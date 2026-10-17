
/*
 * POPClub V2 — CTA GLB Layer
 * Adapted from Six-Card Viewer V7
 *
 * Assets: Six GLBs + animation.json
 * Trigger: cta:coin-complete
 * Animation: Blender frames 25–65
 * Reset: CTA exits viewport + 20vh
 */

(async () => {
  "use strict";

  const HOST = ".cta_glb_layer";
  const SECTION = ".section_cta";

  const BASE =
    "https://cdn.jsdelivr.net/gh/blackonionspace-spec/POPClub-Website-V2@18a86d5298fe95b24680480ab031b5891efff713/cta-3d/";

  const section = document.querySelector(SECTION);
  const host = document.querySelector(HOST);

  if (!section || !host) {
    console.warn("[CTA GLB] Section or layer missing.");
    return;
  }

  if (host.dataset.ctaGlbInitialized === "true") return;
  host.dataset.ctaGlbInitialized = "true";

  let requested = false;
  let ready = false;
  let playing = false;
  let settled = false;

  let elapsed = 0;
  let floatElapsed = 0;
  let sceneTime = 0;
  let lastTime = 0;

  const FPS_START = 25;
  const FPS_END = 65;
  const RESET_OVERSHOOT = 0.2;

  const GLB_START_TIME = 1.42; // Seconds after coin starts

section.addEventListener("cta:coin-start", () => {
  gsap.delayedCall(GLB_START_TIME, () => {
    requested = true;
    if (ready) start();
  });
});

  // -----------------------------------------------
  // Import Three.js
  // -----------------------------------------------

  let THREE, GLTFLoader;

  try {
    [THREE, { GLTFLoader }] = await Promise.all([
      import("three"),
      import("three/addons/loaders/GLTFLoader.js")
    ]);
  } catch (error) {
    console.error("[CTA GLB] Three.js import failed", error);
    return;
  }

  // -----------------------------------------------
  // Scene and renderer
  // -----------------------------------------------

  const scene = new THREE.Scene();

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, 2)
  );

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.setClearColor(0x000000, 0);

  renderer.domElement.style.cssText = [
    "position:absolute",
    "inset:0",
    "width:100%",
    "height:100%",
    "display:block",
    "pointer-events:none"
  ].join(";");

  host.appendChild(renderer.domElement);
  host.style.pointerEvents = "none";

  // -----------------------------------------------
  // V7 camera
  // -----------------------------------------------

  const axis = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    -Math.PI / 2
  );

  const axisInverse = axis.clone().invert();

  const focalLength = 85;

  const camera = new THREE.PerspectiveCamera(
    12, 16 / 9, 0.1, 1000
  );

  camera.position.set(
    -0.004163948300020308,
    11.566847194137651,
    0.13761279552284753
  );

  camera.quaternion.copy(axis);

  function resize() {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);

    renderer.setSize(w, h, false);

    const baseVFov = 2 * Math.atan(
      36 / (2 * focalLength * (16 / 9))
    );

    const ratio = w / h;

    const vfov = ratio < 16 / 9
      ? 2 * Math.atan(
          Math.tan(baseVFov / 2) * (16 / 9) / ratio
        )
      : baseVFov;

    camera.aspect = ratio;
    camera.fov = THREE.MathUtils.radToDeg(vfov);
    camera.updateProjectionMatrix();
  }

  window.addEventListener("resize", resize);
  resize();

  // -----------------------------------------------
  // V7 lighting
  // -----------------------------------------------

  scene.add(new THREE.AmbientLight(0xffffff, 1));

  const warm = new THREE.PointLight(
    0xff651a, 90, 0, 2
  );

  warm.position.set(-2, 2, 2);
  scene.add(warm);

  const highlightColors = [
    0xffa45c,
    0xff752d,
    0xffc18a,
    0xff8a40,
    0xffb46c,
    0xff7025
  ];

  const cardHighlights = highlightColors.map(color => {
    const light = new THREE.PointLight(
      color, 36, 6.5, 2
    );
    scene.add(light);
    return light;
  });

  const fill = new THREE.DirectionalLight(
    0xffffff, 1
  );

  fill.position.set(3, 4, 5);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(
    0xff9d56, 5
  );

  rim.position.set(-3, -2, -4);
  scene.add(rim);

  // -----------------------------------------------
  // V7 assets
  // -----------------------------------------------

  const files = {
    Card_bill: "Bill.glb",
    Card_card: "Card.glb",
    Card_coin: "Coin.glb",
    Card_energy: "Energy.glb",
    Card_npci: "NPCI.glb",
    Card_qr: "QR.glb"
  };

  const cardObjects = {};
  let data;

  function fromBlender(p) {
    return new THREE.Vector3(
      p[0], p[2], -p[1]
    );
  }

  function qFromBlender(q) {
    const raw = new THREE.Quaternion(
      q[1], q[2], q[3], q[0]
    );

    return axis.clone()
      .multiply(raw)
      .multiply(axisInverse)
      .normalize();
  }

  function scaleMultiplier(f) {
    const t = THREE.MathUtils.clamp(
      (f - 25) / 40, 0, 1
    );

    return 1 + 0.5 * (
      t * t * (3 - 2 * t)
    );
  }

  function applyTransform(
    group, s, multiplier = 1.5
  ) {
    group.position.copy(
      fromBlender(s.position)
    );

    group.quaternion.copy(
      qFromBlender(s.quaternion)
    );

    group.scale.set(
      s.scale[0] * multiplier,
      s.scale[1] * multiplier,
      s.scale[2] * multiplier
    );
  }

  function sampleAt(samples, f) {
    const i = Math.min(
      samples.length - 2,
      Math.max(0, Math.floor(f - 25))
    );

    const a = samples[i];
    const b = samples[i + 1];

    const t = THREE.MathUtils.clamp(
      f - a.frame, 0, 1
    );

    const q1 = new THREE.Quaternion(
      a.quaternion[1],
      a.quaternion[2],
      a.quaternion[3],
      a.quaternion[0]
    );

    const q2 = new THREE.Quaternion(
      b.quaternion[1],
      b.quaternion[2],
      b.quaternion[3],
      b.quaternion[0]
    );

    q1.slerp(q2, t);

    return {
      position: a.position.map(
        (v, j) => THREE.MathUtils.lerp(
          v, b.position[j], t
        )
      ),

      scale: a.scale.map(
        (v, j) => THREE.MathUtils.lerp(
          v, b.scale[j], t
        )
      ),

      quaternion: [
        q1.w, q1.x, q1.y, q1.z
      ]
    };
  }

  function setFrame(f) {
    for (
      const [name, entry]
      of Object.entries(data.cards)
    ) {
      applyTransform(
        cardObjects[name],
        sampleAt(entry.samples, f),
        scaleMultiplier(f)
      );
    }
  }

  // -----------------------------------------------
  // Animation reset and start
  // -----------------------------------------------

  function reset() {
    requested = false;
    playing = false;
    settled = false;

    elapsed = 0;
    floatElapsed = 0;

    if (ready) setFrame(FPS_START);

    renderer.domElement.style.visibility =
      "hidden";
  }

  function start() {
    if (
      !ready ||
      !requested ||
      playing ||
      settled
    ) return;

    playing = true;
    elapsed = 0;
    floatElapsed = 0;

    setFrame(FPS_START);

    renderer.domElement.style.visibility =
      "visible";

    console.log(
      "[CTA GLB] V7 explosion started."
    );
  }

  renderer.domElement.style.visibility =
    "hidden";

  function checkReset() {
    const rect =
      section.getBoundingClientRect();

    const extra =
      window.innerHeight * RESET_OVERSHOOT;

    if (
      rect.bottom < -extra ||
      rect.top > window.innerHeight + extra
    ) {
      if (
        requested ||
        playing ||
        settled
      ) reset();
    }
  }

  window.addEventListener(
    "scroll",
    checkReset,
    { passive: true }
  );

  window.addEventListener(
    "resize",
    checkReset
  );

  // -----------------------------------------------
  // Load animation.json and six GLBs
  // -----------------------------------------------

  try {
    const response = await fetch(
      BASE + "animation.json"
    );

    if (!response.ok) {
      throw new Error(
        "animation.json HTTP " + response.status
      );
    }

    data = await response.json();

    const loader = new GLTFLoader();

    await Promise.all(
      Object.entries(files).map(
        async ([name, file]) => {
          const gltf = await loader.loadAsync(
            BASE + file
          );

          const group = new THREE.Group();

          group.name = name;
          group.add(gltf.scene);
          scene.add(group);

          cardObjects[name] = group;

          gltf.scene.traverse(object => {
            if (!object.isMesh) return;

            const meshName =
              object.name.toLowerCase();

            if (meshName.includes("glass")) {
              const material = object.material;

              material.ior = 1.5;
              material.thickness = 0.15;
              material.roughness = 0.30;
              material.specularIntensity = 0.65;
              material.envMapIntensity = 0.65;
              material.needsUpdate = true;

            } else if (
              meshName.includes("artwork")
            ) {
              const original = object.material;

              const unlit =
                new THREE.MeshBasicMaterial({
                  map: original.map || null,
                  color: 0xffffff,
                  transparent: original.transparent,
                  opacity: original.opacity,
                  side: original.side,
                  alphaTest: original.alphaTest,
                  depthWrite: original.depthWrite,
                  toneMapped: false
                });

              if (unlit.map) {
                unlit.map.colorSpace =
                  THREE.SRGBColorSpace;
              }

              object.material = unlit;
            }
          });
        }
      )
    );

    ready = true;
    setFrame(FPS_START);

    console.log(
      "[CTA GLB] All six V7 models loaded."
    );

    checkReset();

    if (requested) start();

  } catch (error) {
    console.error(
      "[CTA GLB] Failed to load V7 assets",
      error
    );
    return;
  }

  // -----------------------------------------------
  // Render loop
  // -----------------------------------------------

  function animate(now) {
    requestAnimationFrame(animate);

    const dt = lastTime
      ? Math.min(
          (now - lastTime) / 1000,
          0.05
        )
      : 0;

    lastTime = now;

    if (
      !requested &&
      !playing &&
      !settled
    ) return;

    sceneTime += dt;

    const lightTime = sceneTime * 1.5;

    warm.intensity = 90 * (
      1 +
      0.09 * Math.sin(lightTime * 0.9) +
      0.045 * Math.sin(lightTime * 1.7)
    );

    warm.position.set(
      -2 + 0.55 * Math.sin(lightTime * 0.43),
      2 + 0.35 * Math.cos(lightTime * 0.39),
      2 + 0.45 * Math.cos(lightTime * 0.32)
    );

    let i = 0;

    for (
      const entry
      of Object.values(data.cards)
    ) {
      const p = fromBlender(
        entry.samples.at(-1).position
      );

      const lamp = cardHighlights[i];
      const phase = i * 2.39996;

      lamp.position.set(
        p.x + 0.75 * Math.cos(
          lightTime * 0.43 + phase
        ),
        p.y + 2.5 + 0.45 * Math.sin(
          lightTime * 0.37 + phase
        ),
        p.z + 0.75 * Math.sin(
          lightTime * 0.51 + phase
        )
      );

      lamp.intensity =
        90 * 0.48 * (
          0.90 +
          0.10 * Math.sin(
            lightTime * 0.78 + phase
          )
        );

      i++;
    }

    // Play Blender animation frames 25–65

    if (playing) {
      elapsed += dt;

      const frame =
        FPS_START + elapsed * data.fps;

      if (frame < FPS_END) {
        setFrame(frame);
      } else {
        setFrame(FPS_END);

        playing = false;
        settled = true;
        floatElapsed = 0;
      }

    } else if (settled) {

      // V7 perpetual floating

      floatElapsed += dt;

      const strength = 1;

      const fade =
        1 - Math.exp(
          -floatElapsed * 1.7
        );

      let index = 0;

      for (
        const [name, entry]
        of Object.entries(data.cards)
      ) {
        const group = cardObjects[name];

        const rest =
          entry.samples.at(-1);

        const reference =
          entry.float_reference;

        applyTransform(group, rest);

        const baseQ =
          qFromBlender(rest.quaternion);

        const targetQ =
          qFromBlender(reference.quaternion);

        const delta =
          baseQ.clone()
            .invert()
            .multiply(targetQ);

        const phase = index * 1.71;

        const amplitude =
          0.5 +
          0.5 * Math.sin(
            floatElapsed * 0.55 + phase
          );

        const s = fade * strength;

        const qOffset =
          new THREE.Quaternion()
            .identity()
            .slerp(
              delta,
              Math.min(
                1,
                s * amplitude * 0.85
              )
            );

        group.quaternion.multiply(qOffset);

        group.position.x +=
          Math.sin(
            floatElapsed * 0.72 + phase
          ) * 0.025 * s;

        group.position.y +=
          Math.sin(
            floatElapsed * 0.85 +
            phase * 0.8
          ) * 0.035 * s;

        group.position.z +=
          Math.cos(
            floatElapsed * 0.65 + phase
          ) * 0.025 * s;

        index++;
      }
    }

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);

  console.log(
    "[CTA GLB] Webflow V7 initialized."
  );

})();
