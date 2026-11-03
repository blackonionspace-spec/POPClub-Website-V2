
(function () {
  "use strict";

  const CONFIG = {
    section: ".section_partners",
    layer: ".partners_shutter_layer",
    background: ".partners_bg",

    frameCount: 25,

    // Scroll-controlled visibility range.
    startVisibility: 0.30,
    endVisibility: 1.00
  };

  function init() {
    const section = document.querySelector(CONFIG.section);
    const layer = document.querySelector(CONFIG.layer);
    const background = document.querySelector(CONFIG.background);
    const urls = window.partnersShutterFrameURLs;

    if (!section || !layer || !background) {
      console.warn(
        "Partners shutter: Missing Webflow elements."
      );
      return;
    }

    if (
      !Array.isArray(urls) ||
      urls.length !== CONFIG.frameCount
    ) {
      console.warn(
        "Partners shutter: Expected 25 frame URLs."
      );
      return;
    }

    // ==========================================
    // IMAGE ELEMENT
    // ==========================================

    const image = document.createElement("img");

    image.alt = "";
    image.setAttribute("aria-hidden", "true");

    Object.assign(image.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      display: "block",
      pointerEvents: "none"
    });

    const bgStyle = window.getComputedStyle(background);

    if (background.tagName === "IMG") {
      image.style.objectFit = bgStyle.objectFit;
      image.style.objectPosition = bgStyle.objectPosition;
    } else {
      image.style.objectFit = "cover";
      image.style.objectPosition = "center";
    }

    layer.style.pointerEvents = "none";
    layer.appendChild(image);

    // ==========================================
    // PRELOAD ALL 25 FRAMES
    // ==========================================

    const frames = urls.map((url) => {
      const frame = new Image();
      frame.src = url;
      return frame;
    });

    let frameIndex = -1;

    layer.style.visibility = "visible";

    // ==========================================
    // FRAME DISPLAY
    // ==========================================

    function showFrame(index) {
      const nextIndex = Math.max(
        0,
        Math.min(
          Math.round(index),
          urls.length - 1
        )
      );

      // Avoid changing the image source
      // unnecessarily on every scroll event.
      if (nextIndex === frameIndex) return;

      frameIndex = nextIndex;
      image.src = urls[frameIndex];
    }

    // ==========================================
    // SCROLL PROGRESS
    // ==========================================

    function getProgress() {
      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      const referenceHeight = Math.min(
        rect.height,
        viewportHeight
      );

      if (referenceHeight <= 0) return 0;

      // The section's leading edge enters
      // from the bottom of the viewport.
      //
      // Progress increases as the section
      // becomes more visible on entry.
      //
      // It stays at 100% after the section
      // has fully entered the viewport.

      const entryVisibility =
        (viewportHeight - rect.top) /
        referenceHeight;

      const rawProgress =
        (
          entryVisibility -
          CONFIG.startVisibility
        ) /
        (
          CONFIG.endVisibility -
          CONFIG.startVisibility
        );

      return Math.max(
        0,
        Math.min(1, rawProgress)
      );
    }

    // ==========================================
    // UPDATE FRAME FROM SCROLL
    // ==========================================

    function update() {
      const progress = getProgress();

      const frame =
        progress * (urls.length - 1);

      showFrame(frame);
    }

    // ==========================================
    // REQUEST ANIMATION FRAME THROTTLING
    // ==========================================

    let ticking = false;

    function requestUpdate() {
      if (ticking) return;

      ticking = true;

      requestAnimationFrame(() => {
        ticking = false;
        update();
      });
    }

    window.addEventListener(
      "scroll",
      requestUpdate,
      { passive: true }
    );

    window.addEventListener(
      "resize",
      requestUpdate
    );

    // ==========================================
    // ALIGNMENT PREVIEW
    // ==========================================

    const params = new URLSearchParams(
      window.location.search
    );

    if (params.get("previewShutter") === "1") {
      // Show the final frame for alignment.
      showFrame(urls.length - 1);
    } else {
      update();
    }

    // ==========================================
    // DEBUG / MANUAL CONTROLS
    // ==========================================

    window.partnersShutter = {
      layer,
      image,
      frames,
      urls,

      showFrame,
      update,

      getProgress,

      reset() {
        showFrame(0);
      }
    };

    console.log(
      "Partners shutter: Scroll-controlled sequence ready."
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
