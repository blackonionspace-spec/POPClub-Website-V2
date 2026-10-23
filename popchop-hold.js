
/*
 * POPClub V2 — POPChop Visual Hold
 *
 * Holds the existing final product viewport behind
 * the CTA's radial reveal.
 *
 * Does not modify:
 * - Product carousel timeline
 * - Video playback or reset
 * - CTA radial transition
 * - GSAP pin duration
 *
 * Remove this script to disable the experiment.
 */

(() => {
  "use strict";

  function init() {
    const banner = document.querySelector(".section_banner");
    const viewport = banner?.querySelector(
      ".products_viewport.banner_products"
    );
    const cta = document.querySelector(".section_cta");

    if (!banner || !viewport || !cta) {
      console.warn("[POPChop Hold] Required elements missing.");
      return;
    }

    if (!window.ScrollTrigger) {
      console.warn("[POPChop Hold] ScrollTrigger missing.");
      return;
    }

    if (banner.dataset.popchopHoldInitialized === "true") {
      return;
    }

    banner.dataset.popchopHoldInitialized = "true";

    const original = {
      bannerOverflow: banner.style.overflow,
      bannerOverflowX: banner.style.overflowX,
      bannerOverflowY: banner.style.overflowY,
      viewportTranslate: viewport.style.translate,
      bannerZIndex: banner.style.zIndex,
      ctaZIndex: cta.style.zIndex
    };

    let holding = false;
    let lastOffset = null;

    function getBannerTrigger() {
      return ScrollTrigger.getAll().find(
        trigger => trigger.trigger === banner && trigger.pin
      );
    }

    function restore() {
      if (!holding) return;

      holding = false;
      lastOffset = null;

      banner.style.overflow = original.bannerOverflow;
      banner.style.overflowX = original.bannerOverflowX;
      banner.style.overflowY = original.bannerOverflowY;

      viewport.style.translate = original.viewportTranslate;

      banner.style.zIndex = original.bannerZIndex;
      cta.style.zIndex = original.ctaZIndex;
    }

    function update() {
      const trigger = getBannerTrigger();

      if (!trigger) {
        restore();
        return;
      }

      const bannerRect = banner.getBoundingClientRect();
      const ctaRect = cta.getBoundingClientRect();
      const vh = window.innerHeight;

      if (!vh) return;

      // Only hold after the carousel's pin has finished.
      const carouselFinished =
        window.scrollY >= trigger.end - 2;

      // CTA is entering, but has not reached the top.
      const ctaEntering =
        ctaRect.top > 0 &&
        ctaRect.top < vh;

      // Keep the hold while the banner remains
      // immediately behind the entering CTA.
      const shouldHold =
        carouselFinished && ctaEntering;

      if (!shouldHold) {
        restore();
        return;
      }

      if (!holding) {
        holding = true;

        // Allow the full product viewport to extend
        // beyond the original banner boundaries.
        banner.style.overflow = "visible";
        banner.style.overflowX = "visible";
        banner.style.overflowY = "visible";

        // Ensure CTA renders above POPChop.
        banner.style.zIndex = "1";
        cta.style.zIndex = "2";
      }

      // Cancel the banner's upward movement.
      // Do not modify the GSAP-controlled banner transform.
      const offset = Math.max(0, -bannerRect.top);

      if (
        lastOffset === null ||
        Math.abs(offset - lastOffset) > 0.1
      ) {
        viewport.style.translate = `0 ${offset}px`;
        lastOffset = offset;
      }
    }

    let ticking = false;

    function requestUpdate() {
      if (ticking) return;

      ticking = true;

      requestAnimationFrame(() => {
        ticking = false;
        update();
      });
    }

    update();

    window.addEventListener("scroll", requestUpdate, {
      passive: true
    });

    window.addEventListener("resize", requestUpdate);

    ScrollTrigger.addEventListener(
      "refresh",
      requestUpdate
    );

    console.log("[POPChop Hold] Ready.");
  }

  if (document.readyState === "complete") {
    init();
  } else {
    window.addEventListener("load", init, {
      once: true
    });
  }
})();
