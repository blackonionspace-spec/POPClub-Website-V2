
/*
 * POPClub V2 — CTA Coin Animation
 * 40 AVIF frames at 24 FPS
 * Replays whenever CTA re-enters viewport
 */

(() => {
  "use strict";

  const CONFIG = {
    fps: 24,
    maxDPR: 2,
    activationThreshold: 0.6
  };

  function init() {
    const section = document.querySelector(".section_cta");
    const container = document.querySelector(".cta_coin_layer");
    const urls = window.ctaCoinFrameURLs;

    if (!section || !container) {
      console.warn("[CTA Coin] Section or layer not found.");
      return;
    }

    if (!Array.isArray(urls) || urls.length !== 40) {
      console.warn("[CTA Coin] Expected 40 frame URLs.");
      return;
    }

    if (container.dataset.ctaCoinInitialized === "true") return;
    container.dataset.ctaCoinInitialized = "true";

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { alpha: true });

    if (!ctx) return;

    canvas.style.cssText = [
      "position:absolute",
      "inset:0",
      "display:block",
      "width:100%",
      "height:100%",
      "pointer-events:none"
    ].join(";");

    container.appendChild(canvas);
    container.style.pointerEvents = "none";

    const images = new Array(urls.length);

    let ready = false;
    let active = false;
    let playing = false;
    let completed = false;
    let startTime = 0;
    let currentFrame = -1;
    let rafId = null;

    const duration = urls.length / CONFIG.fps;

    function resize() {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, CONFIG.maxDPR);

      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));

      if (ready && playing && currentFrame >= 0) {
        drawFrame(currentFrame);
      }
    }

    function drawFrame(index) {
      const img = images[index];
      if (!img || !img.naturalWidth) return;

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      const scale = Math.max(
        w / img.naturalWidth,
        h / img.naturalHeight
      );

      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;

      ctx.drawImage(
        img,
        (w - drawW) / 2,
        (h - drawH) / 2,
        drawW,
        drawH
      );
    }

    function stopAndReset() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      playing = false;
      completed = false;
      currentFrame = -1;

      canvas.style.display = "none";
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function complete() {
      playing = false;
      completed = true;
      rafId = null;

      // Hide after the last frame has had its full display time.
      canvas.style.display = "none";

      section.dispatchEvent(new CustomEvent("cta:coin-complete", {
        bubbles: true,
        detail: { duration }
      }));

      console.log("[CTA Coin] Complete.");
    }

    function tick(now) {
      if (!playing || !active) return;

      const elapsed = (now - startTime) / 1000;

      if (elapsed >= duration) {
        complete();
        return;
      }

      const nextFrame = Math.min(
        urls.length - 1,
        Math.floor(elapsed * CONFIG.fps)
      );

      if (nextFrame !== currentFrame) {
        currentFrame = nextFrame;
        drawFrame(currentFrame);
      }

      rafId = requestAnimationFrame(tick);
    }

    function start() {
      if (!ready || !active || playing || completed) return;

      playing = true;
      currentFrame = 0;

      canvas.style.display = "block";
      resize();
      drawFrame(0);

      startTime = performance.now();

      section.dispatchEvent(new CustomEvent("cta:coin-start", {
        bubbles: true
      }));

      rafId = requestAnimationFrame(tick);

      console.log("[CTA Coin] Playing at 24 FPS.");
    }

    Promise.all(
      urls.map((url, index) => new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
          images[index] = img;
          resolve();
        };

        img.onerror = () => reject(
          new Error(`Frame ${index} failed: ${url}`)
        );

        img.src = url;
      }))
    ).then(() => {
      ready = true;
      console.log("[CTA Coin] All 40 frames loaded.");
      start();
    }).catch(error => {
      console.error("[CTA Coin]", error);
    });

    resize();
    window.addEventListener("resize", resize);

    const observer = new IntersectionObserver(entries => {
      const visible = entries[0].intersectionRatio >=
        CONFIG.activationThreshold;

      if (visible && !active) {
        active = true;
        start();
      } else if (!visible && active) {
        active = false;
        stopAndReset();
      }
    }, {
      threshold: [0, CONFIG.activationThreshold, 1]
    });

    observer.observe(section);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
