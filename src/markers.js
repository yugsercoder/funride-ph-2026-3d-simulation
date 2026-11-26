import * as THREE from 'three';
import {
  ROXAS_ANGLE_RAD,
  toWorld,
  S_START,
  S_QUIRINO_UTURN,
  S_HYDRATION,
  S_UTURN,
  S_KATIGBAK,
  S_ANDA_CIRCLE,
  LANE_OFFSET_SB,
  LANE_OFFSET_NB,
  KATIGBAK_WEST_OFFSET,
  PB_LANE_OUT_S,
  PB_LANE_RET_S,
  PB_GEN_LUNA_OFFSET,
  PB_FORK_OFFSET
} from './routeCommon.js';
import { ROUTE_5KM } from './route5km.js';
import { LANDMARKS_21KM } from './route21km.js';

// Preload official FunRide PH logo & BYD logo
const frphLogoImg = new Image();
frphLogoImg.src = './logos/frph-blue.png';
const bydLogoImg = new Image();
bydLogoImg.src = './logos/byd.png';
const logoLoadCallbacks = [];
const notifyLogoLoaded = () => logoLoadCallbacks.forEach((fn) => fn());
frphLogoImg.onload = notifyLogoLoaded;
bydLogoImg.onload = notifyLogoLoaded;

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function createBannerTexture(title, subtitle, bgHex, accentHex = '#f5c400', showLogo = true) {
  const canvas = document.createElement('canvas');
  canvas.width = 1440;
  canvas.height = 240; // Exact 6:1 aspect ratio
  const ctx = canvas.getContext('2d');

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  const draw = () => {
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = accentHex;
    ctx.fillRect(0, 0, W, 16);
    ctx.fillRect(0, H - 16, W, 16);

    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 22, W - 20, H - 44);

    if (showLogo) {
      const plaqueW = 240;
      const plaqueH = 166;
      const plaqueY = (H - plaqueH) / 2;
      const leftX = 36;
      const rightX = W - plaqueW - 36;

      for (const px of [leftX, rightX]) {
        ctx.fillStyle = '#ffffff';
        roundRectPath(ctx, px, plaqueY, plaqueW, plaqueH, 18);
        ctx.fill();

        if (frphLogoImg.complete && frphLogoImg.naturalWidth > 0) {
          const iw = frphLogoImg.naturalWidth;
          const ih = frphLogoImg.naturalHeight;
          const srcX = 0;
          const srcY = ih * 0.17;
          const srcW = iw;
          const srcH = ih * 0.62;

          const pad = 12;
          const maxW = plaqueW - pad * 2;
          const maxH = plaqueH - pad * 2;
          const scale = Math.min(maxW / srcW, maxH / srcH);
          const drawW = srcW * scale;
          const drawH = srcH * scale;
          const dx = px + (plaqueW - drawW) / 2;
          const dy = plaqueY + (plaqueH - drawH) / 2;
          ctx.drawImage(frphLogoImg, srcX, srcY, srcW, srcH, dx, dy, drawW, drawH);
        }
      }
    }

    const maxTextW = showLogo ? W - 600 : W - 120;
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 84px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, W / 2, subtitle ? 96 : H / 2, maxTextW);

    if (subtitle) {
      ctx.fillStyle = '#fef9c3';
      ctx.font = '700 38px Inter, Arial, sans-serif';
      ctx.fillText(subtitle, W / 2, 168, maxTextW);
    }

    tex.needsUpdate = true;
  };

  draw();
  if (showLogo && !frphLogoImg.complete) {
    logoLoadCallbacks.push(draw);
  }
  return tex;
}

function createCheckeredTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  const sq = 32;
  for (let y = 0; y < canvas.height; y += sq) {
    for (let x = 0; x < canvas.width; x += sq) {
      ctx.fillStyle = ((x / sq + y / sq) % 2 === 0) ? '#ffffff' : '#0f172a';
      ctx.fillRect(x, y, sq, sq);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createRaceGantry(title, subtitle, bgHex, accentHex, width = 18, options = {}) {
  const { checkeredGround = false, showLogo = true } = options;
  const group = new THREE.Group();

  const trussMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
  const baseMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
  const trimMat = new THREE.MeshLambertMaterial({ color: bgHex });

  for (const side of [-1, 1]) {
    const px = side * (width / 2);
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.0, 9.2, 1.0), trussMat);
    pillar.position.set(px, 4.6, 0);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 1.8), baseMat);
    base.position.set(px, 0.35, 0);
    const collar = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.4, 1.15), trimMat);
    collar.position.set(px, 2.2, 0);
    group.add(pillar, base, collar);
  }

  const bannerW = width + 1.2;
  const bannerH = bannerW / 6;
  const bannerTex = createBannerTexture(title, subtitle, bgHex, accentHex, showLogo);
  const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTex });
  const sideMat = new THREE.MeshLambertMaterial({ color: bgHex });
  const banner = new THREE.Mesh(
    new THREE.BoxGeometry(bannerW, bannerH, 0.85),
    [sideMat, sideMat, sideMat, sideMat, bannerMat, bannerMat]
  );
  banner.position.set(0, 7.6, 0);
  group.add(banner);

  if (checkeredGround) {
    const checkerTex = createCheckeredTexture();
    const checkerStrip = new THREE.Mesh(
      new THREE.PlaneGeometry(width - 1.2, 3.2),
      new THREE.MeshBasicMaterial({ map: checkerTex })
    );
    checkerStrip.rotation.x = -Math.PI / 2;
    checkerStrip.position.set(0, 0.22, 0);
    group.add(checkerStrip);

    const borderMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const zOff of [-1.72, 1.72]) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(width - 1.2, 0.22), borderMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, 0.225, zOff);
      group.add(line);
    }
  } else {
    const matMesh = new THREE.Mesh(
      new THREE.BoxGeometry(width - 1.2, 0.06, 2.0),
      new THREE.MeshBasicMaterial({ color: 0x0f172a })
    );
    matMesh.position.set(0, 0.20, 0);
    group.add(matMesh);
  }

  return group;
}

function createHydrationStation(title, subtitle) {
  const hydGroup = new THREE.Group();
  const tentTopMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
  const tentPoleMat = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 });
  const tableMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8 });
  const cupMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

  for (let i = -1; i <= 1; i++) {
    const zOff = i * 8.5;
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(4.2, 2.0, 4), tentTopMat);
    canopy.position.set(-10.5, 4.4, zOff);
    canopy.rotation.y = Math.PI / 4;
    hydGroup.add(canopy);

    for (const [px, pz] of [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.6, 6), tentPoleMat);
      pole.position.set(-10.5 + px, 1.8, zOff + pz);
      hydGroup.add(pole);
    }

    const table = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 5.5), tableMat);
    table.position.set(-7.6, 0.55, zOff);
    hydGroup.add(table);

    for (let c = -2; c <= 2; c++) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.3, 6), cupMat);
      cup.position.set(-7.6, 1.25, zOff + c * 0.9);
      hydGroup.add(cup);
    }
  }

  const hydBannerTex = createBannerTexture(title, subtitle, '#0284c7', '#e0f2fe');
  const hydSign = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 2.4, 16),
    new THREE.MeshBasicMaterial({ map: hydBannerTex })
  );
  hydSign.position.set(-10.5, 6.4, 0);
  hydGroup.add(hydSign);

  return hydGroup;
}

function createDirectionalSign(title, subtitle) {
  const signGroup = new THREE.Group();
  const poleMat = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 });
  const tex = createBannerTexture(title, subtitle, '#1d4ed8', '#f5c400', false);
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(11, 2.2, 0.5),
    new THREE.MeshBasicMaterial({ map: tex })
  );
  sign.position.set(0, 5.2, 0);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 5.2, 8), poleMat);
  post.position.set(0, 2.6, 0);
  signGroup.add(sign, post);
  return signGroup;
}

/**
 * Create the official BYD Recharging Hub Hydration Station (21KM ONLY)
 * Faithful to "BYD FunridePH 2026 _ Proposed Layout 111126.pdf" (Pages 12–14):
 *   - Textured grey ground pad
 *   - Lime-yellow BYD Seagull EV hatchback (V2L power source)
 *   - Black aluminum truss "RECHARGING HUB" arch on yellow/black hazard-striped platform
 *   - Twin silver standing water dispensers underneath the arch
 *   - Black-draped hydration table stocked with water/electrolyte bottles
 *   - Twin tall white L-shaped V2L light poles with black LED floodlights
 *   - Twin tall dark-charcoal vertical BYD banner flags on X-frame bases
 * Local +X faces the cyclists on Padre Burgos Ave; local Z runs parallel to the road.
 */
function createBydHydrationStation() {
  const group = new THREE.Group();

  // 1. Textured Concrete/Gravel Ground Pad (19m along road x 7m deep)
  const padMat = new THREE.MeshLambertMaterial({ color: 0x8e8c82 });
  const pad = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.14, 19.2), padMat);
  pad.position.set(0, 0.09, 0);
  group.add(pad);

  // 2. Lime-Yellow BYD Seagull EV Hatchback (Left side, z = -4.0, angled slightly toward road)
  const car = new THREE.Group();
  const seagullYellow = new THREE.MeshLambertMaterial({ color: 0xd9e856 });
  const carGlass = new THREE.MeshLambertMaterial({ color: 0x1e293b });
  const carBlack = new THREE.MeshLambertMaterial({ color: 0x111827 });
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x1f2937 });
  const rimMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
  const headLightMat = new THREE.MeshBasicMaterial({ color: 0xfef9c3 });
  const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

  // Lower body & black side skirt
  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.72, 4.15), seagullYellow);
  lowerBody.position.set(0, 0.76, 0);
  const sideSkirt = new THREE.Mesh(new THREE.BoxGeometry(1.99, 0.20, 3.85), carBlack);
  sideSkirt.position.set(0, 0.44, 0);
  // Sloped hatchback cabin + dark greenhouse windows
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.62, 2.35), seagullYellow);
  cabin.position.set(0, 1.38, -0.18);
  const sideWin = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.44, 2.10), carGlass);
  sideWin.position.set(0, 1.36, -0.18);
  const frontWindshield = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.56, 0.12), carGlass);
  frontWindshield.position.set(0, 1.32, 1.06);
  frontWindshield.rotation.x = -0.58;
  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.60, 0.50, 0.12), carGlass);
  rearGlass.position.set(0, 1.34, -1.42);
  rearGlass.rotation.x = 0.42;
  // Front black bumper grille + headlights + rear LED lightbar
  const frontGrille = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.28, 0.10), carBlack);
  frontGrille.position.set(0, 0.56, 2.08);
  for (const sx of [-0.66, 0.66]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.08), headLightMat);
    hl.position.set(sx, 0.86, 2.07);
    car.add(hl);
  }
  const tailBar = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.12, 0.08), tailLightMat);
  tailBar.position.set(0, 0.94, -2.07);

  // 4 Alloy Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.20, 0.20, 0.26, 12);
  hubGeo.rotateZ(Math.PI / 2);
  for (const [wx, wz] of [[-0.96, 1.28], [0.96, 1.28], [-0.96, -1.28], [0.96, -1.28]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(wx, 0.36, wz);
    const h = new THREE.Mesh(hubGeo, rimMat);
    h.position.set(wx, 0.36, wz);
    car.add(w, h);
  }
  car.add(lowerBody, sideSkirt, cabin, sideWin, frontWindshield, rearGlass, frontGrille, tailBar);
  car.position.set(0.1, 0.16, -4.1);
  car.rotation.y = Math.PI * 0.14; // slightly angled outward toward cyclists like PDF page 12-13
  group.add(car);

  // 3. "RECHARGING HUB" Platform with Yellow/Black Hazard Stripes + Black Truss Arch + Twin Water Dispensers
  const hubGroup = new THREE.Group();
  const hazCanvas = document.createElement('canvas');
  hazCanvas.width = 512;
  hazCanvas.height = 64;
  const hctx = hazCanvas.getContext('2d');
  hctx.fillStyle = '#facc15';
  hctx.fillRect(0, 0, 512, 64);
  hctx.fillStyle = '#111827';
  for (let x = -64; x < 576; x += 32) {
    hctx.beginPath();
    hctx.moveTo(x, 0);
    hctx.lineTo(x + 16, 0);
    hctx.lineTo(x + 40, 64);
    hctx.lineTo(x + 24, 64);
    hctx.closePath();
    hctx.fill();
  }
  const hazTex = new THREE.CanvasTexture(hazCanvas);
  hazTex.colorSpace = THREE.SRGBColorSpace;
  hazTex.wrapS = THREE.RepeatWrapping;
  hazTex.repeat.set(3, 1);

  const platTopMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
  const platEdgeMat = new THREE.MeshBasicMaterial({ map: hazTex });
  const platMesh = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.24, 4.4),
    [platEdgeMat, platEdgeMat, platTopMat, platTopMat, platEdgeMat, platEdgeMat]
  );
  platMesh.position.set(0, 0.26, 0);
  hubGroup.add(platMesh);

  // Two black aluminum truss columns
  const trussMat = new THREE.MeshLambertMaterial({ color: 0x18181b });
  for (const tz of [-1.75, 1.75]) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.6, 0.32), trussMat);
    col.position.set(0, 2.18, tz);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 0.7), trussMat);
    foot.position.set(0, 0.44, tz);
    hubGroup.add(col, foot);
  }
  const topBeam = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 3.8), trussMat);
  topBeam.position.set(0, 3.85, 0);
  hubGroup.add(topBeam);

  // Glowing Cyan-Bordered "RECHARGING HUB" Header Sign
  const hubCanvas = document.createElement('canvas');
  hubCanvas.width = 1024;
  hubCanvas.height = 192;
  const bctx = hubCanvas.getContext('2d');
  bctx.fillStyle = '#38bdf8';
  roundRectPath(bctx, 0, 0, 1024, 192, 32);
  bctx.fill();
  bctx.fillStyle = '#ffffff';
  roundRectPath(bctx, 14, 14, 996, 164, 22);
  bctx.fill();
  bctx.fillStyle = '#0f172a';
  bctx.font = '800 84px Inter, Arial, sans-serif';
  bctx.textAlign = 'left';
  bctx.textBaseline = 'middle';
  bctx.fillText('RECHARGING HUB', 44, 98);
  // Diagonal cyan accent bars on right (matching PDF page 12-13)
  bctx.fillStyle = '#38bdf8';
  for (let i = 0; i < 4; i++) {
    const sx = 825 + i * 38;
    bctx.beginPath();
    bctx.moveTo(sx + 20, 30);
    bctx.lineTo(sx + 38, 30);
    bctx.lineTo(sx + 18, 162);
    bctx.lineTo(sx, 162);
    bctx.closePath();
    bctx.fill();
  }
  const hubTex = new THREE.CanvasTexture(hubCanvas);
  hubTex.colorSpace = THREE.SRGBColorSpace;
  const hubSideMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const hubFaceMat = new THREE.MeshBasicMaterial({ map: hubTex });
  const hubSign = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.78, 4.4),
    [hubFaceMat, hubFaceMat, hubSideMat, hubSideMat, hubSideMat, hubSideMat]
  );
  hubSign.position.set(0.18, 3.92, 0);
  hubGroup.add(hubSign);

  // Twin Silver-Grey Standing Water Dispensers underneath the arch
  const dispMat = new THREE.MeshLambertMaterial({ color: 0xb4bcc4 });
  const dispDark = new THREE.MeshLambertMaterial({ color: 0x334155 });
  const dispAccent = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  for (const dz of [-0.46, 0.46]) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.75, 0.66), dispMat);
    body.position.set(0, 1.26, dz);
    const recess = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, 0.42), dispDark);
    recess.position.set(0.28, 1.48, dz);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.32), dispAccent);
    led.position.set(0.32, 1.82, dz);
    hubGroup.add(body, recess, led);
  }
  hubGroup.position.set(-0.6, 0.0, 1.2);
  group.add(hubGroup);

  // 4. Black-Draped Hydration Table with Rows of Blue & Orange Bottles (Right side, z = +5.6)
  const tableGroup = new THREE.Group();
  const clothMat = new THREE.MeshLambertMaterial({ color: 0x111827 });
  const tableMesh = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.05, 3.1), clothMat);
  tableMesh.position.set(0, 0.68, 0);
  tableGroup.add(tableMesh);

  const bottleBlue = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
  const bottleOrange = new THREE.MeshLambertMaterial({ color: 0xf97316 });
  const bottleGeo = new THREE.CylinderGeometry(0.06, 0.065, 0.32, 6);
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 10; col++) {
      const b = new THREE.Mesh(bottleGeo, row === 0 ? bottleBlue : bottleOrange);
      b.position.set(0.22 - row * 0.42, 1.36, -1.25 + col * 0.28);
      tableGroup.add(b);
    }
  }
  tableGroup.position.set(1.2, 0, 5.5);
  group.add(tableGroup);

  // 5. Twin Tall White L-Shaped V2L Light Poles with Dual Black LED Floodlights
  const whitePoleMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
  const lampHeadMat = new THREE.MeshLambertMaterial({ color: 0x111827 });
  const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef9c3 });

  function makeLightPole(lx, lz, armDirX) {
    const pGroup = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.12, 0.85), whitePoleMat);
    base.position.set(0, 0.22, 0);
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.14, 5.4, 0.14), whitePoleMat);
    mast.position.set(0, 2.95, 0);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.14), whitePoleMat);
    arm.position.set(armDirX * 0.75, 5.6, 0);
    pGroup.add(base, mast, arm);
    for (const fz of [-0.36, 0.36]) {
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.24), lampHeadMat);
      head.position.set(armDirX * 1.25, 5.42, fz);
      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.20), lampGlowMat);
      lens.position.set(armDirX * 1.25, 5.31, fz);
      pGroup.add(head, lens);
    }
    pGroup.position.set(lx, 0, lz);
    return pGroup;
  }
  group.add(makeLightPole(2.1, -8.3, -1));
  group.add(makeLightPole(-2.1, 7.6, 1));

  // 6. Twin Tall Dark-Charcoal BYD Vertical Banner Flags (with official white BYD logo)
  const flagCanvas = document.createElement('canvas');
  flagCanvas.width = 256;
  flagCanvas.height = 640;
  const fctx = flagCanvas.getContext('2d');
  const flagTex = new THREE.CanvasTexture(flagCanvas);
  flagTex.colorSpace = THREE.SRGBColorSpace;

  const drawBydFlag = () => {
    fctx.fillStyle = '#2d3748';
    fctx.fillRect(0, 0, 256, 640);
    fctx.strokeStyle = 'rgba(255,255,255,0.18)';
    fctx.lineWidth = 6;
    fctx.strokeRect(8, 8, 240, 624);

    if (bydLogoImg.complete && bydLogoImg.naturalWidth > 0) {
      // Render BYD.png rotated 90° vertically in pure white on charcoal flag (matching PDF!)
      const off = document.createElement('canvas');
      off.width = bydLogoImg.naturalWidth;
      off.height = bydLogoImg.naturalHeight;
      const octx = off.getContext('2d');
      octx.drawImage(bydLogoImg, 0, 0);
      octx.globalCompositeOperation = 'source-in';
      octx.fillStyle = '#ffffff';
      octx.fillRect(0, 0, off.width, off.height);

      fctx.save();
      fctx.translate(128, 320);
      fctx.rotate(Math.PI / 2);
      const scale = 320 / off.width;
      const dw = off.width * scale;
      const dh = off.height * scale;
      fctx.drawImage(off, -dw / 2, -dh / 2, dw, dh);
      fctx.restore();
    } else {
      fctx.save();
      fctx.translate(128, 320);
      fctx.rotate(Math.PI / 2);
      fctx.fillStyle = '#ffffff';
      fctx.font = '800 92px Inter, Arial, sans-serif';
      fctx.textAlign = 'center';
      fctx.textBaseline = 'middle';
      fctx.fillText('BYD', 0, 0);
      fctx.restore();
    }
    flagTex.needsUpdate = true;
  };
  drawBydFlag();
  if (!bydLogoImg.complete) logoLoadCallbacks.push(drawBydFlag);

  const flagMat = new THREE.MeshBasicMaterial({ map: flagTex, side: THREE.DoubleSide });
  const xBaseMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
  function makeBydFlag(fx, fz) {
    const fg = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 4.9, 6), xBaseMat);
    pole.position.set(0, 2.55, 0);
    const bar1 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.08), xBaseMat);
    bar1.position.set(0, 0.2, 0);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 1.1), xBaseMat);
    bar2.position.set(0, 0.2, 0);
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 3.4), flagMat);
    banner.position.set(0, 3.15, 0.68);
    banner.rotation.y = Math.PI / 2;
    fg.add(pole, bar1, bar2, banner);
    fg.position.set(fx, 0, fz);
    return fg;
  }
  group.add(makeBydFlag(-1.9, -7.8));
  group.add(makeBydFlag(1.2, 8.2));

  return group;
}

/**
 * Build swappable 3D race infrastructure & projected 2D HTML map pills for 5KM and 10KM.
 */
export function buildMarkersAndLabels(scene, labelsContainer, onLabelClick, initialRoute = ROUTE_5KM) {
  const group = new THREE.Group();
  scene.add(group);

  let labelItems = [];

  function clearCurrent() {
    while (group.children.length > 0) {
      const child = group.children.pop();
      child.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        }
      });
    }
    labelsContainer.innerHTML = '';
    labelItems = [];
  }

  function setActiveRoute(route) {
    clearCurrent();
    const is5k = route.id === '5km';
    const is10k = route.id === '10km';
    const is21k = route.id === '21km';
    const coneGeo = new THREE.ConeGeometry(0.45, 1.2, 8);
    const coneMat = new THREE.MeshLambertMaterial({ color: 0xf97316 });

    // 1. START · KM 0 Gantry
    const startGantry = createRaceGantry(
      'START · KM 0',
      `FUNRIDE PH 2026 · ${route.shortLabel}`,
      '#0d9488',
      '#f5c400',
      15
    );
    startGantry.position.copy(toWorld(S_START, LANE_OFFSET_SB, 0));
    startGantry.rotation.y = ROXAS_ANGLE_RAD;
    group.add(startGantry);

    // 2. HYDRATION · PH NAVY Station (5KM & 10KM)
    if (!is21k) {
      const hydPhNavy = createHydrationStation('HYDRATION · PH NAVY', `WATER STATION · ${route.shortLabel}`);
      hydPhNavy.position.copy(toWorld(S_HYDRATION, LANE_OFFSET_SB, 0));
      hydPhNavy.rotation.y = ROXAS_ANGLE_RAD;
      group.add(hydPhNavy);
    }

    // 3. U-TURN · P. OCAMPO Zone (cones strictly on outer road sides, never blocking the lanes!)
    const uturnGroup = new THREE.Group();
    for (const side of [-1, 1]) {
      for (let z = -12; z <= 16; z += 7) {
        const cone = new THREE.Mesh(coneGeo, coneMat);
        cone.position.set(side * 16.5, 0.6, z);
        uturnGroup.add(cone);
      }
    }
    const uturnArch = createRaceGantry('U-TURN · P. OCAMPO', '180° TURN TO NORTHBOUND', '#0f172a', '#f5c400', 28);
    uturnArch.position.set(0, 0, 14);
    uturnGroup.add(uturnArch);
    uturnGroup.position.copy(toWorld(S_UTURN, 0, 0));
    uturnGroup.rotation.y = ROXAS_ANGLE_RAD;
    group.add(uturnGroup);

    // 4. Route-specific junction signs, extra hydration & U-turns
    if (is5k) {
      const turn5Group = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const cone = new THREE.Mesh(coneGeo, coneMat);
        cone.position.set(16.5, 0.6, -12 + i * 4.5);
        turn5Group.add(cone);
      }
      const turnSign = createDirectionalSign('← LEFT TO KATIGBAK DR', 'TO QUIRINO GRANDSTAND FINISH');
      turnSign.position.set(6, 0, -16);
      turn5Group.add(turnSign);
      turn5Group.position.copy(toWorld(S_KATIGBAK, LANE_OFFSET_NB, 0));
      turn5Group.rotation.y = ROXAS_ANGLE_RAD;
      group.add(turn5Group);
    } else if (is10k) {
      const pbTurnSign = createDirectionalSign('RIGHT TO PADRE BURGOS →', 'TOWARDS FINANCE ROAD U-TURN');
      pbTurnSign.position.copy(toWorld(S_KATIGBAK - 18, LANE_OFFSET_NB + 6, 0));
      pbTurnSign.rotation.y = ROXAS_ANGLE_RAD;
      group.add(pbTurnSign);

      const hydGenLuna = createHydrationStation('HYDRATION · GEN. LUNA', 'WATER STATION · 10KM');
      hydGenLuna.position.copy(toWorld(PB_LANE_OUT_S, PB_GEN_LUNA_OFFSET, 0));
      hydGenLuna.rotation.y = ROXAS_ANGLE_RAD + Math.PI * 0.5;
      group.add(hydGenLuna);

      const finForkSign = createDirectionalSign('BEAR RIGHT → FINANCE RD', '10KM U-TURN AHEAD');
      finForkSign.position.copy(toWorld(PB_LANE_OUT_S - 20, PB_FORK_OFFSET + 18, 0));
      finForkSign.rotation.y = ROXAS_ANGLE_RAD - Math.PI * 0.5;
      group.add(finForkSign);

      const finMeta = route.financeMeta;
      const finUturnGroup = new THREE.Group();
      for (const side of [-1, 1]) {
        for (let z = -10; z <= 14; z += 6) {
          const cone = new THREE.Mesh(coneGeo, coneMat);
          cone.position.set(side * 15.0, 0.6, z);
          finUturnGroup.add(cone);
        }
      }
      const finArch = createRaceGantry('10KM U-TURN · FINANCE RD', 'RETURN TO PADRE BURGOS AVE', '#0f172a', '#dc2626', 26);
      finArch.position.set(0, 0, 12);
      finUturnGroup.add(finArch);
      finUturnGroup.position.copy(finMeta.uturnCenter);
      finUturnGroup.rotation.y = Math.atan2(finMeta.dirOut.x, finMeta.dirOut.z);
      group.add(finUturnGroup);

      const katReturnSign = createDirectionalSign('KATIGBAK DR → FINISH', 'QUIRINO GRANDSTAND AHEAD');
      katReturnSign.position.copy(toWorld(PB_LANE_RET_S - 18, -28, 0));
      katReturnSign.rotation.y = ROXAS_ANGLE_RAD + Math.PI * 0.5;
      group.add(katReturnSign);
    } else if (is21k) {
      // 21KM Hydration Station by Jones Bridge (aligned parallel to Jones Bridge approach, cleanly off the blue lane!)
      const hyd21 = createHydrationStation('HYDRATION · 21KM', 'BY JONES BRIDGE · LAWTON');
      hyd21.position.copy(LANDMARKS_21KM.hydJones);
      hyd21.rotation.y = LANDMARKS_21KM.hydJonesYaw;
      group.add(hyd21);

      // 21KM ONLY: Official BYD Recharging Hub Hydration Station (Padre Burgos Ave / Gomburza Plaza across from National Museum)
      const bydStation = createBydHydrationStation();
      bydStation.scale.setScalar(2.25);
      bydStation.position.copy(LANDMARKS_21KM.bydStation);
      bydStation.rotation.y = LANDMARKS_21KM.bydStationYaw;
      group.add(bydStation);

      // Subtle Gomburza tiled plaza & lawn framing the BYD Hydration Station (matching Google Maps)
      const gomburzaPlaza = new THREE.Mesh(
        new THREE.BoxGeometry(30, 0.04, 64),
        new THREE.MeshLambertMaterial({ color: 0xd6d3c9 })
      );
      gomburzaPlaza.position.copy(LANDMARKS_21KM.bydStation).add(new THREE.Vector3(0, 0.025, 0));
      gomburzaPlaza.rotation.y = LANDMARKS_21KM.bydStationYaw;
      group.add(gomburzaPlaza);

      // 21KM U-Turn at Anda Circle (positioned cleanly on straight Bonifacio Drive south of roundabout so pillars sit on sidewalks!)
      const andaUturn = createRaceGantry('U-TURN · ANDA CIRCLE', 'RETURN SOUTHBOUND ROXAS BLVD', '#0f172a', '#2563eb', 28);
      andaUturn.position.copy(toWorld(S_ANDA_CIRCLE + 34, 0, 0));
      andaUturn.rotation.y = ROXAS_ANGLE_RAD + Math.PI;
      group.add(andaUturn);

      // 21KM Final U-Turn at Quirino Avenue (cones strictly on outer road shoulders, lanes 100% clear!)
      const quirinoGroup = new THREE.Group();
      for (const side of [-1, 1]) {
        for (let z = -12; z <= 16; z += 7) {
          const cone = new THREE.Mesh(coneGeo, coneMat);
          cone.position.set(side * 16.5, 0.6, z);
          quirinoGroup.add(cone);
        }
      }
      const quirinoArch = createRaceGantry('21KM LAST U-TURN', 'QUIRINO AVE · FINAL PUSH TO FINISH', '#0f172a', '#2563eb', 28);
      quirinoArch.position.set(0, 0, 14);
      quirinoGroup.add(quirinoArch);
      quirinoGroup.position.copy(toWorld(S_QUIRINO_UTURN, 0, 0));
      quirinoGroup.rotation.y = ROXAS_ANGLE_RAD;
      group.add(quirinoGroup);
    }

    // 5. FINISH LINE · Quirino Grandstand Gantry
    const finishGantry = createRaceGantry(
      `FINISH · ${route.shortLabel}`,
      'QUIRINO GRANDSTAND · MANILA',
      '#dc2626',
      '#f5c400',
      21,
      { checkeredGround: true, showLogo: true }
    );
    finishGantry.position.copy(toWorld(route.finalS, KATIGBAK_WEST_OFFSET, 0));
    finishGantry.rotation.y = ROXAS_ANGLE_RAD;
    group.add(finishGantry);

    // -------------------------------------------------------------------------
    // Projected 2D HTML Map Labels (Exact match to each official FunRide poster)
    // -------------------------------------------------------------------------
    let labelDefs = [];
    if (is5k) {
      labelDefs = [
        { checkpoint: 'step1', worldPos: toWorld(S_START, LANE_OFFSET_SB + 42, 14), html: `<div class="label-pill start">START · KM 0</div>` },
        { checkpoint: 'step1', worldPos: toWorld(S_START + 25, LANE_OFFSET_SB - 32, 10), html: `<div class="label-step">1</div>` },
        { checkpoint: 'step2', worldPos: toWorld(1040, LANE_OFFSET_SB - 36, 12), html: `<div class="label-step">2</div>` },
        { checkpoint: 'hydration', worldPos: toWorld(S_HYDRATION - 10, LANE_OFFSET_SB - 52, 15), html: `<div class="label-pill hydration">💧 HYDRATION · PH NAVY</div>` },
        { checkpoint: 'step3', worldPos: toWorld(S_UTURN + 42, 0, 16), html: `<div class="label-pill uturn">U-TURN · P. OCAMPO</div>` },
        { checkpoint: 'step3', worldPos: toWorld(S_UTURN + 88, 0, 10), html: `<div class="label-step">3</div>` },
        { checkpoint: 'step4', worldPos: toWorld(1040, LANE_OFFSET_NB + 36, 12), html: `<div class="label-step">4</div>` },
        { checkpoint: 'step5', worldPos: toWorld(S_KATIGBAK - 32, LANE_OFFSET_NB - 10, 14), html: `<div class="label-step">5</div>` },
        { checkpoint: 'finish', worldPos: toWorld(route.finalS + 10, KATIGBAK_WEST_OFFSET, 16), html: `<div class="label-pill finish">FINISH</div><div class="label-sub">Katigbak Dr · Quirino Grandstand</div>` },
        { checkpoint: null, worldPos: toWorld(-110, 170, 10), html: `<div class="label-geo park">Rizal Park (Luneta)</div>` },
        { checkpoint: null, worldPos: toWorld(1450, -100, 6), html: `<div class="label-geo water">MANILA BAY · ROXAS BLVD</div>` }
      ];
    } else if (is10k) {
      labelDefs = [
        { checkpoint: 'step1', worldPos: toWorld(S_START, LANE_OFFSET_SB + 42, 14), html: `<div class="label-pill start">START · KM 0</div>` },
        { checkpoint: 'step1', worldPos: toWorld(S_START + 25, LANE_OFFSET_SB - 32, 10), html: `<div class="label-step">1</div>` },
        { checkpoint: 'step2', worldPos: toWorld(1040, LANE_OFFSET_SB - 36, 12), html: `<div class="label-step">2</div>` },
        { checkpoint: 'hydPhNavy', worldPos: toWorld(S_HYDRATION - 10, LANE_OFFSET_SB - 52, 15), html: `<div class="label-pill hydration">💧 HYDRATION · PH NAVY</div>` },
        { checkpoint: 'step3', worldPos: toWorld(S_UTURN + 42, 0, 16), html: `<div class="label-pill uturn">U-TURN · P. OCAMPO</div>` },
        { checkpoint: 'step3', worldPos: toWorld(S_UTURN + 88, 0, 10), html: `<div class="label-step">3</div>` },
        { checkpoint: 'step4', worldPos: toWorld(1040, LANE_OFFSET_NB + 36, 12), html: `<div class="label-step">4</div>` },
        { checkpoint: 'step5', worldPos: toWorld(S_KATIGBAK + 40, LANE_OFFSET_NB - 28, 12), html: `<div class="label-step">5</div>` },
        { checkpoint: 'step6', worldPos: toWorld(PB_LANE_OUT_S + 38, 360, 12), html: `<div class="label-step">6</div>` },
        { checkpoint: 'hydGenLuna', worldPos: toWorld(PB_LANE_OUT_S + 68, PB_GEN_LUNA_OFFSET + 40, 16), html: `<div class="label-pill hydration">💧 HYDRATION · GEN. LUNA–FINANCE</div>` },
        { checkpoint: 'step7', worldPos: toWorld(PB_LANE_OUT_S + 32, PB_FORK_OFFSET + 35, 12), html: `<div class="label-step">7</div>` },
        { checkpoint: 'step8', worldPos: route.financeMeta.uturnCenter.clone().add(new THREE.Vector3(25, 18, 15)), html: `<div class="label-pill uturn">10KM U-TURN · FINANCE RD</div>` },
        { checkpoint: 'step8', worldPos: route.financeMeta.uturnCenter.clone().add(new THREE.Vector3(-10, 12, -28)), html: `<div class="label-step">8</div>` },
        { checkpoint: 'step9', worldPos: route.checkpoints.step9.position.clone().add(new THREE.Vector3(0, 12, -32)), html: `<div class="label-step">9</div>` },
        { checkpoint: 'step10', worldPos: toWorld(PB_LANE_RET_S - 42, 340, 12), html: `<div class="label-step">10</div>` },
        { checkpoint: 'step11', worldPos: toWorld(PB_LANE_RET_S - 38, -22, 12), html: `<div class="label-step">11</div>` },
        { checkpoint: 'finish', worldPos: toWorld(route.finalS + 10, KATIGBAK_WEST_OFFSET, 16), html: `<div class="label-pill finish">FINISH</div><div class="label-sub">Katigbak Dr · Quirino Grandstand</div>` },
        { checkpoint: null, worldPos: toWorld(-110, 220, 10), html: `<div class="label-geo park">Rizal Park (Luneta)</div>` },
        { checkpoint: null, worldPos: toWorld(S_KATIGBAK - 130, 360, 12), html: `<div class="label-geo park">Intramuros</div>` },
        { checkpoint: null, worldPos: toWorld(S_KATIGBAK + 105, PB_FORK_OFFSET + 80, 14), html: `<div class="label-geo">National Museum</div>` },
        { checkpoint: null, worldPos: toWorld(1450, -100, 6), html: `<div class="label-geo water">MANILA BAY · ROXAS BLVD</div>` }
      ];
    } else if (is21k) {
      const cp = route.checkpoints;
      labelDefs = [
        { checkpoint: 'step1', worldPos: toWorld(S_START, LANE_OFFSET_SB + 46, 15), html: `<div class="label-pill start">START · KM 0</div>` },
        { checkpoint: 'step3', worldPos: toWorld(S_UTURN + 46, 0, 16), html: `<div class="label-pill uturn">U-TURN · P. OCAMPO</div>` },
        { checkpoint: 'hyd21k', worldPos: LANDMARKS_21KM.hydJones.clone().add(new THREE.Vector3(55, 18, 0)), html: `<div class="label-pill hydration">💧 HYDRATION · 21KM</div>` },
        { checkpoint: 'bydHydration', worldPos: LANDMARKS_21KM.bydStation.clone().add(new THREE.Vector3(0, 12, 0)), html: `<div class="label-pill hydration">⚡ BYD RECHARGING HUB</div>` },
        { checkpoint: 'step10', worldPos: LANDMARKS_21KM.binondoChurch.clone().add(new THREE.Vector3(0, 44, 0)), html: `<div class="label-pill uturn">BINONDO CHURCH</div>` },
        { checkpoint: 'step32', worldPos: LANDMARKS_21KM.andaCircle.clone().add(new THREE.Vector3(-45, 22, 0)), html: `<div class="label-pill uturn">U-TURN · ANDA CIRCLE</div>` },
        { checkpoint: 'step34', worldPos: LANDMARKS_21KM.quirinoUturn.clone().add(new THREE.Vector3(-55, 18, 0)), html: `<div class="label-pill uturn">21KM LAST U-TURN · QUIRINO AVE</div>` },
        { checkpoint: 'finish', worldPos: toWorld(route.finalS + 10, KATIGBAK_WEST_OFFSET, 16), html: `<div class="label-pill finish">FINISH</div><div class="label-sub">Katigbak Dr · Quirino Grandstand</div>` },
        // Key numbered step bubbles matching the 21KM map
        ...[2, 4, 6, 7, 9, 12, 15, 17, 20, 23, 26, 29, 31, 33, 35, 36].map((num) => ({
          checkpoint: `step${num}`,
          worldPos: cp[`step${num}`].position.clone().add(new THREE.Vector3(0, 12, 0)),
          html: `<div class="label-step">${num}</div>`
        })),
        // Geographic context labels
        { checkpoint: null, worldPos: toWorld(-110, 220, 10), html: `<div class="label-geo park">Rizal Park</div>` },
        { checkpoint: null, worldPos: toWorld(-720, 270, 16), html: `<div class="label-geo park">INTRAMUROS</div>` },
        { checkpoint: null, worldPos: toWorld(-1620, 60, 16), html: `<div class="label-geo">BINONDO</div>` },
        { checkpoint: null, worldPos: toWorld(-1190, 740, 10), html: `<div class="label-geo water">Pasig River</div>` },
        { checkpoint: null, worldPos: LANDMARKS_21KM.jonesSouth.clone().lerp(LANDMARKS_21KM.jonesNorth, 0.5).add(new THREE.Vector3(0, 14, 0)), html: `<div class="label-geo">Jones Bridge</div>` },
        { checkpoint: null, worldPos: LANDMARKS_21KM.biBridgeSouth.clone().lerp(LANDMARKS_21KM.biBridgeNorth, 0.5).add(new THREE.Vector3(0, 18, 0)), html: `<div class="label-geo">Binondo–Intramuros Bridge</div>` },
        { checkpoint: null, worldPos: toWorld(-760, -250, 10), html: `<div class="label-geo">Port Area</div>` }
      ];
    }

    labelItems = labelDefs.map((def) => {
      const el = document.createElement('div');
      el.className = 'map-label';
      el.innerHTML = def.html;
      if (def.checkpoint && onLabelClick) {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onLabelClick(def.checkpoint);
        });
      }
      labelsContainer.appendChild(el);
      const priority = def.html.includes('label-pill')
        ? 1
        : def.html.includes('label-geo')
        ? 2
        : 3;
      const boxW = priority === 1 ? 155 : priority === 2 ? 110 : 30;
      const boxH = priority === 1 ? 30 : priority === 2 ? 22 : 28;
      return { ...def, el, priority, boxW, boxH };
    });
    labelItems.sort((a, b) => a.priority - b.priority);
  }

  setActiveRoute(initialRoute);

  const projVec = new THREE.Vector3();

  return {
    group,
    setActiveRoute,
    updateLabels(camera, width, height) {
      const placed = [];
      for (const item of labelItems) {
        projVec.copy(item.worldPos).project(camera);
        if (projVec.z > 1) {
          item.el.style.display = 'none';
          continue;
        }
        const x = (projVec.x * 0.5 + 0.5) * width;
        const y = (-projVec.y * 0.5 + 0.5) * height;

        // Screen-space decluttering: hide lower-priority labels that overlap higher-priority pills
        const halfW = item.boxW * 0.5;
        const top = y - item.boxH;
        const bottom = y;
        const left = x - halfW;
        const right = x + halfW;

        let overlaps = false;
        for (let i = 0; i < placed.length; i++) {
          const b = placed[i];
          if (left < b.right && right > b.left && top < b.bottom && bottom > b.top) {
            overlaps = true;
            break;
          }
        }

        if (overlaps) {
          item.el.style.display = 'none';
          continue;
        }

        placed.push({ left, right, top, bottom });
        item.el.style.display = 'block';
        item.el.style.left = `${x}px`;
        item.el.style.top = `${y}px`;
      }
    }
  };
}
