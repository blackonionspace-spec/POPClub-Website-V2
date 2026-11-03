
/*
 * POPClub V2 — CTA Coin Radial Reveal
 * Standalone mask for .cta_coin_layer.
 * Reveal progresses only while CTA visibility increases, and never reverses.
 * 40% -> 98% visibility: radius 15vw -> 110vw.
 * At 98%: mask fades out over 1 second and stays removed.
 * Rearms ONLY after the same exit + 20vh reset used by CTA coin.
 */
(() => {
  "use strict";

  const CONFIG = {
    revealStart: 0.40,
    revealEnd: 0.98,
    startRadiusVW: 15,
    endRadiusVW: 110,
    featherVW: 12,
    fadeDuration: 1,
    resetOvershoot: 0.2
  };

  function init() {
    const section = document.querySelector(".section_cta");
    const layer = document.querySelector(".cta_coin_layer");

    if (!section || !layer) {
      console.warn("[CTA Reveal] Section or coin layer not found.");
      return;
    }

    if (layer.dataset.ctaRadialInitialized === "true") return;
    layer.dataset.ctaRadialInitialized = "true";

    let phase = "armed"; // armed | fading | complete
    let maxProgress = 0;
    let fadeStart = null;
    let fadeRaf = null;
    let updateRaf = null;
    let previousRatio = null;

    const clamp = (n, min, max) =>
      Math.min(max, Math.max(min, n));

    const smoothstep = n => n * n * (3 - 2 * n);

    function setMask(radiusVW, outerOpacity) {
      const inner = Math.max(
        0,
        radiusVW - CONFIG.featherVW
      );

      const alpha = clamp(outerOpacity, 0, 1);

      const gradient =
        `radial-gradient(circle at 50% 50%, ` +
        `black 0, black ${inner}vw, ` +
        `rgba(0,0,0,${alpha}) ${radiusVW}vw, ` +
        `rgba(0,0,0,${alpha}) 100%)`;

      layer.style.webkitMaskImage = gradient;
      layer.style.maskImage = gradient;
    }

    function clearMask() {
      layer.style.webkitMaskImage = "none";
      layer.style.maskImage = "none";
    }

    function cancelFade() {
      if (fadeRaf !== null) {
        cancelAnimationFrame(fadeRaf);
      }

      fadeRaf = null;
      fadeStart = null;
    }

    function reset() {
      cancelFade();

      phase = "armed";
      maxProgress = 0;
      previousRatio = 0;

      setMask(0, 0);

      console.log(
        "[CTA Reveal] Reset after CTA exit + 20vh."
      );
    }

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
        return;
      }

      setMask(
        CONFIG.endRadiusVW,
        smoothstep(progress)
      );

      fadeRaf = requestAnimationFrame(fade);
    }

    function update() {
      updateRaf = null;

      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;

      if (rect.height <= 0 || vh <= 0) return;

      // Same reset boundaries as CTA coin script.
      const exitedAbove =
        rect.bottom < -vh * CONFIG.resetOvershoot;

      const exitedBelow =
        rect.top > vh * (1 + CONFIG.resetOvershoot);

      if (exitedAbove || exitedBelow) {
        if (phase !== "armed" || maxProgress > 0) {
          reset();
        }

        previousRatio = 0;
        return;
      }

      const visibleHeight = Math.max(
        0,
        Math.min(rect.bottom, vh) -
          Math.max(rect.top, 0)
      );

      const ratio = visibleHeight / rect.height;

      if (phase !== "armed") {
        previousRatio = ratio;
        return;
      }

      // Reveal only on increasing visibility.
      const increasing =
        previousRatio === null ||
        ratio > previousRatio;

      previousRatio = ratio;

      if (!increasing) return;

      const progress = clamp(
        (ratio - CONFIG.revealStart) /
          (CONFIG.revealEnd - CONFIG.revealStart),
        0,
        1
      );

      maxProgress = Math.max(maxProgress, progress);

      if (ratio >= CONFIG.revealEnd) {
        phase = "fading";
        fadeRaf = requestAnimationFrame(fade);
        return;
      }

      if (maxProgress === 0) {
        setMask(0, 0);
      } else {
        const radius =
          CONFIG.startRadiusVW +
          (CONFIG.endRadiusVW -
            CONFIG.startRadiusVW) * maxProgress;

        setMask(radius, 0);
      }
    }

    function requestUpdate() {
      if (updateRaf === null) {
        updateRaf = requestAnimationFrame(update);
      }
    }

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
      "[CTA Reveal] Initialized; reveal plays once per CTA reset."
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
