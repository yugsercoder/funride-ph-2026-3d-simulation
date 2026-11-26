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

// Preload official FunRide PH logo (blue version works crisply on white plaques)
const frphLogoImg = new Image();
frphLogoImg.src = './logos/frph-blue.png';
const logoLoadCallbacks = [];
frphLogoImg.onload = () => {
  logoLoadCallbacks.forEach((fn) => fn());
};

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
