
/*
 * POPClub V2 — CTA Background Animation
 *
 * Independent of CTA coin and GLB scripts.
 *
 * Activation: CTA 87% visible
 * Explosion begins: 1.583 seconds after activation
 *
 * Scale animation:
 *   0 -> 1.1 over 1.05 seconds
 *   1.1 -> 1 over 0.45 seconds
 *
 * Edge feather:
 *   Soft rectangular edges during expansion
 *   Feather fades away before scale reaches 1.1
 *   No expanding radial mask
 *
 * Reset: CTA exits viewport by an additional 20vh
 * Replays on CTA re-entry
 */

(() => {
  "use strict";

  const CONFIG = {
    activationThreshold: 0.87,
    resetOvershoot: 0.2,

    startDelay: 38 / 24,
    expandDuration: 1.05,
    settleDuration: 0.45,

    featherSizeVH: 20,
    featherFadeDuration: 0.15
  };

  function init() {
    const section = document.querySelector(".section_cta");
    const background = document.querySelector(".cta_bg_effect");

    if (!section || !background) {
      console.warn("[CTA BG] Section or background not found.");
      return;
    }

    if (!window.gsap) {
      console.warn("[CTA BG] GSAP not found.");
      return;
    }

    if (background.dataset.ctaBgInitialized === "true") return;
    background.dataset.ctaBgInitialized = "true";

    let active = false;
    let timeline = null;

    // --------------------------------------------------
    // Edge feathering
    // --------------------------------------------------

    const feather = {
      strength: 1
    };

    function applyEdgeFeather() {
      const strength = Math.max(
        0,
        Math.min(1, feather.strength)
      );

      // Completely remove masking once feather reaches zero.
      if (strength <= 0.001) {
        background.style.webkitMaskImage = "none";
        background.style.maskImage = "none";
        return;
      }

      const featherSize = CONFIG.featherSizeVH * strength;

      // Each gradient softens one pair of opposite edges.
      // Intersecting the gradients softens all four edges.
      const vertical = `linear-gradient(
        to bottom,
        transparent 0%,
        black ${featherSize}vh,
        black calc(100% - ${featherSize}vh),
        transparent 100%
      )`;

      const horizontal = `linear-gradient(
        to right,
        transparent 0%,
        black ${featherSize}vh,
        black calc(100% - ${featherSize}vh),
        transparent 100%
      )`;

      background.style.webkitMaskImage =
        `${vertical}, ${horizontal}`;

      background.style.maskImage =
        `${vertical}, ${horizontal}`;

      background.style.webkitMaskComposite = "source-in";
      background.style.maskComposite = "intersect";
    }

    function removeEdgeFeather() {
      background.style.webkitMaskImage = "none";
      background.style.maskImage = "none";

      background.style.webkitMaskComposite = "";
      background.style.maskComposite = "";
    }

    // --------------------------------------------------
    // Reset
    // --------------------------------------------------

    function resetBackground() {
      if (timeline) {
        timeline.kill();
        timeline = null;
      }

      gsap.killTweensOf(background);
      gsap.killTweensOf(feather);

      gsap.set(background, {
        scale: 0,
        opacity: 1,
        transformOrigin: "50% 50%",
        filter: "none"
      });

      feather.strength = 1;
      applyEdgeFeather();
    }

    // --------------------------------------------------
    // Background animation
    // --------------------------------------------------

    function startBackground() {
      if (timeline) {
        timeline.kill();
      }

      timeline = gsap.timeline();

      // Existing scale animation — unchanged.
      timeline.to(
        background,
        {
          scale: 1.1,
          duration: CONFIG.expandDuration,
          ease: "power3.out"
        },
        CONFIG.startDelay
      );

      timeline.to(
        background,
        {
          scale: 1,
          duration: CONFIG.settleDuration,
          ease: "power2.inOut"
        },
        CONFIG.startDelay + CONFIG.expandDuration
      );

      // Fade away the edge feather just before 110% scale.
      const featherFadeStart =
        CONFIG.startDelay +
        CONFIG.expandDuration -
        CONFIG.featherFadeDuration;

      timeline.to(
        feather,
        {
          strength: 0,
          duration: CONFIG.featherFadeDuration,
          ease: "power2.inOut",
          onUpdate: applyEdgeFeather,
          onComplete: removeEdgeFeather
        },
        featherFadeStart
      );
    }

    // --------------------------------------------------
    // CTA visibility
    // --------------------------------------------------

    function checkCTAVisibility() {
      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      const visibleHeight = Math.max(
        0,
        Math.min(rect.bottom, viewportHeight) -
          Math.max(rect.top, 0)
      );

      const visibilityRatio =
        rect.height > 0
          ? visibleHeight / rect.height
          : 0;

      // Activate at the same threshold as CTA coin.
      if (
        !active &&
        visibilityRatio >= CONFIG.activationThreshold
      ) {
        active = true;
        startBackground();
      }

      // Reset after leaving viewport by another 20vh.
      if (active) {
        const exitedAbove =
          rect.bottom <
          -viewportHeight * CONFIG.resetOvershoot;

        const exitedBelow =
          rect.top >
          viewportHeight * (1 + CONFIG.resetOvershoot);

        if (exitedAbove || exitedBelow) {
          active = false;
          resetBackground();
        }
      }
    }

    // --------------------------------------------------
    // Initialize
    // --------------------------------------------------

    resetBackground();

    window.addEventListener(
      "scroll",
      checkCTAVisibility,
      { passive: true }
    );

    window.addEventListener(
      "resize",
      checkCTAVisibility
    );

    checkCTAVisibility();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
