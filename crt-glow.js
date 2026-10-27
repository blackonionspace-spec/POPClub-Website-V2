
/*
 * POPCLUB V2 — CRT GLOW
 *
 * Uses the existing Problem ScrollTrigger.
 * Does not create another pin.
 *
 * Preserves original flicker timing,
 * brightness and visibility thresholds.
 */

(function () {
  'use strict';

  function initCRTGlow() {
    const section = document.querySelector('.section_problem');
    const glow = document.querySelector('.crt_outer_glow');

    if (!section || !glow || !window.gsap || !window.ScrollTrigger) {
      console.warn('[CRT Glow] Required elements unavailable.');
      return;
    }

    const trigger = ScrollTrigger.getAll().find(
      (t) => t.trigger === section && t.vars.pin === true
    );

    if (!trigger) {
      console.warn('[CRT Glow] Problem ScrollTrigger not found.');
      return;
    }

    const totalScrollDistance = 11300;
    const problemFrameDistance = 1500;
    const beliefStartDistance = 5000;

    const glowStartFrame = 50;
    const totalFrames = 55;

    const minOpacity = 0.05;
    const maxOpacity = 0.25;

    glow.style.opacity = '0';
    glow.style.pointerEvents = 'none';

    let nextFlicker = 0;
    let brightness = minOpacity;

    function update(time) {
      const progress = Math.max(
        0,
        Math.min(1, trigger.progress)
      );

      const scrollDistance = progress * totalScrollDistance;

      const frameProgress = Math.min(
        1,
        scrollDistance / problemFrameDistance
      );

      const frame = Math.min(
        totalFrames - 1,
        Math.floor(frameProgress * (totalFrames - 1))
      );

      const glowHasStarted = frame >= glowStartFrame;

      const beliefHasStarted =
        scrollDistance >= beliefStartDistance;

      const shouldShowGlow =
        glowHasStarted &&
        !beliefHasStarted &&
        trigger.isActive;

      if (!shouldShowGlow) {
        glow.style.opacity = '0';
        return;
      }

      if (time >= nextFlicker) {
        brightness =
          minOpacity +
          Math.random() * (maxOpacity - minOpacity);

        if (Math.random() < 0.08) {
          brightness = maxOpacity;
        }

        nextFlicker =
          time + 0.027 + Math.random() * 0.12;
      }

      glow.style.opacity = String(brightness);
    }

    gsap.ticker.add(update);
    update(0);

    console.log('[CRT Glow] Initialized.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      initCRTGlow
    );
  } else {
    initCRTGlow();
  }
})();
