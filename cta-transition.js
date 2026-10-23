
/*
 * POPClub V2 — CTA Radial Section Transition
 *
 * Independent of coin, GLB, text and background animations.
 *
 * 0–25% CTA visibility:
 *   Fixed 40vh diameter circular opening
 *
 * 25–100% CTA visibility:
 *   Circular opening expands with natural scrolling
 *
 * 100% CTA visibility:
 *   Remaining mask fades away over 1.5 seconds
 *
 * Backward scrolling:
 *   Scroll-controlled mask returns automatically
 *
 * No pinning, extra scroll distance or Navigator changes.
 */

(() => {
  "use strict";

  const CONFIG = {
    startVisibility: 0.25,

    initialDiameterVH: 40,
    finalRadiusVH: 90,
    featherVH: 12,

    fadeDuration: 1.5
  };

  function init() {
    const section = document.querySelector(".section_CTA");

    if (!section) {
      console.warn("[CTA Transition] Section not found.");
      return;
    }

    if (!window.gsap) {
      console.warn("[CTA Transition] GSAP not found.");
      return;
    }

    if (section.dataset.ctaTransitionInitialized === "true") {
      return;
    }

    section.dataset.ctaTransitionInitialized = "true";

    const state = {
      fade: 0
    };

    let fadeTween = null;
    let fullyEntered = false;
    let currentProgress = 0;
    let lastVisibility = -1;

    const clamp = (value, min, max) =>
      Math.max(min, Math.min(max, value));

    // --------------------------------------------------
    // Mask rendering
    // --------------------------------------------------

    function applyMask(progress) {
      const startRadius = CONFIG.initialDiameterVH / 2;

      const radius =
        startRadius +
        (CONFIG.finalRadiusVH - startRadius) * progress;

      const feather = CONFIG.featherVH;

      const innerRadius = Math.max(0, radius - feather);

      const edgeOpacity = clamp(state.fade, 0, 1);

      if (edgeOpacity >= 0.999) {
        section.style.webkitMaskImage = "none";
        section.style.maskImage = "none";
        return;
      }

      const gradient = `radial-gradient(
        circle at center,
        black ${innerRadius}vh,
        rgba(0,0,0,${edgeOpacity}) ${radius}vh
      )`;

      section.style.webkitMaskImage = gradient;
      section.style.maskImage = gradient;
    }

    // --------------------------------------------------
    // Final fade
    // --------------------------------------------------

    function stopFade() {
      if (fadeTween) {
        fadeTween.kill();
        fadeTween = null;
      }
    }

    function beginFade() {
      if (fullyEntered) return;

      fullyEntered = true;
      stopFade();

      fadeTween = gsap.to(state, {
        fade: 1,
        duration: CONFIG.fadeDuration,
        ease: "power2.inOut",
        onUpdate: () => applyMask(currentProgress),
        onComplete: () => {
          fadeTween = null;
          applyMask(currentProgress);
        }
      });
    }

    // --------------------------------------------------
    // Scroll progress
    // --------------------------------------------------

    function update() {
      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      if (rect.height <= 0 || viewportHeight <= 0) return;

      const visibleHeight = Math.max(
        0,
        Math.min(rect.bottom, viewportHeight) -
          Math.max(rect.top, 0)
      );

      // Use the smaller of section and viewport heights,
      // so the transition works with taller sections.
      const referenceHeight = Math.min(
        rect.height,
        viewportHeight
      );

      const visibility = clamp(
        visibleHeight / referenceHeight,
        0,
        1
      );

      // Calculate progress from 25% to 100% visibility.
      const progress = clamp(
        (visibility - CONFIG.startVisibility) /
          (1 - CONFIG.startVisibility),
        0,
        1
      );

      currentProgress = progress;

      // Only start the fade when the CTA is entering
      // from below and reaches full visibility.
      if (visibility >= 0.999 && !fullyEntered) {
        beginFade();
      }

      // Re-enable the radial mask when scrolling
      // backward out of the fully visible state.
      if (visibility < 0.999 && fullyEntered) {
        fullyEntered = false;
        stopFade();
        state.fade = 0;
      }

      if (
        Math.abs(visibility - lastVisibility) > 0.0001 ||
        fadeTween
      ) {
        applyMask(currentProgress);
        lastVisibility = visibility;
      }
    }

    // --------------------------------------------------
    // Initialize
    // --------------------------------------------------

    update();

    window.addEventListener("scroll", update, {
      passive: true
    });

    window.addEventListener("resize", update);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
