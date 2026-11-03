
/*
 * POPClub V2 — CTA Coin Radial Reveal
 *
 * Independent script for .cta_coin_layer
 *
 * 40% visibility: radial reveal begins at 5vw
 * 98% visibility: radial reveal reaches 55vw
 *
 * Feather: 6vw
 *
 * Before 98%:
 *   Reveal expands and contracts with scroll.
 *
 * At 98%:
 *   Mask fades away over 1 second.
 *   Reveal is locked complete for this cycle.
 *
 * Reset:
 *   CTA exits viewport + another 20vh.
 */

(() => {
  "use strict";

  const CONFIG = {
    revealStart: 0.40,
    revealEnd: 0.98,

    startRadiusVW: 5,
    endRadiusVW: 55,

    featherVW: 6,
    fadeDuration: 1,

    resetOvershoot: 0.2
  };

  function init() {
    const section = document.querySelector(".section_cta");
    const layer = document.querySelector(".cta_coin_layer");

    if (!section || !layer) {
      console.warn(
        "[CTA Reveal] Section or coin layer not found."
      );
      return;
    }

    if (layer.dataset.ctaRadialInitialized === "true") {
      return;
    }

    layer.dataset.ctaRadialInitialized = "true";

    let phase = "armed";
    let fadeStart = null;
    let fadeRaf = null;
    let updateRaf = null;

    const clamp = (n, min, max) =>
      Math.min(max, Math.max(min, n));

    const smoothstep = n =>
      n * n * (3 - 2 * n);

    // -----------------------------------------------
    // Radial mask
    // -----------------------------------------------

    function setMask(radiusVW, outerOpacity) {
      const inner = Math.max(
        0,
        radiusVW - CONFIG.featherVW
      );

      const alpha = clamp(
        outerOpacity,
        0,
        1
      );

      const gradient =
        `radial-gradient(circle at 50% 50%, ` +
        `black 0, ` +
        `black ${inner}vw, ` +
        `rgba(0,0,0,${alpha}) ${radiusVW}vw, ` +
        `rgba(0,0,0,${alpha}) 100%)`;

      layer.style.webkitMaskImage = gradient;
      layer.style.maskImage = gradient;
    }

    function clearMask() {
      layer.style.webkitMaskImage = "none";
      layer.style.maskImage = "none";
    }

    // -----------------------------------------------
    // Fade control
    // -----------------------------------------------

    function cancelFade() {
      if (fadeRaf !== null) {
        cancelAnimationFrame(fadeRaf);
      }

      fadeRaf = null;
      fadeStart = null;
    }

    // -----------------------------------------------
    // Reset
    // -----------------------------------------------

    function reset() {
      cancelFade();

      phase = "armed";

      setMask(0, 0);

      console.log(
        "[CTA Reveal] Reset after CTA exit + 20vh."
      );
    }

    // -----------------------------------------------
    // Fade out mask at 98%
    // -----------------------------------------------

    function fade(now) {
      if (phase !== "fading") return;

      if (fadeStart === null) {
        fadeStart = now;
      }

      const progress = clamp(
        (now - fadeStart) /
          (CONFIG.fadeDuration * 1000),
        0,
        1
      );

      if (progress >= 1) {
        phase = "complete";
        fadeRaf = null;

        clearMask();

        console.log(
          "[CTA Reveal] Complete."
        );

        return;
      }

      setMask(
        CONFIG.endRadiusVW,
        smoothstep(progress)
      );

      fadeRaf = requestAnimationFrame(fade);
    }

    // -----------------------------------------------
    // Scroll-controlled visibility
    // -----------------------------------------------

    function update() {
      updateRaf = null;

      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;

      if (rect.height <= 0 || vh <= 0) return;

      // Same reset conditions as CTA coin
      const exitedAbove =
        rect.bottom <
        -vh * CONFIG.resetOvershoot;

      const exitedBelow =
        rect.top >
        vh * (1 + CONFIG.resetOvershoot);

      if (exitedAbove || exitedBelow) {
        if (phase !== "armed") {
          reset();
        } else {
          setMask(0, 0);
        }

        return;
      }

      const visibleHeight = Math.max(
        0,
        Math.min(rect.bottom, vh) -
          Math.max(rect.top, 0)
      );

      const ratio = visibleHeight / rect.height;

      // Once 98% has been reached,
      // don't reverse until a full reset.
      if (phase !== "armed") return;

      // -------------------------------------------
      // Bidirectional reveal BEFORE 98%
      // -------------------------------------------

      if (ratio < CONFIG.revealStart) {
        setMask(0, 0);
        return;
      }

      const progress = clamp(
        (ratio - CONFIG.revealStart) /
          (CONFIG.revealEnd - CONFIG.revealStart),
        0,
        1
      );

      const radius =
        CONFIG.startRadiusVW +
        (
          CONFIG.endRadiusVW -
          CONFIG.startRadiusVW
        ) * progress;

      setMask(radius, 0);

      // -------------------------------------------
      // Lock reveal at 98%
      // -------------------------------------------

      if (ratio >= CONFIG.revealEnd) {
        phase = "fading";

        fadeRaf = requestAnimationFrame(fade);

        console.log(
          "[CTA Reveal] 98% reached — fading mask."
        );
      }
    }

    function requestUpdate() {
      if (updateRaf === null) {
        updateRaf = requestAnimationFrame(update);
      }
    }

    // -----------------------------------------------
    // Initialize
    // -----------------------------------------------

    setMask(0, 0);

    window.addEventListener(
      "scroll",
      requestUpdate,
      { passive: true }
    );

    window.addEventListener(
      "resize",
      requestUpdate
    );

    requestUpdate();

    console.log(
      "[CTA Reveal] Initialized."
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }
})();
