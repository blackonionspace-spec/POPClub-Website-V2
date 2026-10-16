
/*
 * POPClub V2 — CTA Coin + Background Animation
 *
 * Coin: 40 AVIF frames at 24 FPS
 * Background explosion: starts at frame 5_38
 * Background: scale 0.1 -> 1, opacity 0 -> 1
 * Explosion duration: 0.5 seconds
 * Replays when CTA leaves and re-enters viewport
 */

(() => {
  "use strict";

  const CONFIG = {
    fps: 24,
    maxDPR: 2,
    activationThreshold: 0.6,
    explosionFrame: 38,
    explosionDuration: 0.7
  };

  function init() {
    const section = document.querySelector(".section_cta");
    const container = document.querySelector(".cta_coin_layer");
    const bgEffect = document.querySelector(".cta_bg_effect");
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
    let bgExplosionStarted = false;

    const duration = urls.length / CONFIG.fps;

    // --------------------------------------------------
    // Background animation
    // --------------------------------------------------

    function resetBackground() {
      bgExplosionStarted = false;

      if (!bgEffect) return;

      gsap.killTweensOf(bgEffect);

      gsap.set(bgEffect, {
        scale: 0.1,
        opacity: 0,
        transformOrigin: "50% 50%"
      });
    }

    function startBackgroundExplosion() {
      if (!bgEffect || bgExplosionStarted) return;

      bgExplosionStarted = true;

      gsap.to(bgEffect, {
        scale: 1,
        opacity: 1,
        duration: CONFIG.explosionDuration,
        ease: "power2.out",
        overwrite: true
      });

      console.log("[CTA] Background explosion started.");
    }

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

      if (ready && playing && currentFrame >= 0) {
        drawFrame(currentFrame);
      }
    }

    // --------------------------------------------------
    // Draw AVIF frame
    // --------------------------------------------------

    function drawFrame(index) {
      const img = images[index];

      if (!img || !img.naturalWidth) return;

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Cover behaviour, preserving aspect ratio
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
    // Reset when leaving CTA
    // --------------------------------------------------

    function stopAndReset() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      playing = false;
      completed = false;
      currentFrame = -1;

      canvas.style.display = "none";

      ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      resetBackground();

      console.log("[CTA] Reset — ready to replay.");
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
    // Animation loop
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

        // Trigger explosion at frame 5_38
        if (currentFrame >= CONFIG.explosionFrame) {
          startBackgroundExplosion();
        }
      }

      rafId = requestAnimationFrame(tick);
    }

    // --------------------------------------------------
    // Start coin animation
    // --------------------------------------------------

    function start() {
      if (!ready || !active || playing || completed) return;

      resetBackground();

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

    resetBackground();

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
    // Replay on CTA re-entry
    // --------------------------------------------------

    const observer = new IntersectionObserver(
      entries => {
        const visible =
          entries[0].intersectionRatio >=
          CONFIG.activationThreshold;

        if (visible && !active) {
          active = true;
          start();
        } else if (!visible && active) {
          active = false;
          stopAndReset();
        }
      },
      {
        threshold: [
          0,
          CONFIG.activationThreshold,
          1
        ]
      }
    );

    observer.observe(section);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
