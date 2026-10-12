
/* =========================================
   POPCLUB V2 — BELIEF FRAME ANIMATION
   Phase 1: Load and display first frame

   170 AVIF frames (2_3000–2_3169)
   No ScrollTrigger or pin created yet.
   ========================================= */

(function () {
  "use strict";

  const CONFIG = {
    maxDPR: 2
  };

  function initBeliefAnimation() {
    const layer = document.querySelector(".belief_frame_layer");
    const urls = window.beliefFrameURLs;

    if (!layer) {
      console.warn("[Belief Animation] Layer not found.");
      return;
    }

    if (!Array.isArray(urls) || urls.length !== 170) {
      console.error(
        "[Belief Animation] Expected 170 frame URLs.",
        urls?.length
      );
      return;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { alpha: true });

    if (!ctx) {
      console.error("[Belief Animation] Canvas unavailable.");
      return;
    }

    Object.assign(layer.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      zIndex: "20",
      pointerEvents: "none",
      overflow: "hidden",
      visibility: "visible"
    });

    Object.assign(canvas.style, {
      display: "block",
      width: "100%",
      height: "100%",
      pointerEvents: "none"
    });

    layer.appendChild(canvas);

    const firstFrame = new Image();

    function drawFrame() {
      if (!firstFrame.complete || !firstFrame.naturalWidth) {
        return;
      }

      const dpr = Math.min(
        window.devicePixelRatio || 1,
        CONFIG.maxDPR
      );

      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      ctx.clearRect(0, 0, width, height);

      const scale = Math.max(
        width / firstFrame.naturalWidth,
        height / firstFrame.naturalHeight
      );

      const drawWidth = firstFrame.naturalWidth * scale;
      const drawHeight = firstFrame.naturalHeight * scale;

      ctx.drawImage(
        firstFrame,
        (width - drawWidth) / 2,
        (height - drawHeight) / 2,
        drawWidth,
        drawHeight
      );
    }

    function resizeCanvas() {
      const rect = layer.getBoundingClientRect();

      if (!rect.width || !rect.height) return;

      const dpr = Math.min(
        window.devicePixelRatio || 1,
        CONFIG.maxDPR
      );

      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      drawFrame();
    }

    firstFrame.onload = function () {
      resizeCanvas();
      console.log(
        "[Belief Animation] First frame loaded successfully."
      );
    };

    firstFrame.onerror = function () {
      console.error(
        "[Belief Animation] Failed to load first frame."
      );
    };

    firstFrame.src = urls[0];

    window.addEventListener("resize", resizeCanvas);

    resizeCanvas();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initBeliefAnimation
    );
  } else {
    initBeliefAnimation();
  }
})();
