
(() => {
  "use strict";

  // =========================================
  // ANIMATION SETTINGS
  // =========================================

  const CONFIG = {
    spinCount: 2,
    fps: 30,
    scrollDistance: "200%"
  };

  // Frame numbers are zero-based array indices.
  // 1_3000 = index 0, 1_3119 = index 119.

  const SPIN_START = 0;
  const SPIN_END = 44;

  const DROP_START = 45;
  const DROP_END = 74;

  const EXIT_START = 75;
  const EXIT_END = 119;

  function initCoinAnimation() {
    const wrapper = document.querySelector(".coin_wrapper");
    const container = document.querySelector(".coin_coin");
    const urls = window.coinFrameUrls;

    if (!wrapper || !container || !Array.isArray(urls) || urls.length !== 120) {
      console.error("Coin animation: Missing elements or frame URLs.");
      return;
    }

    if (!window.gsap || !window.ScrollTrigger) {
      console.error("Coin animation: GSAP or ScrollTrigger missing.");
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // =========================================
    // CANVAS
    // =========================================

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { alpha: true });

    if (!ctx) return;

    canvas.style.cssText =
      "display:block;width:100%;height:100%;pointer-events:none;";

    container.replaceChildren(canvas);

    const images = new Array(urls.length);
    let currentFrame = 0;
    let introFinished = false;
    let scrollProgress = 0;

    function draw() {
      const image = images[currentFrame];

      // Keep the previous frame visible while
      // the next image is still loading.
      if (!image || !image.complete || !image.naturalWidth) {
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const scale = Math.min(
        canvas.width / image.naturalWidth,
        canvas.height / image.naturalHeight
      );

      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;

      ctx.drawImage(
        image,
        (canvas.width - width) / 2,
        (canvas.height - height) / 2,
        width,
        height
      );
    }

    function showFrame(index) {
      currentFrame = Math.max(
        0,
        Math.min(urls.length - 1, Math.round(index))
      );

      draw();
    }

    function resize() {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));

      draw();
    }

    function loadFrame(index) {
      if (images[index]) return;

      const image = new Image();
      images[index] = image;

      image.onload = () => {
        if (index === currentFrame) draw();
      };

      image.onerror = () => {
        console.warn(`Coin frame ${index} failed to load.`);
      };

      image.src = urls[index];
    }

    // =========================================
    // FRAME PRELOADING
    // =========================================

    // Wait for all frames before beginning.
    // This prevents blank frames during playback.

    const preloadPromises = urls.map((url, index) => {
      return new Promise((resolve) => {
        const image = new Image();
        images[index] = image;

        image.onload = () => resolve(true);

        image.onerror = () => {
          console.warn(`Coin frame ${index} failed.`);
          resolve(false);
        };

        image.src = url;
      });
    });

    resize();
    window.addEventListener("resize", resize);

    // =========================================
    // SCROLL-CONTROLLED EXIT
    // =========================================

    // Set up ScrollTrigger immediately so the
    // section is pinned even during the intro.

    ScrollTrigger.create({
      trigger: wrapper,
      start: "top top",
      end: `+=${CONFIG.scrollDistance}`,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,

      onUpdate(self) {
        scrollProgress = self.progress;

        if (!introFinished) return;

        const frame =
          EXIT_START +
          scrollProgress * (EXIT_END - EXIT_START);

        showFrame(frame);
      }
    });

    // =========================================
    // AUTOMATIC INTRO
    // =========================================

    Promise.all(preloadPromises).then(() => {
      showFrame(SPIN_START);

      const frameState = { value: SPIN_START };

      const timeline = gsap.timeline({
        onComplete() {
          introFinished = true;

          // Match the exit to the current
          // scroll position, if already scrolled.
          const frame =
            EXIT_START +
            scrollProgress * (EXIT_END - EXIT_START);

          showFrame(frame);

          console.log("Coin intro complete. Scroll exit active.");
        }
      });

      // Repeat the full rotation.
      for (let spin = 0; spin < CONFIG.spinCount; spin++) {
        timeline.fromTo(
          frameState,
          { value: SPIN_START },
          {
            value: SPIN_END,
            duration: (SPIN_END - SPIN_START + 1) / CONFIG.fps,
            ease: "none",
            onUpdate: () => showFrame(frameState.value)
          }
        );
      }

      // Automatically descend to floor.
      timeline.fromTo(
        frameState,
        { value: DROP_START },
        {
          value: DROP_END,
          duration: (DROP_END - DROP_START + 1) / CONFIG.fps,
          ease: "none",
          onUpdate: () => showFrame(frameState.value)
        }
      );

      console.log(
        `Coin intro started: ${CONFIG.spinCount} spins at ${CONFIG.fps} FPS`
      );
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCoinAnimation);
  } else {
    initCoinAnimation();
  }
})();
