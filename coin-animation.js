
(() => {
  "use strict";

  // Always start the homepage from the top on reload.
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  window.scrollTo(0, 0);

  // =========================================
  // ANIMATION SETTINGS
  // =========================================

  const CONFIG = {
    spinCount: 2,
    fps: 30,
    scrollDistance: "200%",
    curtainBreathingDuration: 7,
    curtainBreathingBrightness: 1.12
  };

  // Coin sequence: 1_3000.avif through 1_3119.avif
  const SPIN_START = 0;
  const SPIN_END = 44;

  const DROP_START = 45;
  const DROP_END = 74;

  const EXIT_START = 75;
  const EXIT_END = 119;

  // Curtain sequence: 1_200.avif through 1_239.avif
  const CURTAIN_FRAME_COUNT = 40;
  const CURTAIN_LAST_FRAME = 39;

  function initCoinAnimation() {
    const wrapper = document.querySelector(".coin_wrapper");
    const coinContainer = document.querySelector(".coin_coin");
    const curtainContainer = document.querySelector(".coin_curtains");

    const coinUrls = window.coinFrameUrls;
    const curtainUrls = window.curtainFrameUrls;

    if (
      !wrapper ||
      !coinContainer ||
      !curtainContainer ||
      !Array.isArray(coinUrls) ||
      coinUrls.length !== 120 ||
      !Array.isArray(curtainUrls) ||
      curtainUrls.length !== CURTAIN_FRAME_COUNT
    ) {
      console.error(
        "Coin/curtain animation: Missing elements or incorrect frame URL count."
      );
      return;
    }

    if (!window.gsap || !window.ScrollTrigger) {
      console.error(
        "Coin/curtain animation: GSAP or ScrollTrigger missing."
      );
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // =========================================
    // CANVAS SETUP
    // =========================================

    function createCanvas(container) {
      const canvas = document.createElement("canvas");

      canvas.style.cssText =
        "display:block;width:100%;height:100%;pointer-events:none;";

      const ctx = canvas.getContext("2d", {
        alpha: true
      });

      if (!ctx) return null;

      container.replaceChildren(canvas);

      return { canvas, ctx, container };
    }

    const coinLayer = createCanvas(coinContainer);
    const curtainLayer = createCanvas(curtainContainer);

    if (!coinLayer || !curtainLayer) return;

    const coinImages = new Array(coinUrls.length);
    const curtainImages = new Array(curtainUrls.length);

    let currentCoinFrame = SPIN_START;
    let currentCurtainFrame = -1;

    let introFinished = false;
    let scrollProgress = 0;

    // =========================================
    // CURTAIN BRIGHTNESS BREATHING
    // =========================================

    // Override any earlier always-on CSS breathing animation.
    curtainLayer.canvas.style.animation = "none";
    curtainLayer.canvas.style.filter = "brightness(1)";

    let curtainBreathingStarted = false;

    function startCurtainBreathing() {
      if (curtainBreathingStarted) return;

      curtainBreathingStarted = true;

      // Start at normal brightness and animate only
      // after the final curtain frame is displayed.
      gsap.fromTo(
        curtainLayer.canvas,
        {
          filter: "brightness(1)"
        },
        {
          filter: `brightness(${CONFIG.curtainBreathingBrightness})`,
          duration: CONFIG.curtainBreathingDuration / 2,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true
        }
      );
    }

    // =========================================
    // SCROLL LOCK
    // =========================================

    let scrollLocked = false;

    const blockedKeys = new Set([
      "ArrowUp",
      "ArrowDown",
      "PageUp",
      "PageDown",
      "Home",
      "End",
      " "
    ]);

    function preventScroll(event) {
      if (!scrollLocked) return;
      event.preventDefault();
    }

    function preventScrollKeys(event) {
      if (!scrollLocked) return;

      if (blockedKeys.has(event.key)) {
        event.preventDefault();
      }
    }

    function lockScroll() {
      if (scrollLocked) return;

      scrollLocked = true;

      document.addEventListener(
        "wheel",
        preventScroll,
        { passive: false }
      );

      document.addEventListener(
        "touchmove",
        preventScroll,
        { passive: false }
      );

      document.addEventListener(
        "keydown",
        preventScrollKeys,
        { passive: false }
      );

      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    }

    function unlockScroll() {
      if (!scrollLocked) return;

      scrollLocked = false;

      document.removeEventListener(
        "wheel",
        preventScroll
      );

      document.removeEventListener(
        "touchmove",
        preventScroll
      );

      document.removeEventListener(
        "keydown",
        preventScrollKeys
      );

      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }

    lockScroll();

    // =========================================
    // CANVAS RENDERING
    // =========================================

    function drawImageCover(layer, image) {
      const { canvas, ctx } = layer;

      ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      if (
        !image ||
        !image.complete ||
        !image.naturalWidth
      ) {
        return;
      }

      // Cover the viewport while preserving
      // the original image aspect ratio.
      const scale = Math.max(
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

    function drawCoin() {
      drawImageCover(
        coinLayer,
        coinImages[currentCoinFrame]
      );
    }

    function drawCurtain() {
      if (currentCurtainFrame < 0) {
        curtainLayer.ctx.clearRect(
          0,
          0,
          curtainLayer.canvas.width,
          curtainLayer.canvas.height
        );
        return;
      }

      drawImageCover(
        curtainLayer,
        curtainImages[currentCurtainFrame]
      );
    }

    function showCoinFrame(index) {
      currentCoinFrame = Math.max(
        0,
        Math.min(
          coinUrls.length - 1,
          Math.round(index)
        )
      );

      drawCoin();
    }

    function showCurtainFrame(index) {
      if (index < 0) {
        currentCurtainFrame = -1;
      } else {
        currentCurtainFrame = Math.max(
          0,
          Math.min(
            CURTAIN_LAST_FRAME,
            Math.floor(index)
          )
        );
      }

      drawCurtain();
    }

    // =========================================
    // RESIZING
    // =========================================

    function resizeLayer(layer, drawFunction) {
      const rect = layer.container.getBoundingClientRect();

      const dpr = Math.min(
        window.devicePixelRatio || 1,
        2
      );

      layer.canvas.width = Math.max(
        1,
        Math.round(rect.width * dpr)
      );

      layer.canvas.height = Math.max(
        1,
        Math.round(rect.height * dpr)
      );

      drawFunction();
    }

    function resize() {
      resizeLayer(coinLayer, drawCoin);
      resizeLayer(curtainLayer, drawCurtain);
    }

    resize();

    window.addEventListener(
      "resize",
      resize
    );

    // =========================================
    // FRAME PRELOADING
    // =========================================

    function preloadFrames(urls, images, label, onLoad) {
      return urls.map((url, index) => {
        return new Promise((resolve) => {
          const image = new Image();

          images[index] = image;

          image.onload = () => {
            if (onLoad) onLoad(index);
            resolve(true);
          };

          image.onerror = () => {
            console.warn(
              `${label} frame ${index} failed to load.`
            );
            resolve(false);
          };

          image.src = url;
        });
      });
    }

    const coinPreloads = preloadFrames(
      coinUrls,
      coinImages,
      "Coin",
      (index) => {
        if (index === currentCoinFrame) {
          drawCoin();
        }
      }
    );

    const curtainPreloads = preloadFrames(
      curtainUrls,
      curtainImages,
      "Curtain",
      (index) => {
        if (index === currentCurtainFrame) {
          drawCurtain();
        }
      }
    );

    // =========================================
    // SCROLL-CONTROLLED EXIT
    // =========================================

    const scrollTrigger = ScrollTrigger.create({
      trigger: wrapper,
      start: "top top",
      end: `+=${CONFIG.scrollDistance}`,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,

      onUpdate(self) {
        if (!introFinished) return;

        scrollProgress = self.progress;

        const frame =
          EXIT_START +
          scrollProgress *
          (EXIT_END - EXIT_START);

        showCoinFrame(frame);

        // Curtains remain on their final frame,
        // with brightness breathing continuing.
      }
    });

    // =========================================
    // AUTOMATIC INTRO
    // =========================================

    Promise.all([
      ...coinPreloads,
      ...curtainPreloads
    ]).then(() => {
      showCoinFrame(SPIN_START);
      showCurtainFrame(-1);

      const frameState = {
        value: SPIN_START
      };

      const curtainState = {
        value: 0
      };

      const timeline = gsap.timeline({
        onComplete() {
          introFinished = true;

          scrollProgress = 0;
          showCoinFrame(EXIT_START);

          // Keep the last curtain frame visible.
          showCurtainFrame(CURTAIN_LAST_FRAME);

          // Safety check: breathing begins only
          // once the curtain sequence has finished.
          startCurtainBreathing();

          window.scrollTo(0, 0);

          unlockScroll();

          ScrollTrigger.refresh();

          scrollProgress = scrollTrigger.progress;

          const frame =
            EXIT_START +
            scrollProgress *
            (EXIT_END - EXIT_START);

          showCoinFrame(frame);

          console.log(
            "Coin and curtain intro complete. Scroll exit active."
          );
        }
      });

      // =====================================
      // PART 1 — AUTOMATIC COIN SPINS
      // =====================================

      for (
        let spin = 0;
        spin < CONFIG.spinCount;
        spin++
      ) {
        timeline.fromTo(
          frameState,
          {
            value: SPIN_START
          },
          {
            value: SPIN_END,

            duration:
              (SPIN_END - SPIN_START + 1) /
              CONFIG.fps,

            ease: "none",

            onUpdate: () => {
              showCoinFrame(frameState.value);
            }
          }
        );
      }

      // =====================================
      // PART 2 — AUTOMATIC COIN DROP
      // =====================================

      const dropDuration =
        (DROP_END - DROP_START + 1) /
        CONFIG.fps;

      const dropStartTime =
        CONFIG.spinCount *
        (SPIN_END - SPIN_START + 1) /
        CONFIG.fps;

      timeline.fromTo(
        frameState,
        {
          value: DROP_START
        },
        {
          value: DROP_END,
          duration: dropDuration,
          ease: "none",

          onUpdate: () => {
            showCoinFrame(frameState.value);
          }
        }
      );

      // =====================================
      // PART 3 — 40-FRAME CURTAIN REVEAL
      // =====================================

      // The curtain reveal begins at the exact
      // same time as the coin drop.
      //
      // 40 frames are distributed over one second,
      // independently of the coin's 30 FPS frames.

      timeline.fromTo(
        curtainState,
        {
          value: 0
        },
        {
          value: CURTAIN_FRAME_COUNT,
          duration: dropDuration,
          ease: "none",

          onUpdate: () => {
            showCurtainFrame(
              Math.min(
                CURTAIN_LAST_FRAME,
                curtainState.value
              )
            );
          },

          onComplete: () => {
            // Display the final curtain frame first.
            showCurtainFrame(CURTAIN_LAST_FRAME);

            // Only now begin brightness breathing.
            startCurtainBreathing();
          }
        },
        dropStartTime
      );

      // =====================================
      // PART 4 — HEADING FADE-IN
      // =====================================

      // Fade begins when the coin drops,
      // at exactly 3 seconds into the intro.

      timeline.fromTo(
        ".coin_heading",
        {
          opacity: 0
        },
        {
          opacity: 1,
          duration: dropDuration,
          ease: "power2.inOut"
        },
        dropStartTime
      );

      console.log(
        `Coin intro started: ${CONFIG.spinCount} spins at ${CONFIG.fps} FPS`
      );
    });
  }

  // =========================================
  // INITIALIZATION
  // =========================================

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initCoinAnimation
    );
  } else {
    initCoinAnimation();
  }
})();
