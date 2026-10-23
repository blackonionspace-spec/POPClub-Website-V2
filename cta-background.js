
/*
 * POPClub V2 — CTA Background Animation
 *
 * Independent of CTA coin and GLB scripts.
 *
 * Activation: CTA 87% visible
 * Explosion: 1.583 seconds after activation
 * Scale: 0 -> 1.1 -> 1 over 1.5 seconds
 *
 * Radial mask:
 *   Closed until 1.65 seconds
 *   Expands from center until 2.633 seconds
 *   Radius: 0 -> 120vh
 *   Feather: 0 -> 20vh
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

    maskStartTime: 1.65,
    maskEndTime: 2.633,

    maskEndRadiusVH: 120,
    maskEndFeatherVH: 20
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

    const mask = {
      radius: 0,
      feather: 0
    };

    // --------------------------------------------------
    // Radial mask
    // --------------------------------------------------

    function applyRadialMask() {
      const radius = Math.max(0, mask.radius);
      const feather = Math.max(0, mask.feather);

      const innerRadius = Math.max(0, radius - feather);

      const gradient = `radial-gradient(
        circle at center,
        black ${innerRadius}vh,
        transparent ${radius}vh
      )`;

      background.style.webkitMaskImage = gradient;
      background.style.maskImage = gradient;
    }

    function removeRadialMask() {
      background.style.webkitMaskImage = "none";
      background.style.maskImage = "none";
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
      gsap.killTweensOf(mask);

      gsap.set(background, {
        scale: 0,
        opacity: 1,
        transformOrigin: "50% 50%",
        filter: "none"
      });

      mask.radius = 0;
      mask.feather = 0;

      applyRadialMask();
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

      // New radial reveal.
      timeline.to(
        mask,
        {
          radius: CONFIG.maskEndRadiusVH,
          feather: CONFIG.maskEndFeatherVH,
          duration: CONFIG.maskEndTime - CONFIG.maskStartTime,
          ease: "power3.out",
          onUpdate: applyRadialMask,
          onComplete: removeRadialMask
        },
        CONFIG.maskStartTime
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

      const visibilityRatio = visibleHeight / rect.height;

      if (!active && visibilityRatio >= CONFIG.activationThreshold) {
        active = true;
        startBackground();
      }

      if (active) {
        const exitedAbove =
          rect.bottom < -viewportHeight * CONFIG.resetOvershoot;

        const exitedBelow =
          rect.top >
          viewportHeight * (1 + CONFIG.resetOvershoot);

        if (exitedAbove || exitedBelow) {
          active = false;
          resetBackground();
        }
      }
    }

    resetBackground();

    window.addEventListener("scroll", checkCTAVisibility, {
      passive: true
    });

    window.addEventListener("resize", checkCTAVisibility);

    checkCTAVisibility();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
