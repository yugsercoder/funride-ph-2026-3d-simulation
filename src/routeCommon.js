import * as THREE from 'three';

/**
 * Shared coordinate system & piecewise Line + Circular Arc builders for FunRide PH 2026 routes.
 *   - Roxas Boulevard runs NNW -> SSE at bearing 157.5° (22.5° East of South).
 *   - Three.js coordinate convention: +X = East, -Z = North, +Z = South, +Y = Up.
 *   - 1 Three.js unit = 1 meter.
 */

export const ROXAS_ANGLE_RAD = THREE.MathUtils.degToRad(22.5);

// Unit vector along Roxas Blvd Southbound (SSE, bearing 157.5°)
export const DIR_SB = new THREE.Vector3(
  Math.sin(ROXAS_ANGLE_RAD),
  0,
  Math.cos(ROXAS_ANGLE_RAD)
);

// Unit vector along Roxas Blvd Northbound (NNW, bearing 337.5°)
export const DIR_NB = DIR_SB.clone().negate();

// Unit vector perpendicular East (inland towards Rizal Park / Padre Burgos Ave, bearing 67.5° ENE)
export const DIR_EAST = new THREE.Vector3(
  Math.cos(ROXAS_ANGLE_RAD),
  0,
  -Math.sin(ROXAS_ANGLE_RAD)
);

// Unit vector perpendicular West (towards Manila Bay / Quirino Grandstand, bearing 247.5° WSW)
export const DIR_WEST = DIR_EAST.clone().negate();

/**
 * Convert Roxas-aligned coordinates (s, offset) to Three.js world (x, y, z).
 * s = distance southbound along Roxas Blvd from KM 0 (meters).
 * offset = distance east (+inland) or west (-towards Manila Bay) from Roxas median center (meters).
 */
export function toWorld(s, offset, y = 0) {
  return new THREE.Vector3(
    DIR_SB.x * s + DIR_EAST.x * offset,
    y,
    DIR_SB.z * s + DIR_EAST.z * offset
  );
}

// Shared road geometry constants (meters)
export const LANE_OFFSET_SB = -9.0;       // Southbound carriageway center (west/bay side)
export const LANE_OFFSET_NB = 9.0;        // Northbound carriageway center (east/inland side)
export const S_START = 0;                 // KM 0 (Rizal Monument)
export const S_QUIRINO_UTURN = 1580;      // 21KM Last U-Turn at Quirino Ave
export const S_HYDRATION = 1920;          // PH Navy Hydration Station (5KM / 10KM)
export const S_UTURN = 2088;              // P. Ocampo U-turn apex start
export const S_KATIGBAK = -272;           // Katigbak Drive / Padre Burgos Ave intersection
export const S_ANDA_CIRCLE = -1040;       // 21KM Anda Circle U-turn on Bonifacio Drive
export const KATIGBAK_WEST_OFFSET = -238; // Quirino Grandstand / Independence Rd west offset
export const CORNER_RADIUS = 18;          // Smooth corner fillet radius at intersections

// 10KM Padre Burgos Ave & Finance Road constants
export const PB_LANE_OUT_S = S_KATIGBAK + 7.5;
export const PB_LANE_RET_S = S_KATIGBAK - 7.5;
export const PB_GEN_LUNA_OFFSET = 610;
export const PB_FORK_OFFSET = 710;
export const FINANCE_ANGLE_DEG = 18;
export const FINANCE_LEN = 355;

export function createLineSegment(p0, p1) {
  const length = p0.distanceTo(p1);
  const dir = p1.clone().sub(p0).normalize();
  return {
    type: 'line',
    length,
    sample(d) {
      return {
        position: p0.clone().addScaledVector(dir, d),
        tangent: dir.clone()
      };
    }
  };
}

/**
 * Circular arc in the XZ plane.
 * Positive sweepRad = counter-clockwise from above (LEFT turn).
 * Negative sweepRad = clockwise from above (RIGHT turn).
 */
export function createArcSegment(center, radius, startDir, sweepRad) {
  const length = Math.abs(sweepRad) * radius;
  const sign = Math.sign(sweepRad);
  const up = new THREE.Vector3(0, 1, 0);

  return {
    type: 'arc',
    length,
    sample(d) {
      const frac = length > 0 ? d / length : 0;
      const angle = sweepRad * frac;
      const radial = startDir.clone().applyAxisAngle(up, angle);
      const position = center.clone().addScaledVector(radial, radius);
      const tangent = radial.clone().applyAxisAngle(up, sign * Math.PI * 0.5).normalize();
      return { position, tangent };
    }
  };
}

/**
 * Convert an array of waypoints [{ pos: THREE.Vector3, radius?: number, tag?: string }]
 * into a continuous chain of Line + Circular Arc segments with smooth rounded corners,
 * returning { segments, tagDistances }.
 */
export function buildFilletedPath(waypoints, defaultRadius = 18) {
  const n = waypoints.length;
  const entries = new Array(n);
  const exits = new Array(n);
  const arcs = new Array(n).fill(null);

  entries[0] = waypoints[0].pos.clone();
  exits[0] = waypoints[0].pos.clone();
  entries[n - 1] = waypoints[n - 1].pos.clone();
  exits[n - 1] = waypoints[n - 1].pos.clone();

  for (let i = 1; i < n - 1; i++) {
    const prev = waypoints[i - 1].pos;
    const curr = waypoints[i].pos;
    const next = waypoints[i + 1].pos;

    const vIn = curr.clone().sub(prev);
    const vOut = next.clone().sub(curr);
    const lenIn = vIn.length();
    const lenOut = vOut.length();

    if (lenIn < 0.01 || lenOut < 0.01) {
      entries[i] = curr.clone();
      exits[i] = curr.clone();
      continue;
    }

    const u1 = vIn.divideScalar(lenIn);
    const u2 = vOut.divideScalar(lenOut);
    const dot = THREE.MathUtils.clamp(u1.dot(u2), -1, 1);
    const turnAngle = Math.acos(dot); // 0 = straight, PI = 180° reversal

    if (turnAngle < 0.03 || turnAngle > Math.PI - 0.03) {
      entries[i] = curr.clone();
      exits[i] = curr.clone();
      continue;
    }

    const desiredR = waypoints[i].radius ?? defaultRadius;
    const maxTrim = Math.min(lenIn, lenOut) * 0.44;
    const tanHalf = Math.tan(turnAngle * 0.5);
    let trim = desiredR * tanHalf;
    let r = desiredR;
    if (trim > maxTrim) {
      trim = maxTrim;
      r = trim / tanHalf;
    }

    const pA = curr.clone().addScaledVector(u1, -trim);
    const pB = curr.clone().addScaledVector(u2, trim);

    // Cross Y in Three.js XZ plane: +1 = LEFT turn (CCW from +Y), -1 = RIGHT turn (CW)
    const crossY = u1.z * u2.x - u1.x * u2.z;
    const sign = crossY >= 0 ? 1 : -1;
    const leftNormal = new THREE.Vector3(u1.z, 0, -u1.x);
    const center = pA.clone().addScaledVector(leftNormal, sign * r);
    const startDir = pA.clone().sub(center).normalize();

    entries[i] = pA;
    exits[i] = pB;
    arcs[i] = createArcSegment(center, r, startDir, sign * turnAngle);
  }

  const segments = [];
  const tagDistances = {};
  let acc = 0;

  if (waypoints[0].tag) tagDistances[waypoints[0].tag] = 0;

  for (let i = 0; i < n - 1; i++) {
    const startPt = exits[i];
    const endPt = entries[i + 1];
    if (startPt.distanceTo(endPt) > 0.05) {
      const line = createLineSegment(startPt, endPt);
      segments.push(line);
      acc += line.length;
    }
    const arc = arcs[i + 1];
    if (arc) {
      const arcMidDist = acc + arc.length * 0.5;
      segments.push(arc);
      acc += arc.length;
      if (waypoints[i + 1].tag) {
        tagDistances[waypoints[i + 1].tag] = arcMidDist;
      }
    } else if (waypoints[i + 1].tag) {
      tagDistances[waypoints[i + 1].tag] = acc;
    }
  }

  return { segments, tagDistances, totalLength: acc };
}

export function bearingAndCompass(tangent) {
  let bearingDeg = THREE.MathUtils.radToDeg(Math.atan2(tangent.x, -tangent.z));
  if (bearingDeg < 0) bearingDeg += 360;
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const compassDir = dirs[Math.round(bearingDeg / 22.5) % 16];
  return { bearingDeg, compassDir };
}
