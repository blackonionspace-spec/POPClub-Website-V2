
/*
 * POPClub V2 — CTA Radial Section Transition
 *
 * Independent of coin, GLB, text and background animations.
 *
 * CTA entering from POPChop:
 *   0–25% entry: Fixed 40vh circular opening
 *   25–100% entry: Circle expands with scrolling
 *   100% entry: Remaining mask fades over 1.5 seconds
 *
 * CTA exiting toward next section:
 *   Mask remains completely open
 *
 * Scrolling backward toward POPChop:
 *   Radial reveal reverses naturally
 *
 * No pinning or additional scroll distance.
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
    const section = document.querySelector(".section_cta");

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
    // Entry-based scroll progress
    // --------------------------------------------------

    function update() {
      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      if (rect.height <= 0 || viewportHeight <= 0) return;

      // 0: CTA top at viewport bottom
      // 1: CTA top at viewport top
      // Remains 1 while CTA exits upward.
      const entryProgress = clamp(
        (viewportHeight - rect.top) / viewportHeight,
        0,
        1
      );

      // Circle remains fixed until 25% entry.
      const progress = clamp(
        (entryProgress - CONFIG.startVisibility) /
          (1 - CONFIG.startVisibility),
        0,
        1
      );

      currentProgress = progress;

      // Start final fade when CTA fully enters.
      if (entryProgress >= 0.999) {
        if (!fullyEntered) {
          beginFade();
        }
      } else {
        // Reverse transition only when returning
        // toward POPChop.
        if (fullyEntered) {
          fullyEntered = false;
          stopFade();
          state.fade = 0;
        }
      }

      applyMask(currentProgress);
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
