import * as THREE from 'three';
import {
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
  PB_LANE_OUT_S,
  PB_LANE_RET_S,
  PB_GEN_LUNA_OFFSET,
  PB_FORK_OFFSET,
  FINANCE_ANGLE_DEG,
  FINANCE_LEN,
  createLineSegment,
  createArcSegment,
  bearingAndCompass
} from './routeCommon.js';
import { ROUTE_5KM } from './route5km.js';

/**
 * FUNRIDE PH 2026 — 10KM CYCLING ROUTE GEOMETRY
 * Faithful to "FunRide 10KM Route - Map.png":
 *   A. Starting Point: KM 0 – Quirino Grandstand
 *      1. Start at KM 0, Quirino Grandstand.
 *      2. Proceed straight along Roxas Boulevard, southbound (+ Hydration PH Navy).
 *      3. Make a U-turn towards P. Ocampo Street.
 *      4. Proceed straight along Roxas Boulevard, northbound.
 *   B. Padre Burgos – Finance Road U-Turn
 *      5. Turn right to Padre Burgos Avenue.
 *      6. Proceed straight along Padre Burgos Avenue towards Finance Road (+ Hydration Gen. Luna–Finance).
 *      7. Bear right onto Finance Road.
 *      8. Make a U-turn on Finance Road (just short of Taft Ave).
 *   C. Final Return to Quirino Grandstand
 *      9. Proceed back to Padre Burgos Avenue towards Roxas Boulevard.
 *     10. Proceed straight along Padre Burgos Avenue to Roxas Boulevard.
 *     11. Turn left to Katigbak Drive and proceed to the FINISH LINE at Quirino Grandstand.
 */

function build10KMRoute() {
  const segments = [];
  const up = new THREE.Vector3(0, 1, 0);

  // Finance Road direction vectors (bearing 18° right/clockwise from DIR_EAST)
  const finAngleRad = THREE.MathUtils.degToRad(FINANCE_ANGLE_DEG);
  const DIR_FIN_OUT = DIR_EAST.clone().applyAxisAngle(up, -finAngleRad).normalize();
  const DIR_FIN_RET = DIR_FIN_OUT.clone().negate();
  // Normal pointing left (north-ish) of Finance Road outbound
  const DIR_FIN_LEFT = DIR_NB.clone().applyAxisAngle(up, -finAngleRad).normalize();
  const DIR_FIN_RIGHT = DIR_FIN_LEFT.clone().negate();

  // 0. Southbound straight: KM 0 -> P. Ocampo U-turn entry
  const pStart = toWorld(S_START, LANE_OFFSET_SB);
  const pUturnEntry = toWorld(S_UTURN, LANE_OFFSET_SB);
  segments.push(createLineSegment(pStart, pUturnEntry));

  // 1. P. Ocampo 180° U-Turn (LEFT turn from SB to NB)
  const uturnCenter = toWorld(S_UTURN, 0);
  const uturnRadius = Math.abs(LANE_OFFSET_SB);
  segments.push(createArcSegment(uturnCenter, uturnRadius, DIR_WEST.clone(), Math.PI));

  // 2. Northbound straight: P. Ocampo -> Padre Burgos Ave right-turn entry
  const pUturnExit = toWorld(S_UTURN, LANE_OFFSET_NB);
  const pPbTurnEntry = toWorld(PB_LANE_OUT_S + CORNER_RADIUS, LANE_OFFSET_NB);
  segments.push(createLineSegment(pUturnExit, pPbTurnEntry));

  // 3. Step 5: 90° RIGHT turn from Roxas Blvd NB onto Padre Burgos Ave eastbound (outbound)
  // Center is east of entry by CORNER_RADIUS
  const pbTurnCenter = toWorld(PB_LANE_OUT_S + CORNER_RADIUS, LANE_OFFSET_NB + CORNER_RADIUS);
  segments.push(createArcSegment(pbTurnCenter, CORNER_RADIUS, DIR_WEST.clone(), -Math.PI * 0.5));

  // 4. Step 6: Straight along Padre Burgos Ave outbound -> Finance Road fork
  const forkRadius = 90;
  const pPbOutStart = toWorld(PB_LANE_OUT_S, LANE_OFFSET_NB + CORNER_RADIUS);
  const pForkOutStart = toWorld(PB_LANE_OUT_S, PB_FORK_OFFSET);
  segments.push(createLineSegment(pPbOutStart, pForkOutStart));

  // 5. Step 7: Bear right onto Finance Road (smooth right curve of FINANCE_ANGLE_DEG)
  const forkOutCenter = pForkOutStart.clone().addScaledVector(DIR_SB, forkRadius);
  const segForkOut = createArcSegment(forkOutCenter, forkRadius, DIR_NB.clone(), -finAngleRad);
  segments.push(segForkOut);
  const pFinOutStart = segForkOut.sample(segForkOut.length).position;

  // 6. Finance Road outbound straight to U-turn just short of Taft Ave
  const pFinUturnEntry = pFinOutStart.clone().addScaledVector(DIR_FIN_OUT, FINANCE_LEN);
  segments.push(createLineSegment(pFinOutStart, pFinUturnEntry));

  // 7. Step 8: 10KM U-TURN on Finance Road (180° LEFT turn to return lane)
  const finHalfWidth = (PB_LANE_OUT_S - PB_LANE_RET_S) * 0.5; // 7.5m -> 15m lane separation
  const finUturnCenter = pFinUturnEntry.clone().addScaledVector(DIR_FIN_LEFT, finHalfWidth);
  const segFinUturn = createArcSegment(finUturnCenter, finHalfWidth, DIR_FIN_RIGHT.clone(), Math.PI);
  segments.push(segFinUturn);
  const pFinRetStart = segFinUturn.sample(segFinUturn.length).position;

  // 8. Step 9: Finance Road return straight back toward Padre Burgos Ave
  // Compute exact join point so the return curve lands cleanly on PB_LANE_RET_S!
  const retRadius = forkRadius + finHalfWidth * 2; // concentric curve with outbound fork!
  const pForkRetEnd = toWorld(PB_LANE_RET_S, PB_FORK_OFFSET);
  const forkRetCenter = pForkRetEnd.clone().addScaledVector(DIR_SB, retRadius);
  // Start of return arc (at angle -finAngleRad from DIR_NB)
  const retArcStartDir = DIR_NB.clone().applyAxisAngle(up, -finAngleRad).normalize();
  const pForkRetStart = forkRetCenter.clone().addScaledVector(retArcStartDir, retRadius);
  segments.push(createLineSegment(pFinRetStart, pForkRetStart));

  // 9. Smooth LEFT curve from Finance Road back onto Padre Burgos Ave westbound
  segments.push(createArcSegment(forkRetCenter, retRadius, retArcStartDir, finAngleRad));

  // 10. Step 10 & 11: Straight westbound along Padre Burgos Ave -> across Roxas Blvd -> Katigbak Drive!
  const pKatigbakWestEnd = toWorld(PB_LANE_RET_S, KATIGBAK_WEST_OFFSET + CORNER_RADIUS);
  segments.push(createLineSegment(pForkRetEnd, pKatigbakWestEnd));

  // 11. Left Curve from Katigbak Drive onto Independence Rd / Quirino Grandstand Parade Ground
  const kTurn2Center = toWorld(PB_LANE_RET_S + CORNER_RADIUS, KATIGBAK_WEST_OFFSET + CORNER_RADIUS);
  segments.push(createArcSegment(kTurn2Center, CORNER_RADIUS, DIR_NB.clone(), Math.PI * 0.5));

  // 12. Final straight into the exact same FINISH LINE at Quirino Grandstand as 5KM
  const pFinalStart = toWorld(PB_LANE_RET_S + CORNER_RADIUS, KATIGBAK_WEST_OFFSET);
  const pFinish = toWorld(ROUTE_5KM.finalS, KATIGBAK_WEST_OFFSET);
  segments.push(createLineSegment(pFinalStart, pFinish));

  // Cumulative distances
  let acc = 0;
  const cumSegments = segments.map((seg) => {
    const startDist = acc;
    acc += seg.length;
    return { ...seg, startDist, endDist: acc };
  });

  const totalLength = acc;
  const displayKm = 10.0;

  // Exact checkpoint distances along the 10KM route
  const distStart = 0;
  const distStep2 = 1040;
  const distHydPhNavy = S_HYDRATION;
  const distStep3 = cumSegments[1].startDist + cumSegments[1].length * 0.5;
  const distStep4 = cumSegments[2].startDist + 1080;
  const distStep5 = cumSegments[3].startDist + cumSegments[3].length * 0.5;
  const distStep6 = cumSegments[4].startDist + 320;
  const distHydGenLuna = cumSegments[4].startDist + (PB_GEN_LUNA_OFFSET - (LANE_OFFSET_NB + CORNER_RADIUS));
  const distStep7 = cumSegments[5].startDist + cumSegments[5].length * 0.5;
  const distStep8 = cumSegments[7].startDist + cumSegments[7].length * 0.5;
  const distStep9 = cumSegments[8].startDist + cumSegments[8].length * 0.55;
  const distStep10 = cumSegments[10].startDist + 340;
  const distStep11 = cumSegments[10].startDist + PB_FORK_OFFSET; // right at Roxas Blvd -> Katigbak Dr crossing
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

    if (d >= distFinish - 18) {
      activeCheckpoint = 'finish';
      segmentText = 'FINISH LINE · Quirino Grandstand (10.00 km Complete!)';
      segmentColor = '#dc2626';
    } else if (d >= distStep11 - 40) {
      activeCheckpoint = 'step11';
      segmentText = 'Step 11 · Katigbak Drive → Quirino Grandstand Finish';
      segmentColor = '#1d4ed8';
    } else if (d >= cumSegments[10].startDist + 30) {
      activeCheckpoint = 'step10';
      segmentText = 'Step 10 · Padre Burgos Ave Westbound toward Roxas Blvd';
      segmentColor = '#1d4ed8';
    } else if (d >= cumSegments[8].startDist - 10) {
      activeCheckpoint = 'step9';
      segmentText = 'Step 9 · Return from Finance Rd back to Padre Burgos Ave';
      segmentColor = '#1d4ed8';
    } else if (d >= cumSegments[7].startDist - 40) {
      activeCheckpoint = 'step8';
      segmentText = 'Step 8 · 10KM U-Turn on Finance Road (before Taft Ave)';
      segmentColor = '#0f172a';
    } else if (d >= cumSegments[5].startDist - 15) {
      activeCheckpoint = 'step7';
      segmentText = 'Step 7 · Bear right onto Finance Road';
      segmentColor = '#1d4ed8';
    } else if (d >= distHydGenLuna - 55 && d <= distHydGenLuna + 55) {
      activeCheckpoint = 'hydGenLuna';
      segmentText = 'Hydration Station · Gen. Luna–Finance';
      segmentColor = '#0284c7';
    } else if (d >= cumSegments[4].startDist + 25) {
      activeCheckpoint = 'step6';
      segmentText = 'Step 6 · Padre Burgos Ave Eastbound toward Finance Rd';
      segmentColor = '#1d4ed8';
    } else if (d >= cumSegments[3].startDist - 35) {
      activeCheckpoint = 'step5';
      segmentText = 'Step 5 · Turn right onto Padre Burgos Avenue';
      segmentColor = '#1d4ed8';
    } else if (d >= cumSegments[2].startDist + 20) {
      activeCheckpoint = 'step4';
      segmentText = 'Step 4 · Roxas Boulevard Northbound (Return to Luneta)';
      segmentColor = '#1d4ed8';
    } else if (d >= cumSegments[1].startDist - 35) {
      activeCheckpoint = 'step3';
      segmentText = 'Step 3 · U-Turn at P. Ocampo Street';
      segmentColor = '#0f172a';
    } else if (d >= distHydPhNavy - 70 && d <= distHydPhNavy + 70) {
      activeCheckpoint = 'hydPhNavy';
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

  const fmtKm = (d) => `${((d / totalLength) * displayKm).toFixed(2)} km`;

  const checkpoints = {
    step1: { id: 'step1', distM: distStart, position: sample(distStart).position, title: 'START · KM 0' },
    step2: { id: 'step2', distM: distStep2, position: sample(distStep2).position, title: 'Step 2' },
    hydPhNavy: { id: 'hydPhNavy', distM: distHydPhNavy, position: sample(distHydPhNavy).position, title: 'HYDRATION · PH NAVY' },
    step3: { id: 'step3', distM: distStep3, position: sample(distStep3).position, title: 'U-TURN · P. OCAMPO' },
    step4: { id: 'step4', distM: distStep4, position: sample(distStep4).position, title: 'Step 4' },
    step5: { id: 'step5', distM: distStep5, position: sample(distStep5).position, title: 'Step 5 · Padre Burgos' },
    step6: { id: 'step6', distM: distStep6, position: sample(distStep6).position, title: 'Step 6 · Padre Burgos Ave' },
    hydGenLuna: { id: 'hydGenLuna', distM: distHydGenLuna, position: sample(distHydGenLuna).position, title: 'HYDRATION · GEN. LUNA–FINANCE' },
    step7: { id: 'step7', distM: distStep7, position: sample(distStep7).position, title: 'Step 7 · Finance Rd' },
    step8: { id: 'step8', distM: distStep8, position: sample(distStep8).position, title: '10KM U-TURN · FINANCE RD' },
    step9: { id: 'step9', distM: distStep9, position: sample(distStep9).position, title: 'Step 9 · Return to Padre Burgos' },
    step10: { id: 'step10', distM: distStep10, position: sample(distStep10).position, title: 'Step 10 · Padre Burgos Westbound' },
    step11: { id: 'step11', distM: distStep11, position: sample(distStep11).position, title: 'Step 11 · Katigbak Drive' },
    finish: { id: 'finish', distM: distFinish, position: sample(distFinish).position, title: 'FINISH' }
  };

  return {
    id: '10km',
    shortLabel: '10KM',
    title: '10KM CYCLING ROUTE',
    subtitle: 'Manila – Roxas Boulevard – P. Ocampo U-turn – Padre Burgos Avenue – Finance Road U-turn – Quirino Grandstand',
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
    legendHydrationLabel: 'Hydration (PH Navy · Gen. Luna)',
    meta: [
      { label: 'VENUE', value: 'Quirino Grandstand' },
      { label: 'START', value: 'KM 0' },
      { label: 'U-TURNS', value: 'P. Ocampo · Finance Rd' },
      { label: 'HYDRATION', value: 'PH Navy · Gen. Luna' }
    ],
    guideGroups: [
      {
        heading: 'A. STARTING POINT: KM 0 – QUIRINO GRANDSTAND',
        items: [
          { checkpoint: 'step1', badge: '1', type: 'step', text: 'Start at KM 0, Quirino Grandstand.', meta: '0.00 km · Roxas Blvd Southbound' },
          { checkpoint: 'step2', badge: '2', type: 'step', text: 'Proceed straight along Roxas Boulevard, southbound.', meta: `0.00 – ${fmtKm(distStep3)} · Bay-side lanes` },
          { checkpoint: 'hydPhNavy', badge: '💧', type: 'hydration', text: 'Hydration Station — PH Navy (by P. Ocampo).', meta: `${fmtKm(distHydPhNavy)} · Southbound water stop` },
          { checkpoint: 'step3', badge: '3', type: 'step', text: 'Make a U-turn towards P. Ocampo Street.', meta: `${fmtKm(distStep3)} · 180° turn to Northbound` },
          { checkpoint: 'step4', badge: '4', type: 'step', text: 'Proceed straight along Roxas Boulevard, northbound.', meta: `${fmtKm(distStep3)} – ${fmtKm(distStep5)} · Past Rizal Park` }
        ]
      },
      {
        heading: 'B. PADRE BURGOS – FINANCE ROAD U-TURN',
        items: [
          { checkpoint: 'step5', badge: '5', type: 'step', text: 'Turn right to Padre Burgos Avenue.', meta: `${fmtKm(distStep5)} · North end of Rizal Park` },
          { checkpoint: 'step6', badge: '6', type: 'step', text: 'Proceed straight along Padre Burgos Avenue towards Finance Road.', meta: `${fmtKm(distStep5)} – ${fmtKm(distStep7)} · Past Intramuros` },
          { checkpoint: 'hydGenLuna', badge: '💧', type: 'hydration', text: 'Hydration Station — Gen. Luna–Finance.', meta: `${fmtKm(distHydGenLuna)} · Padre Burgos / Gen. Luna` },
          { checkpoint: 'step7', badge: '7', type: 'step', text: 'Bear right onto Finance Road.', meta: `${fmtKm(distStep7)} · Past National Museum` },
          { checkpoint: 'step8', badge: '8', type: 'step', text: 'Make a U-turn on Finance Road.', meta: `${fmtKm(distStep8)} · Just short of Taft Ave` }
        ]
      },
      {
        heading: 'C. FINAL RETURN TO QUIRINO GRANDSTAND',
        items: [
          { checkpoint: 'step9', badge: '9', type: 'step', text: 'Proceed back to Padre Burgos Avenue towards Roxas Boulevard.', meta: `${fmtKm(distStep9)} · Westbound return` },
          { checkpoint: 'step10', badge: '10', type: 'step', text: 'Proceed straight along Padre Burgos Avenue to Roxas Boulevard.', meta: `${fmtKm(distStep10)} · Along Intramuros` },
          { checkpoint: 'step11', badge: '11', type: 'step', text: 'Turn left to Katigbak Drive and proceed to the FINISH LINE at Quirino Grandstand.', meta: `${fmtKm(distStep11)} – 10.00 km · Katigbak Dr & Parade Ground` },
          { checkpoint: 'finish', badge: '🏁', type: 'finish', text: 'FINISH LINE – QUIRINO GRANDSTAND', meta: '10.00 km · Katigbak Dr · Quirino Grandstand' }
        ]
      }
    ],
    scrubberTicks: [
      { pct: 0, cls: 'tick-start', title: 'KM 0 Start' },
      { pct: (distHydPhNavy / totalLength) * 100, cls: 'tick-hyd', title: 'PH Navy Hydration' },
      { pct: (distStep3 / totalLength) * 100, cls: 'tick-uturn', title: 'P. Ocampo U-Turn' },
      { pct: (distStep5 / totalLength) * 100, cls: 'tick-turn', title: 'Right to Padre Burgos Ave' },
      { pct: (distHydGenLuna / totalLength) * 100, cls: 'tick-hyd', title: 'Gen. Luna–Finance Hydration' },
      { pct: (distStep8 / totalLength) * 100, cls: 'tick-uturn', title: '10KM Finance Rd U-Turn' },
      { pct: (distStep11 / totalLength) * 100, cls: 'tick-turn', title: 'Katigbak Dr to Finish' },
      { pct: 100, cls: 'tick-finish', title: 'Quirino Grandstand Finish (10.0 KM)' }
    ],
    minimapDots: [
      { id: 'step1', color: '#0d9488' },
      { id: 'hydPhNavy', color: '#0284c7' },
      { id: 'step3', color: '#0f172a' },
      { id: 'hydGenLuna', color: '#0284c7' },
      { id: 'step8', color: '#0f172a' },
      { id: 'finish', color: '#dc2626' }
    ],
    mapOverview: {
      center: toWorld(720, 190, 0),
      height: 2950,
      zOffset: 760
    },
    financeMeta: {
      uturnCenter: finUturnCenter,
      dirOut: DIR_FIN_OUT,
      dirLeft: DIR_FIN_LEFT,
      forkOutStart: pForkOutStart,
      finOutStart: pFinOutStart,
      finUturnEntry: pFinUturnEntry,
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
