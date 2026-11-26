import * as THREE from 'three';
import {
  ROXAS_ANGLE_RAD,
  DIR_SB,
  DIR_NB,
  DIR_EAST,
  DIR_WEST,
  toWorld,
  LANE_OFFSET_SB,
  LANE_OFFSET_NB,
  S_START,
  S_HYDRATION,
  S_UTURN,
  S_KATIGBAK,
  KATIGBAK_WEST_OFFSET,
  CORNER_RADIUS,
  createLineSegment,
  createArcSegment,
  bearingAndCompass
} from './routeCommon.js';

export {
  ROXAS_ANGLE_RAD,
  DIR_SB,
  DIR_NB,
  DIR_EAST,
  DIR_WEST,
  toWorld,
  LANE_OFFSET_SB,
  LANE_OFFSET_NB,
  S_START,
  S_HYDRATION,
  S_UTURN,
  S_KATIGBAK,
  KATIGBAK_WEST_OFFSET,
  CORNER_RADIUS
};

function build5KMRoute() {
  const segments = [];

  // 1. Southbound straight: KM 0 (s=0, off=-9) -> P. Ocampo U-turn entry (s=S_UTURN, off=-9)
  const pStart = toWorld(S_START, LANE_OFFSET_SB);
  const pUturnEntry = toWorld(S_UTURN, LANE_OFFSET_SB);
  segments.push(createLineSegment(pStart, pUturnEntry));

  // 2. U-Turn at P. Ocampo: 180° LEFT turn from southbound (off=-9) to northbound (off=+9)
  const uturnCenter = toWorld(S_UTURN, 0);
  const uturnRadius = Math.abs(LANE_OFFSET_SB);
  segments.push(createArcSegment(uturnCenter, uturnRadius, DIR_WEST.clone(), Math.PI));

  // 3. Northbound straight: P. Ocampo U-turn exit (s=S_UTURN, off=+9) -> Katigbak Dr corner entry
  const pUturnExit = toWorld(S_UTURN, LANE_OFFSET_NB);
  const pKatigbakCornerEntry = toWorld(S_KATIGBAK + CORNER_RADIUS, LANE_OFFSET_NB);
  segments.push(createLineSegment(pUturnExit, pKatigbakCornerEntry));

  // 4. Step 5 Left Turn onto Katigbak Drive (90° LEFT turn from NNW to WSW)
  const kTurn1Center = toWorld(S_KATIGBAK + CORNER_RADIUS, LANE_OFFSET_NB - CORNER_RADIUS);
  segments.push(createArcSegment(kTurn1Center, CORNER_RADIUS, DIR_EAST.clone(), Math.PI * 0.5));

  // 5. Katigbak Drive westbound straight toward Manila Bay / Quirino Grandstand
  const pKatigbakWestStart = toWorld(S_KATIGBAK, LANE_OFFSET_NB - CORNER_RADIUS);
  const pKatigbakWestEnd = toWorld(S_KATIGBAK, KATIGBAK_WEST_OFFSET + CORNER_RADIUS);
  segments.push(createLineSegment(pKatigbakWestStart, pKatigbakWestEnd));

  // 6. Left Curve onto Independence Rd / Quirino Grandstand Parade Ground (90° LEFT turn from WSW to SSE)
  const kTurn2Center = toWorld(S_KATIGBAK + CORNER_RADIUS, KATIGBAK_WEST_OFFSET + CORNER_RADIUS);
  segments.push(createArcSegment(kTurn2Center, CORNER_RADIUS, DIR_NB.clone(), Math.PI * 0.5));

  // Compute remaining distance to make total route EXACTLY 5,000.0 meters
  const distSoFar = segments.reduce((sum, seg) => sum + seg.length, 0);
  const finalStraightLen = 5000 - distSoFar;

  // 7. Final straight along Independence Rd / Parade Ground into FINISH LINE at Quirino Grandstand
  const pFinalStart = toWorld(S_KATIGBAK + CORNER_RADIUS, KATIGBAK_WEST_OFFSET);
  const pFinish = toWorld(S_KATIGBAK + CORNER_RADIUS + finalStraightLen, KATIGBAK_WEST_OFFSET);
  segments.push(createLineSegment(pFinalStart, pFinish));

  // Cumulative distances
  let acc = 0;
  const cumSegments = segments.map((seg) => {
    const startDist = acc;
    acc += seg.length;
    return { ...seg, startDist, endDist: acc };
  });

  const totalLength = acc; // 5000.0 m
  const displayKm = 5.0;

  const distStart = 0;
  const distStep2 = 1040;
  const distHydration = S_HYDRATION;
  const distUTurnApex = cumSegments[1].startDist + cumSegments[1].length * 0.5;
  const distStep4 = cumSegments[2].startDist + 1060;
  const distStep5 = cumSegments[3].startDist + cumSegments[3].length * 0.5;
  const distFinish = totalLength;

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

    let activeCheckpoint = 'step1';
    let segmentText = 'Step 1 · Start at KM 0, Quirino Grandstand';
    let segmentColor = '#0d9488';

    if (d >= distFinish - 15) {
      activeCheckpoint = 'finish';
      segmentText = 'FINISH LINE · Quirino Grandstand (5.00 km Complete!)';
      segmentColor = '#dc2626';
    } else if (d >= cumSegments[3].startDist - 25) {
      activeCheckpoint = 'step5';
      segmentText = 'Step 5 · Left onto Katigbak Dr → Quirino Grandstand Finish';
      segmentColor = '#1d4ed8';
    } else if (d >= cumSegments[2].startDist + 20) {
      activeCheckpoint = 'step4';
      segmentText = 'Step 4 · Roxas Boulevard Northbound (Return to Luneta)';
      segmentColor = '#1d4ed8';
    } else if (d >= cumSegments[1].startDist - 35) {
      activeCheckpoint = 'step3';
      segmentText = 'Step 3 · U-Turn at P. Ocampo Street';
      segmentColor = '#0f172a';
    } else if (d >= distHydration - 70 && d <= distHydration + 70) {
      activeCheckpoint = 'hydration';
      segmentText = 'Hydration Station · PH Navy (by P. Ocampo)';
      segmentColor = '#0284c7';
    } else if (d > 60) {
      activeCheckpoint = 'step2';
      segmentText = 'Step 2 · Roxas Boulevard Southbound (Bay-side)';
      segmentColor = '#1d4ed8';
    }

    return {
      distance: d,
      displayKmValue: (d / totalLength) * displayKm,
      position,
      tangent,
      bearingDeg,
      compassDir,
      activeCheckpoint,
      segmentText,
      segmentColor
    };
  }

  const densePoints = [];
  for (let d = 0; d <= totalLength; d += 4) {
    densePoints.push(sample(d));
  }
  if (densePoints[densePoints.length - 1].distance < totalLength) {
    densePoints.push(sample(totalLength));
  }

  const checkpoints = {
    step1: { id: 'step1', distM: distStart, position: sample(distStart).position, title: 'START · KM 0', subtitle: 'Quirino Grandstand / Rizal Park' },
    step2: { id: 'step2', distM: distStep2, position: sample(distStep2).position, title: 'Step 2', subtitle: 'Roxas Blvd Southbound' },
    hydration: { id: 'hydration', distM: distHydration, position: sample(distHydration).position, title: 'HYDRATION · PH NAVY', subtitle: 'Water station by P. Ocampo' },
    step3: { id: 'step3', distM: distUTurnApex, position: sample(distUTurnApex).position, title: 'U-TURN · P. OCAMPO', subtitle: '180° U-turn to Northbound' },
    step4: { id: 'step4', distM: distStep4, position: sample(distStep4).position, title: 'Step 4', subtitle: 'Roxas Blvd Northbound' },
    step5: { id: 'step5', distM: distStep5, position: sample(distStep5).position, title: 'Step 5', subtitle: 'Left turn to Katigbak Drive' },
    finish: { id: 'finish', distM: distFinish, position: sample(distFinish).position, title: 'FINISH', subtitle: 'Katigbak Dr · Quirino Grandstand' }
  };

  return {
    id: '5km',
    shortLabel: '5KM',
    title: '5KM CYCLING ROUTE',
    subtitle: 'Manila – Roxas Boulevard – P. Ocampo U-turn – Roxas Boulevard – Quirino Grandstand',
    minimapTitle: '5KM ROUTE MAP',
    displayKm,
    totalLength,
    ribbonColor: 0xf5c400,
    ribbonBorderColor: 0xb45309,
    arrowColor: 0x0f172a,
    minimapLineColor: '#f5c400',
    minimapBorderColor: '#d97706',
    legendLineColor: '#f5c400',
    legendLineBorder: '#ca8a04',
    legendLineLabel: '5KM route (yellow path + arrows)',
    legendHydrationLabel: 'Hydration station (PH Navy)',
    meta: [
      { label: 'VENUE', value: 'Quirino Grandstand' },
      { label: 'START', value: 'KM 0' },
      { label: 'U-TURN', value: 'P. Ocampo' },
      { label: 'HYDRATION', value: 'PH Navy' }
    ],
    guideGroups: [
      {
        heading: 'A. STARTING POINT: KM 0 – QUIRINO GRANDSTAND',
        items: [
          { checkpoint: 'step1', badge: '1', type: 'step', text: 'Start at KM 0, Quirino Grandstand.', meta: '0.00 km · Roxas Blvd Southbound' },
          { checkpoint: 'step2', badge: '2', type: 'step', text: 'Proceed straight along Roxas Boulevard, southbound.', meta: '0.00 – 2.09 km · Bay-side lanes' },
          { checkpoint: 'hydration', badge: '💧', type: 'hydration', text: 'Hydration Station — PH Navy (by P. Ocampo).', meta: '1.92 km · Southbound water stop' },
          { checkpoint: 'step3', badge: '3', type: 'step', text: 'Make a U-turn towards P. Ocampo Street.', meta: '2.10 km · 180° turn to Northbound' }
        ]
      },
      {
        heading: 'B. FINAL RETURN TO QUIRINO GRANDSTAND',
        items: [
          { checkpoint: 'step4', badge: '4', type: 'step', text: 'Proceed straight along Roxas Boulevard, northbound.', meta: '2.12 – 4.48 km · Inland lanes past Rizal Park' },
          { checkpoint: 'step5', badge: '5', type: 'step', text: 'Turn left to Katigbak Drive and proceed to the FINISH LINE at Quirino Grandstand.', meta: '4.48 – 5.00 km · Katigbak Dr & Parade Ground' },
          { checkpoint: 'finish', badge: '🏁', type: 'finish', text: 'FINISH LINE – QUIRINO GRANDSTAND', meta: '5.00 km · Katigbak Dr · Quirino Grandstand' }
        ]
      }
    ],
    scrubberTicks: [
      { pct: 0, cls: 'tick-start', title: 'KM 0 Start' },
      { pct: (distHydration / totalLength) * 100, cls: 'tick-hyd', title: 'PH Navy Hydration (1.92 km)' },
      { pct: (distUTurnApex / totalLength) * 100, cls: 'tick-uturn', title: 'P. Ocampo U-Turn (2.10 km)' },
      { pct: (distStep5 / totalLength) * 100, cls: 'tick-turn', title: 'Katigbak Dr Left Turn (4.48 km)' },
      { pct: 100, cls: 'tick-finish', title: 'Quirino Grandstand Finish (5.00 km)' }
    ],
    minimapDots: [
      { id: 'step1', color: '#0d9488' },
      { id: 'hydration', color: '#0284c7' },
      { id: 'step3', color: '#0f172a' },
      { id: 'finish', color: '#dc2626' }
    ],
    mapOverview: {
      center: toWorld(860, -25, 0),
      height: 2350,
      zOffset: 650
    },
    segments: cumSegments,
    densePoints,
    checkpoints,
    finalS: S_KATIGBAK + CORNER_RADIUS + finalStraightLen,
    sample
  };
}

export const ROUTE_5KM = build5KMRoute();
