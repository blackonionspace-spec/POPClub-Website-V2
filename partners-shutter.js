
(function () {
  "use strict";

  const CONFIG = {
    section: ".section_partners",
    layer: ".partners_shutter_layer",
    background: ".partners_bg",
    frameCount: 25,
    fps: 24,
    playVisibility: 0.95,
    resetVisibility: 0.50
  };

  function init() {
    const section = document.querySelector(CONFIG.section);
    const layer = document.querySelector(CONFIG.layer);
    const background = document.querySelector(CONFIG.background);
    const urls = window.partnersShutterFrameURLs;

    if (!section || !layer || !background) {
      console.warn("Partners shutter: Missing Webflow elements.");
      return;
    }

    if (!Array.isArray(urls) || urls.length !== CONFIG.frameCount) {
      console.warn("Partners shutter: Expected 25 frame URLs.");
      return;
    }

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

    // Preload all 25 frames.
    const frames = urls.map((url) => {
      const frame = new Image();
      frame.src = url;
      return frame;
    });

    let played = false;
    let playing = false;
    let frameIndex = 0;
    let playbackTimer = null;

    image.src = urls[0];
    layer.style.visibility = "visible";

    function showFrame(index) {
      frameIndex = Math.max(0, Math.min(index, urls.length - 1));
      image.src = urls[frameIndex];
    }

    function play() {
      if (played || playing) return;

      playing = true;
      played = true;
      layer.style.visibility = "visible";
      showFrame(0);

      let nextFrame = 1;

      playbackTimer = window.setInterval(() => {
        showFrame(nextFrame);
        nextFrame++;

        if (nextFrame >= urls.length) {
          clearInterval(playbackTimer);
          playbackTimer = null;
          playing = false;
          showFrame(urls.length - 1);
        }
      }, 1000 / CONFIG.fps);
    }

    function reset() {
      if (playbackTimer !== null) {
        clearInterval(playbackTimer);
        playbackTimer = null;
      }

      played = false;
      playing = false;
      showFrame(0);
      layer.style.visibility = "visible";
    }

    function update() {
      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      const visiblePixels = Math.max(
        0,
        Math.min(rect.bottom, viewportHeight) -
        Math.max(rect.top, 0)
      );

      const visibility = Math.min(
        1,
        visiblePixels / Math.min(rect.height, viewportHeight)
      );

      // Play when 95% of the section is visible.
      if (visibility >= CONFIG.playVisibility) {
        play();
      }

      // Reset only when the visitor has moved
      // at least 50% beyond the section.
      if (
        rect.bottom <= viewportHeight * CONFIG.resetVisibility ||
        rect.top >= viewportHeight * CONFIG.resetVisibility
      ) {
        if (played || playing) {
          reset();
        }
      }
    }

    let ticking = false;

    function requestUpdate() {
      if (ticking) return;

      ticking = true;

      requestAnimationFrame(() => {
        ticking = false;
        update();
      });
    }

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    // Keep the alignment preview available.
    const params = new URLSearchParams(window.location.search);

    if (params.get("previewShutter") === "1") {
      layer.style.visibility = "visible";
    } else {
      update();
    }

    window.partnersShutter = {
      layer,
      image,
      frames,
      urls,
      play,
      reset
    };

    console.log("Partners shutter: Animation controller ready.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
