
(function () {
  "use strict";

  const CONFIG = {
    section: ".section_partners",
    layer: ".partners_shutter_layer",
    background: ".partners_bg",
    frameCount: 25,
    fps: 24
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

    // Create a single image element for frame playback.
    const image = document.createElement("img");
    image.alt = "";
    image.setAttribute("aria-hidden", "true");

    Object.assign(image.style, {
      position: "absolute",
      width: "100%",
      height: "100%",
      inset: "0",
      display: "block",
      pointerEvents: "none"
    });

    // Match the background's image fitting rules.
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

    // Preload frames for smoother playback.
    const frames = urls.map((url) => {
      const frame = new Image();
      frame.src = url;
      return frame;
    });

    // Initial frame, hidden until triggered.
    image.src = urls[0];
    layer.style.visibility = "hidden";

    // Temporary preview: display the first frame
    // by adding ?previewShutter=1 to the published URL.
    const params = new URLSearchParams(window.location.search);

    if (params.get("previewShutter") === "1") {
      layer.style.visibility = "visible";
    }

    window.partnersShutter = {
      layer,
      image,
      frames,
      urls
    };

    console.log("Partners shutter: 25 frames ready.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
