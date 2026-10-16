
/*
 * POPClub V2 — CTA Coin Animation
 * 40 AVIF frames, 1.5-second autoplay
 * Uses window.ctaCoinFrameURLs
 */

(() => {
  "use strict";

  const CONFIG = {
    duration: 1.5,
    maxDPR: 2,
    activationThreshold: 0.6
  };

  function init() {
    const section = document.querySelector(".section_cta");
    const container = document.querySelector(".cta_coin_layer");
    const urls = window.ctaCoinFrameURLs;

    if (!section || !container) {
      console.warn("[CTA Coin] Section or coin layer not found.");
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
    let activated = false;
    let started = false;
    let finished = false;
    let currentFrame = 0;
    let animationStart = 0;

    function resize() {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, CONFIG.maxDPR);

      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));

      if (ready && !finished) drawFrame(currentFrame);
    }

    function drawFrame(index) {
      const img = images[index];
      if (!img || !img.naturalWidth) return;

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Cover: preserve image aspect ratio, crop evenly if necessary.
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

    function complete() {
      if (finished) return;

      finished = true;
      canvas.style.display = "none";

      section.dispatchEvent(new CustomEvent("cta:coin-complete", {
        bubbles: true,
        detail: { duration: CONFIG.duration }
      }));

      console.log("[CTA Coin] Complete — explosion can begin.");
    }

    function tick(now) {
      if (finished) return;

      const elapsed = (now - animationStart) / 1000;

      if (elapsed >= CONFIG.duration) {
        complete();
        return;
      }

      const progress = elapsed / CONFIG.duration;

      const nextFrame = Math.min(
        images.length - 1,
        Math.floor(progress * images.length)
      );

      if (nextFrame !== currentFrame) {
        currentFrame = nextFrame;
        drawFrame(currentFrame);
      }

      requestAnimationFrame(tick);
    }

    function start() {
      if (started || !ready || !activated) return;

      started = true;
      currentFrame = 0;

      resize();
      drawFrame(0);

      animationStart = performance.now();
      requestAnimationFrame(tick);

      section.dispatchEvent(new CustomEvent("cta:coin-start", {
        bubbles: true
      }));

      console.log("[CTA Coin] Playing 40 frames over 1.5 seconds.");
    }

    function loadFrames() {
      Promise.all(
        urls.map((url, index) => new Promise((resolve, reject) => {
          const img = new Image();

          img.onload = () => {
            images[index] = img;
            resolve();
          };

          img.onerror = () => reject(new Error(
            `Could not load coin frame ${index}: ${url}`
          ));

          img.src = url;
        }))
      ).then(() => {
        ready = true;
        console.log("[CTA Coin] All 40 frames loaded.");
        start();
      }).catch(error => {
        console.error("[CTA Coin]", error);
      });
    }

    resize();
    window.addEventListener("resize", resize);

    const observer = new IntersectionObserver(entries => {
      if (entries[0].intersectionRatio >= CONFIG.activationThreshold) {
        activated = true;
        observer.disconnect();
        start();
      }
    }, {
      threshold: [0, CONFIG.activationThreshold, 1]
    });

    observer.observe(section);
    loadFrames();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
