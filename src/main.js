import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { toWorld, S_KATIGBAK, PB_FORK_OFFSET } from './routeCommon.js';
import { ROUTE_5KM } from './route5km.js';
import { ROUTE_10KM } from './route10km.js';
import { ROUTE_21KM } from './route21km.js';
import { buildEnvironment } from './environment.js';
import { buildMarkersAndLabels } from './markers.js';
import { buildPeloton } from './cyclist.js';

const ROUTES = {
  '5km': ROUTE_5KM,
  '10km': ROUTE_10KM,
  '21km': ROUTE_21KM
};

let activeRoute = ROUTE_5KM;

// ============================================================================
// 1. Scene, Renderer, Camera & Lighting
// ============================================================================
const container = document.getElementById('canvas-container');
const labelsLayer = document.getElementById('labels-layer');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcce5f8);
scene.fog = new THREE.Fog(0xcce5f8, 4200, 11500);

const camera = new THREE.PerspectiveCamera(
  52,
  window.innerWidth / window.innerHeight,
  0.8,
  16000
);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
container.appendChild(renderer.domElement);

// Warm Manila morning sunlight (Dec 19, 2026)
const hemiLight = new THREE.HemisphereLight(0xf0f9ff, 0x94a3b8, 0.95);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xfff7e6, 1.35);
sunLight.position.set(900, 1400, -400);
scene.add(sunLight);

const fillLight = new THREE.DirectionalLight(0xbae6fd, 0.35);
fillLight.position.set(-700, 500, 800);
scene.add(fillLight);

// OrbitControls (active in Map View)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.485;
controls.minDistance = 12;
controls.maxDistance = 6800;

// ============================================================================
// 2. Build 3D World, Landmarks, Markers & Cyclist Peloton
// ============================================================================
const environment = buildEnvironment(scene, activeRoute);
const peloton = buildPeloton(scene);

const BASE_SPEED_MPS = 20 / 3.6; // 20 km/h realistic FunRide pace (~5.56 m/s)
const state = {
  distanceM: 0,
  playing: true,
  speedMult: 4,
  cameraMode: 'follow', // 'follow' | 'pov' | 'map' | 'orbit'
  orbitAngle: 0,
  showLabels: true,
  showBuildings: true,
  showMinimap: true,
  lookYaw: 0,
  lookPitch: 0,
  followZoom: 32,
  isDraggingLook: false,
  lastPointerX: 0,
  lastPointerY: 0
};

const markers = buildMarkersAndLabels(
  scene,
  labelsLayer,
  (checkpointId) => jumpToCheckpoint(checkpointId),
  activeRoute
);

// ============================================================================
// 3. Camera Modes & Free-Look Controls
// ============================================================================
const smoothCamPos = new THREE.Vector3();
const smoothLookAt = new THREE.Vector3();
let snapCameraNextFrame = true;

function resetFreeLook() {
  state.lookYaw = 0;
  state.lookPitch = 0;
  state.followZoom = 32;
}

function frameMapOverview() {
  const { center, height, zOffset } = activeRoute.mapOverview;
  camera.position.set(center.x, height, center.z + zOffset);
  controls.target.copy(center);
  controls.update();
}

function setCameraMode(mode) {
  state.cameraMode = mode;
  resetFreeLook();
  document.querySelectorAll('.cam-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.cam === mode);
  });

  if (mode === 'map') {
    controls.enabled = true;
    frameMapOverview();
  } else {
    controls.enabled = false;
    snapCameraNextFrame = true;
  }
}

const canvasEl = renderer.domElement;
canvasEl.style.cursor = 'grab';

canvasEl.addEventListener('pointerdown', (e) => {
  if (state.cameraMode !== 'follow' && state.cameraMode !== 'pov') return;
  state.isDraggingLook = true;
  state.lastPointerX = e.clientX;
  state.lastPointerY = e.clientY;
  canvasEl.style.cursor = 'grabbing';
  canvasEl.setPointerCapture(e.pointerId);
});

canvasEl.addEventListener('pointermove', (e) => {
  if (!state.isDraggingLook) return;
  const dx = e.clientX - state.lastPointerX;
  const dy = e.clientY - state.lastPointerY;
  state.lastPointerX = e.clientX;
  state.lastPointerY = e.clientY;

  const sensitivity = 0.0055;
  state.lookYaw -= dx * sensitivity;

  if (state.cameraMode === 'pov') {
    state.lookYaw = THREE.MathUtils.clamp(state.lookYaw, -Math.PI * 0.85, Math.PI * 0.85);
    state.lookPitch = THREE.MathUtils.clamp(state.lookPitch - dy * sensitivity * 0.75, -0.45, 0.55);
  } else {
    state.lookPitch = THREE.MathUtils.clamp(state.lookPitch + dy * sensitivity * 0.75, -0.25, 0.85);
  }
});

function endLookDrag(e) {
  if (!state.isDraggingLook) return;
  state.isDraggingLook = false;
  canvasEl.style.cursor = 'grab';
  if (e && canvasEl.hasPointerCapture(e.pointerId)) {
    canvasEl.releasePointerCapture(e.pointerId);
  }
}

canvasEl.addEventListener('pointerup', endLookDrag);
canvasEl.addEventListener('pointercancel', endLookDrag);

canvasEl.addEventListener('wheel', (e) => {
  if (state.cameraMode !== 'follow') return;
  e.preventDefault();
  state.followZoom = THREE.MathUtils.clamp(state.followZoom + e.deltaY * 0.03, 12, 110);
}, { passive: false });

canvasEl.addEventListener('dblclick', () => {
  if (state.cameraMode === 'follow' || state.cameraMode === 'pov') {
    resetFreeLook();
  }
});

function jumpToCheckpoint(checkpointId) {
  const cp = activeRoute.checkpoints[checkpointId];
  if (!cp) return;
  state.distanceM = cp.distM;
  if (state.cameraMode === 'map') {
    controls.target.set(cp.position.x, 0, cp.position.z);
    camera.position.set(cp.position.x, 420, cp.position.z + 280);
    controls.update();
  } else {
    snapCameraNextFrame = true;
  }
  updateHUD(peloton.update(activeRoute, state.distanceM));
}

const upAxis = new THREE.Vector3(0, 1, 0);

function updateCamera(riderState, dt) {
  if (state.cameraMode === 'map') {
    controls.update();
    return;
  }

  const pos = riderState.position;
  const tan = riderState.tangent;
  const targetPos = new THREE.Vector3();
  const targetLook = new THREE.Vector3();

  if (state.cameraMode === 'follow') {
    const baseElevation = 0.44;
    const pitch = THREE.MathUtils.clamp(baseElevation + state.lookPitch, 0.12, 1.25);
    const horizDist = Math.cos(pitch) * state.followZoom;
    const vertDist = Math.sin(pitch) * state.followZoom + 2.0;

    const backDir = tan.clone().negate().applyAxisAngle(upAxis, state.lookYaw);
    targetPos
      .copy(pos)
      .addScaledVector(backDir, horizDist)
      .add(new THREE.Vector3(0, vertDist, 0));

    const aheadWeight = Math.max(0, Math.cos(state.lookYaw));
    targetLook
      .copy(pos)
      .addScaledVector(tan, 18 * aheadWeight)
      .add(new THREE.Vector3(0, 2.2, 0));
  } else if (state.cameraMode === 'pov') {
    targetPos
      .copy(pos)
      .addScaledVector(tan, 1.1)
      .add(new THREE.Vector3(0, 3.1, 0));

    const lookDir = tan.clone().applyAxisAngle(upAxis, state.lookYaw).normalize();
    const pitchY = Math.sin(state.lookPitch) * 35;
    const horizScale = Math.cos(state.lookPitch) * 35;
    targetLook
      .copy(targetPos)
      .addScaledVector(lookDir, horizScale)
      .add(new THREE.Vector3(0, pitchY - 0.8, 0));
  } else if (state.cameraMode === 'orbit') {
    state.orbitAngle += dt * 0.35;
    const radius = 56;
    targetPos.set(
      pos.x + Math.cos(state.orbitAngle) * radius,
      26,
      pos.z + Math.sin(state.orbitAngle) * radius
    );
    targetLook.set(pos.x, 3, pos.z);
  }

  if (snapCameraNextFrame) {
    smoothCamPos.copy(targetPos);
    smoothLookAt.copy(targetLook);
    snapCameraNextFrame = false;
  } else {
    const speed = state.isDraggingLook ? 22 : (state.cameraMode === 'pov' ? 14 : 7.5);
    const lerpFactor = 1 - Math.exp(-dt * speed);
    smoothCamPos.lerp(targetPos, lerpFactor);
    smoothLookAt.lerp(targetLook, lerpFactor);
  }

  camera.position.copy(smoothCamPos);
  camera.lookAt(smoothLookAt);
}

// ============================================================================
// 4. Synchronized 2D Mini-Map (Auto-fitted to active 5KM or 10KM route)
// ============================================================================
const minimapCanvas = document.getElementById('minimap-canvas');
const mmCtx = minimapCanvas.getContext('2d');
let mmBounds = { minX: 0, maxX: 1, minZ: 0, maxZ: 1 };

function computeMinimapBounds(route) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const pt of route.densePoints) {
    if (pt.position.x < minX) minX = pt.position.x;
    if (pt.position.x > maxX) maxX = pt.position.x;
    if (pt.position.z < minZ) minZ = pt.position.z;
    if (pt.position.z > maxZ) maxZ = pt.position.z;
  }
  const pad = 220;
  mmBounds = { minX: minX - pad, maxX: maxX + pad, minZ: minZ - pad, maxZ: maxZ + pad };
}

function worldToMinimap(x, z) {
  const w = minimapCanvas.width;
  const h = minimapCanvas.height;
  const spanX = mmBounds.maxX - mmBounds.minX;
  const spanZ = mmBounds.maxZ - mmBounds.minZ;
  const scale = Math.min((w - 16) / spanX, (h - 16) / spanZ);
  const offsetX = (w - spanX * scale) * 0.5;
  const offsetY = (h - spanZ * scale) * 0.5;
  return {
    x: offsetX + (x - mmBounds.minX) * scale,
    y: offsetY + (z - mmBounds.minZ) * scale
  };
}

function drawMinimap(riderState) {
  if (!state.showMinimap) return;
  const w = minimapCanvas.width;
  const h = minimapCanvas.height;

  mmCtx.fillStyle = '#b9dcf4';
  mmCtx.fillRect(0, 0, w, h);

  // Land polygon (east of Roxas coastline)
  const cTop = worldToMinimap(toWorld(-750, -35).x, toWorld(-750, -35).z);
  const cBot = worldToMinimap(toWorld(2550, -35).x, toWorld(2550, -35).z);
  mmCtx.fillStyle = '#ebe8df';
  mmCtx.beginPath();
  mmCtx.moveTo(cTop.x, 0);
  mmCtx.lineTo(w, 0);
  mmCtx.lineTo(w, h);
  mmCtx.lineTo(cBot.x, h);
  mmCtx.closePath();
  mmCtx.fill();

  // Quirino Grandstand peninsula
  const p1 = worldToMinimap(toWorld(-360, -300).x, toWorld(-360, -300).z);
  const p2 = worldToMinimap(toWorld(-360, 0).x, toWorld(-360, 0).z);
  const p3 = worldToMinimap(toWorld(140, 0).x, toWorld(140, 0).z);
  const p4 = worldToMinimap(toWorld(140, -300).x, toWorld(140, -300).z);
  mmCtx.beginPath();
  mmCtx.moveTo(p1.x, p1.y);
  mmCtx.lineTo(p2.x, p2.y);
  mmCtx.lineTo(p3.x, p3.y);
  mmCtx.lineTo(p4.x, p4.y);
  mmCtx.closePath();
  mmCtx.fill();

  // Rizal Park green patch
  const r1 = worldToMinimap(toWorld(-240, 20).x, toWorld(-240, 20).z);
  const r2 = worldToMinimap(toWorld(-240, 520).x, toWorld(-240, 520).z);
  const r3 = worldToMinimap(toWorld(140, 520).x, toWorld(140, 520).z);
  const r4 = worldToMinimap(toWorld(140, 20).x, toWorld(140, 20).z);
  mmCtx.fillStyle = '#9cd38a';
  mmCtx.beginPath();
  mmCtx.moveTo(r1.x, r1.y);
  mmCtx.lineTo(r2.x, r2.y);
  mmCtx.lineTo(r3.x, r3.y);
  mmCtx.lineTo(r4.x, r4.y);
  mmCtx.closePath();
  mmCtx.fill();

  // Intramuros green golf course (visible in 10KM & 21KM overview)
  if (activeRoute.id === '10km' || activeRoute.id === '21km') {
    const g1 = worldToMinimap(toWorld(S_KATIGBAK - 165, 90).x, toWorld(S_KATIGBAK - 165, 90).z);
    const g2 = worldToMinimap(toWorld(S_KATIGBAK - 165, PB_FORK_OFFSET).x, toWorld(S_KATIGBAK - 165, PB_FORK_OFFSET).z);
    const g3 = worldToMinimap(toWorld(S_KATIGBAK - 25, PB_FORK_OFFSET).x, toWorld(S_KATIGBAK - 25, PB_FORK_OFFSET).z);
    const g4 = worldToMinimap(toWorld(S_KATIGBAK - 25, 90).x, toWorld(S_KATIGBAK - 25, 90).z);
    mmCtx.fillStyle = '#89cc7a';
    mmCtx.beginPath();
    mmCtx.moveTo(g1.x, g1.y);
    mmCtx.lineTo(g2.x, g2.y);
    mmCtx.lineTo(g3.x, g3.y);
    mmCtx.lineTo(g4.x, g4.y);
    mmCtx.closePath();
    mmCtx.fill();
  }

  // Pasig River stripe (visible in 21KM overview)
  if (activeRoute.id === '21km') {
    const pr1 = worldToMinimap(toWorld(-1190, -80).x, toWorld(-1190, -80).z);
    const pr2 = worldToMinimap(toWorld(-1190, 950).x, toWorld(-1190, 950).z);
    mmCtx.strokeStyle = '#7abde8';
    mmCtx.lineWidth = 8;
    mmCtx.beginPath();
    mmCtx.moveTo(pr1.x, pr1.y);
    mmCtx.lineTo(pr2.x, pr2.y);
    mmCtx.stroke();
  }

  // Active Route Line (Yellow for 5KM, Red for 10KM)
  mmCtx.strokeStyle = activeRoute.minimapBorderColor;
  mmCtx.lineWidth = 4.6;
  mmCtx.lineCap = 'round';
  mmCtx.lineJoin = 'round';
  mmCtx.beginPath();
  activeRoute.densePoints.forEach((pt, idx) => {
    const p = worldToMinimap(pt.position.x, pt.position.z);
    if (idx === 0) mmCtx.moveTo(p.x, p.y);
    else mmCtx.lineTo(p.x, p.y);
  });
  mmCtx.stroke();

  mmCtx.strokeStyle = activeRoute.minimapLineColor;
  mmCtx.lineWidth = 2.8;
  mmCtx.stroke();

  // Key Checkpoint Dots
  for (const d of activeRoute.minimapDots) {
    const cp = activeRoute.checkpoints[d.id];
    if (!cp) continue;
    const p = worldToMinimap(cp.position.x, cp.position.z);
    mmCtx.fillStyle = d.color;
    mmCtx.beginPath();
    mmCtx.arc(p.x, p.y, 3.8, 0, Math.PI * 2);
    mmCtx.fill();
    mmCtx.strokeStyle = '#ffffff';
    mmCtx.lineWidth = 1.4;
    mmCtx.stroke();
  }

  // Live Cyclist Position Dot
  const rp = worldToMinimap(riderState.position.x, riderState.position.z);
  mmCtx.fillStyle = '#0f1d4a';
  mmCtx.beginPath();
  mmCtx.arc(rp.x, rp.y, 5.2, 0, Math.PI * 2);
  mmCtx.fill();
  mmCtx.strokeStyle = '#ffd426';
  mmCtx.lineWidth = 2;
  mmCtx.stroke();
}

// ============================================================================
// 5. Dynamic Route UI Rendering & Switcher
// ============================================================================
const elRouteTitle = document.getElementById('header-route-title');
const elRouteSubtitle = document.getElementById('header-route-subtitle');
const elPanelMeta = document.getElementById('panel-event-meta');
const elGuideContent = document.getElementById('route-guide-content');
const elLegendLine = document.getElementById('legend-route-line');
const elLegendLabel = document.getElementById('legend-route-label');
const elLegendHyd = document.getElementById('legend-hydration-label');
const elMinimapTitle = document.getElementById('minimap-title');
const elScrubberTicks = document.getElementById('scrubber-ticks');
const elScrubberEnd = document.getElementById('scrubber-end-label');

const elDistance = document.getElementById('tele-distance');
const elProgress = document.getElementById('tele-progress');
const elHeading = document.getElementById('tele-heading');
const elTime = document.getElementById('tele-time');
const elSegmentText = document.getElementById('current-segment-text');
const elSegmentDot = document.getElementById('segment-dot');
const elScrubber = document.getElementById('distance-scrubber');
const elCompassNeedle = document.getElementById('compass-needle');
const btnPlay = document.getElementById('btn-play');
const elPlayIcon = document.getElementById('play-icon');
const elPlayLabel = document.getElementById('play-label');
const routePanel = document.getElementById('route-panel');
const minimapCard = document.getElementById('minimap-card');

function renderRouteUI(route) {
  elRouteTitle.textContent = route.title;
  elRouteSubtitle.textContent = route.subtitle;
  elMinimapTitle.textContent = route.minimapTitle;

  // Legend
  elLegendLine.style.background = route.legendLineColor;
  elLegendLine.style.borderColor = route.legendLineBorder;
  elLegendLabel.textContent = route.legendLineLabel;
  elLegendHyd.textContent = route.legendHydrationLabel;

  // Event meta chips
  elPanelMeta.innerHTML = route.meta
    .map((m) => `<div class="meta-chip"><span>${m.label}</span><strong>${m.value}</strong></div>`)
    .join('');

  // Route guide groups & clickable steps
  elGuideContent.innerHTML = route.guideGroups
    .map((grp) => {
      const itemsHtml = grp.items
        .map((it) => {
          const itemCls =
            it.type === 'hydration'
              ? 'step-item hydration-item'
              : it.type === 'finish'
              ? 'step-item finish-item'
              : 'step-item';
          const numCls =
            it.type === 'hydration'
              ? 'step-num step-num-hydration'
              : it.type === 'finish'
              ? 'step-num step-num-finish'
              : 'step-num';
          return `
            <li class="${itemCls}" data-checkpoint="${it.checkpoint}">
              <span class="${numCls}">${it.badge}</span>
              <div class="step-body">
                <div class="step-text">${it.text}</div>
                <div class="step-meta">${it.meta}</div>
              </div>
            </li>`;
        })
        .join('');
      return `
        <div class="route-group-label">${grp.heading}</div>
        <ul class="step-list">${itemsHtml}</ul>`;
    })
    .join('');

  elGuideContent.querySelectorAll('.step-item').forEach((item) => {
    item.addEventListener('click', () => jumpToCheckpoint(item.dataset.checkpoint));
  });

  // Scrubber range & ticks
  elScrubber.max = String(Math.round(route.totalLength));
  elScrubber.value = '0';
  elScrubberEnd.textContent = `${route.displayKm.toFixed(1)} KM`;
  elScrubberTicks.innerHTML = route.scrubberTicks
    .map((t) => `<span class="tick ${t.cls}" style="left: ${t.pct.toFixed(1)}%;" title="${t.title}"></span>`)
    .join('');
}

function selectRoute(routeId) {
  const nextRoute = ROUTES[routeId];
  if (!nextRoute) return;
  activeRoute = nextRoute;

  document.querySelectorAll('.route-tab').forEach((tab) => {
    const isAct = tab.dataset.route === routeId;
    tab.classList.toggle('active', isAct);
    tab.setAttribute('aria-selected', String(isAct));
  });

  // Swap 3D ribbon, markers, labels, mini-map bounds, and HUD
  environment.setActiveRoute(activeRoute);
  markers.setActiveRoute(activeRoute);
  computeMinimapBounds(activeRoute);
  renderRouteUI(activeRoute);

  state.distanceM = 0;
  state.playing = true;
  lastActiveCheckpoint = null;
  resetFreeLook();
  updatePlayButton();

  if (state.cameraMode === 'map') {
    frameMapOverview();
  } else {
    snapCameraNextFrame = true;
  }

  const riderState = peloton.update(activeRoute, 0);
  updateHUD(riderState);
  drawMinimap(riderState);
}

// ============================================================================
// 6. HUD Updates & Event Wiring
// ============================================================================
function updatePlayButton() {
  elPlayIcon.textContent = state.playing ? '⏸' : '▶';
  elPlayLabel.textContent = state.playing ? 'Pause' : 'Play';
}

let lastActiveCheckpoint = null;

function updateHUD(riderState) {
  const km = riderState.displayKmValue.toFixed(2);
  const totalKmStr = activeRoute.displayKm.toFixed(2);
  const pct = Math.round((riderState.distance / activeRoute.totalLength) * 100);
  const estSec = Math.round((riderState.displayKmValue * 1000) / BASE_SPEED_MPS);
  const mins = String(Math.floor(estSec / 60)).padStart(2, '0');
  const secs = String(estSec % 60).padStart(2, '0');

  elDistance.innerHTML = `${km} <small>/ ${totalKmStr} km</small>`;
  elProgress.textContent = `${pct}%`;
  elHeading.textContent = `${riderState.compassDir} ${Math.round(riderState.bearingDeg)}°`;
  elTime.textContent = `${mins}:${secs}`;
  elSegmentText.textContent = riderState.segmentText;
  elSegmentDot.style.background = riderState.segmentColor;
  elScrubber.value = Math.round(riderState.distance);

  if (riderState.activeCheckpoint !== lastActiveCheckpoint) {
    lastActiveCheckpoint = riderState.activeCheckpoint;
    document.querySelectorAll('.step-item').forEach((item) => {
      const isAct = item.dataset.checkpoint === riderState.activeCheckpoint;
      item.classList.toggle('active', isAct);
      if (isAct && !routePanel.classList.contains('collapsed')) {
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }

  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  const camYawDeg = THREE.MathUtils.radToDeg(Math.atan2(camDir.x, -camDir.z));
  elCompassNeedle.style.transform = `rotate(${-camYawDeg}deg)`;
}

document.querySelectorAll('.route-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    if (tab.dataset.route !== activeRoute.id) {
      selectRoute(tab.dataset.route);
    }
  });
});

btnPlay.addEventListener('click', () => {
  if (state.distanceM >= activeRoute.totalLength - 1) {
    state.distanceM = 0;
  }
  state.playing = !state.playing;
  updatePlayButton();
});

document.getElementById('btn-reset').addEventListener('click', () => {
  state.distanceM = 0;
  state.playing = true;
  snapCameraNextFrame = true;
  updatePlayButton();
});

document.querySelectorAll('.speed-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.speedMult = Number(btn.dataset.speed);
    document.querySelectorAll('.speed-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

document.querySelectorAll('.cam-btn').forEach((btn) => {
  btn.addEventListener('click', () => setCameraMode(btn.dataset.cam));
});

elScrubber.addEventListener('input', (e) => {
  state.distanceM = Number(e.target.value);
  if (state.cameraMode !== 'map') snapCameraNextFrame = true;
});

document.getElementById('btn-toggle-panel').addEventListener('click', () => {
  routePanel.classList.toggle('collapsed');
});

const btnLabels = document.getElementById('btn-labels');
btnLabels.addEventListener('click', () => {
  state.showLabels = !state.showLabels;
  btnLabels.classList.toggle('active', state.showLabels);
  labelsLayer.classList.toggle('hidden', !state.showLabels);
});

const btnBuildings = document.getElementById('btn-buildings');
btnBuildings.addEventListener('click', () => {
  state.showBuildings = !state.showBuildings;
  btnBuildings.classList.toggle('active', state.showBuildings);
  environment.cityGroup.visible = state.showBuildings;
});

const btnMinimap = document.getElementById('btn-minimap');
btnMinimap.addEventListener('click', () => {
  state.showMinimap = !state.showMinimap;
  btnMinimap.classList.toggle('active', state.showMinimap);
  minimapCard.classList.toggle('hidden', !state.showMinimap);
});

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space') {
    e.preventDefault();
    btnPlay.click();
  } else if (e.key.toLowerCase() === 'r') {
    document.getElementById('btn-reset').click();
  } else if (e.key === '1') {
    setCameraMode('follow');
  } else if (e.key === '2') {
    setCameraMode('pov');
  } else if (e.key === '3') {
    setCameraMode('map');
  } else if (e.key === '4') {
    setCameraMode('orbit');
  } else if (e.key.toLowerCase() === 'c') {
    resetFreeLook();
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================================================
// 7. Initialize & Main Animation Loop
// ============================================================================
computeMinimapBounds(activeRoute);
renderRouteUI(activeRoute);
updatePlayButton();

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.getElapsedTime();

  if (state.playing) {
    state.distanceM += BASE_SPEED_MPS * state.speedMult * dt;
    if (state.distanceM >= activeRoute.totalLength) {
      state.distanceM = activeRoute.totalLength;
      state.playing = false;
      updatePlayButton();
    }
  }

  environment.update(elapsed);
  const riderState = peloton.update(activeRoute, state.distanceM);
  updateCamera(riderState, dt);
  updateHUD(riderState);
  drawMinimap(riderState);

  renderer.render(scene, camera);

  if (state.showLabels) {
    markers.updateLabels(camera, window.innerWidth, window.innerHeight);
  }
}

animate();
