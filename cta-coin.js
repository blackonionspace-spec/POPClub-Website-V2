
/*
 * POPClub V2 — CTA Coin Animation
 *
 * Coin: 40 AVIF frames at 24 FPS
 * Activation: CTA 98% visible
 * First coin frame visible before activation
 * Radial reveal: 20% to 98% entry visibility
 * Replays on CTA re-entry
 * Emits cta:coin-start and cta:coin-complete events
 */

(() => {
  "use strict";

  const CONFIG = {
    fps: 24,
    maxDPR: 2,
    activationThreshold: 0.98,

    radialStart: 0.20,
    radialEnd: 0.98,
    radialInitialRadius: 0.06,
    radialFeather: 0.22
  };

  function init() {
    const section = document.querySelector(".section_cta");
    const container = document.querySelector(".cta_coin_layer");
    const urls = window.ctaCoinFrameURLs;

    if (!section || !container) {
      console.warn("[CTA] Section or coin layer not found.");
      return;
    }

    if (!Array.isArray(urls) || urls.length !== 40) {
      console.warn("[CTA] Expected 40 coin frame URLs.");
      return;
    }

    if (!window.gsap) {
      console.warn("[CTA] GSAP not found.");
      return;
    }

    if (container.dataset.ctaCoinInitialized === "true") return;
    container.dataset.ctaCoinInitialized = "true";

    // --------------------------------------------------
    // Canvas setup
    // --------------------------------------------------

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { alpha: true });

    if (!ctx) return;

    canvas.style.cssText = [
      "position:absolute",
      "inset:0",
      "display:block",
      "width:100%",
      "height:100%",
      "pointer-events:none"
    ].join(";");

    container.appendChild(canvas);
    container.style.pointerEvents = "none";

    const images = new Array(urls.length);

    let ready = false;
    let active = false;
    let playing = false;
    let completed = false;
    let startTime = 0;
    let currentFrame = -1;
    let rafId = null;

    const duration = urls.length / CONFIG.fps;

    // --------------------------------------------------
    // Canvas sizing
    // --------------------------------------------------

    function resize() {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(
        window.devicePixelRatio || 1,
        CONFIG.maxDPR
      );

      canvas.width = Math.max(
        1,
        Math.round(rect.width * dpr)
      );

      canvas.height = Math.max(
        1,
        Math.round(rect.height * dpr)
      );

      if (ready && currentFrame >= 0 && !completed) {
        drawFrame(currentFrame);
      }

      updateRadialReveal();
    }

    // --------------------------------------------------
    // Draw coin frame
    // --------------------------------------------------

    function drawFrame(index) {
      const img = images[index];

      if (!img || !img.naturalWidth) return;

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      const scale = Math.max(
        w / img.naturalWidth,
        h / img.naturalHeight
      );

      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;

      ctx.drawImage(
        img,
        (w - drawW) / 2,
        (h - drawH) / 2,
        drawW,
        drawH
      );
    }

    // --------------------------------------------------
    // Radial reveal
    // --------------------------------------------------

    function updateRadialReveal() {
      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Use entry progress rather than total visible
      // area so the mask does not close when the
      // visitor continues down past the CTA.

      const referenceHeight = Math.min(
        rect.height,
        viewportHeight
      );

      if (referenceHeight <= 0) return;

      const entryVisibility =
        (viewportHeight - rect.top) /
        referenceHeight;

      const rawProgress =
        (entryVisibility - CONFIG.radialStart) /
        (CONFIG.radialEnd - CONFIG.radialStart);

      const progress = Math.max(
        0,
        Math.min(1, rawProgress)
      );

      // At full reveal, remove the mask entirely.
      if (progress >= 1) {
        canvas.style.maskImage = "none";
        canvas.style.webkitMaskImage = "none";
        return;
      }

      const width = container.clientWidth;
      const height = container.clientHeight;

      if (width <= 0 || height <= 0) return;

      // Distance from center to farthest corner.
      const maximumRadius =
        Math.hypot(width, height) / 2;

      const initialRadius =
        Math.min(width, height) *
        CONFIG.radialInitialRadius;

      // Expands beyond all four corners.
      const radius =
        initialRadius +
        progress *
        (maximumRadius * 1.3 - initialRadius);

      const feather =
        Math.max(1, radius * CONFIG.radialFeather);

      const solidRadius = Math.max(
        0,
        radius - feather
      );

      const mask = [
        "radial-gradient(",
        "circle at 50% 50%,",
        "black 0px,",
        `black ${solidRadius}px,`,
        `transparent ${radius}px`,
        ")"
      ].join(" ");

      canvas.style.maskImage = mask;
      canvas.style.webkitMaskImage = mask;
    }

    // --------------------------------------------------
    // Reset when leaving CTA
    // --------------------------------------------------

    function stopAndReset() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      playing = false;
      completed = false;
      currentFrame = 0;

      canvas.style.display = "block";
      drawFrame(0);
      updateRadialReveal();

      console.log("[CTA] Reset — first frame restored.");
    }

    // --------------------------------------------------
    // Complete coin playback
    // --------------------------------------------------

    function complete() {
      playing = false;
      completed = true;
      rafId = null;

      canvas.style.display = "none";

      section.dispatchEvent(
        new CustomEvent("cta:coin-complete", {
          bubbles: true,
          detail: { duration }
        })
      );

      console.log("[CTA] Coin complete.");
    }

    // --------------------------------------------------
    // Coin animation loop
    // --------------------------------------------------

    function tick(now) {
      if (!playing || !active) return;

      const elapsed = (now - startTime) / 1000;

      if (elapsed >= duration) {
        complete();
        return;
      }

      const nextFrame = Math.min(
        urls.length - 1,
        Math.floor(elapsed * CONFIG.fps)
      );

      if (nextFrame !== currentFrame) {
        currentFrame = nextFrame;
        drawFrame(currentFrame);
      }

      rafId = requestAnimationFrame(tick);
    }

    // --------------------------------------------------
    // Start coin animation
    // --------------------------------------------------

    function start() {
      if (!ready || !active || playing || completed) return;

      playing = true;
      currentFrame = 0;

      canvas.style.display = "block";

      resize();
      drawFrame(0);

      startTime = performance.now();

      section.dispatchEvent(
        new CustomEvent("cta:coin-start", {
          bubbles: true
        })
      );

      rafId = requestAnimationFrame(tick);

      console.log("[CTA] Coin playing at 24 FPS.");
    }

    // --------------------------------------------------
    // Load all 40 AVIF frames
    // --------------------------------------------------

    Promise.all(
      urls.map((url, index) =>
        new Promise((resolve, reject) => {
          const img = new Image();

          img.onload = () => {
            images[index] = img;
            resolve();
          };

          img.onerror = () => {
            reject(
              new Error(
                `Coin frame ${index} failed: ${url}`
              )
            );
          };

          img.src = url;
        })
      )
    )
      .then(() => {
        ready = true;

        // Display first frame before activation.
        currentFrame = 0;
        canvas.style.display = "block";
        drawFrame(0);

        console.log("[CTA] All 40 frames loaded.");

        start();
      })
      .catch(error => {
        console.error("[CTA]", error);
      });

    // --------------------------------------------------
    // Resize listener
    // --------------------------------------------------

    resize();

    window.addEventListener("resize", resize);

    // --------------------------------------------------
    // Activate at 98% visibility
    // Reset only after leaving by another 20vh
    // --------------------------------------------------

    const RESET_OVERSHOOT = 0.2;

    function checkCTAVisibility() {
      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      const visibleHeight = Math.max(
        0,
        Math.min(rect.bottom, viewportHeight) -
        Math.max(rect.top, 0)
      );

      const visibilityRatio =
        visibleHeight / rect.height;

      updateRadialReveal();

      // Start when 98% of the CTA is visible.
      if (
        !active &&
        visibilityRatio >= CONFIG.activationThreshold
      ) {
        active = true;
        start();
      }

      // Preserve original reset behavior.
      if (active) {
        const exitedAbove =
          rect.bottom <
          -viewportHeight * RESET_OVERSHOOT;

        const exitedBelow =
          rect.top >
          viewportHeight * (1 + RESET_OVERSHOOT);

        if (exitedAbove || exitedBelow) {
          active = false;
          stopAndReset();
        }
      }
    }

    window.addEventListener(
      "scroll",
      checkCTAVisibility,
      { passive: true }
    );

    window.addEventListener(
      "resize",
      checkCTAVisibility
    );

    checkCTAVisibility();
  }

  // ==================================================
  // CTA TEXT ANIMATION — ORIGINAL BEHAVIOR
  // ==================================================

  function initCTAText() {
    const section = document.querySelector(".section_cta");
    const textLayer = document.querySelector(".cta_text_layer");

    if (!section || !textLayer || !window.gsap) {
      console.warn(
        "[CTA Text] Required elements or GSAP missing."
      );
      return;
    }

    const CONFIG = {
      fps: 24,
      explosionFrame: 38,
      expandDuration: 1.1,
      settleDuration: 0.4,
      resetOvershoot: 0.2
    };

    let entranceTimeline = null;
    let scheduledStart = null;
    let armed = false;

    function resetText() {
      if (scheduledStart) {
        scheduledStart.kill();
        scheduledStart = null;
      }

      if (entranceTimeline) {
        entranceTimeline.kill();
        entranceTimeline = null;
      }

      gsap.killTweensOf(textLayer);

      gsap.set(textLayer, {
        scale: 0,
        opacity: 0,
        transformOrigin: "50% 50%"
      });
    }

    function animateText() {
      scheduledStart = null;

      entranceTimeline = gsap.timeline();

      entranceTimeline.to(textLayer, {
        scale: 1,
        opacity: 1,
        duration: 1.2,
        ease: "power2.out"
      });
    }

    section.addEventListener("cta:coin-start", () => {
      armed = true;
      resetText();

      scheduledStart = gsap.delayedCall(
        CONFIG.explosionFrame / CONFIG.fps,
        animateText
      );
    });

    function checkReset() {
      if (!armed) return;

      const rect = section.getBoundingClientRect();
      const extra =
        window.innerHeight * CONFIG.resetOvershoot;

      if (
        rect.bottom < -extra ||
        rect.top > window.innerHeight + extra
      ) {
        armed = false;
        resetText();
      }
    }

    window.addEventListener(
      "scroll",
      checkReset,
      { passive: true }
    );

    window.addEventListener("resize", checkReset);

    resetText();

    console.log(
      "[CTA Text] Scale + bounce initialized."
    );
  }

  function initializeCTA() {
    initCTAText();
    init();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeCTA
    );
  } else {
    initializeCTA();
  }
})();
