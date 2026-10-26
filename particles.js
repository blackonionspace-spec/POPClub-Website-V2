
/*
 * POPClub V2 — Shared Particle System
 *
 * Coin + Products Banner
 * Lightweight Canvas 2D particles with soft glow.
 *
 * Preserves original movement, interaction,
 * timing, density and visibility behaviour.
 */

(() => {
  'use strict';

  function init() {

    const CONFIG = {
      // ----------------------------------------
      // ORIGINAL PARTICLE SETTINGS
      // ----------------------------------------

      count: 104,
      speed: 0.25,
      minRadius: 0.75,
      maxRadius: 1.7,

      centerBias: 0.92,
      spreadX: 0.38,
      spreadY: 0.38,

      orange: [235, 65, 35],
      white: [255, 245, 225],
      minOpacity: 0.45,
      maxOpacity: 0.95,
      pulseSpeed: 0.0015,

      interactionRadius: 120,
      interactionStrength: 0.45,
      damping: 0.75,
      randomMovement: 0.02,

      maxDPR: 1.5,

      // ----------------------------------------
      // NEW GLOW SETTINGS
      // ----------------------------------------

      glowEnabled: true,

      // Size of halo relative to particle radius.
      glowRadius: 10.0,

      // Strength of the surrounding glow.
      glowIntensity: 1.0,

      // Sprite resolution.
      // Generated once, not every frame.
      glowSpriteSize: 64
    };

    const targets = [
      {
        container: '.coin_particles',
        section: '.section_coin'
      },
      {
        container: '.banner_particles',
        section: '.section_banner'
      }
    ];

    // ==========================================
    // PRE-RENDERED GLOW SPRITES
    // ==========================================

    // Create two small sprites once:
    // one orange, one warm white.
    //
    // We blend their brightness as particles
    // move through the original colour pulse.

    function createGlowSprite(color) {
      const size = CONFIG.glowSpriteSize;

      const sprite = document.createElement('canvas');
      sprite.width = size;
      sprite.height = size;

      const context = sprite.getContext('2d');

      if (!context) return null;

      const center = size / 2;
      const radius = size / 2;

      const gradient = context.createRadialGradient(
        center, center, 0,
        center, center, radius
      );

      const [r, g, b] = color;

      gradient.addColorStop(
        0,
        `rgba(${r}, ${g}, ${b}, 1)`
      );

      gradient.addColorStop(
        0.12,
        `rgba(${r}, ${g}, ${b}, 0.85)`
      );

      gradient.addColorStop(
        0.3,
        `rgba(${r}, ${g}, ${b}, 0.35)`
      );

      gradient.addColorStop(
        0.6,
        `rgba(${r}, ${g}, ${b}, 0.08)`
      );

      gradient.addColorStop(
        1,
        `rgba(${r}, ${g}, ${b}, 0)`
      );

      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);

      return sprite;
    }

    const orangeGlow = CONFIG.glowEnabled
      ? createGlowSprite(CONFIG.orange)
      : null;

    const whiteGlow = CONFIG.glowEnabled
      ? createGlowSprite(CONFIG.white)
      : null;

    // ==========================================
    // INITIALIZE EACH PARTICLE CONTAINER
    // ==========================================

    function initializeParticles(target) {

      const container = document.querySelector(
        target.container
      );

      const section = document.querySelector(
        target.section
      );

      const isCoin =
        target.container === '.coin_particles';

      if (!container || !section) return;

      if (
        container.querySelector(
          'canvas[data-shared-particles]'
        )
      ) {
        return;
      }

      const canvas = document.createElement('canvas');

      canvas.dataset.sharedParticles = 'true';

      const ctx = canvas.getContext('2d', {
        alpha: true
      });

      if (!ctx) return;

      container.appendChild(canvas);

      Object.assign(canvas.style, {
        width: '100%',
        height: '100%',
        display: 'block',
        pointerEvents: 'none',

        // Original appearance timing.
        opacity: isCoin ? '0' : '1',

        transition: isCoin
          ? 'opacity 2000ms ease-in-out'
          : 'none'
      });

      // Original 3-second Coin delay.
      if (isCoin) {
        setTimeout(() => {
          canvas.style.opacity = '1';
        }, 3000);
      }

      let width = 0;
      let height = 0;
      let particles = [];

      const mouse = {
        x: -9999,
        y: -9999
      };

      let visible = false;
      let animationId = null;
      let lastTime = null;

      // ========================================
      // ORIGINAL CENTRE-WEIGHTED DISTRIBUTION
      // ========================================

      function densityAt(x, y) {
        const nx =
          (x - width / 2) / (width / 2);

        const ny =
          (y - height / 2) / (height / 2);

        const distanceSquared =
          (nx * nx) /
            (CONFIG.spreadX * CONFIG.spreadX) +
          (ny * ny) /
            (CONFIG.spreadY * CONFIG.spreadY);

        const falloff =
          Math.exp(-0.5 * distanceSquared);

        return (
          (1 - CONFIG.centerBias) +
          CONFIG.centerBias * falloff
        );
      }

      function createPosition() {
        let x;
        let y;

        do {
          x = Math.random() * width;
          y = Math.random() * height;
        } while (
          Math.random() > densityAt(x, y)
        );

        return { x, y };
      }

      function createParticle() {
        const position = createPosition();

        return {
          x: position.x,
          y: position.y,

          vx:
            (Math.random() - 0.5) *
            CONFIG.speed * 2,

          vy:
            (Math.random() - 0.5) *
            CONFIG.speed * 2,

          radius:
            CONFIG.minRadius +
            Math.random() *
            (CONFIG.maxRadius - CONFIG.minRadius),

          phase:
            Math.random() * Math.PI * 2
        };
      }

      // ========================================
      // ORIGINAL RESIZE HANDLING
      // ========================================

      function resize() {
        const rect =
          container.getBoundingClientRect();

        width = rect.width;
        height = rect.height;

        if (width <= 0 || height <= 0) return;

        const dpr = Math.min(
          window.devicePixelRatio || 1,
          CONFIG.maxDPR
        );

        canvas.width =
          Math.round(width * dpr);

        canvas.height =
          Math.round(height * dpr);

        ctx.setTransform(
          dpr, 0, 0, dpr, 0, 0
        );

        particles = Array.from(
          { length: CONFIG.count },
          createParticle
        );

        draw(performance.now());
      }

      // ========================================
      // PARTICLE DRAWING — WITH NEW GLOW
      // ========================================

      function draw(time) {
        if (width <= 0 || height <= 0) return;

        ctx.clearRect(
          0, 0, width, height
        );

        ctx.shadowBlur = 0;

        for (const p of particles) {

          // Original colour/opacity pulse.
          const pulse =
            (
              Math.sin(
                time * CONFIG.pulseSpeed +
                p.phase
              ) + 1
            ) / 2;

          const r = Math.round(
            CONFIG.orange[0] +
            (
              CONFIG.white[0] -
              CONFIG.orange[0]
            ) * pulse
          );

          const g = Math.round(
            CONFIG.orange[1] +
            (
              CONFIG.white[1] -
              CONFIG.orange[1]
            ) * pulse
          );

          const b = Math.round(
            CONFIG.orange[2] +
            (
              CONFIG.white[2] -
              CONFIG.orange[2]
            ) * pulse
          );

          const alpha =
            CONFIG.minOpacity +
            (
              CONFIG.maxOpacity -
              CONFIG.minOpacity
            ) * pulse;

          // ------------------------------------
          // NEW: SOFT GLOW
          // ------------------------------------

          if (
            CONFIG.glowEnabled &&
            orangeGlow &&
            whiteGlow
          ) {

            const glowSize =
              p.radius *
              CONFIG.glowRadius * 2;

            const glowX =
              p.x - glowSize / 2;

            const glowY =
              p.y - glowSize / 2;

            // Orange glow fades out as
            // the particle becomes white.

            ctx.globalAlpha =
              alpha *
              CONFIG.glowIntensity *
              (1 - pulse);

            ctx.drawImage(
              orangeGlow,
              glowX,
              glowY,
              glowSize,
              glowSize
            );

            // White glow fades in with pulse.

            ctx.globalAlpha =
              alpha *
              CONFIG.glowIntensity *
              pulse;

            ctx.drawImage(
              whiteGlow,
              glowX,
              glowY,
              glowSize,
              glowSize
            );
          }

          // ------------------------------------
          // ORIGINAL SHARP PARTICLE CORE
          // ------------------------------------

          ctx.globalAlpha = 1;

          ctx.fillStyle =
            `rgba(${r}, ${g}, ${b}, ${alpha})`;

          ctx.beginPath();

          ctx.arc(
            p.x,
            p.y,
            p.radius,
            0,
            Math.PI * 2
          );

          ctx.fill();
        }

        ctx.globalAlpha = 1;
      }

      // ========================================
      // ORIGINAL PARTICLE PHYSICS
      // ========================================

      function animate(time) {
        if (!visible || document.hidden) {
          animationId = null;
          lastTime = null;
          return;
        }

        animationId =
          requestAnimationFrame(animate);

        const delta =
          lastTime === null
            ? 16.667
            : Math.min(
                time - lastTime,
                50
              );

        lastTime = time;

        const step =
          delta / 16.667;

        const damping =
          Math.pow(CONFIG.damping, step);

        for (const p of particles) {

          // Cursor repulsion.
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;

          const distanceSquared =
            dx * dx + dy * dy;

          if (
            distanceSquared > 1 &&
            distanceSquared <
              CONFIG.interactionRadius *
              CONFIG.interactionRadius
          ) {
            const distance =
              Math.sqrt(distanceSquared);

            const force =
              (
                1 -
                distance /
                  CONFIG.interactionRadius
              ) *
              CONFIG.interactionStrength *
              step;

            p.vx +=
              (dx / distance) * force;

            p.vy +=
              (dy / distance) * force;
          }

          // Original damping.
          p.vx *= damping;
          p.vy *= damping;

          // Original random movement.
          p.vx +=
            (Math.random() - 0.5) *
            CONFIG.randomMovement *
            Math.sqrt(step);

          p.vy +=
            (Math.random() - 0.5) *
            CONFIG.randomMovement *
            Math.sqrt(step);

          p.x += p.vx * step;
          p.y += p.vy * step;

          // Original centre-weighted respawn.
          if (
            p.x < -10 ||
            p.x > width + 10 ||
            p.y < -10 ||
            p.y > height + 10
          ) {
            const position =
              createPosition();

            p.x = position.x;
            p.y = position.y;

            p.vx =
              (Math.random() - 0.5) *
              CONFIG.speed * 2;

            p.vy =
              (Math.random() - 0.5) *
              CONFIG.speed * 2;
          }
        }

        draw(time);
      }

      // ========================================
      // ORIGINAL START / STOP BEHAVIOUR
      // ========================================

      function start() {
        if (visible || document.hidden) return;

        visible = true;
        lastTime = null;

        if (animationId === null) {
          animationId =
            requestAnimationFrame(animate);
        }
      }

      function stop() {
        visible = false;
        lastTime = null;

        if (animationId !== null) {
          cancelAnimationFrame(animationId);
          animationId = null;
        }

        mouse.x = -9999;
        mouse.y = -9999;
      }

      // ========================================
      // ORIGINAL SECTION VISIBILITY
      // ========================================

      const observer =
        new IntersectionObserver(
          entries => {
            if (
              entries[0].isIntersecting &&
              !document.hidden
            ) {
              start();
            } else {
              stop();
            }
          },
          {
            threshold: 0.01
          }
        );

      observer.observe(section);

      // ========================================
      // ORIGINAL CURSOR INTERACTION
      // ========================================

      window.addEventListener(
        'pointermove',
        event => {
          if (!visible) return;

          const rect =
            canvas.getBoundingClientRect();

          mouse.x =
            event.clientX - rect.left;

          mouse.y =
            event.clientY - rect.top;
        },
        {
          passive: true
        }
      );

      window.addEventListener(
        'pointerout',
        event => {
          if (!event.relatedTarget) {
            mouse.x = -9999;
            mouse.y = -9999;
          }
        }
      );

      // ========================================
      // ORIGINAL RESIZE / TAB VISIBILITY
      // ========================================

      window.addEventListener(
        'resize',
        resize
      );

      document.addEventListener(
        'visibilitychange',
        () => {
          if (document.hidden) {
            stop();
          } else {
            const rect =
              section.getBoundingClientRect();

            if (
              rect.bottom > 0 &&
              rect.top < window.innerHeight
            ) {
              start();
            }
          }
        }
      );

      resize();
    }

    // Initialize both sections.
    targets.forEach(initializeParticles);

    console.info(
      '[POPClub] Shared particles with glow initialized.'
    );
  }

  // ==========================================
  // INITIALIZATION
  // ==========================================

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      init,
      { once: true }
    );
  } else {
    init();
  }

})();
