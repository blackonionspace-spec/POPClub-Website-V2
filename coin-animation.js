
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
    scrollDistance: "200%"
  };

  // Coin frame numbers are zero-based indices.
  // 1_3000 = index 0
  // 1_3119 = index 119

  const SPIN_START = 0;
  const SPIN_END = 44;

  const DROP_START = 45;
  const DROP_END = 74;

  const EXIT_START = 75;
  const EXIT_END = 119;

  // Curtain sequence:
  // index 0  = 1_202.avif
  // index 26 = 1_228.avif
  //
  // Curtains begin when the coin reaches
  // frame 1_3047 (coin index 47).

  const CURTAIN_START_COIN_FRAME = 47;
  const CURTAIN_LAST_FRAME = 26;

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
      curtainUrls.length !== 27
    ) {
      console.error(
        "Coin/curtain animation: Missing elements or frame URLs."
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

    // Lock immediately, before image loading.
    lockScroll();

    // =========================================
    // CANVAS RENDERING
    // =========================================

    function drawImageContained(layer, image) {
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

      // Preserve original image proportions.
      
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
      drawImageContained(
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

      drawImageContained(
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
            Math.round(index)
          )
        );
      }

      drawCurtain();
    }

    // Synchronize curtains to the coin's
    // current frame during the automatic drop.
    function updateCurtainFromCoin(coinFrame) {
      const roundedCoinFrame = Math.round(coinFrame);

      if (roundedCoinFrame < CURTAIN_START_COIN_FRAME) {
        showCurtainFrame(-1);
        return;
      }

      const curtainFrame =
        roundedCoinFrame - CURTAIN_START_COIN_FRAME;

      showCurtainFrame(
        Math.min(curtainFrame, CURTAIN_LAST_FRAME)
      );
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

        // Curtains remain on their final frame.
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

      const timeline = gsap.timeline({
        onComplete() {
          // Automatic animation is finished.
          introFinished = true;

          // Coin begins scroll exit at floor level.
          scrollProgress = 0;
          showCoinFrame(EXIT_START);

          // Keep curtains on final frame.
          showCurtainFrame(CURTAIN_LAST_FRAME);

          // Reset scroll before unlocking.
          window.scrollTo(0, 0);

          unlockScroll();

          // Recalculate after restoring overflow.
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
      // PART 1 — AUTOMATIC SPINS
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
      // PART 2 — AUTOMATIC DROP
      // =====================================

      timeline.fromTo(
        frameState,
        {
          value: DROP_START
        },
        {
          value: DROP_END,

          duration:
            (DROP_END - DROP_START + 1) /
            CONFIG.fps,

          ease: "none",

          onUpdate: () => {
            showCoinFrame(frameState.value);

            // Curtains follow the same timeline.
            updateCurtainFromCoin(frameState.value);
          }
        }
      );

      // Fade in heading during the coin drop (3s–4s).
      timeline.fromTo(
        ".coin_heading",
        { opacity: 0 },
        {
          opacity: 1,
          duration: 1,
          ease: "power2.inOut"
        },
        3
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
