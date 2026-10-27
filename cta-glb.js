
/* POPClub V2 — CTA GLB V10 two-pass compositing integration */
(async () => {
  'use strict';

  const section = document.querySelector('.section_cta');
  const host = document.querySelector('.cta_glb_layer');

  if (!section || !host) {
    console.warn('[CTA GLB] Missing CTA section/layer');
    return;
  }

  if (host.dataset.ctaGlbInitialized === 'true') return;
  host.dataset.ctaGlbInitialized = 'true';
  host.style.opacity = '0';

  const BASE =
    'https://cdn.jsdelivr.net/gh/blackonionspace-spec/POPClub-Website-V2@18a86d5298fe95b24680480ab031b5891efff713/cta-3d/';

  const START_DELAY = 1.42;
  const FADE_DURATION = 0.5;
  const RESET_OVERSHOOT = 0.2;
  const START_FRAME = 25;
  const END_FRAME = 65;

  const DRAG_RADIANS_PER_PIXEL = 0.010;
  const RETURN_SPEED = 3.2;
  const DRAG_SMOOTHING = 19;

  const FILES = {
    Card_bill: 'Bill.glb',
    Card_card: 'Card.glb',
    Card_coin: 'Coin.glb',
    Card_energy: 'Energy.glb',
    Card_npci: 'NPCI.glb',
    Card_qr: 'QR.glb'
  };

  let requested = false;
  let ready = false;
  let playing = false;
  let settled = false;

  let elapsed = 0;
  let floatElapsed = 0;
  let sceneTime = 0;
  let lastTime = 0;
  let startTimer = null;
  let generation = 0;

  function resetBoundaryPassed() {
    const r = section.getBoundingClientRect();
    const h = innerHeight;

    return (
      r.bottom < -h * RESET_OVERSHOOT ||
      r.top > h * (1 + RESET_OVERSHOOT)
    );
  }

  function cancelStartTimer() {
    if (startTimer) {
      startTimer.kill();
      startTimer = null;
    }
  }

  section.addEventListener('cta:coin-start', () => {
    cancelStartTimer();

    const token = ++generation;

    if (!window.gsap) {
      console.error('[CTA GLB] GSAP missing');
      return;
    }

    startTimer = gsap.delayedCall(START_DELAY, () => {
      startTimer = null;

      if (token !== generation || resetBoundaryPassed()) return;

      requested = true;
      if (ready) start();
    });
  });

  let THREE, GLTFLoader;

  try {
    [THREE, { GLTFLoader }] = await Promise.all([
      import('three'),
      import('three/addons/loaders/GLTFLoader.js')
    ]);
  } catch (e) {
    console.error('[CTA GLB] Three.js import failed', e);
    return;
  }

  const scene = new THREE.Scene();

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    premultipliedAlpha: false
  });

  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.setClearColor(0x000000, 0);

  renderer.domElement.style.cssText = [
    'position:absolute',
    'inset:0',
    'width:100%',
    'height:100%',
    'display:block',
    'pointer-events:auto',
    'touch-action:none',
    'visibility:hidden',
    'cursor:default'
  ].join(';');

  host.appendChild(renderer.domElement);
  host.style.pointerEvents = 'auto';

  // Approved 85mm camera
  const axis = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    -Math.PI / 2
  );

  const axisInverse = axis.clone().invert();

  const camera = new THREE.PerspectiveCamera(
    12, 16 / 9, 0.1, 1000
  );

  camera.position.set(
    -0.004163948300020308,
    11.566847194137651,
    0.13761279552284753
  );

  camera.quaternion.copy(axis);

  // TWO-PASS COMPOSITING
  // Beauty: render cards against opaque black.
  // Mask: render card silhouettes independently.
  // Composite: preserve beauty RGB with silhouette alpha.

  const beautyTarget = new THREE.WebGLRenderTarget(1, 1, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    colorSpace: THREE.SRGBColorSpace,
    depthBuffer: true,
    samples: 4
  });

  const maskTarget = new THREE.WebGLRenderTarget(1, 1, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: true,
    samples: 4
  });

  const maskMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    depthWrite: true,
    depthTest: true,
    toneMapped: false
  });

  const compositeScene = new THREE.Scene();

  const compositeCamera = new THREE.OrthographicCamera(
    -1, 1, 1, -1, 0, 1
  );

  const compositeMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tBeauty: { value: beautyTarget.texture },
      tMask: { value: maskTarget.texture }
    },
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
    toneMapped: false,

    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,

    fragmentShader: `
      uniform sampler2D tBeauty;
      uniform sampler2D tMask;
      varying vec2 vUv;

      void main() {
        vec3 rgb = texture2D(tBeauty, vUv).rgb;
        float coverage = texture2D(tMask, vUv).r;

        gl_FragColor = vec4(rgb, coverage);
        #include <colorspace_fragment>
      }
    `
  });

  compositeScene.add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      compositeMaterial
    )
  );

  function renderComposited() {
    // Pass 1: black-background V10 appearance
    renderer.setRenderTarget(beautyTarget);
    renderer.setClearColor(0x000000, 1);
    renderer.clear(true, true, true);
    renderer.render(scene, camera);

    // Pass 2: geometry silhouette
    const previousOverride = scene.overrideMaterial;

    scene.overrideMaterial = maskMaterial;

    renderer.setRenderTarget(maskTarget);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, true);
    renderer.render(scene, camera);

    scene.overrideMaterial = previousOverride;

    // Pass 3: transparent output over Webflow video
    renderer.setRenderTarget(null);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, true);
    renderer.render(compositeScene, compositeCamera);
  }

  function resize() {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    const ratio = w / h;

    const originalVFov =
      2 * Math.atan(36 / (2 * 85 * (16 / 9)));

    const vfov = ratio < 16 / 9
      ? 2 * Math.atan(
          Math.tan(originalVFov / 2) * (16 / 9) / ratio
        )
      : originalVFov;

    renderer.setSize(w, h, false);

    const pixelRatio = renderer.getPixelRatio();

    beautyTarget.setSize(
      Math.max(1, Math.round(w * pixelRatio)),
      Math.max(1, Math.round(h * pixelRatio))
    );

    maskTarget.setSize(
      Math.max(1, Math.round(w * pixelRatio)),
      Math.max(1, Math.round(h * pixelRatio))
    );

    camera.aspect = ratio;
    camera.fov = THREE.MathUtils.radToDeg(vfov);
    camera.updateProjectionMatrix();
  }

  window.addEventListener('resize', resize);
  resize();

  // Approved V10 lighting
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
    const lamp = new THREE.PointLight(
      color, 36, 6.5, 2
    );

    scene.add(lamp);
    return lamp;
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

  // Camera-invisible V10 reflection environment
  const envCanvas = document.createElement('canvas');

  envCanvas.width = 1024;
  envCanvas.height = 512;

  const ec = envCanvas.getContext('2d');
  const gradient = ec.createLinearGradient(
    0, 0, 0, 512
  );

  gradient.addColorStop(0, '#260602');
gradient.addColorStop(0.5, '#541305');
gradient.addColorStop(1, '#200401');

  ec.fillStyle = gradient;
  ec.fillRect(0, 0, 1024, 512);

  for (let i = 0; i < 26; i++) {
    const x = (i * 197.7 + 87) % 1024;
    const width = 12 + (i % 5) * 13;

    const g = ec.createLinearGradient(
      x - width, 0, x + width, 0
    );

    g.addColorStop(0, 'rgba(255,75,8,0)');

    g.addColorStop(
      0.5,
      i % 3 === 0
        ? 'rgba(255,190,110,.9)'
        : 'rgba(255,90,20,.7)'
    );

    g.addColorStop(1, 'rgba(255,75,8,0)');

    ec.fillStyle = g;

    ec.fillRect(
      x - width,
      80 + (i % 4) * 24,
      width * 2,
      340 - (i % 4) * 30
    );
  }

  const envTexture = new THREE.CanvasTexture(
    envCanvas
  );

  envTexture.mapping =
    THREE.EquirectangularReflectionMapping;

  envTexture.colorSpace = THREE.SRGBColorSpace;

  scene.environment = envTexture;
  scene.environmentIntensity = 0.65;

  // Models and Blender transforms
  const loader = new GLTFLoader();

  const cardObjects = {};
  const glassMaterials = [];

  let data;

  function fromBlender(p) {
    return new THREE.Vector3(
      p[0], p[2], -p[1]
    );
  }

  function qFromBlender(q) {
    return axis.clone()
      .multiply(
        new THREE.Quaternion(
          q[1], q[2], q[3], q[0]
        )
      )
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

  // Individual-card V10 mouse interaction
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();

  const dragRotations = new Map();
  const identityQuat = new THREE.Quaternion();

  const cameraRight = new THREE.Vector3(1, 0, 0)
    .applyQuaternion(camera.quaternion)
    .normalize();

  const cameraUp = new THREE.Vector3(0, 1, 0)
    .applyQuaternion(camera.quaternion)
    .normalize();

  let drag = null;

  function pickCard(event) {
    const b =
      renderer.domElement.getBoundingClientRect();

    if (!b.width || !b.height) return null;

    pointerNDC.set(
      ((event.clientX - b.left) / b.width) * 2 - 1,
      -((event.clientY - b.top) / b.height) * 2 + 1
    );

    raycaster.setFromCamera(pointerNDC, camera);

    const hits = raycaster.intersectObjects(
      Object.values(cardObjects),
      true
    );

    for (const hit of hits) {
      let node = hit.object;

      while (node && node.parent !== scene) {
        node = node.parent;
      }

      if (
        node &&
        cardObjects[node.name] === node
      ) {
        return node.name;
      }
    }

    return null;
  }

  function releaseDrag(event) {
    if (
      !drag ||
      (event && event.pointerId !== drag.pointerId)
    ) return;

    const state = dragRotations.get(drag.name);

    if (state) state.dragging = false;

    const id = drag.pointerId;
    drag = null;

    if (
      renderer.domElement.hasPointerCapture(id)
    ) {
      renderer.domElement.releasePointerCapture(id);
    }

    renderer.domElement.style.cursor = 'default';
  }

  function resetInteractions() {
    releaseDrag();
    dragRotations.clear();

    renderer.domElement.style.cursor = 'default';
  }

  renderer.domElement.addEventListener(
    'pointerdown',
    event => {
      if (
        !ready ||
        !settled ||
        event.button !== 0
      ) return;

      const name = pickCard(event);
      if (!name) return;

      event.preventDefault();

      drag = {
        name,
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY
      };

      if (!dragRotations.has(name)) {
        dragRotations.set(name, {
          target: new THREE.Quaternion(),
          current: new THREE.Quaternion(),
          dragging: false
        });
      }

      dragRotations.get(name).dragging = true;

      renderer.domElement.setPointerCapture(
        event.pointerId
      );

      renderer.domElement.style.cursor =
        'grabbing';
    }
  );

  renderer.domElement.addEventListener(
    'pointermove',
    event => {
      if (
        drag &&
        drag.pointerId === event.pointerId
      ) {
        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;

        drag.x = event.clientX;
        drag.y = event.clientY;

        const state =
          dragRotations.get(drag.name);

        const horizontal = new THREE.Quaternion()
          .setFromAxisAngle(
            cameraUp,
            dx * DRAG_RADIANS_PER_PIXEL
          );

        const vertical = new THREE.Quaternion()
          .setFromAxisAngle(
            cameraRight,
            dy * DRAG_RADIANS_PER_PIXEL
          );

        state.target
          .premultiply(horizontal)
          .premultiply(vertical)
          .normalize();

      } else if (ready && settled) {
        renderer.domElement.style.cursor =
          pickCard(event) ? 'grab' : 'default';
      }
    }
  );

  renderer.domElement.addEventListener(
    'pointerup', releaseDrag
  );

  renderer.domElement.addEventListener(
    'pointercancel', releaseDrag
  );

  renderer.domElement.addEventListener(
    'lostpointercapture', releaseDrag
  );

  window.addEventListener(
    'blur', () => releaseDrag()
  );

  // Playback and reset
  function reset() {
    generation++;
    cancelStartTimer();

    requested = false;
    playing = false;
    settled = false;

    elapsed = 0;
    floatElapsed = 0;

    resetInteractions();

    renderer.domElement.style.visibility =
  'hidden';

gsap.killTweensOf(host);
gsap.set(host, { opacity: 0 });

if (ready) setFrame(START_FRAME);
  }

  function start() {
    if (
      !ready ||
      !requested ||
      playing ||
      settled ||
      resetBoundaryPassed()
    ) return;

    resetInteractions();

    playing = true;
    elapsed = 0;
    floatElapsed = 0;

    setFrame(START_FRAME);

    renderer.domElement.style.visibility =
  'visible';

gsap.killTweensOf(host);
gsap.to(host, {
  opacity: 1,
  duration: FADE_DURATION,
  ease: 'power2.out'
});

console.log(
  '[CTA GLB] V10 animation started'
);
  }

  function checkReset() {
    if (
      resetBoundaryPassed() &&
      (
        requested ||
        playing ||
        settled ||
        startTimer
      )
    ) {
      reset();
    }
  }

  window.addEventListener(
    'scroll',
    checkReset,
    { passive: true }
  );

  window.addEventListener(
    'resize',
    checkReset
  );

  // Load six GLBs and animation.json
  try {
    const response = await fetch(
      BASE + 'animation.json'
    );

    if (!response.ok) {
      throw new Error(
        'animation.json HTTP ' + response.status
      );
    }

    data = await response.json();

    await Promise.all(
      Object.entries(FILES).map(
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

            if (meshName.includes('glass')) {
              const m = object.material;

              m.ior = 1.5;
              m.thickness = 0.15;
              m.roughness = 0.30;
              m.specularIntensity = 0.65;
              m.envMapIntensity = 0.65;
              m.needsUpdate = true;

              glassMaterials.push(m);

            } else if (
              meshName.includes('artwork')
            ) {
              const original =
                object.material;

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
    setFrame(START_FRAME);
    checkReset();

    if (requested) start();

    console.log(
      '[CTA GLB] V10 assets loaded'
    );

  } catch (e) {
    console.error(
      '[CTA GLB] Asset load failed',
      e
    );
    return;
  }

  // Animation and rendering
  function animate(now) {
    requestAnimationFrame(animate);

    const dt = lastTime
      ? Math.min(
          (now - lastTime) / 1000,
          0.05
        )
      : 0;

    lastTime = now;

    if (!playing && !settled) return;

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

    for (const m of glassMaterials) {
      m.roughness = 0.30;
      m.thickness = 0.15;
      m.specularIntensity = 0.65;
    }

    if (playing) {
      elapsed += dt;

      const f =
        START_FRAME + elapsed * data.fps;

      if (f < END_FRAME) {
        setFrame(f);
      } else {
        setFrame(END_FRAME);

        playing = false;
        settled = true;
        floatElapsed = 0;
      }

    } else if (settled) {
      floatElapsed += dt;

      const fade =
        1 - Math.exp(-floatElapsed * 1.7);

      let index = 0;

      for (
        const [name, entry]
        of Object.entries(data.cards)
      ) {
        const group = cardObjects[name];
        const rest = entry.samples.at(-1);
        const reference = entry.float_reference;

        applyTransform(group, rest);

        const baseQ =
          qFromBlender(rest.quaternion);

        const targetQ =
          qFromBlender(reference.quaternion);

        const delta = baseQ.clone()
          .invert()
          .multiply(targetQ);

        const phase = index * 1.71;

        const amplitude =
          0.5 +
          0.5 * Math.sin(
            floatElapsed * 0.55 + phase
          );

        const s = fade;

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

        const interaction =
          dragRotations.get(name);

        if (interaction) {
          if (!interaction.dragging) {
            interaction.target.slerp(
              identityQuat,
              1 - Math.exp(
                -dt * RETURN_SPEED
              )
            );
          }

          interaction.current.slerp(
            interaction.target,
            1 - Math.exp(
              -dt * DRAG_SMOOTHING
            )
          );

          group.quaternion.premultiply(
            interaction.current
          );

          if (
            !interaction.dragging &&
            interaction.current.angleTo(
              identityQuat
            ) < 0.001 &&
            interaction.target.angleTo(
              identityQuat
            ) < 0.001
          ) {
            dragRotations.delete(name);
          }
        }

        index++;
      }
    }

    renderComposited();
  }

  requestAnimationFrame(animate);

  console.log(
    '[CTA GLB] V10 two-pass Webflow controller initialized'
  );
})();
