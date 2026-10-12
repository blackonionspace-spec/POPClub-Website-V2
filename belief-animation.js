
/* =========================================
   POPCLUB V2 — BELIEF FRAME ANIMATION

   170 AVIF frames: 2_3000–2_3169

   Existing pinned section:
   Problem + CRT:  5000px
   Belief:        15000px
   Total:         20000px

   No additional ScrollTrigger or pin.
   ========================================= */

(function () {
  "use strict";

  const CONFIG = {
    beliefStart: 5000,
    beliefDistance: 15000,
    totalDistance: 20000,
    maxDPR: 2
  };

  const SEGMENTS = [
    { type: "hold", frame: 0, distance: 1500 },
    { type: "move", from: 0, to: 48, distance: 2100 },
    { type: "hold", frame: 49, distance: 1200 },
    { type: "move", from: 49, to: 88, distance: 2100 },
    { type: "hold", frame: 89, distance: 1200 },
    { type: "move", from: 89, to: 128, distance: 2100 },
    { type: "hold", frame: 129, distance: 1200 },
    { type: "move", from: 129, to: 169, distance: 2100 },
    { type: "hold", frame: 169, distance: 1500 }
  ];

  function initBeliefAnimation() {
    const section = document.querySelector(".section_problem");
    const wrapper = document.querySelector(".problem_wrapper");
    const layer = document.querySelector(".belief_frame_layer");
    const urls = window.beliefFrameURLs;

    if (!section || !wrapper || !layer) {
      console.warn("[Belief Animation] Required elements missing.");
      return;
    }

    if (!Array.isArray(urls) || urls.length !== 170) {
      console.error(
        "[Belief Animation] Expected 170 URLs.",
        urls?.length
      );
      return;
    }

    if (!window.gsap || !window.ScrollTrigger) {
      console.error("[Belief Animation] GSAP missing.");
      return;
    }

    const crtTrigger = ScrollTrigger.getAll().find(
      trigger =>
        trigger.trigger === section &&
        trigger.vars.pin === true
    );

    if (!crtTrigger) {
      console.error(
        "[Belief Animation] CRT ScrollTrigger not found."
      );
      return;
    }

    /* -----------------------------------------
       PREPARE LAYER
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
       CANVAS
       ----------------------------------------- */

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { alpha: true });

    if (!ctx) {
      console.error("[Belief Animation] Canvas unavailable.");
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
       WHITE FLASH OVERLAY
       ----------------------------------------- */

    const flash = document.createElement("div");

    Object.assign(flash.style, {
      position: "absolute",
      inset: "0",
      background: "#ffffff",
      opacity: "0",
      pointerEvents: "none",
      zIndex: "30"
    });

    layer.appendChild(flash);

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
          "[Belief Animation] Failed frame:",
          index,
          url
        );
      };

      img.src = url;
    });

    /* -----------------------------------------
       RESIZE
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
       DRAW FRAME
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

      ctx.drawImage(
        img,
        (width - drawWidth) / 2,
        (height - drawHeight) / 2,
        drawWidth,
        drawHeight
      );

      lastDrawnFrame = index;
    }

    /* -----------------------------------------
       SEGMENTED FRAME MAPPING
       ----------------------------------------- */

    function getFrameAtDistance(distance) {
      let cursor = 0;

      for (const segment of SEGMENTS) {
        const end = cursor + segment.distance;

        if (distance < end) {
          if (segment.type === "hold") {
            return segment.frame;
          }

          const t = Math.max(
            0,
            Math.min(
              1,
              (distance - cursor) / segment.distance
            )
          );

          return Math.min(
            segment.to,
            Math.floor(
              segment.from +
              t * (segment.to - segment.from)
            )
          );
        }

        cursor = end;
      }

      return 169;
    }

    /* -----------------------------------------
       WHITE FLASH MAPPING
       ----------------------------------------- */

    function getFlashOpacity(distance) {
      // White flash within the first 500px
      // of the initial 1500px hold.

      if (distance < 0 || distance > 500) {
        return 0;
      }

      if (distance < 100) {
        return distance / 100;
      }

      if (distance < 200) {
        return 1;
      }

      return 1 - (distance - 200) / 300;
    }

    /* -----------------------------------------
       FOLLOW EXISTING SCROLLTRIGGER
       ----------------------------------------- */

    function update() {
      const progress = Math.max(
        0,
        Math.min(1, crtTrigger.progress)
      );

      const scrollDistance =
        progress * CONFIG.totalDistance;

      const beliefDistance =
        scrollDistance - CONFIG.beliefStart;

      const beliefActive = beliefDistance >= 0;

      layer.style.visibility = beliefActive
        ? "visible"
        : "hidden";

      if (!beliefActive) {
        currentFrame = 0;
        flash.style.opacity = "0";
        return;
      }

      const distance = Math.max(
        0,
        Math.min(
          CONFIG.beliefDistance,
          beliefDistance
        )
      );

      currentFrame = getFrameAtDistance(distance);

      if (currentFrame !== lastDrawnFrame) {
        drawFrame(currentFrame);
      }

      flash.style.opacity =
        getFlashOpacity(distance).toFixed(3);
    }

    /* -----------------------------------------
       INITIALIZE
       ----------------------------------------- */

    resizeCanvas();

    window.addEventListener("resize", resizeCanvas);

    gsap.ticker.add(update);

    update();

    console.log(
      "[Belief Animation] Initialized:",
      urls.length,
      "frames with holds and flash"
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
