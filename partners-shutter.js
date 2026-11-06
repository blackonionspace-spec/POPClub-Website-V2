
(function () {
  "use strict";

  const CONFIG = {
    section: ".section_partners",
    layer: ".partners_shutter_layer",
    background: ".partners_bg",

    frameCount: 50,
    fps: 25,

    startVisibility: 0.95,
    resetOvershoot: 0.20
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
        "Partners shutter: Expected 50 frame URLs."
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
    // PRELOAD ALL 50 FRAMES
    // ==========================================

    const frames = urls.map((url) => {
      const frame = new Image();
      frame.src = url;
      return frame;
    });

    const framesReady = Promise.all(
      frames.map((frame) => {
        if (frame.complete) {
          return Promise.resolve();
        }

        return new Promise((resolve) => {
          frame.addEventListener(
            "load",
            resolve,
            { once: true }
          );

          frame.addEventListener(
            "error",
            resolve,
            { once: true }
          );
        });
      })
    );

    let frameIndex = -1;
    let playing = false;
    let completed = false;
    let pending = false;
    let animationId = null;
    let playbackToken = 0;

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

      if (nextIndex === frameIndex) return;

      frameIndex = nextIndex;
      image.src = urls[nextIndex];
    }

    showFrame(0);

    // ==========================================
    // VISIBILITY CALCULATION
    // ==========================================

    function getVisibility() {
      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      const visibleHeight = Math.max(
        0,
        Math.min(rect.bottom, viewportHeight) -
        Math.max(rect.top, 0)
      );

      const referenceHeight = Math.min(
        rect.height,
        viewportHeight
      );

      if (referenceHeight <= 0) return 0;

      return Math.min(
        1,
        visibleHeight / referenceHeight
      );
    }

    // ==========================================
    // RESET DETECTION — BOTH DIRECTIONS
    // ==========================================

    function hasExitedBeyondReset() {
      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      const overshoot =
        viewportHeight * CONFIG.resetOvershoot;

      // Section exits above the viewport.
      const exitedAbove =
        rect.bottom <= -overshoot;

      // Section exits below the viewport.
      const exitedBelow =
        rect.top >= viewportHeight + overshoot;

      return exitedAbove || exitedBelow;
    }

    // ==========================================
    // RESET
    // ==========================================

    function reset() {
      playbackToken++;

      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }

      playing = false;
      completed = false;
      pending = false;

      showFrame(0);
    }

    // ==========================================
    // AUTOPLAY AT 24 FPS
    // ==========================================

    function play() {
      if (playing || completed || pending) return;

      pending = true;

      const token = ++playbackToken;

      framesReady.then(() => {
        if (token !== playbackToken) return;

        pending = false;

        // Check visibility again after loading.
        if (
          getVisibility() < CONFIG.startVisibility
        ) {
          return;
        }

        playing = true;

        const frameDuration =
          1000 / CONFIG.fps;

        const totalDuration =
          urls.length * frameDuration;

        let startTime = null;

        showFrame(0);

        function animate(now) {
          if (
            token !== playbackToken ||
            !playing
          ) {
            return;
          }

          if (startTime === null) {
            startTime = now;
          }

          const elapsed = now - startTime;

          const nextFrame = Math.min(
            Math.floor(
              elapsed / frameDuration
            ),
            urls.length - 1
          );

          showFrame(nextFrame);

          if (elapsed >= totalDuration) {
            playing = false;
            completed = true;
            animationId = null;

            showFrame(urls.length - 1);
            return;
          }

          animationId =
            requestAnimationFrame(animate);
        }

        animationId =
          requestAnimationFrame(animate);
      });
    }

    // ==========================================
    // VIEWPORT MONITORING
    // ==========================================

    function update() {
      if (hasExitedBeyondReset()) {
        if (
          playing ||
          completed ||
          pending ||
          frameIndex !== 0
        ) {
          reset();
        }

        return;
      }

      if (
        !playing &&
        !completed &&
        !pending &&
        getVisibility() >=
          CONFIG.startVisibility
      ) {
        play();
      }
    }

    // ==========================================
    // SCROLL / RESIZE THROTTLING
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

    const previewMode =
      params.get("previewShutter") === "1";

    if (previewMode) {
      completed = true;
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
      play,
      reset,
      getVisibility,
      hasExitedBeyondReset
    };

    console.log(
      "Partners shutter: 50 frames at 24 FPS, 95% trigger, 20vh reset."
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
