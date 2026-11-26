import * as THREE from 'three';
import {
  toWorld,
  LANE_OFFSET_SB,
  LANE_OFFSET_NB,
  S_START,
  S_QUIRINO_UTURN,
  S_UTURN,
  S_KATIGBAK,
  S_ANDA_CIRCLE,
  KATIGBAK_WEST_OFFSET,
  PB_LANE_OUT_S,
  PB_LANE_RET_S,
  buildFilletedPath,
  bearingAndCompass
} from './routeCommon.js';
import { ROUTE_5KM } from './route5km.js';

/**
 * FUNRIDE PH 2026 — OFFICIAL 21KM CYCLING ROUTE GEOMETRY
 * Cleanly aligned to Jones Bridge, Binondo–Intramuros Bridge (with straight approach
 * leads so lanes never clip parapets), Anda Circle roundabout (14.5m loop around 6.5m island),
 * and Quirino Ave / P. Ocampo U-turns.
 */

// Exact bridge centerlines & perpendicular lane offsets
const JONES_SOUTH = toWorld(-1095, 520);
const JONES_NORTH = toWorld(-1305, 445);
const jonesDir = JONES_NORTH.clone().sub(JONES_SOUTH).normalize();
const jonesRight = new THREE.Vector3(-jonesDir.z, 0, jonesDir.x).normalize();

const BI_SOUTH = toWorld(-1105, 240);
const BI_NORTH = toWorld(-1315, 200);
const biDir = BI_NORTH.clone().sub(BI_SOUTH).normalize();
const biRight = new THREE.Vector3(-biDir.z, 0, biDir.x).normalize();

// Exact BYD Hydration Station anchor on the straight of Padre Burgos Ave (Step 15, west/plaza side)
const bydRoadA = toWorld(-880, 580);
const bydRoadB = toWorld(-590, 665);
const bydRoadDir = bydRoadB.clone().sub(bydRoadA).normalize();
const bydWestNormal = new THREE.Vector3(-bydRoadDir.z, 0, bydRoadDir.x).normalize(); // points west/right of Step 15 SB lane
const bydCenterOnRoad = bydRoadA.clone().lerp(bydRoadB, 0.55);
const bydStationPos = bydCenterOnRoad.clone().addScaledVector(bydWestNormal, 20.5);

export const LANDMARKS_21KM = {
  jonesSouth: JONES_SOUTH,
  jonesNorth: JONES_NORTH,
  biBridgeSouth: BI_SOUTH,
  biBridgeNorth: BI_NORTH,
  binondoChurch: toWorld(-1820, 195),
  hydJones: toWorld(-995, 576),
  hydJonesYaw: Math.atan2(jonesDir.x, jonesDir.z),
  bydStation: bydStationPos,
  bydStationYaw: Math.atan2(bydRoadDir.x, bydRoadDir.z),
  andaCircle: toWorld(S_ANDA_CIRCLE, 0),
  quirinoUturn: toWorld(S_QUIRINO_UTURN, 0)
};

function build21KMRoute() {
  // Symmetrical NB (+6.5m right) & SB (-6.5m left) lanes cleanly inside each 26m-wide bridge deck
  // Plus 26m straight approach/exit leads so turns complete BEFORE entering bridge parapets!
  const jonesNbLeadS = JONES_SOUTH.clone().addScaledVector(jonesDir, -26).addScaledVector(jonesRight, 6.5);
  const jonesNbS = JONES_SOUTH.clone().addScaledVector(jonesRight, 6.5);
  const jonesNbN = JONES_NORTH.clone().addScaledVector(jonesRight, 6.5);
  const jonesNbLeadN = JONES_NORTH.clone().addScaledVector(jonesDir, 26).addScaledVector(jonesRight, 6.5);

  const jonesSbLeadN = JONES_NORTH.clone().addScaledVector(jonesDir, 26).addScaledVector(jonesRight, -6.5);
  const jonesSbN = JONES_NORTH.clone().addScaledVector(jonesRight, -6.5);
  const jonesSbS = JONES_SOUTH.clone().addScaledVector(jonesRight, -6.5);
  const jonesSbLeadS = JONES_SOUTH.clone().addScaledVector(jonesDir, -26).addScaledVector(jonesRight, -6.5);

  const biNbLeadS = BI_SOUTH.clone().addScaledVector(biDir, -28).addScaledVector(biRight, 6.5);
  const biNbS = BI_SOUTH.clone().addScaledVector(biRight, 6.5);
  const biNbN = BI_NORTH.clone().addScaledVector(biRight, 6.5);
  const biNbLeadN = BI_NORTH.clone().addScaledVector(biDir, 28).addScaledVector(biRight, 6.5);

  const biSbLeadN = BI_NORTH.clone().addScaledVector(biDir, 28).addScaledVector(biRight, -6.5);
  const biSbN = BI_NORTH.clone().addScaledVector(biRight, -6.5);
  const biSbS = BI_SOUTH.clone().addScaledVector(biRight, -6.5);
  const biSbLeadS = BI_SOUTH.clone().addScaledVector(biDir, -28).addScaledVector(biRight, -6.5);

  const waypoints = [
    // --- SECTION A: KM 0 -> P. Ocampo U-Turn -> Padre Burgos -> Jones Bridge -> Binondo ---
    { pos: toWorld(S_START, LANE_OFFSET_SB), tag: 'step1' },
    { pos: toWorld(1040, LANE_OFFSET_SB), tag: 'step2' },
    // Step 3: P. Ocampo U-turn
    { pos: toWorld(S_UTURN + 8, LANE_OFFSET_SB), radius: 8.5 },
    { pos: toWorld(S_UTURN + 8, 0), radius: 8.5, tag: 'step3' },
    { pos: toWorld(S_UTURN + 8, LANE_OFFSET_NB), radius: 8.5 },
    { pos: toWorld(1040, LANE_OFFSET_NB), tag: 'step4' },

    // Step 5-6: Right turn onto Padre Burgos Ave, curving north around Intramuros toward Lawton
    { pos: toWorld(PB_LANE_OUT_S, LANE_OFFSET_NB), radius: 18, tag: 'step5' },
    { pos: toWorld(PB_LANE_OUT_S, 460), radius: 75 },
    { pos: toWorld(-325, 675), radius: 105, tag: 'step6' },
    { pos: toWorld(-590, 735), radius: 105 },
    { pos: toWorld(-985, 565), radius: 36, tag: 'hyd21k' },

    // Step 7-8: Jones Bridge Northbound (straight lead -> deck -> straight exit)
    { pos: jonesNbLeadS, radius: 14 },
    { pos: jonesNbS, radius: 10, tag: 'step7' },
    { pos: jonesNbN, radius: 10 },
    { pos: jonesNbLeadN, radius: 14, tag: 'step8' },

    // Step 9-11: Quintin Paredes -> Binondo Church -> Reina Regente -> Juan Luna
    { pos: toWorld(-1545, 340), radius: 26, tag: 'step9' },
    { pos: toWorld(-1755, 225), radius: 16, tag: 'step10' },
    { pos: toWorld(-1755, 160), radius: 16, tag: 'step11' },

    // Step 12-14: Juan Luna -> Dasmariñas -> Jones Bridge Southbound (straight lead -> deck -> straight exit)
    { pos: toWorld(-1535, 230), radius: 20, tag: 'step12' },
    { pos: toWorld(-1375, 290), radius: 14, tag: 'step13' },
    { pos: jonesSbLeadN, radius: 14, tag: 'step14' },
    { pos: jonesSbN, radius: 10 },
    { pos: jonesSbS, radius: 10 },
    { pos: jonesSbLeadS, radius: 14 },

    // --- SECTION B: INTRAMUROS – BINONDO LOOP (Steps 15–27) ---
    { pos: toWorld(-880, 580), radius: 55, tag: 'step15' },
    { pos: bydCenterOnRoad, radius: 40, tag: 'bydHydration' },
    { pos: toWorld(-590, 665), radius: 90 },
    { pos: toWorld(-385, 555), radius: 45, tag: 'step16' },
    { pos: toWorld(-430, 455), radius: 18, tag: 'step17' },
    { pos: toWorld(-730, 495), radius: 34 },
    { pos: toWorld(-985, 480), radius: 22, tag: 'step18' },
    // Step 19-20: Left onto Riverside Drive -> straight approach onto Intramuros–Binondo Bridge NB
    { pos: toWorld(-1045, 445), radius: 16, tag: 'step19' },
    { pos: biNbLeadS, radius: 14 },
    { pos: biNbS, radius: 8, tag: 'step20' },
    { pos: biNbN, radius: 8 },
    { pos: biNbLeadN, radius: 14 },

    // Step 21-24: Santo Cristo -> San Fernando -> Madrid -> straight approach onto Binondo–Intramuros Bridge SB
    { pos: toWorld(-1555, 175), radius: 20, tag: 'step21' },
    { pos: toWorld(-1680, 145), radius: 16, tag: 'step22' },
    { pos: toWorld(-1570, -25), radius: 16, tag: 'step23' },
    { pos: toWorld(-1385, -15), radius: 16 },
    { pos: biSbLeadN, radius: 14, tag: 'step24' },
    { pos: biSbN, radius: 8 },
    { pos: biSbS, radius: 8 },
    { pos: biSbLeadS, radius: 14, tag: 'step25' },

    // Step 25-27: Andres Soriano Ave -> General Luna St -> Padre Burgos Ave
    { pos: toWorld(-975, 90), radius: 16, tag: 'step26' },
    { pos: toWorld(-680, 260), radius: 22, tag: 'step27' },
    { pos: toWorld(PB_LANE_RET_S - 4, 470), radius: 18, tag: 'step28' },

    // --- SECTION C: BONIFACIO DRIVE – FINAL RETURN TO QUIRINO GRANDSTAND (Steps 28–36) ---
    { pos: toWorld(PB_LANE_RET_S - 4, 240), radius: 18, tag: 'step29' },
    { pos: toWorld(PB_LANE_RET_S - 4, LANE_OFFSET_NB), radius: 18, tag: 'step30' },
    { pos: toWorld(-680, LANE_OFFSET_NB), tag: 'step31' },

    // Step 32: Clean wide roundabout loop AROUND the Anda Circle Monument (15.5m radius around 6.5m island!)
    { pos: toWorld(S_ANDA_CIRCLE + 22, LANE_OFFSET_NB), radius: 12 },
    { pos: toWorld(S_ANDA_CIRCLE, 15.5), radius: 14 },
    { pos: toWorld(S_ANDA_CIRCLE - 15.5, 0), radius: 14, tag: 'step32' },
    { pos: toWorld(S_ANDA_CIRCLE, -15.5), radius: 14 },
    { pos: toWorld(S_ANDA_CIRCLE + 22, LANE_OFFSET_SB), radius: 12 },

    // Step 33-34: Southbound Bonifacio Dr & Roxas Blvd -> Final U-turn at Quirino Ave
    { pos: toWorld(580, LANE_OFFSET_SB), tag: 'step33' },
    { pos: toWorld(S_QUIRINO_UTURN + 8, LANE_OFFSET_SB), radius: 8.5 },
    { pos: toWorld(S_QUIRINO_UTURN + 8, 0), radius: 8.5, tag: 'step34' },
    { pos: toWorld(S_QUIRINO_UTURN + 8, LANE_OFFSET_NB), radius: 8.5 },

    // Step 35-36: Northbound Roxas Blvd -> Katigbak Drive -> FINISH LINE
    { pos: toWorld(640, LANE_OFFSET_NB), tag: 'step35' },
    { pos: toWorld(S_KATIGBAK, LANE_OFFSET_NB), radius: 18, tag: 'step36' },
    { pos: toWorld(S_KATIGBAK, KATIGBAK_WEST_OFFSET), radius: 18 },
    { pos: toWorld(ROUTE_5KM.finalS, KATIGBAK_WEST_OFFSET), tag: 'finish' }
  ];

  const { segments, tagDistances, totalLength } = buildFilletedPath(waypoints, 18);

  let acc = 0;
  const cumSegments = segments.map((seg) => {
    const startDist = acc;
    acc += seg.length;
    return { ...seg, startDist, endDist: acc };
  });

  const displayKm = 21.0;

  const milestones = [
    { id: 'step1', text: 'Step 1 · Start at KM 0, Quirino Grandstand', color: '#0d9488' },
    { id: 'step2', text: 'Step 2 · Roxas Boulevard Southbound', color: '#1d4ed8' },
    { id: 'step3', text: 'Step 3 · U-Turn at P. Ocampo Street', color: '#0f172a' },
    { id: 'step4', text: 'Step 4 · Roxas Boulevard Northbound', color: '#1d4ed8' },
    { id: 'step5', text: 'Step 5 · Right Turn onto Padre Burgos Avenue', color: '#1d4ed8' },
    { id: 'step6', text: 'Step 6 · Padre Burgos Avenue towards Lawton', color: '#1d4ed8' },
    { id: 'hyd21k', text: 'Hydration Station · 21KM (By Jones Bridge)', color: '#0284c7' },
    { id: 'step7', text: 'Step 7 · Crossing Jones Bridge Northbound', color: '#1d4ed8' },
    { id: 'step8', text: 'Step 8 · Entering Binondo Chinatown', color: '#1d4ed8' },
    { id: 'step9', text: 'Step 9 · Quintin Paredes St near Binondo Church', color: '#1d4ed8' },
    { id: 'step10', text: 'Step 10 · Left onto Reina Regente St (Binondo Church)', color: '#1d4ed8' },
    { id: 'step11', text: 'Step 11 · Left onto Juan Luna Street', color: '#1d4ed8' },
    { id: 'step12', text: 'Step 12 · Juan Luna St towards Dasmariñas St', color: '#1d4ed8' },
    { id: 'step13', text: 'Step 13 · Left onto Dasmariñas Street', color: '#1d4ed8' },
    { id: 'step14', text: 'Step 14 · Right onto Jones Bridge Southbound', color: '#1d4ed8' },
    { id: 'step15', text: 'Step 15 · Southbound along Padre Burgos Ave', color: '#1d4ed8' },
    { id: 'bydHydration', text: 'BYD Recharging Hub · Hydration Station (National Museum)', color: '#0284c7' },
    { id: 'step16', text: 'Step 16 · Right onto General Luna St (Intramuros)', color: '#1d4ed8' },
    { id: 'step17', text: 'Step 17 · Right onto Muralla Street (Intramuros)', color: '#1d4ed8' },
    { id: 'step18', text: 'Step 18 · Right onto Lawton Road', color: '#1d4ed8' },
    { id: 'step19', text: 'Step 19 · Left onto Riverside Drive (Pasig River)', color: '#1d4ed8' },
    { id: 'step20', text: 'Step 20 · Crossing Intramuros–Binondo Bridge NB', color: '#1d4ed8' },
    { id: 'step21', text: 'Step 21 · Santo Cristo Street, Binondo', color: '#1d4ed8' },
    { id: 'step22', text: 'Step 22 · Left onto San Fernando Street', color: '#1d4ed8' },
    { id: 'step23', text: 'Step 23 · Left onto Madrid Street', color: '#1d4ed8' },
    { id: 'step24', text: 'Step 24 · Crossing Binondo–Intramuros Bridge SB', color: '#1d4ed8' },
    { id: 'step25', text: 'Step 25 · Right onto Andres Soriano Ave, Intramuros', color: '#1d4ed8' },
    { id: 'step26', text: 'Step 26 · Left onto General Luna St (Intramuros)', color: '#1d4ed8' },
    { id: 'step27', text: 'Step 27 · General Luna St towards Padre Burgos Ave', color: '#1d4ed8' },
    { id: 'step28', text: 'Step 28 · Right onto Padre Burgos Ave Westbound', color: '#1d4ed8' },
    { id: 'step29', text: 'Step 29 · Padre Burgos Ave towards Roxas Blvd', color: '#1d4ed8' },
    { id: 'step30', text: 'Step 30 · Right onto Bonifacio Drive Northbound', color: '#1d4ed8' },
    { id: 'step31', text: 'Step 31 · Bonifacio Drive towards Anda Circle', color: '#1d4ed8' },
    { id: 'step32', text: 'Step 32 · U-Turn at Anda Circle', color: '#0f172a' },
    { id: 'step33', text: 'Step 33 · Bonifacio Dr & Roxas Blvd Southbound', color: '#1d4ed8' },
    { id: 'step34', text: 'Step 34 · Final U-Turn at Quirino Avenue', color: '#0f172a' },
    { id: 'step35', text: 'Step 35 · Roxas Boulevard Northbound (Final Push)', color: '#1d4ed8' },
    { id: 'step36', text: 'Step 36 · Left onto Katigbak Dr → Quirino Grandstand', color: '#1d4ed8' },
    { id: 'finish', text: 'FINISH LINE · Quirino Grandstand (21.00 km Complete!)', color: '#dc2626' }
  ].map((m) => ({ ...m, distM: tagDistances[m.id] ?? 0 }));

  function sample(distM) {
    const d = THREE.MathUtils.clamp(distM, 0, totalLength);
    let seg = cumSegments[cumSegments.length - 1];
    for (let i = 0; i < cumSegments.length; i++) {
      if (d <= cumSegments[i].endDist) {
        seg = cumSegments[i];
        break;
      }
    }
    const localD = THREE.MathUtils.clamp(d - seg.startDist, 0, seg.length);
    const { position, tangent } = seg.sample(localD);
    const { bearingDeg, compassDir } = bearingAndCompass(tangent);

    let active = milestones[0];
    if (d >= totalLength - 22) {
      active = milestones[milestones.length - 1];
    } else {
      for (let i = milestones.length - 2; i >= 0; i--) {
        if (d >= milestones[i].distM - 30) {
          active = milestones[i];
          break;
        }
      }
    }

    return {
      distance: d,
      displayKmValue: (d / totalLength) * displayKm,
      position,
      tangent,
      bearingDeg,
      compassDir,
      activeCheckpoint: active.id,
      segmentText: active.text,
      segmentColor: active.color
    };
  }

  const densePoints = [];
  for (let d = 0; d <= totalLength; d += 5) {
    densePoints.push(sample(d));
  }
  if (densePoints[densePoints.length - 1].distance < totalLength) {
    densePoints.push(sample(totalLength));
  }

  const fmtKm = (id) => `${(((tagDistances[id] ?? 0) / totalLength) * displayKm).toFixed(2)} km`;

  const checkpoints = {};
  for (const m of milestones) {
    checkpoints[m.id] = {
      id: m.id,
      distM: m.distM,
      position: sample(m.distM).position,
      title: m.text
    };
  }

  const stepItem = (num, text) => ({
    checkpoint: `step${num}`,
    badge: String(num),
    type: 'step',
    text,
    meta: `${fmtKm(`step${num}`)}`
  });

  return {
    id: '21km',
    shortLabel: '21KM',
    title: 'OFFICIAL 21KM CYCLING ROUTE',
    subtitle: 'Manila – Roxas Boulevard – Binondo – Intramuros – Bonifacio Drive – Roxas Boulevard – Quirino Grandstand',
    minimapTitle: '21KM ROUTE MAP',
    displayKm,
    totalLength,
    ribbonColor: 0x2563eb,
    ribbonBorderColor: 0x1e3a8a,
    arrowColor: 0xffffff,
    minimapLineColor: '#2563eb',
    minimapBorderColor: '#1e3a8a',
    legendLineColor: '#2563eb',
    legendLineBorder: '#1e3a8a',
    legendLineLabel: '21KM route (royal blue path + arrows)',
    legendHydrationLabel: 'Hydration station (By Jones Bridge)',
    meta: [
      { label: 'VENUE', value: 'Quirino Grandstand' },
      { label: 'START', value: 'KM 0' },
      { label: 'U-TURNS', value: 'P. Ocampo · Anda · Quirino' },
      { label: 'HYDRATION', value: 'By Jones Bridge' }
    ],
    guideGroups: [
      {
        heading: 'A. STARTING POINT: KM 0 – QUIRINO GRANDSTAND',
        items: [
          stepItem(1, 'Start at KM 0, Quirino Grandstand.'),
          stepItem(2, 'Proceed straight along Roxas Boulevard, southbound.'),
          stepItem(3, 'Make a U-turn towards P. Ocampo Street.'),
          stepItem(4, 'Proceed straight along Roxas Boulevard, northbound.'),
          stepItem(5, 'Turn right to Padre Burgos Avenue.'),
          stepItem(6, 'Proceed straight along Padre Burgos Avenue towards Lawton.'),
          { checkpoint: 'hyd21k', badge: '💧', type: 'hydration', text: 'Hydration Station — 21KM (By Jones Bridge).', meta: `${fmtKm('hyd21k')} · Lawton / Jones Bridge` },
          stepItem(7, 'Continue straight towards Jones Bridge.'),
          stepItem(8, 'Proceed towards Binondo Chinatown.'),
          stepItem(9, 'Continue to Quintin Paredes Street, near Binondo Church.'),
          stepItem(10, 'Turn left to Reina Regente Street.'),
          stepItem(11, 'Turn left to Juan Luna Street.'),
          stepItem(12, 'Proceed straight towards Dasmariñas Street, Binondo.'),
          stepItem(13, 'Turn left onto Dasmariñas Street.'),
          stepItem(14, 'Turn right towards Jones Bridge, southbound.')
        ]
      },
      {
        heading: 'B. INTRAMUROS – BINONDO LOOP',
        items: [
          stepItem(15, 'Proceed straight towards Padre Burgos Avenue.'),
          { checkpoint: 'bydHydration', badge: '⚡', type: 'hydration', text: 'BYD Recharging Hub — Hydration Station (Padre Burgos / National Museum).', meta: `${fmtKm('bydHydration')} · V2L Powered Lights & Water Dispensers` },
          stepItem(16, 'Turn right to General Luna Street.'),
          stepItem(17, 'Turn right to Muralla Street.'),
          stepItem(18, 'Turn right to Lawton Road.'),
          stepItem(19, 'Turn left towards Riverside Drive.'),
          stepItem(20, 'Proceed straight towards the Intramuros–Binondo Bridge.'),
          stepItem(21, 'Continue straight towards Santo Cristo Street, Binondo.'),
          stepItem(22, 'Turn left to San Fernando Street.'),
          stepItem(23, 'Turn left to Madrid Street.'),
          stepItem(24, 'Proceed straight towards the Binondo–Intramuros Bridge.'),
          stepItem(25, 'Turn right to Andres Soriano Avenue, Intramuros.'),
          stepItem(26, 'Turn left to General Luna Street.'),
          stepItem(27, 'Proceed straight towards Padre Burgos Avenue.')
        ]
      },
      {
        heading: 'C. BONIFACIO DRIVE – FINAL RETURN TO QUIRINO GRANDSTAND',
        items: [
          stepItem(28, 'Turn right to Padre Burgos Avenue.'),
          stepItem(29, 'Proceed straight towards Roxas Boulevard.'),
          stepItem(30, 'Turn right to Bonifacio Drive.'),
          stepItem(31, 'Proceed straight towards Anda Circle.'),
          stepItem(32, 'Make a U-turn at Anda Circle.'),
          stepItem(33, 'Proceed straight along Roxas Boulevard, southbound.'),
          stepItem(34, 'Make the final U-turn towards Quirino Avenue.'),
          stepItem(35, 'Proceed straight along Roxas Boulevard, northbound.'),
          stepItem(36, 'Turn left to Katigbak Drive and proceed to the FINISH LINE at Quirino Grandstand.'),
          { checkpoint: 'finish', badge: '🏁', type: 'finish', text: 'FINISH LINE – QUIRINO GRANDSTAND', meta: '21.00 km · Katigbak Dr · Quirino Grandstand' }
        ]
      }
    ],
    scrubberTicks: [
      { pct: 0, cls: 'tick-start', title: 'KM 0 Start' },
      { pct: (tagDistances.step3 / totalLength) * 100, cls: 'tick-uturn', title: 'P. Ocampo U-Turn' },
      { pct: (tagDistances.hyd21k / totalLength) * 100, cls: 'tick-hyd', title: '21KM Hydration (Jones Bridge)' },
      { pct: (tagDistances.step10 / totalLength) * 100, cls: 'tick-turn', title: 'Binondo Church' },
      { pct: (tagDistances.bydHydration / totalLength) * 100, cls: 'tick-hyd', title: 'BYD Recharging Hub (Padre Burgos)' },
      { pct: (tagDistances.step20 / totalLength) * 100, cls: 'tick-turn', title: 'Intramuros–Binondo Bridge' },
      { pct: (tagDistances.step32 / totalLength) * 100, cls: 'tick-uturn', title: 'Anda Circle U-Turn' },
      { pct: (tagDistances.step34 / totalLength) * 100, cls: 'tick-uturn', title: 'Quirino Ave Final U-Turn' },
      { pct: 100, cls: 'tick-finish', title: 'Quirino Grandstand Finish (21.0 KM)' }
    ],
    minimapDots: [
      { id: 'step1', color: '#0d9488' },
      { id: 'step3', color: '#0f172a' },
      { id: 'hyd21k', color: '#0284c7' },
      { id: 'bydHydration', color: '#06b6d4' },
      { id: 'step10', color: '#1d4ed8' },
      { id: 'step32', color: '#0f172a' },
      { id: 'step34', color: '#0f172a' },
      { id: 'finish', color: '#dc2626' }
    ],
    mapOverview: {
      center: toWorld(140, 160, 0),
      height: 4300,
      zOffset: 980
    },
    segments: cumSegments,
    densePoints,
    checkpoints,
    finalS: ROUTE_5KM.finalS,
    sample
  };
}

export const ROUTE_21KM = build21KMRoute();
