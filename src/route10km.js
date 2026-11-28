import * as THREE from 'three';
import {
  DIR_EAST,
  DIR_NB,
  toWorld,
  LANE_OFFSET_SB,
  LANE_OFFSET_NB,
  S_START,
  S_HYDRATION,
  S_UTURN,
  S_KATIGBAK,
  S_ANDA_CIRCLE,
  KATIGBAK_WEST_OFFSET,
  PB_LANE_OUT_S,
  PB_LANE_RET_S,
  PB_GEN_LUNA_OFFSET,
  PB_FORK_OFFSET,
  FINANCE_ANGLE_DEG,
  FINANCE_LEN,
  buildFilletedPath,
  bearingAndCompass
} from './routeCommon.js';
import { ROUTE_5KM } from './route5km.js';

/**
 * FUNRIDE PH 2026 — UPDATED OFFICIAL 10KM CYCLING ROUTE GEOMETRY (18 STEPS)
 * Faithful to updated Official 10KM Cycling Route map:
 *   A. KM 0 – Roxas Boulevard – P. Ocampo U-Turn (Steps 1–4)
 *      1. START: From KM 0, Quirino Grandstand, Luneta Park.
 *      2. Proceed straight ahead along Roxas Boulevard Southbound (+ Hydration PH Navy).
 *      3. Make a U-turn at Pablo Ocampo Street (1ST U-TURN · P. OCAMPO).
 *      4. Proceed straight ahead along Roxas Boulevard Northbound.
 *   B. Padre Burgos – Finance Rd U-Turn – Intramuros Loop (Steps 5–12)
 *      5. Turn right to Padre Burgos Avenue (+ Hydration Gen. Luna–Finance).
 *      6. Make a U-turn at Finance Road / Padre Burgos Avenue (2ND U-TURN · FINANCE RD).
 *      7. Turn right to General Luna Street.
 *      8. Turn right to Muralla Street.
 *      9. Turn left to Andres Soriano Avenue.
 *     10. Turn left to General Luna Street.
 *     11. Proceed straight ahead towards Padre Burgos Avenue.
 *     12. Turn right to Padre Burgos Avenue.
 *   C. Bonifacio Drive – Anda Circle U-Turn – Finish (Steps 13–18)
 *     13. Turn right to Bonifacio Drive.
 *     14. Proceed straight ahead towards Anda Circle.
 *     15. Make a U-turn at Anda Circle (U-TURN · ANDA CIRCLE).
 *     16. Proceed straight ahead along Roxas Boulevard towards Katigbak Drive.
 *     17. Turn right to Katigbak Drive.
 *     18. FINISH LINE: Quirino Grandstand, Luneta Park, Manila.
 */

function build10KMRoute() {
  const up = new THREE.Vector3(0, 1, 0);
  const finAngleRad = THREE.MathUtils.degToRad(FINANCE_ANGLE_DEG);
  const DIR_FIN_OUT = DIR_EAST.clone().applyAxisAngle(up, -finAngleRad).normalize();
  const DIR_FIN_LEFT = DIR_NB.clone().applyAxisAngle(up, -finAngleRad).normalize();

  // Finance Road U-turn geometry (2ND U-TURN · FINANCE RD)
  // Exact parallel outbound (+7.5m) & return (-7.5m) lanes staying cleanly on their own carriageways!
  const pForkOutStart = toWorld(PB_LANE_OUT_S, PB_FORK_OFFSET);
  const finOutStart = pForkOutStart.clone().addScaledVector(DIR_FIN_OUT, 20);
  const finUturnEntry = finOutStart.clone().addScaledVector(DIR_FIN_OUT, FINANCE_LEN * 0.72);
  const finHalfW = (PB_LANE_OUT_S - PB_LANE_RET_S) * 0.5; // 7.5m (15m lane-to-lane separation)
  const finUturnCenter = finUturnEntry.clone().addScaledVector(DIR_FIN_LEFT, finHalfW);
  const finUturnApex = finUturnCenter.clone().addScaledVector(DIR_FIN_OUT, finHalfW);
  const finRetStart = finUturnEntry.clone().addScaledVector(DIR_FIN_LEFT, finHalfW * 2);
  const finRetFork = finOutStart.clone().addScaledVector(DIR_FIN_LEFT, finHalfW * 2);

  const waypoints = [
    // --- SECTION A: KM 0 -> Roxas Blvd SB -> P. Ocampo 1st U-Turn -> Roxas Blvd NB ---
    { pos: toWorld(S_START, LANE_OFFSET_SB), tag: 'step1' },
    { pos: toWorld(1040, LANE_OFFSET_SB), tag: 'step2' },
    { pos: toWorld(S_HYDRATION, LANE_OFFSET_SB), tag: 'hydPhNavy' },
    // Step 3: 1ST U-TURN · P. OCAMPO
    { pos: toWorld(S_UTURN + 8, LANE_OFFSET_SB), radius: 8.5 },
    { pos: toWorld(S_UTURN + 8, 0), radius: 8.5, tag: 'step3' },
    { pos: toWorld(S_UTURN + 8, LANE_OFFSET_NB), radius: 8.5 },
    { pos: toWorld(1040, LANE_OFFSET_NB), tag: 'step4' },

    // --- SECTION B: Padre Burgos -> Finance Rd 2nd U-Turn -> Intramuros Loop ---
    // Step 5: Right turn onto Padre Burgos Ave
    { pos: toWorld(PB_LANE_OUT_S, LANE_OFFSET_NB), radius: 18, tag: 'step5' },
    { pos: toWorld(PB_LANE_OUT_S, PB_GEN_LUNA_OFFSET), radius: 16, tag: 'hydGenLuna' },
    { pos: pForkOutStart, radius: 32 },
    // Step 6: 2ND U-TURN · FINANCE RD
    { pos: finUturnEntry, radius: 7.5 },
    { pos: finUturnApex, radius: 7.5, tag: 'step6' },
    { pos: finRetStart, radius: 7.5 },
    // Return cleanly along northern Finance Rd lane -> northern Padre Burgos lane (NEVER crossing median!)
    { pos: finRetFork, radius: 32 },
    { pos: toWorld(PB_LANE_RET_S, PB_FORK_OFFSET - 10), radius: 24 },
    { pos: toWorld(PB_LANE_RET_S, 540), radius: 18, tag: 'step7' },
    // Step 7-8: Right onto General Luna St -> Right onto Muralla St (northbound inside Intramuros)
    { pos: toWorld(-430, 455), radius: 18, tag: 'step8' },
    { pos: toWorld(-730, 495), radius: 34 },
    { pos: toWorld(-985, 480), radius: 22 },
    // Step 9: Turn left onto Andres Soriano Avenue (along northern Intramuros)
    { pos: toWorld(-1065, 255), radius: 22, tag: 'step9' },
    // Step 10: Turn left onto General Luna Street (south-southeast through center of Intramuros)
    { pos: toWorld(-975, 90), radius: 18, tag: 'step10' },
    // Step 11: Proceed straight ahead towards Padre Burgos Avenue
    { pos: toWorld(-660, 270), radius: 20, tag: 'step11' },
    // Step 12: Turn right onto Padre Burgos Avenue (westbound toward Roxas Blvd)
    { pos: toWorld(PB_LANE_RET_S, 465), radius: 18, tag: 'step12' },

    // --- SECTION C: Bonifacio Drive -> Anda Circle U-Turn -> Katigbak Dr -> FINISH ---
    // Step 13: Turn right onto Bonifacio Drive (northbound)
    { pos: toWorld(PB_LANE_RET_S, LANE_OFFSET_NB), radius: 18, tag: 'step13' },
    // Step 14: Proceed straight ahead towards Anda Circle
    { pos: toWorld(-680, LANE_OFFSET_NB), tag: 'step14' },
    // Step 15: U-TURN · ANDA CIRCLE (clean 15.5m loop around the 6.5m monument island)
    { pos: toWorld(S_ANDA_CIRCLE + 22, LANE_OFFSET_NB), radius: 12 },
    { pos: toWorld(S_ANDA_CIRCLE, 15.5), radius: 14 },
    { pos: toWorld(S_ANDA_CIRCLE - 15.5, 0), radius: 14, tag: 'step15' },
    { pos: toWorld(S_ANDA_CIRCLE, -15.5), radius: 14 },
    { pos: toWorld(S_ANDA_CIRCLE + 22, LANE_OFFSET_SB), radius: 12 },
    // Step 16: Proceed straight ahead southbound along Bonifacio Dr / Roxas Blvd towards Katigbak Dr
    { pos: toWorld(-650, LANE_OFFSET_SB), tag: 'step16' },
    // Step 17: Turn right onto Katigbak Drive (westbound to Quirino Grandstand)
    { pos: toWorld(S_KATIGBAK, LANE_OFFSET_SB), radius: 18, tag: 'step17' },
    { pos: toWorld(S_KATIGBAK, KATIGBAK_WEST_OFFSET), radius: 18 },
    // Step 18: FINISH LINE at Quirino Grandstand
    { pos: toWorld(ROUTE_5KM.finalS, KATIGBAK_WEST_OFFSET), tag: 'finish' }
  ];

  const { segments, tagDistances, totalLength } = buildFilletedPath(waypoints, 18);

  let acc = 0;
  const cumSegments = segments.map((seg) => {
    const startDist = acc;
    acc += seg.length;
    return { ...seg, startDist, endDist: acc };
  });

  const displayKm = 10.0;

  const milestones = [
    { id: 'step1', text: 'Step 1 · START: KM 0, Quirino Grandstand, Luneta Park', color: '#0d9488' },
    { id: 'step2', text: 'Step 2 · Roxas Boulevard Southbound', color: '#1d4ed8' },
    { id: 'hydPhNavy', text: 'Hydration Station · PH Navy (by P. Ocampo)', color: '#0284c7' },
    { id: 'step3', text: 'Step 3 · 1st U-Turn at Pablo Ocampo Street', color: '#0f172a' },
    { id: 'step4', text: 'Step 4 · Roxas Boulevard Northbound', color: '#1d4ed8' },
    { id: 'step5', text: 'Step 5 · Turn right to Padre Burgos Avenue', color: '#1d4ed8' },
    { id: 'hydGenLuna', text: 'Hydration Station · Gen. Luna–Finance', color: '#0284c7' },
    { id: 'step6', text: 'Step 6 · 2nd U-Turn at Finance Road / Padre Burgos Ave', color: '#0f172a' },
    { id: 'step7', text: 'Step 7 · Turn right to General Luna Street', color: '#1d4ed8' },
    { id: 'step8', text: 'Step 8 · Turn right to Muralla Street (Intramuros)', color: '#1d4ed8' },
    { id: 'step9', text: 'Step 9 · Turn left to Andres Soriano Avenue', color: '#1d4ed8' },
    { id: 'step10', text: 'Step 10 · Turn left to General Luna Street (Intramuros)', color: '#1d4ed8' },
    { id: 'step11', text: 'Step 11 · General Luna St towards Padre Burgos Avenue', color: '#1d4ed8' },
    { id: 'step12', text: 'Step 12 · Turn right to Padre Burgos Avenue Westbound', color: '#1d4ed8' },
    { id: 'step13', text: 'Step 13 · Turn right to Bonifacio Drive Northbound', color: '#1d4ed8' },
    { id: 'step14', text: 'Step 14 · Bonifacio Drive towards Anda Circle', color: '#1d4ed8' },
    { id: 'step15', text: 'Step 15 · U-Turn at Anda Circle', color: '#0f172a' },
    { id: 'step16', text: 'Step 16 · Roxas Boulevard Southbound towards Katigbak Dr', color: '#1d4ed8' },
    { id: 'step17', text: 'Step 17 · Turn right to Katigbak Drive', color: '#1d4ed8' },
    { id: 'finish', text: 'Step 18 · FINISH LINE: Quirino Grandstand (10.00 km Complete!)', color: '#dc2626' }
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
    if (d >= totalLength - 20) {
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
  for (let d = 0; d <= totalLength; d += 4) {
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
    meta: fmtKm(`step${num}`)
  });

  return {
    id: '10km',
    shortLabel: '10KM',
    title: 'OFFICIAL 10KM CYCLING ROUTE',
    subtitle: 'Manila – Roxas Boulevard – P. Ocampo U-turn – Padre Burgos – Finance Rd U-turn – Intramuros – Anda Circle U-turn – Quirino Grandstand',
    minimapTitle: '10KM ROUTE MAP',
    displayKm,
    totalLength,
    ribbonColor: 0xdc2626,
    ribbonBorderColor: 0x7f1d1d,
    arrowColor: 0xffffff,
    minimapLineColor: '#dc2626',
    minimapBorderColor: '#991b1b',
    legendLineColor: '#dc2626',
    legendLineBorder: '#991b1b',
    legendLineLabel: '10KM route (red path + arrows)',
    legendHydrationLabel: 'Hydration (PH Navy · Gen. Luna–Finance)',
    meta: [
      { label: 'VENUE', value: 'Quirino Grandstand' },
      { label: 'START', value: 'KM 0' },
      { label: 'U-TURNS', value: 'P. Ocampo · Finance · Anda' },
      { label: 'HYDRATION', value: 'PH Navy · Gen. Luna' }
    ],
    guideGroups: [
      {
        heading: 'A. KM 0 – ROXAS BOULEVARD – P. OCAMPO U-TURN',
        items: [
          stepItem(1, 'START: From KM 0, Quirino Grandstand, Luneta Park.'),
          stepItem(2, 'Proceed straight ahead along Roxas Boulevard Southbound.'),
          { checkpoint: 'hydPhNavy', badge: '💧', type: 'hydration', text: 'Hydration Station — PH Navy (by P. Ocampo).', meta: `${fmtKm('hydPhNavy')} · Southbound water stop` },
          stepItem(3, 'Make a U-turn at Pablo Ocampo Street.'),
          stepItem(4, 'Proceed straight ahead along Roxas Boulevard Northbound.')
        ]
      },
      {
        heading: 'B. PADRE BURGOS – FINANCE RD U-TURN – INTRAMUROS LOOP',
        items: [
          stepItem(5, 'Turn right to Padre Burgos Avenue.'),
          { checkpoint: 'hydGenLuna', badge: '💧', type: 'hydration', text: 'Hydration Station — Gen. Luna–Finance.', meta: `${fmtKm('hydGenLuna')} · Padre Burgos / Gen. Luna` },
          stepItem(6, 'Make a U-turn at Finance Road / Padre Burgos Avenue.'),
          stepItem(7, 'Turn right to General Luna Street.'),
          stepItem(8, 'Turn right to Muralla Street.'),
          stepItem(9, 'Turn left to Andres Soriano Avenue.'),
          stepItem(10, 'Turn left to General Luna Street.'),
          stepItem(11, 'Proceed straight ahead towards Padre Burgos Avenue.'),
          stepItem(12, 'Turn right to Padre Burgos Avenue.')
        ]
      },
      {
        heading: 'C. BONIFACIO DRIVE – ANDA CIRCLE U-TURN – FINISH',
        items: [
          stepItem(13, 'Turn right to Bonifacio Drive.'),
          stepItem(14, 'Proceed straight ahead towards Anda Circle.'),
          stepItem(15, 'Make a U-turn at Anda Circle.'),
          stepItem(16, 'Proceed straight ahead along Roxas Boulevard towards Katigbak Drive.'),
          stepItem(17, 'Turn right to Katigbak Drive.'),
          { checkpoint: 'finish', badge: '18', type: 'finish', text: 'FINISH LINE: Quirino Grandstand, Luneta Park, Manila.', meta: '10.00 km · Katigbak Dr · Quirino Grandstand' }
        ]
      }
    ],
    scrubberTicks: [
      { pct: 0, cls: 'tick-start', title: 'KM 0 Start' },
      { pct: (tagDistances.hydPhNavy / totalLength) * 100, cls: 'tick-hyd', title: 'PH Navy Hydration' },
      { pct: (tagDistances.step3 / totalLength) * 100, cls: 'tick-uturn', title: '1st U-Turn · P. Ocampo' },
      { pct: (tagDistances.hydGenLuna / totalLength) * 100, cls: 'tick-hyd', title: 'Gen. Luna–Finance Hydration' },
      { pct: (tagDistances.step6 / totalLength) * 100, cls: 'tick-uturn', title: '2nd U-Turn · Finance Rd' },
      { pct: (tagDistances.step9 / totalLength) * 100, cls: 'tick-turn', title: 'Intramuros · Andres Soriano' },
      { pct: (tagDistances.step15 / totalLength) * 100, cls: 'tick-uturn', title: 'U-Turn · Anda Circle' },
      { pct: 100, cls: 'tick-finish', title: 'Quirino Grandstand Finish (10.0 KM)' }
    ],
    minimapDots: [
      { id: 'step1', color: '#0d9488' },
      { id: 'hydPhNavy', color: '#0284c7' },
      { id: 'step3', color: '#0f172a' },
      { id: 'hydGenLuna', color: '#0284c7' },
      { id: 'step6', color: '#0f172a' },
      { id: 'step15', color: '#0f172a' },
      { id: 'finish', color: '#dc2626' }
    ],
    mapOverview: {
      center: toWorld(460, 140, 0),
      height: 3650,
      zOffset: 840
    },
    financeMeta: {
      uturnCenter: finUturnCenter,
      dirOut: DIR_FIN_OUT,
      dirLeft: DIR_FIN_LEFT,
      forkOutStart: pForkOutStart,
      finOutStart,
      finUturnEntry,
      angleRad: finAngleRad
    },
    segments: cumSegments,
    densePoints,
    checkpoints,
    finalS: ROUTE_5KM.finalS,
    sample
  };
}

export const ROUTE_10KM = build10KMRoute();
