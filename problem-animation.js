
/* =========================================
   POPCLUB V2 — PROBLEM FRAME ANIMATION
   55 AVIF frames (0–54)

   Uses the existing CRT ScrollTrigger.
   Does NOT create another pin.

   CRT screen:
   Hidden during frames 0–29.
   Visible from frame 30 onward.
   ========================================= */

(function () {
  "use strict";

  const CONFIG = {
  frameProgressEnd: 1500 / 11300,
  crtRevealFrame: 30,
  maxDPR: 2
};

  function initProblemAnimation() {
    const section = document.querySelector(".section_problem");
    const wrapper = document.querySelector(".problem_wrapper");
    const layer = document.querySelector(".problem_frame_layer");
    const roll = document.querySelector(".crt-roll");
    const crtScreen = document.querySelector(".problem_crt_screen");

    const urls = window.problemFrameURLs;

    if (!section || !wrapper || !layer || !roll || !crtScreen) {
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
       CRT VISIBILITY CONTROL
       ----------------------------------------- */

    // Hide the entire CRT screen initially.
    // This includes its text, scanlines, grain,
    // distortion and all other CRT effects.

    crtScreen.style.visibility = "hidden";

    function updateCRTVisibility(frameIndex) {
      const shouldShow =
        frameIndex >= CONFIG.crtRevealFrame;

      const visibility = shouldShow
        ? "visible"
        : "hidden";

      if (crtScreen.style.visibility !== visibility) {
        crtScreen.style.visibility = visibility;
      }
    }

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

  // Start frames when Problem is 50% visible.
  // Continue smoothly after the existing pin begins.
  const earlyStart = window.innerHeight * 0.2;

  const scrollPosition =
    window.scrollY - (crtTrigger.start - earlyStart);

  const frameDistance =
    CONFIG.frameProgressEnd * 11300;

  const frameProgress = Math.max(
    0,
    Math.min(1, scrollPosition / (frameDistance + earlyStart))
  );

  const frameIndex = Math.min(
    urls.length - 1,
    Math.floor(frameProgress * (urls.length - 1))
  );

  currentFrame = frameIndex;

      // Reveal CRT at frame 30.
      // Hide it again when scrolling backwards
      // below frame 30.

      updateCRTVisibility(currentFrame);

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

    // Apply the correct visibility immediately,
    // including when the page loads mid-scroll.
    update();

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
