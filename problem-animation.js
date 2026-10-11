
/* =========================================
   POPCLUB V2 — PROBLEM FRAME ANIMATION
   55 AVIF frames (0–54)

   Uses the existing CRT ScrollTrigger.
   Does NOT create another pin.
   ========================================= */

(function () {
  "use strict";

  const CONFIG = {
    frameProgressEnd: 0.40,
    maxDPR: 2
  };

  function initProblemAnimation() {
    const section = document.querySelector(".section_problem");
    const wrapper = document.querySelector(".problem_wrapper");
    const layer = document.querySelector(".problem_frame_layer");
    const roll = document.querySelector(".crt-roll");

    const urls = window.problemFrameURLs;

    if (!section || !wrapper || !layer || !roll) {
      console.warn(
        "[Problem Animation] Required elements not found."
      );
      return;
    }

    if (!Array.isArray(urls) || urls.length !== 55) {
      console.error(
        "[Problem Animation] Expected 55 frame URLs.",
        urls?.length
      );
      return;
    }

    if (!window.gsap || !window.ScrollTrigger) {
      console.error(
        "[Problem Animation] GSAP or ScrollTrigger missing."
      );
      return;
    }

    /* -----------------------------------------
       FIND EXISTING CRT SCROLLTRIGGER
       ----------------------------------------- */

   const crtTrigger = ScrollTrigger.getAll().find(
  (trigger) =>
    trigger.trigger === section &&
    trigger.vars.pin === true
);

    if (!crtTrigger) {
      console.error(
        "[Problem Animation] Existing CRT ScrollTrigger not found."
      );
      return;
    }

    /* -----------------------------------------
       PREPARE EXISTING FRAME LAYER
       ----------------------------------------- */

    if (getComputedStyle(wrapper).position === "static") {
      wrapper.style.position = "relative";
    }

    Object.assign(layer.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      zIndex: "10",
      pointerEvents: "none",
      overflow: "hidden"
    });

    /* -----------------------------------------
       CREATE CANVAS
       ----------------------------------------- */

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", {
      alpha: true
    });

    if (!ctx) {
      console.error(
        "[Problem Animation] Canvas context unavailable."
      );
      return;
    }

    Object.assign(canvas.style, {
      display: "block",
      width: "100%",
      height: "100%",
      pointerEvents: "none"
    });

    layer.appendChild(canvas);

    /* -----------------------------------------
       LOAD FRAMES
       ----------------------------------------- */

    const frames = new Array(urls.length);
    let currentFrame = 0;
    let lastDrawnFrame = -1;

    urls.forEach((url, index) => {
      const img = new Image();

      img.onload = function () {
        frames[index] = img;

        if (index === currentFrame) {
          drawFrame(currentFrame);
        }
      };

      img.onerror = function () {
        console.warn(
          "[Problem Animation] Failed to load frame:",
          index,
          url
        );
      };

      img.src = url;
    });

    /* -----------------------------------------
       RESIZE CANVAS
       ----------------------------------------- */

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

      lastDrawnFrame = -1;
      drawFrame(currentFrame);
    }

    /* -----------------------------------------
       DRAW FRAME — PRESERVE TRANSPARENCY
       ----------------------------------------- */

    function drawFrame(index) {
      const img = frames[index];

      if (!img || !canvas.width || !canvas.height) {
        return;
      }

      const dpr = Math.min(
        window.devicePixelRatio || 1,
        CONFIG.maxDPR
      );

      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      ctx.clearRect(0, 0, width, height);

      // Cover sizing, matching a full-screen
      // image sequence without distortion.

      const scale = Math.max(
        width / img.naturalWidth,
        height / img.naturalHeight
      );

      const drawWidth = img.naturalWidth * scale;
      const drawHeight = img.naturalHeight * scale;

      const x = (width - drawWidth) / 2;
      const y = (height - drawHeight) / 2;

      ctx.drawImage(
        img,
        x,
        y,
        drawWidth,
        drawHeight
      );

      lastDrawnFrame = index;
    }

    /* -----------------------------------------
       FOLLOW CRT SCROLL PROGRESS
       ----------------------------------------- */

    function update() {
      const progress = Math.max(
        0,
        Math.min(1, crtTrigger.progress)
      );

      // Complete all 55 frames within the
      // first 40% of the CRT scroll distance.
      // Then hold the final frame.

      const frameProgress = Math.min(
        1,
        progress / CONFIG.frameProgressEnd
      );

      const frameIndex = Math.min(
        urls.length - 1,
        Math.floor(frameProgress * (urls.length - 1))
      );

      currentFrame = frameIndex;

      if (currentFrame !== lastDrawnFrame) {
        drawFrame(currentFrame);
      }
    }

    /* -----------------------------------------
       INITIALIZE
       ----------------------------------------- */

    resizeCanvas();

    window.addEventListener("resize", resizeCanvas);

    // Follow the existing ScrollTrigger.
    // No new ScrollTrigger or pin is created.
    gsap.ticker.add(update);

    console.log(
      "[Problem Animation] Initialized:",
      urls.length,
      "frames"
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initProblemAnimation
    );
  } else {
    initProblemAnimation();
  }
})();
