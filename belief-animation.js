
/* =========================================
   POPCLUB V2 — BELIEF ANIMATION
   170 AVIF frames: 2_3000–2_3169

   Problem + CRT: 5000px
   Belief:       10500px
   Total:        15500px

   Reuses existing pinned ScrollTrigger.
   No additional pin or ScrollTrigger.
   ========================================= */

(function () {
  "use strict";

  const CONFIG = {
  beliefStart: 5000,
  beliefDistance: 6300,
  totalDistance: 11300,
  maxDPR: 2
};

  const SEGMENTS = [
  { type: "hold", frame: 0, distance: 300 },
  { type: "move", from: 0, to: 49, distance: 900 },
  { type: "hold", frame: 49, distance: 600 },
  { type: "move", from: 49, to: 89, distance: 900 },
  { type: "hold", frame: 89, distance: 600 },
  { type: "move", from: 89, to: 129, distance: 900 },
  { type: "hold", frame: 129, distance: 600 },
  { type: "move", from: 129, to: 169, distance: 900 },
  { type: "hold", frame: 169, distance: 600 }
];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function initBeliefAnimation() {
    const section = document.querySelector(".section_problem");
    const wrapper = document.querySelector(".problem_wrapper");
    const layer = document.querySelector(".belief_frame_layer");
    const urls = window.beliefFrameURLs;

    if (!section || !wrapper || !layer) {
      console.error("[Belief Animation] Required elements missing.");
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
        "[Belief Animation] Existing CRT trigger not found."
      );
      return;
    }

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
       FLASH LAYERS

       Dark cover hides the baked-in title.
       Radial bloom expands from screen centre.
       Warm wash conceals the title at peak.
       ----------------------------------------- */

    function createOverlay(background, zIndex) {
      const element = document.createElement("div");

      Object.assign(element.style, {
        position: "absolute",
        inset: "0",
        width: "100%",
        height: "100%",
        background,
        opacity: "0",
        pointerEvents: "none",
        zIndex: String(zIndex),
        willChange: "opacity, transform"
      });

      layer.appendChild(element);
      return element;
    }

    const darkCover = createOverlay("#17120f", 30);

    const radialBloom = createOverlay(
      "radial-gradient(ellipse at 50% 50%, " +
      "rgba(255,255,245,1) 0%, " +
      "rgba(255,246,214,1) 18%, " +
      "rgba(255,208,150,0.96) 38%, " +
      "rgba(255,145,83,0.62) 58%, " +
      "rgba(255,145,83,0) 85%)",
      31
    );

    radialBloom.style.transformOrigin = "50% 50%";

    const brightWash = createOverlay("#fff5df", 32);

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
          drawFrame(index);
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
       CANVAS SIZE AND DRAWING
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

      const scale = Math.max(
        width / img.naturalWidth,
        height / img.naturalHeight
      );

      const drawWidth = img.naturalWidth * scale;
      const drawHeight = img.naturalHeight * scale;

      ctx.clearRect(0, 0, width, height);

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
       SEGMENTED FRAME PLAYBACK
       ----------------------------------------- */

    function getFrameAtDistance(distance) {
      let cursor = 0;

      for (const segment of SEGMENTS) {
        const end = cursor + segment.distance;

        if (distance < end) {
          if (segment.type === "hold") {
            return segment.frame;
          }

          const t = clamp(
            (distance - cursor) / segment.distance,
            0,
            1
          );

          return Math.round(
            lerp(segment.from, segment.to, t)
          );
        }

        cursor = end;
      }

      return 169;
    }

    /* -----------------------------------------
       CENTRE-ORIGINATING FLASH
       First 350px of initial 500px hold.

       0–110px: dark screen → expanding bloom
       110–160px: bright wash reaches peak
       160–350px: wash fades to reveal title
       350–500px: clean Our Belief hold
       ----------------------------------------- */

    function updateFlash(distance) {
      if (distance >= 350) {
        darkCover.style.opacity = "0";
        radialBloom.style.opacity = "0";
        brightWash.style.opacity = "0";
        return;
      }

      if (distance < 110) {
        const t = clamp(distance / 110, 0, 1);

        darkCover.style.opacity = "1";
        radialBloom.style.opacity = String(t);
        radialBloom.style.transform =
          `scale(${lerp(0.2, 2.8, t)})`;
        brightWash.style.opacity = "0";

      } else if (distance < 160) {
        const t = clamp((distance - 110) / 50, 0, 1);

        darkCover.style.opacity = "1";
        radialBloom.style.opacity = "1";
        radialBloom.style.transform = "scale(3)";
        brightWash.style.opacity = String(t);

      } else {
        const t = clamp((distance - 160) / 190, 0, 1);

        // The wash stays fully opaque while the
        // dark cover disappears underneath it.
        darkCover.style.opacity = "0";
        radialBloom.style.opacity = String(1 - t);
        radialBloom.style.transform = "scale(3)";
        brightWash.style.opacity = String(1 - t);
      }
    }

    /* -----------------------------------------
       FOLLOW EXISTING SCROLLTRIGGER
       ----------------------------------------- */

    function update() {
      const progress = clamp(crtTrigger.progress, 0, 1);

      const totalScroll =
        progress * CONFIG.totalDistance;

      const beliefScroll =
        totalScroll - CONFIG.beliefStart;

      const beliefActive = beliefScroll >= 0;

      const visibility = beliefActive
        ? "visible"
        : "hidden";

      if (layer.style.visibility !== visibility) {
        layer.style.visibility = visibility;
      }

      if (!beliefActive) {
  currentFrame = 0;
  window.beliefCurrentFrame = -1;
  return;
}

      const distance = clamp(
        beliefScroll,
        0,
        CONFIG.beliefDistance
      );

      currentFrame = getFrameAtDistance(distance);
      window.beliefCurrentFrame = currentFrame;

      if (currentFrame !== lastDrawnFrame) {
        drawFrame(currentFrame);
      }

      updateFlash(distance);
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
      "frames, 10500px segmented timeline"
    );
  }
  /* =========================================
     BELIEF TEXT VISIBILITY
     ========================================= */

  function initBeliefText() {
    const items = [
      {
        element: document.querySelector(".belief_bills_text"),
        fadeInStart: 85,
        fadeInEnd: 89,
        fadeOutStart: 89,
        fadeOutEnd: 94
      },
      {
        element: document.querySelector(".belief_coffee_text"),
        fadeInStart: 125,
        fadeInEnd: 129,
        fadeOutStart: 129,
        fadeOutEnd: 134
      },
      {
        element: document.querySelector(".belief_shopping_text"),
        fadeInStart: 165,
        fadeInEnd: 169,
        fadeOutStart: null,
        fadeOutEnd: null
      }
    ];

    function getOpacity(frame, item) {
      if (frame < item.fadeInStart) return 0;

      if (frame < item.fadeInEnd) {
        return (frame - item.fadeInStart) /
          (item.fadeInEnd - item.fadeInStart);
      }

      if (
        item.fadeOutStart !== null &&
        frame >= item.fadeOutStart
      ) {
        if (frame >= item.fadeOutEnd) return 0;

        return 1 -
          (frame - item.fadeOutStart) /
          (item.fadeOutEnd - item.fadeOutStart);
      }

      return 1;
    }

    let lastFrame = null;

    function updateText() {
      const frame = Number.isFinite(window.beliefCurrentFrame)
        ? window.beliefCurrentFrame
        : -1;

      if (frame !== lastFrame) {
        lastFrame = frame;

        items.forEach(item => {
          if (!item.element) return;

          const opacity = getOpacity(frame, item);

          item.element.style.opacity = String(opacity);
          item.element.style.visibility =
            opacity > 0 ? "visible" : "hidden";
        });
      }

      requestAnimationFrame(updateText);
    }

    updateText();

    console.log("[Belief Text] Visibility initialized.");
  }
    function initializeBelief() {
    initBeliefAnimation();
    initBeliefText();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeBelief
    );
  } else {
    initializeBelief();
  }
})();
