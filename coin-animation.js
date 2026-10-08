
(() => {
  "use strict";

  function initCoinAnimation() {
    const wrapper = document.querySelector(".coin_wrapper");
    const container = document.querySelector(".coin_coin");
    const urls = window.coinFrameUrls;

    if (!wrapper || !container || !Array.isArray(urls) || urls.length !== 120) {
      console.error("Coin animation: Missing elements or frame URLs.");
      return;
    }

    if (!window.gsap || !window.ScrollTrigger) {
      console.error("Coin animation: GSAP or ScrollTrigger not loaded.");
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { alpha: true });

    if (!ctx) return;

    canvas.style.cssText =
      "display:block;width:100%;height:100%;pointer-events:none;";

    container.replaceChildren(canvas);

    const images = new Array(urls.length);
    const state = { frame: 0 };

    function resize() {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);

      draw();
    }

    function draw() {
      if (!canvas.width || !canvas.height) return;

      const index = Math.round(state.frame);
      const img = images[index];

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!img || !img.complete || !img.naturalWidth) return;

      const scale = Math.min(
        canvas.width / img.naturalWidth,
        canvas.height / img.naturalHeight
      );

      const width = img.naturalWidth * scale;
      const height = img.naturalHeight * scale;

      ctx.drawImage(
        img,
        (canvas.width - width) / 2,
        (canvas.height - height) / 2,
        width,
        height
      );
    }

    function loadFrame(index) {
      if (images[index]) return;

      const img = new Image();
      images[index] = img;

      img.onload = () => {
        if (Math.round(state.frame) === index) draw();
      };

      img.onerror = () => {
        console.warn(`Coin frame ${index} failed to load.`);
      };

      img.src = urls[index];
    }

    // Load the opening frame first.
    loadFrame(0);

    // Preload the remaining frames in small batches.
    let nextFrame = 1;

    function loadBatch() {
      const end = Math.min(nextFrame + 8, urls.length);

      for (; nextFrame < end; nextFrame++) {
        loadFrame(nextFrame);
      }

      if (nextFrame < urls.length) {
        setTimeout(loadBatch, 100);
      }
    }

    loadBatch();

    resize();

    window.addEventListener("resize", resize);

    gsap.to(state, {
      frame: urls.length - 1,
      ease: "none",
      snap: "frame",
      onUpdate: draw,
      scrollTrigger: {
        trigger: wrapper,
        start: "top top",
        end: "+=200%",
        scrub: true,
        pin: true,
        anticipatePin: 1
      }
    });

    console.log("Coin animation initialized: 120 frames");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCoinAnimation);
  } else {
    initCoinAnimation();
  }
})();
