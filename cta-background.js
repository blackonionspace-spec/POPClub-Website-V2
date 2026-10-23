
/*
 * POPClub V2 — CTA Background Animation
 *
 * Independent of CTA coin and GLB scripts.
 *
 * Activation: CTA 87% visible
 * Explosion begins: 1.583 seconds after activation
 *
 * Scale:
 *   0 -> 1.1 over 1.05 seconds
 *   1.1 -> 1 over 0.45 seconds
 *
 * Edge feather:
 *   Fixed 20vh feather during expansion
 *   Begins fading when scale reaches 1.1
 *   Fades completely over 2 seconds
 *
 * Reset:
 *   CTA exits viewport by an additional 20vh
 *   Replays on CTA re-entry
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
    featherFadeDuration: 2
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

    const feather = {
      strength: 1
    };

    // --------------------------------------------------
    // Edge feathering
    // --------------------------------------------------

    function removeEdgeFeather() {
      background.style.webkitMaskImage = "none";
      background.style.maskImage = "none";

      background.style.webkitMaskComposite = "";
      background.style.maskComposite = "";
    }

    function applyEdgeFeather() {
      const strength = Math.max(
        0,
        Math.min(1, feather.strength)
      );

      if (strength <= 0.001) {
        removeEdgeFeather();
        return;
      }

      const featherSize = CONFIG.featherSizeVH;

      // As strength decreases from 1 to 0,
      // edge opacity increases from 0 to 1.
      const edgeOpacity = 1 - strength;

      const vertical = `linear-gradient(
        to bottom,
        rgba(0, 0, 0, ${edgeOpacity}) 0%,
        black ${featherSize}vh,
        black calc(100% - ${featherSize}vh),
        rgba(0, 0, 0, ${edgeOpacity}) 100%
      )`;

      const horizontal = `linear-gradient(
        to right,
        rgba(0, 0, 0, ${edgeOpacity}) 0%,
        black ${featherSize}vh,
        black calc(100% - ${featherSize}vh),
        rgba(0, 0, 0, ${edgeOpacity}) 100%
      )`;

      background.style.webkitMaskImage =
        `${vertical}, ${horizontal}`;

      background.style.maskImage =
        `${vertical}, ${horizontal}`;

      background.style.webkitMaskComposite = "source-in";
      background.style.maskComposite = "intersect";
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

      // Scale 0 -> 1.1
      timeline.to(
        background,
        {
          scale: 1.1,
          duration: CONFIG.expandDuration,
          ease: "power3.out"
        },
        CONFIG.startDelay
      );

      // Scale 1.1 -> 1
      timeline.to(
        background,
        {
          scale: 1,
          duration: CONFIG.settleDuration,
          ease: "power2.inOut"
        },
        CONFIG.startDelay + CONFIG.expandDuration
      );

      // Fade the edge feather over 2 seconds,
      // starting when the video reaches 110%.
      const featherFadeStart =
        CONFIG.startDelay + CONFIG.expandDuration;

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

      // Activate at 87% CTA visibility.
      if (
        !active &&
        visibilityRatio >= CONFIG.activationThreshold
      ) {
        active = true;
        startBackground();
      }

      // Reset after exiting the viewport
      // by another 20% of viewport height.
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
