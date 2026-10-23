
/*
 * POPClub V2 — CTA Background Animation
 *
 * Independent of CTA coin and GLB scripts.
 *
 * Activation: CTA 87% visible
 * Start delay: 38 / 24 seconds (1.583s)
 * Scale: 0 -> 1.1 -> 1
 * Animation duration: 1.5 seconds
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
    settleDuration: 0.45
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

    // Initial state: background hidden at zero scale.
    function resetBackground() {
      if (timeline) {
        timeline.kill();
        timeline = null;
      }

      gsap.killTweensOf(background);

      gsap.set(background, {
        scale: 0,
        opacity: 1,
        transformOrigin: "50% 50%",
        filter: "none"
      });
    }

    function startBackground() {
      if (timeline) {
        timeline.kill();
      }

      timeline = gsap.timeline({
        delay: CONFIG.startDelay
      });

      timeline.to(background, {
        scale: 1.1,
        duration: CONFIG.expandDuration,
        ease: "power3.out"
      });

      timeline.to(background, {
        scale: 1,
        duration: CONFIG.settleDuration,
        ease: "power2.inOut"
      });
    }

    function checkCTAVisibility() {
      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      const visibleHeight = Math.max(
        0,
        Math.min(rect.bottom, viewportHeight) -
          Math.max(rect.top, 0)
      );

      const visibilityRatio = visibleHeight / rect.height;

      // Activate at the same threshold as CTA coin.
      if (!active && visibilityRatio >= CONFIG.activationThreshold) {
        active = true;
        startBackground();
      }

      // Reset after CTA moves fully outside the viewport
      // plus another 20% viewport-height margin.
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
