import * as THREE from 'three';
import {
  ROXAS_ANGLE_RAD,
  toWorld,
  S_QUIRINO_UTURN,
  S_UTURN,
  S_KATIGBAK,
  S_ANDA_CIRCLE,
  KATIGBAK_WEST_OFFSET,
  PB_GEN_LUNA_OFFSET,
  PB_FORK_OFFSET,
  FINANCE_ANGLE_DEG,
  FINANCE_LEN
} from './routeCommon.js';
import { ROUTE_5KM } from './route5km.js';
import { ROUTE_10KM } from './route10km.js';
import { ROUTE_21KM, LANDMARKS_21KM } from './route21km.js';

/**
 * Helper: create a box positioned in Roxas-aligned coordinates (s, offset, y)
 * with dimensions (lengthAlongS, heightY, widthAlongEast).
 */
function makeRoxasBox(lenS, height, widthE, material, s, offset, y = height / 2) {
  const geo = new THREE.BoxGeometry(widthE, height, lenS);
  const mesh = new THREE.Mesh(geo, material);
  const pos = toWorld(s, offset, y);
  mesh.position.copy(pos);
  mesh.rotation.y = ROXAS_ANGLE_RAD;
  return mesh;
}

/**
 * Build the 3D Manila / Luneta / Roxas Blvd / Padre Burgos / Finance Rd environment:
 *  - Land & Manila Bay animated water + Baywalk seawall + Manila Yacht Club harbor
 *  - Roxas Boulevard dual carriageway, lane markings, palm-tree median, cross streets
 *  - Katigbak Drive & Quirino Grandstand Parade Ground
 *  - Padre Burgos Avenue, Finance Road, Gen. Luna St & Taft Ave (for 10KM route)
 *  - Rizal Park (Luneta Park) + Rizal Monument (KM 0)
 *  - Intramuros Golf Course & Stone Fortification Walls + National Museum of Fine Arts
 *  - Quirino Grandstand structure & PH Navy HQ compound
 *  - Stylized Ermita / Malate / Intramuros city blocks (toggleable)
 *  - Swappable 3D Route Ribbon + Directional Chevron Arrows (5KM yellow / 10KM red)
 */
export function buildEnvironment(scene, initialRoute = ROUTE_5KM) {
  const envGroup = new THREE.Group();
  const cityGroup = new THREE.Group();
  const routeOverlayGroup = new THREE.Group();
  envGroup.add(cityGroup);
  envGroup.add(routeOverlayGroup);

  // ---------------------------------------------------------------------------
  // 1. Base Land (East / Inland) & Manila Bay Water (West)
  //    Clean vertical elevation hierarchy (ZERO z-fighting!):
  //    Manila Bay (-0.95) < Land (0.00) < Pasig River (+0.03) < Park/Golf (+0.035)
  //    < Roads (+0.08) < Bridges (+0.12) < Route Border (+0.19) < Route Ribbon (+0.23)
  // ---------------------------------------------------------------------------
  const landMat = new THREE.MeshLambertMaterial({ color: 0xebe8df });
  const landMesh = makeRoxasBox(6800, 1.0, 3400, landMat, 250, 1660, -0.50);
  landMesh.receiveShadow = true;
  envGroup.add(landMesh);

  // Binondo / North Bank land extending west of Bonifacio Dr north of Pasig River
  const binondoLand = makeRoxasBox(1300, 1.0, 820, landMat, -1860, -450, -0.50);
  envGroup.add(binondoLand);

  // Quirino Grandstand / Luneta Waterfront Peninsula (top cleanly at y = -0.005 so no z-fight with landMesh)
  const peninsulaMat = new THREE.MeshLambertMaterial({ color: 0xe6e2d8 });
  const peninsula = makeRoxasBox(560, 1.0, 320, peninsulaMat, -120, -198, -0.505);
  peninsula.receiveShadow = true;
  envGroup.add(peninsula);

  // Port Area waterfront land & Manila South Harbor piers (west of Bonifacio Drive, cleanly separated from peninsula)
  const portLand = makeRoxasBox(760, 1.0, 280, peninsulaMat, -830, -178, -0.505);
  envGroup.add(portLand);
  const pierMat = new THREE.MeshLambertMaterial({ color: 0xb8b2a4 });
  for (let i = 0; i < 3; i++) {
    const pier = makeRoxasBox(38, 0.9, 190, pierMat, -600 - i * 175, -410, -0.52);
    envGroup.add(pier);
  }

  // Manila Bay Water Plane (cleanly below all land at y = -0.95!)
  const waterGeo = new THREE.PlaneGeometry(4600, 7800, 32, 32);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x7abde8,
    roughness: 0.25,
    metalness: 0.12
  });
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  const waterCenter = toWorld(250, -2100, -0.95);
  waterMesh.position.copy(waterCenter);
  waterMesh.rotation.y = ROXAS_ANGLE_RAD;
  waterMesh.receiveShadow = true;
  envGroup.add(waterMesh);

  // Pasig River flowing east-west cleanly ABOVE land (y = +0.03) and UNDER both bridges (y = +0.12)!
  const riverMat = new THREE.MeshStandardMaterial({
    color: 0x56a3d5,
    roughness: 0.25,
    metalness: 0.12
  });
  const pasigRiver = makeRoxasBox(145, 0.04, 2400, riverMat, -1205, 580, 0.015);
  pasigRiver.rotation.y = ROXAS_ANGLE_RAD - 0.12;
  envGroup.add(pasigRiver);

  // Baywalk Promenade & Seawall along Roxas Blvd
  const baywalkMat = new THREE.MeshLambertMaterial({ color: 0xd9d4c7 });
  const seawallMat = new THREE.MeshLambertMaterial({ color: 0xb8b2a4 });
  const baywalk = makeRoxasBox(2900, 0.28, 22, baywalkMat, 1100, -29, 0.04);
  baywalk.receiveShadow = true;
  envGroup.add(baywalk);

  const seawall = makeRoxasBox(2900, 1.2, 2.5, seawallMat, 1100, -41, -0.15);
  envGroup.add(seawall);

  // Manila Yacht Club Breakwater & Sailboats
  const harborBreakwater1 = makeRoxasBox(260, 1.3, 10, seawallMat, 1520, -165, -0.1);
  const harborBreakwater2 = makeRoxasBox(10, 1.3, 130, seawallMat, 1395, -102, -0.1);
  const harborBreakwater3 = makeRoxasBox(10, 1.3, 130, seawallMat, 1650, -102, -0.1);
  envGroup.add(harborBreakwater1, harborBreakwater2, harborBreakwater3);

  const hullMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const sailMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc, side: THREE.DoubleSide });
  const mastMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
  for (let i = 0; i < 10; i++) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.2, 7.5), hullMat);
    hull.position.y = 0.2;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 8, 6), mastMat);
    mast.position.y = 4.2;
    const sail = new THREE.Mesh(new THREE.ConeGeometry(1.8, 6.2, 3), sailMat);
    sail.position.set(0, 4.3, 0.8);
    boat.add(hull, mast, sail);
    const bPos = toWorld(1430 + i * 21, -78 - (i % 3) * 24, -0.45);
    boat.position.copy(bPos);
    boat.rotation.y = ROXAS_ANGLE_RAD + (i % 2 === 0 ? 1.4 : -1.5);
    envGroup.add(boat);
  }

  // ---------------------------------------------------------------------------
  // 2. Road Network: Roxas Blvd, Katigbak Dr, Padre Burgos Ave, Finance Rd
  // ---------------------------------------------------------------------------
  const asphaltMat = new THREE.MeshLambertMaterial({ color: 0x3b4252 });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
  const medianMat = new THREE.MeshLambertMaterial({ color: 0x5da455 });
  const curbMat = new THREE.MeshLambertMaterial({ color: 0xcbd5e1 });

  // Roxas Boulevard + Bonifacio Drive main asphalt (terminates cleanly at Anda Circle!)
  const roxasRoad = makeRoxasBox(3500, 0.08, 36, asphaltMat, 705, 0, 0.04);
  roxasRoad.receiveShadow = true;
  envGroup.add(roxasRoad);

  // Circular paved roundabout apron under Anda Circle
  const andaApron = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 0.08, 28), asphaltMat);
  andaApron.position.set(LANDMARKS_21KM.andaCircle.x, 0.04, LANDMARKS_21KM.andaCircle.z);
  envGroup.add(andaApron);

  // Center planted median along Roxas Blvd & Bonifacio Drive (split cleanly at Anda Circle, Katigbak, Quirino & P. Ocampo!)
  const medianBoni = makeRoxasBox(700, 0.24, 3.6, medianMat, -660, 0, 0.12);
  const medianMainN = makeRoxasBox(1780, 0.24, 3.6, medianMat, 650, 0, 0.12);
  const medianMainS = makeRoxasBox(450, 0.24, 3.6, medianMat, 1835, 0, 0.12);
  const medianSouth = makeRoxasBox(300, 0.24, 3.6, medianMat, 2280, 0, 0.12);
  envGroup.add(medianBoni, medianMainN, medianMainS, medianSouth);

  const curbMainN = makeRoxasBox(1782, 0.16, 4.1, curbMat, 650, 0, 0.08);
  const curbMainS = makeRoxasBox(452, 0.16, 4.1, curbMat, 1835, 0, 0.08);
  envGroup.add(curbMainN, curbMainS);

  // White dashed lane dividers on Roxas Blvd & Bonifacio Drive
  const dashGeo = new THREE.BoxGeometry(0.28, 0.03, 4.5);
  const dashOffsets = [-12.5, -5.5, 5.5, 12.5];
  const dashCountPerLane = 215;
  const dashInst = new THREE.InstancedMesh(dashGeo, dashMat, dashOffsets.length * dashCountPerLane);
  const dummy = new THREE.Object3D();
  let dIdx = 0;
  for (const off of dashOffsets) {
    for (let i = 0; i < dashCountPerLane; i++) {
      const sPos = -520 + i * 13.5;
      const wp = toWorld(sPos, off, 0.095);
      dummy.position.copy(wp);
      dummy.rotation.set(0, ROXAS_ANGLE_RAD, 0);
      dummy.updateMatrix();
      dashInst.setMatrixAt(dIdx++, dummy.matrix);
    }
  }
  dashInst.instanceMatrix.needsUpdate = true;
  envGroup.add(dashInst);

  // Katigbak Drive (westbound from Roxas Blvd to Quirino Grandstand)
  const katigbakRoad = makeRoxasBox(26, 0.08, 290, asphaltMat, S_KATIGBAK, -125, 0.045);
  katigbakRoad.receiveShadow = true;
  envGroup.add(katigbakRoad);

  // Independence Road / Parade Ground avenue
  const indepRoad = makeRoxasBox(420, 0.08, 22, asphaltMat, S_KATIGBAK + 200, KATIGBAK_WEST_OFFSET, 0.045);
  indepRoad.receiveShadow = true;
  envGroup.add(indepRoad);

  // South Drive
  const southDrive = makeRoxasBox(16, 0.08, 250, asphaltMat, 85, -125, 0.04);
  envGroup.add(southDrive);

  // 10KM-specific Padre Burgos east extension, Finance Road, Gen. Luna & Taft Ave
  // (toggled visible only on 10KM so 5KM and 21KM have zero extra stray roads!)
  const roads10kGroup = new THREE.Group();
  envGroup.add(roads10kGroup);

  const padreBurgosLen = PB_FORK_OFFSET + 150;
  const padreBurgosRoad = makeRoxasBox(30, 0.08, padreBurgosLen, asphaltMat, S_KATIGBAK, padreBurgosLen * 0.5, 0.045);
  padreBurgosRoad.receiveShadow = true;
  roads10kGroup.add(padreBurgosRoad);

  const pbMed1 = makeRoxasBox(2.6, 0.22, 540, medianMat, S_KATIGBAK, 310, 0.11);
  const pbMed2 = makeRoxasBox(2.6, 0.22, 95, medianMat, S_KATIGBAK, PB_GEN_LUNA_OFFSET + 62, 0.11);
  roads10kGroup.add(pbMed1, pbMed2);

  // Finance Road (forking 18° right from Padre Burgos Ave toward Taft Ave)
  const finMeta = ROUTE_10KM.financeMeta;
  const finAngleRad = THREE.MathUtils.degToRad(FINANCE_ANGLE_DEG);
  const finRoadYaw = ROXAS_ANGLE_RAD - finAngleRad;
  const finMidDist = FINANCE_LEN * 0.5 + 35;
  const finCenter = finMeta.finOutStart
    .clone()
    .addScaledVector(finMeta.dirLeft, 7.5)
    .addScaledVector(finMeta.dirOut, finMidDist - 40);
  const financeRoad = new THREE.Mesh(
    new THREE.BoxGeometry(FINANCE_LEN + 155, 0.095, 30),
    asphaltMat
  );
  financeRoad.position.set(finCenter.x, 0.045, finCenter.z);
  financeRoad.rotation.y = finRoadYaw;
  financeRoad.receiveShadow = true;
  roads10kGroup.add(financeRoad);

  const finApron = new THREE.Mesh(
    new THREE.CylinderGeometry(18, 18, 0.095, 24),
    asphaltMat
  );
  finApron.position.set(finMeta.uturnCenter.x, 0.045, finMeta.uturnCenter.z);
  roads10kGroup.add(finApron);

  const finMedLen = FINANCE_LEN - 55;
  const finMedCenter = finMeta.finOutStart
    .clone()
    .addScaledVector(finMeta.dirLeft, 7.5)
    .addScaledVector(finMeta.dirOut, finMedLen * 0.5 + 10);
  const finMedian = new THREE.Mesh(
    new THREE.BoxGeometry(finMedLen, 0.22, 2.4),
    medianMat
  );
  finMedian.position.set(finMedCenter.x, 0.11, finMedCenter.z);
  finMedian.rotation.y = finRoadYaw;
  roads10kGroup.add(finMedian);

  const genLunaSt = makeRoxasBox(360, 0.075, 16, asphaltMat, S_KATIGBAK + 180, PB_GEN_LUNA_OFFSET, 0.035);
  roads10kGroup.add(genLunaSt);

  const taftPos = finMeta.uturnCenter.clone().addScaledVector(finMeta.dirOut, 65);
  const taftAve = new THREE.Mesh(new THREE.BoxGeometry(24, 0.08, 1400), asphaltMat);
  taftAve.position.set(taftPos.x, 0.035, taftPos.z + 180);
  taftAve.rotation.y = ROXAS_ANGLE_RAD - 0.12;
  roads10kGroup.add(taftAve);

  // Major East-West Cross Streets east of Roxas Blvd (Kalaw, UN Ave, Pedro Gil, Quirino Ave, P. Ocampo)
  const crossStreetsS = [160, 520, 960, 1480, S_UTURN];
  for (const cs of crossStreetsS) {
    const street = makeRoxasBox(18, 0.07, 740, asphaltMat, cs, 385, 0.008);
    street.receiveShadow = true;
    envGroup.add(street);
  }

  // Parallel inland avenues in Ermita/Malate ONLY south of Rizal Park (s = +170..+2300 — never cutting through Rizal Park or Intramuros!)
  for (const aveOff of [125, 255, 410]) {
    const ave = makeRoxasBox(2130, 0.07, 14, asphaltMat, 1235, aveOff, 0.006);
    envGroup.add(ave);
  }

  // Precompute route points from all 3 routes for guaranteed zero-overlap tree & building placement
  const allRoutePoints = [];
  for (const r of [ROUTE_5KM, ROUTE_10KM, ROUTE_21KM]) {
    for (let i = 0; i < r.densePoints.length; i += 3) {
      allRoutePoints.push(r.densePoints[i].position);
    }
  }

  function isClearOfRoutes(pos, halfW, halfL, extraPad = 20) {
    const clearanceSq = (Math.hypot(halfW, halfL) + extraPad) ** 2;
    for (let i = 0; i < allRoutePoints.length; i++) {
      const rp = allRoutePoints[i];
      const dx = pos.x - rp.x;
      const dz = pos.z - rp.z;
      if (dx * dx + dz * dz < clearanceSq) return false;
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // 3. Royal Palm Trees along Roxas Blvd, Katigbak Dr & Padre Burgos Ave
  // ---------------------------------------------------------------------------
  const trunkGeo = new THREE.CylinderGeometry(0.24, 0.38, 8.5, 6);
  const crownGeo = new THREE.ConeGeometry(3.2, 3.6, 7);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8d6e53 });
  const palmMat = new THREE.MeshLambertMaterial({ color: 0x2f855a });

  const rawPalmPositions = [];
  for (let s = -220; s <= S_UTURN - 45; s += 38) {
    if (Math.abs(s - S_QUIRINO_UTURN) < 35) continue;
    rawPalmPositions.push(toWorld(s, 0, 0));
  }
  for (let s = 120; s <= S_UTURN + 120; s += 42) {
    rawPalmPositions.push(toWorld(s, -26, 0));
  }
  for (let off = -35; off >= -210; off -= 28) {
    rawPalmPositions.push(toWorld(S_KATIGBAK - 16, off, 0));
    rawPalmPositions.push(toWorld(S_KATIGBAK + 16, off, 0));
  }
  // Padre Burgos Avenue boulevard trees
  for (let off = 55; off <= PB_FORK_OFFSET - 15; off += 38) {
    if (Math.abs(off - PB_GEN_LUNA_OFFSET) < 25) continue;
    rawPalmPositions.push(toWorld(S_KATIGBAK - 18, off, 0));
    rawPalmPositions.push(toWorld(S_KATIGBAK + 18, off, 0));
  }

  // Filter out any palm tree that sits too close to ANY 5KM, 10KM, or 21KM route lane!
  const palmPositions = rawPalmPositions.filter((p) => isClearOfRoutes(p, 2, 2, 6.2));

  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, palmPositions.length);
  const crownInst = new THREE.InstancedMesh(crownGeo, palmMat, palmPositions.length);
  palmPositions.forEach((p, idx) => {
    dummy.position.set(p.x, 4.25, p.z);
    dummy.rotation.set(0, idx * 0.7, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(p.x, 9.2, p.z);
    dummy.updateMatrix();
    crownInst.setMatrixAt(idx, dummy.matrix);
  });
  trunkInst.instanceMatrix.needsUpdate = true;
  crownInst.instanceMatrix.needsUpdate = true;
  envGroup.add(trunkInst, crownInst);

  // ---------------------------------------------------------------------------
  // 4. Rizal Park (Luneta Park) & Rizal Monument at KM 0
  // ---------------------------------------------------------------------------
  const parkGrassMat = new THREE.MeshLambertMaterial({ color: 0x88c973 });
  const parkPathMat = new THREE.MeshLambertMaterial({ color: 0xe2ddd2 });
  const rizalPark = makeRoxasBox(390, 0.05, 540, parkGrassMat, -50, 292, 0.01);
  rizalPark.receiveShadow = true;
  envGroup.add(rizalPark);

  const esplanade = makeRoxasBox(68, 0.05, 500, parkPathMat, -50, 275, 0.02);
  envGroup.add(esplanade);

  // Rizal Monument Obelisk right across from KM 0
  const monumentGroup = new THREE.Group();
  const monBaseMat = new THREE.MeshLambertMaterial({ color: 0xd6d3cb });
  const monStoneMat = new THREE.MeshLambertMaterial({ color: 0x9ca3af });
  const bronzeMat = new THREE.MeshLambertMaterial({ color: 0x4b3b2b });

  const plinth1 = new THREE.Mesh(new THREE.BoxGeometry(16, 1.2, 16), monBaseMat);
  plinth1.position.y = 0.6;
  const plinth2 = new THREE.Mesh(new THREE.BoxGeometry(10, 2.2, 10), monStoneMat);
  plinth2.position.y = 2.3;
  const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.7, 13.5, 4), monStoneMat);
  obelisk.position.y = 10.0;
  obelisk.rotation.y = Math.PI / 4;
  const statue = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 3.2, 8), bronzeMat);
  statue.position.set(-2.2, 4.8, 0);
  monumentGroup.add(plinth1, plinth2, obelisk, statue);
  monumentGroup.position.copy(toWorld(-4, 48, 0.1));
  monumentGroup.rotation.y = ROXAS_ANGLE_RAD;
  envGroup.add(monumentGroup);

  // Independence Flagpole
  const flagpoleMat = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 });
  const flagpole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 34, 8), flagpoleMat);
  flagpole.position.copy(toWorld(-4, -56, 17));
  envGroup.add(flagpole);
  const phFlag = new THREE.Mesh(
    new THREE.BoxGeometry(8, 4.2, 0.15),
    new THREE.MeshBasicMaterial({ color: 0x1d4ed8 })
  );
  phFlag.position.copy(toWorld(-4, -60, 31.5));
  phFlag.rotation.y = ROXAS_ANGLE_RAD;
  envGroup.add(phFlag);

  // Park trees inside Rizal Park
  const parkTreeGeo = new THREE.DodecahedronGeometry(4.5, 0);
  const parkTreeMat = new THREE.MeshLambertMaterial({ color: 0x4ca154 });
  const rawParkTreePositions = [];
  for (let s = -220; s <= 120; s += 38) {
    for (let off = 65; off <= 520; off += 48) {
      if (Math.abs(s + 50) < 42) continue;
      rawParkTreePositions.push(toWorld(s, off, 0));
    }
  }
  const parkTreePositions = rawParkTreePositions.filter((p) => isClearOfRoutes(p, 4, 4, 8));
  const pTreeInst = new THREE.InstancedMesh(parkTreeGeo, parkTreeMat, parkTreePositions.length);
  parkTreePositions.forEach((p, idx) => {
    const sc = 0.75 + (idx % 5) * 0.14;
    dummy.position.set(p.x, 4.8 * sc, p.z);
    dummy.rotation.set(0, idx * 1.1, 0);
    dummy.scale.set(sc, sc * 0.9, sc);
    dummy.updateMatrix();
    pTreeInst.setMatrixAt(idx, dummy.matrix);
  });
  pTreeInst.instanceMatrix.needsUpdate = true;
  envGroup.add(pTreeInst);

  // ---------------------------------------------------------------------------
  // 4B. Intramuros Golf Course & Historic Walls + National Museum of Fine Arts (10KM!)
  // ---------------------------------------------------------------------------
  const golfMat = new THREE.MeshLambertMaterial({ color: 0x76c265 });
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x9e9585 });
  // Intramuros Golf Course green belt north of Padre Burgos Avenue (top at y = +0.035, cleanly BELOW roads at +0.08!)
  const golfCourse = makeRoxasBox(140, 0.05, 620, golfMat, S_KATIGBAK - 95, 390, 0.01);
  envGroup.add(golfCourse);

  // Historic Intramuros stone fortification wall (positioned cleanly west of Gen. Luna St so no route passes through it)
  const intraWall = makeRoxasBox(10, 7.5, 220, wallMat, S_KATIGBAK - 155, 190, 3.75);
  const intraBastion = makeRoxasBox(24, 8.5, 24, wallMat, S_KATIGBAK - 155, 85, 4.25);
  envGroup.add(intraWall, intraBastion);

  // National Museum of Fine Arts (Neoclassical landmark on south side of Padre Burgos / Finance Rd)
  const nmGroup = new THREE.Group();
  const nmStone = new THREE.MeshLambertMaterial({ color: 0xf4efe6 });
  const nmRoof = new THREE.MeshLambertMaterial({ color: 0x64748b });
  const nmBody = new THREE.Mesh(new THREE.BoxGeometry(118, 18, 42), nmStone);
  nmBody.position.set(0, 9, 0);
  const nmPortico = new THREE.Mesh(new THREE.BoxGeometry(36, 19.5, 10), nmStone);
  nmPortico.position.set(0, 9.75, -24);
  const nmPediment = new THREE.Mesh(new THREE.ConeGeometry(22, 6, 4), nmRoof);
  nmPediment.position.set(0, 21.5, -24);
  nmPediment.rotation.y = Math.PI / 4;
  nmPediment.scale.set(1.2, 1, 0.35);
  nmGroup.add(nmBody, nmPortico, nmPediment);
  for (let cx = -14; cx <= 14; cx += 5.6) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.75, 16, 8), nmStone);
    col.position.set(cx, 8.5, -29.5);
    nmGroup.add(col);
  }
  const nmPos = toWorld(S_KATIGBAK + 72, PB_FORK_OFFSET + 65, 0);
  nmGroup.position.copy(nmPos);
  nmGroup.rotation.y = finRoadYaw;
  envGroup.add(nmGroup);

  // ---------------------------------------------------------------------------
  // 4C. 21KM Manila Heritage Landmarks: Jones Bridge, Binondo-Intramuros Bridge,
  //     Binondo Church, Anda Circle Monument & Intramuros/Binondo Paved Roadbed
  // ---------------------------------------------------------------------------
  // Crisp 18m-wide dark asphalt roadbeds for the 10KM & 21KM Intramuros / Binondo loops
  const loop10Roadbed = buildRouteRibbon(ROUTE_10KM.densePoints, 18.0, 0.085, 0x3b4252);
  const loop21Roadbed = buildRouteRibbon(ROUTE_21KM.densePoints, 18.0, 0.085, 0x3b4252);
  envGroup.add(loop10Roadbed, loop21Roadbed);

  // Helper to build a clean 26m-wide bridge spanning between two points across Pasig River
  // Deck top surface sits at y = +0.12 (cleanly ABOVE Pasig River +0.03 & roadbed +0.085, BELOW route ribbon +0.23!)
  function buildBridge(pSouth, pNorth, style = 'jones') {
    const bGroup = new THREE.Group();
    const len = pSouth.distanceTo(pNorth);
    const mid = pSouth.clone().add(pNorth).multiplyScalar(0.5);
    const dir = pNorth.clone().sub(pSouth).normalize();
    const yaw = Math.atan2(dir.x, dir.z);

    const deckMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(26, 0.6, len), deckMat);
    deck.position.set(0, -0.18, 0); // top surface at y = +0.12!
    bGroup.add(deck);

    // Subtle center divider line on bridge deck
    const centerLine = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.03, len - 4),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    centerLine.position.set(0, 0.135, 0);
    bGroup.add(centerLine);

    if (style === 'jones') {
      // Neoclassical Jones Bridge: cream stone parapets + golden lamp posts on OUTER edges (±13.2m)
      const stoneMat = new THREE.MeshLambertMaterial({ color: 0xf5f0e1 });
      const lampMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const poleMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
      for (const sx of [-13.2, 13.2]) {
        const parapet = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.8, len), stoneMat);
        parapet.position.set(sx, 1.0, 0);
        bGroup.add(parapet);
        for (let z = -len * 0.40; z <= len * 0.40; z += 38) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 5.2, 6), poleMat);
          post.position.set(sx, 3.8, z);
          const globe = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), lampMat);
          globe.position.set(sx, 6.6, z);
          bGroup.add(post, globe);
        }
      }
    } else {
      // Modern Binondo–Intramuros Bridge: twin silver-blue steel arches on OUTER edges (±13.0m)
      const steelMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
      const cableMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
      const archRadius = len * 0.42;
      for (const sx of [-13.0, 13.0]) {
        const arch = new THREE.Mesh(
          new THREE.TorusGeometry(archRadius, 0.85, 8, 28, Math.PI),
          steelMat
        );
        arch.rotation.y = Math.PI / 2;
        arch.position.set(sx, 0.65, 0);
        bGroup.add(arch);

        for (let i = -5; i <= 5; i++) {
          const z = (i / 6) * (archRadius * 0.95);
          const h = Math.sqrt(Math.max(1, archRadius * archRadius - z * z));
          const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, h, 5), cableMat);
          cable.position.set(sx, h * 0.5 + 0.65, z);
          bGroup.add(cable);
        }

        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.3, len), steelMat);
        rail.position.set(sx, 0.75, 0);
        bGroup.add(rail);
      }
    }

    bGroup.position.set(mid.x, 0, mid.z);
    bGroup.rotation.y = yaw;
    return bGroup;
  }

  envGroup.add(buildBridge(LANDMARKS_21KM.jonesSouth, LANDMARKS_21KM.jonesNorth, 'jones'));
  envGroup.add(buildBridge(LANDMARKS_21KM.biBridgeSouth, LANDMARKS_21KM.biBridgeNorth, 'binondo'));

  // Binondo Church (Minor Basilica of St. Lorenzo Ruiz) with iconic octagonal stone belfry
  const churchGroup = new THREE.Group();
  const churchStone = new THREE.MeshLambertMaterial({ color: 0xd9cbb8 });
  const churchRoof = new THREE.MeshLambertMaterial({ color: 0x991b1b });
  const churchNave = new THREE.Mesh(new THREE.BoxGeometry(34, 18, 56), churchStone);
  churchNave.position.set(0, 9, 0);
  const churchPediment = new THREE.Mesh(new THREE.ConeGeometry(24, 9, 4), churchRoof);
  churchPediment.position.set(0, 22, 0);
  churchPediment.rotation.y = Math.PI / 4;
  const belfry1 = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 7.2, 22, 8), churchStone);
  belfry1.position.set(16, 11, 20);
  const belfry2 = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5.6, 14, 8), churchStone);
  belfry2.position.set(16, 29, 20);
  const belfryCap = new THREE.Mesh(new THREE.ConeGeometry(5.2, 7, 8), churchRoof);
  belfryCap.position.set(16, 39.5, 20);
  churchGroup.add(churchNave, churchPediment, belfry1, belfry2, belfryCap);
  churchGroup.position.copy(LANDMARKS_21KM.binondoChurch);
  churchGroup.rotation.y = ROXAS_ANGLE_RAD;
  envGroup.add(churchGroup);

  // Anda Circle Roundabout & Historic Obelisk Monument (6.5m island cleanly inside 15.5m 21KM roundabout loop!)
  const andaGroup = new THREE.Group();
  const andaIsland = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.8, 0.45, 24), parkGrassMat);
  andaIsland.position.y = 0.25;
  const andaBase = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.8, 1.8, 8), monBaseMat);
  andaBase.position.y = 1.3;
  const andaObelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.4, 13, 4), monStoneMat);
  andaObelisk.position.y = 8.6;
  andaGroup.add(andaIsland, andaBase, andaObelisk);
  andaGroup.position.copy(LANDMARKS_21KM.andaCircle);
  envGroup.add(andaGroup);

  // ---------------------------------------------------------------------------
  // 5. Quirino Grandstand & Parade Ground (at FINISH LINE!)
  // ---------------------------------------------------------------------------
  const plazaMat = new THREE.MeshLambertMaterial({ color: 0xdcd7ca });
  const paradeGround = makeRoxasBox(290, 0.05, 165, plazaMat, -45, -135, 0.015);
  paradeGround.receiveShadow = true;
  envGroup.add(paradeGround);

  const gsGroup = new THREE.Group();
  const gsCreamMat = new THREE.MeshLambertMaterial({ color: 0xf7f4ec });
  const gsRoofMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
  const gsTrimMat = new THREE.MeshLambertMaterial({ color: 0x0f1d4a });

  const gsBase = new THREE.Mesh(new THREE.BoxGeometry(24, 5.5, 115), gsCreamMat);
  gsBase.position.set(-22, 2.75, 0);
  const gsStage = new THREE.Mesh(new THREE.BoxGeometry(10, 2.2, 42), gsCreamMat);
  gsStage.position.set(-7, 1.1, 0);
  const gsRoof = new THREE.Mesh(new THREE.BoxGeometry(28, 1.6, 120), gsRoofMat);
  gsRoof.position.set(-20, 13.5, 0);
  const gsFascia = new THREE.Mesh(new THREE.BoxGeometry(28.5, 1.1, 120.5), gsTrimMat);
  gsFascia.position.set(-20, 12.6, 0);
  gsGroup.add(gsBase, gsStage, gsRoof, gsFascia);

  const colGeo = new THREE.CylinderGeometry(0.55, 0.65, 9.0, 8);
  for (let z = -52; z <= 52; z += 13) {
    const col = new THREE.Mesh(colGeo, gsCreamMat);
    col.position.set(-10, 8.0, z);
    gsGroup.add(col);
  }
  gsGroup.position.copy(toWorld(ROUTE_5KM.finalS - 12, KATIGBAK_WEST_OFFSET - 14, 0));
  gsGroup.rotation.y = ROXAS_ANGLE_RAD;
  envGroup.add(gsGroup);

  // ---------------------------------------------------------------------------
  // 6. Philippine Navy Headquarters Compound
  // ---------------------------------------------------------------------------
  const navyWallMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
  const navyRoofMat = new THREE.MeshLambertMaterial({ color: 0x1e3a8a });
  const navyMain = makeRoxasBox(95, 14, 48, navyWallMat, 1955, 58, 7);
  const navyRoof = makeRoxasBox(97, 1.5, 50, navyRoofMat, 1955, 58, 14.75);
  envGroup.add(navyMain, navyRoof);

  // ---------------------------------------------------------------------------
  // 7. Ermita / Malate / Intramuros Urban City Blocks (toggleable)
  // ---------------------------------------------------------------------------
  const bldgGeo = new THREE.BoxGeometry(1, 1, 1);
  const bldgColors = [0xe8e4db, 0xded9ce, 0xd4cfc4, 0xcfd6de, 0xe5dfd5];
  const bldgSpecs = [];

  let seed = 202605;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let s = 195; s <= 2280; s += 54) {
    if (crossStreetsS.some((cs) => Math.abs(s - cs) < 26)) continue;
    for (const colOff of [68, 185, 325, 485]) {
      const w = 26 + rand() * 24;
      const l = 24 + rand() * 22;
      const isFrontRow = colOff < 100;
      const h = isFrontRow ? 22 + rand() * 52 : 12 + rand() * 32;
      const p = toWorld(s + (rand() - 0.5) * 10, colOff + (rand() - 0.5) * 14, h / 2);
      bldgSpecs.push({ pos: p, scale: [w, h, l], colorIdx: Math.floor(rand() * bldgColors.length) });
    }
  }

  // Manila Hotel & Intramuros blocks north of Intramuros wall / Katigbak Dr
  for (let s = -640; s <= -475; s += 58) {
    for (const colOff of [-140, -60, 140, 260, 390, 520, 680]) {
      const w = 32 + rand() * 18;
      const l = 28 + rand() * 16;
      const h = 14 + rand() * 22;
      const p = toWorld(s, colOff, h / 2);
      bldgSpecs.push({ pos: p, scale: [w, h, l], colorIdx: Math.floor(rand() * bldgColors.length) });
    }
  }

  // City blocks east of Taft Ave (framing the 10KM Finance Rd U-turn)
  for (let s = -340; s <= 240; s += 62) {
    for (const colOff of [1180, 1290]) {
      const w = 34 + rand() * 20;
      const l = 30 + rand() * 18;
      const h = 24 + rand() * 36;
      const p = toWorld(s, colOff, h / 2);
      bldgSpecs.push({ pos: p, scale: [w, h, l], colorIdx: Math.floor(rand() * bldgColors.length) });
    }
  }

  // Binondo Chinatown commercial blocks (north of Pasig River)
  for (let s = -1820; s <= -1400; s += 78) {
    for (const colOff of [-120, 60, 440, 580]) {
      const w = 36 + rand() * 22;
      const l = 32 + rand() * 18;
      const h = 22 + rand() * 44;
      const p = toWorld(s, colOff, h / 2);
      bldgSpecs.push({ pos: p, scale: [w, h, l], colorIdx: Math.floor(rand() * bldgColors.length) });
    }
  }

  const cleanBldgSpecs = bldgSpecs.filter((b) =>
    isClearOfRoutes(b.pos, b.scale[0] * 0.5, b.scale[2] * 0.5, 20)
  );

  const bldgMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const bldgInst = new THREE.InstancedMesh(bldgGeo, bldgMat, cleanBldgSpecs.length);
  const tmpColor = new THREE.Color();
  cleanBldgSpecs.forEach((b, idx) => {
    dummy.position.copy(b.pos);
    dummy.rotation.set(0, ROXAS_ANGLE_RAD, 0);
    dummy.scale.set(b.scale[0], b.scale[1], b.scale[2]);
    dummy.updateMatrix();
    bldgInst.setMatrixAt(idx, dummy.matrix);
    tmpColor.setHex(bldgColors[b.colorIdx]);
    bldgInst.setColorAt(idx, tmpColor);
  });
  bldgInst.instanceMatrix.needsUpdate = true;
  bldgInst.instanceColor.needsUpdate = true;
  cityGroup.add(bldgInst);

  // ---------------------------------------------------------------------------
  // 8. Swappable Route Ribbon + Directional Chevrons
  // ---------------------------------------------------------------------------
  function setActiveRoute(route) {
    roads10kGroup.visible = route.id === '10km';
    loop10Roadbed.visible = route.id === '10km';
    loop21Roadbed.visible = route.id === '21km';
    while (routeOverlayGroup.children.length > 0) {
      const child = routeOverlayGroup.children.pop();
      child.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
    }

    const ribbonMesh = buildRouteRibbon(route.densePoints, 5.2, 0.23, route.ribbonColor);
    const ribbonBorder = buildRouteRibbon(route.densePoints, 6.4, 0.19, route.ribbonBorderColor);
    const arrowGroup = buildDirectionalArrows(route, 95, route.arrowColor);
    routeOverlayGroup.add(ribbonBorder, ribbonMesh, arrowGroup);
  }

  setActiveRoute(initialRoute);
  scene.add(envGroup);

  return {
    envGroup,
    cityGroup,
    waterMesh,
    setActiveRoute,
    update(elapsedTime) {
      waterMesh.position.y = -0.95 + Math.sin(elapsedTime * 0.9) * 0.04;
    }
  };
}

function buildRouteRibbon(points, width, yHeight, colorHex) {
  const halfW = width * 0.5;
  const positions = [];
  const indices = [];
  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < points.length; i++) {
    const { position, tangent } = points[i];
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
    const leftPt = position.clone().addScaledVector(right, -halfW);
    const rightPt = position.clone().addScaledVector(right, halfW);

    positions.push(leftPt.x, yHeight, leftPt.z);
    positions.push(rightPt.x, yHeight, rightPt.z);

    if (i < points.length - 1) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2);
      indices.push(base + 1, base + 3, base + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = new THREE.MeshBasicMaterial({
    color: colorHex,
    side: THREE.DoubleSide
  });
  return new THREE.Mesh(geo, mat);
}

function buildDirectionalArrows(route, spacingM, arrowColorHex = 0x0f172a) {
  const group = new THREE.Group();

  const shape = new THREE.Shape();
  shape.moveTo(0, 3.2);
  shape.lineTo(2.4, -1.6);
  shape.lineTo(0.9, -1.6);
  shape.lineTo(0, 0.4);
  shape.lineTo(-0.9, -1.6);
  shape.lineTo(-2.4, -1.6);
  shape.closePath();

  const arrowGeo = new THREE.ShapeGeometry(shape);
  arrowGeo.rotateX(Math.PI / 2);

  const arrowMat = new THREE.MeshBasicMaterial({
    color: arrowColorHex,
    side: THREE.DoubleSide
  });

  const samples = [];
  for (let d = 65; d < route.totalLength - 40; d += spacingM) {
    samples.push(route.sample(d));
  }

  const inst = new THREE.InstancedMesh(arrowGeo, arrowMat, samples.length);
  const dummy = new THREE.Object3D();
  samples.forEach((s, idx) => {
    dummy.position.set(s.position.x, 0.27, s.position.z);
    const yaw = Math.atan2(s.tangent.x, s.tangent.z);
    dummy.rotation.set(0, yaw, 0);
    dummy.updateMatrix();
    inst.setMatrixAt(idx, dummy.matrix);
  });
  inst.instanceMatrix.needsUpdate = true;
  group.add(inst);
  return group;
}
