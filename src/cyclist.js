import * as THREE from 'three';

/**
 * Create a single animated 3D road cyclist (bicycle + rider with pedaling legs & spinning wheels).
 * Forward direction is +Z in local space.
 */
function createSingleCyclist({ jerseyColor = 0xf5c400, helmetColor = 0x0f1d4a, frameColor = 0xdc2626, scale = 1.0 }) {
  const root = new THREE.Group();

  const tireMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
  const rimMat = new THREE.MeshLambertMaterial({ color: 0xcbd5e1 });
  const frameMat = new THREE.MeshLambertMaterial({ color: frameColor });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
  const jerseyMat = new THREE.MeshLambertMaterial({ color: jerseyColor });
  const shortsMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xe2b188 });
  const helmetMat = new THREE.MeshLambertMaterial({ color: helmetColor });

  // Helper to build a wheel with spokes
  function makeWheel() {
    const wheel = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.055, 8, 20), tireMat);
    tire.rotation.y = Math.PI / 2;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.025, 6, 16), rimMat);
    rim.rotation.y = Math.PI / 2;
    wheel.add(tire, rim);
    // 4 cross spokes so rotation is clearly visible
    for (let i = 0; i < 4; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.72, 0.02), rimMat);
      spoke.rotation.x = (i * Math.PI) / 4;
      wheel.add(spoke);
    }
    return wheel;
  }

  const rearWheel = makeWheel();
  rearWheel.position.set(0, 0.46, -0.68);
  const frontWheel = makeWheel();
  frontWheel.position.set(0, 0.46, 0.68);
  root.add(rearWheel, frontWheel);

  // Bicycle Frame
  const topTube = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.82, 6), frameMat);
  topTube.rotation.x = Math.PI / 2;
  topTube.position.set(0, 0.96, 0.05);

  const downTube = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.85, 6), frameMat);
  downTube.rotation.x = -Math.PI / 3.2;
  downTube.position.set(0, 0.72, 0.16);

  const seatTube = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.65, 6), frameMat);
  seatTube.rotation.x = -0.22;
  seatTube.position.set(0, 0.75, -0.28);

  const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.62, 6), frameMat);
  fork.rotation.x = -0.28;
  fork.position.set(0, 0.72, 0.56);

  const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.58, 6), darkMat);
  handlebar.rotation.z = Math.PI / 2;
  handlebar.position.set(0, 1.08, 0.48);

  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.34), darkMat);
  saddle.position.set(0, 1.12, -0.34);

  root.add(topTube, downTube, seatTube, fork, handlebar, saddle);

  // Rider Torso, Head, Helmet, Arms
  const rider = new THREE.Group();
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.28), shortsMat);
  pelvis.position.set(0, 1.22, -0.30);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.58, 0.24), jerseyMat);
  torso.position.set(0, 1.54, -0.06);
  torso.rotation.x = 0.72; // aerodynamic forward lean

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), skinMat);
  head.position.set(0, 1.84, 0.24);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.165, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), helmetMat);
  helmet.position.set(0, 1.87, 0.25);
  helmet.scale.set(0.95, 0.9, 1.22);

  // Arms reaching forward to handlebars
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.042, 0.58, 6), jerseyMat);
    arm.position.set(side * 0.22, 1.38, 0.30);
    arm.rotation.x = -0.58;
    rider.add(arm);
  }
  rider.add(pelvis, torso, head, helmet);
  root.add(rider);

  // Animated Pedaling Legs (left & right hip pivots)
  function makeLeg(side) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.14, 1.18, -0.26);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.42, 6), shortsMat);
    thigh.position.set(0, -0.21, 0);
    const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.038, 0.42, 6), skinMat);
    calf.position.set(0, -0.58, -0.05);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.24), helmetMat);
    shoe.position.set(0, -0.80, 0.02);
    hip.add(thigh, calf, shoe);
    return hip;
  }

  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);
  root.add(leftLeg, rightLeg);

  // Subtle shadow disc underneath the bicycle
  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 16),
    new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.28 })
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.04;
  root.add(shadowDisc);

  root.scale.setScalar(scale);

  return {
    mesh: root,
    animate(distMeters) {
      // Wheel spin based on distance traveled
      const wheelAngle = distMeters / 0.42;
      rearWheel.rotation.x = wheelAngle;
      frontWheel.rotation.x = wheelAngle;

      // Pedaling cadence synced to distance
      const pedalPhase = distMeters * 1.45;
      leftLeg.rotation.x = Math.sin(pedalPhase) * 0.55 - 0.15;
      rightLeg.rotation.x = Math.sin(pedalPhase + Math.PI) * 0.55 - 0.15;
    }
  };
}

/**
 * Create the Lead FunRide Cyclist + a small trailing FunRide peloton (5 riders)
 * so the 5KM simulation looks lively and unmistakable at both close-up and overview scales.
 */
export function buildPeloton(scene) {
  const group = new THREE.Group();

  // Slightly scaled up (1.45x) so cyclist is crisp & readable in 3D road views
  const lead = createSingleCyclist({
    jerseyColor: 0xf5c400, // FunRide Gold
    helmetColor: 0x0f1d4a,
    frameColor: 0xdc2626,
    scale: 1.55
  });

  // Glowing beacon ring under lead cyclist so they're always easy to spot from Map View
  const beaconRing = new THREE.Mesh(
    new THREE.RingGeometry(2.1, 3.0, 24),
    new THREE.MeshBasicMaterial({ color: 0x0f1d4a, side: THREE.DoubleSide })
  );
  beaconRing.rotation.x = -Math.PI / 2;
  beaconRing.position.y = 0.25;
  lead.mesh.add(beaconRing);
  group.add(lead.mesh);

  // Trailing FunRide peloton companions
  const companionSpecs = [
    { lagM: 6.5, lateralM: -2.0, jersey: 0x0284c7, helmet: 0xffffff, frame: 0x0f172a },
    { lagM: 8.5, lateralM: 2.1, jersey: 0xdc2626, helmet: 0x0f1d4a, frame: 0xffffff },
    { lagM: 14.0, lateralM: -1.3, jersey: 0x0d9488, helmet: 0xf5c400, frame: 0x1e293b },
    { lagM: 16.5, lateralM: 1.9, jersey: 0x1d4ed8, helmet: 0xffffff, frame: 0xf5c400 },
    { lagM: 23.0, lateralM: 0.2, jersey: 0xf97316, helmet: 0x0f172a, frame: 0x334155 }
  ];

  const companions = companionSpecs.map((spec) => {
    const c = createSingleCyclist({
      jerseyColor: spec.jersey,
      helmetColor: spec.helmet,
      frameColor: spec.frame,
      scale: 1.4
    });
    group.add(c.mesh);
    return { ...spec, cyclist: c };
  });

  scene.add(group);

  const up = new THREE.Vector3(0, 1, 0);

  return {
    lead,
    group,
    update(route, distM) {
      // Position lead cyclist cleanly above route ribbon (y = 0.23)
      const leadState = route.sample(distM);
      lead.mesh.position.set(leadState.position.x, 0.24, leadState.position.z);
      const leadYaw = Math.atan2(leadState.tangent.x, leadState.tangent.z);
      lead.mesh.rotation.y = leadYaw;
      lead.animate(distM);

      // Position trailing companions along the route
      for (const comp of companions) {
        const cDist = Math.max(0, distM - comp.lagM);
        const st = route.sample(cDist);
        const right = new THREE.Vector3().crossVectors(st.tangent, up).normalize();
        comp.cyclist.mesh.position
          .set(st.position.x, 0.24, st.position.z)
          .addScaledVector(right, comp.lateralM);
        comp.cyclist.mesh.rotation.y = Math.atan2(st.tangent.x, st.tangent.z);
        comp.cyclist.animate(cDist);
        comp.cyclist.mesh.visible = distM > comp.lagM * 0.4;
      }

      return leadState;
    }
  };
}
