
/* =========================================
   POPCLUB V2 — BELIEF FRAME ANIMATION

   170 AVIF frames (2_3000–2_3169)
   Uses the existing CRT ScrollTrigger.
   Does NOT create another pin.

   Problem + CRT: first 5000px
   Belief sequence: next 6000px
   Total pinned scroll: 11000px
   ========================================= */

(function () {
  "use strict";

  const CONFIG = {
    beliefStartProgress: 5000 / 11000,
    maxDPR: 2
  };

  function initBeliefAnimation() {
    const section = document.querySelector(".section_problem");
    const wrapper = document.querySelector(".problem_wrapper");
    const layer = document.querySelector(".belief_frame_layer");
    const urls = window.beliefFrameURLs;

    if (!section || !wrapper || !layer) {
      console.warn(
        "[Belief Animation] Required elements not found."
      );
      return;
    }

    if (!Array.isArray(urls) || urls.length !== 170) {
      console.error(
        "[Belief Animation] Expected 170 frame URLs.",
        urls?.length
      );
      return;
    }

    if (!window.gsap || !window.ScrollTrigger) {
      console.error(
        "[Belief Animation] GSAP or ScrollTrigger missing."
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
        "[Belief Animation] Existing CRT ScrollTrigger not found."
      );
      return;
    }

    /* -----------------------------------------
       PREPARE BELIEF LAYER
       ----------------------------------------- */

    if (getComputedStyle(wrapper).position === "static") {
      wrapper.style.position = "relative";
    }

    Object.assign(layer.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      zIndex: "20",
      pointerEvents: "none",
      overflow: "hidden",
      visibility: "hidden"
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
        "[Belief Animation] Canvas context unavailable."
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
       LOAD ALL 170 FRAMES
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
          "[Belief Animation] Failed to load frame:",
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
       FOLLOW EXISTING CRT SCROLLTRIGGER
       ----------------------------------------- */

    function update() {
      const progress = Math.max(
        0,
        Math.min(1, crtTrigger.progress)
      );

      const beliefActive =
        progress >= CONFIG.beliefStartProgress;

      const visibility = beliefActive
        ? "visible"
        : "hidden";

      if (layer.style.visibility !== visibility) {
        layer.style.visibility = visibility;
      }

      if (!beliefActive) {
        currentFrame = 0;
        return;
      }

      const frameProgress = Math.max(
        0,
        Math.min(
          1,
          (progress - CONFIG.beliefStartProgress) /
            (1 - CONFIG.beliefStartProgress)
        )
      );

      const frameIndex = Math.min(
        urls.length - 1,
        Math.floor(
          frameProgress * (urls.length - 1)
        )
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

    // Follow the existing pinned CRT timeline.
    // No additional ScrollTrigger is created.
    gsap.ticker.add(update);

    update();

    console.log(
      "[Belief Animation] Initialized:",
      urls.length,
      "frames"
    );
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
