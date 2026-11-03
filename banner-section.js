
/*
 * POPClub V2 — Banner Section
 *
 * 1. Mouse-following background spotlight
 * 2. Scroll-driven products carousel
 *
 * Banner CSS remains in Webflow Head.
 */

// ==========================================
// BANNER SPOTLIGHT
// ==========================================

(() => {
  function initBannerSpotlight() {
    const section = document.querySelector('.section_banner');
    if (!section) return;

    const spotlight = section.querySelector('.banner_bg_light');
    if (!spotlight) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let initialized = false;

    function updateTarget(event) {
      const rect = section.getBoundingClientRect();

      targetX = event.clientX - rect.left;
      targetY = event.clientY - rect.top;

      if (!initialized) {
        currentX = targetX;
        currentY = targetY;
        initialized = true;
      }
    }

    section.addEventListener('pointerenter', updateTarget);
    section.addEventListener('pointermove', updateTarget);

    function animateSpotlight() {
      if (initialized) {
        currentX += (targetX - currentX) * 0.1;
        currentY += (targetY - currentY) * 0.1;

        section.style.setProperty('--spot-x', currentX + 'px');
        section.style.setProperty('--spot-y', currentY + 'px');
      }

      requestAnimationFrame(animateSpotlight);
    }

    animateSpotlight();
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      initBannerSpotlight
    );
  } else {
    initBannerSpotlight();
  }
})();

// ==========================================
// PRODUCTS CAROUSEL
// ==========================================

(() => {
  function initBannerProducts() {
    if (!window.gsap || !window.ScrollTrigger) {
      console.warn('[Banner Products] GSAP or ScrollTrigger missing.');
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const section = document.querySelector('.section_banner');
    const viewport = section?.querySelector(
      '.products_viewport.banner_products'
    );

    const slides = viewport
      ? gsap.utils.toArray(
          viewport.querySelectorAll('.product_slide')
        )
      : [];

    if (!section || !viewport || slides.length < 2) {
      console.warn('[Banner Products] Missing banner, viewport, or slides.');
      return;
    }

    const lastIndex = slides.length - 1;

    // ==========================================
    // ORIGINAL SCROLL SETTINGS — UNCHANGED
    // ==========================================

    const BANNER_HOLD = 0.75;
    const CARD_DURATION = 1;
    const END_HOLD = 0.35;

    const totalUnits =
      BANNER_HOLD +
      slides.length * CARD_DURATION +
      END_HOLD;

    // ==========================================
    // VIDEO SWITCHING SETTINGS
    // ==========================================

    const FORWARD_ACTIVATION = 0.95;
    const BACKWARD_ACTIVATION = 0.15;

    let activeIndex = -1;

    // ==========================================
    // FIRST-PASS EXPERIMENT — UPI CARD ONLY
    // ==========================================

    const FIRST_CARD_GATE = {
      enabled: true,
      maxWaitMs: 4500,
      minimumHoldMs: 550,
      gestureQuietMs: 220
    };

    let firstGateSeen = false;
    let firstGateHolding = false;
    let firstGateStarted = 0;
    let firstGateLastWheel = 0;
    let firstGateTimer = null;
    let bannerTrigger = null;

    const firstCardEndUnits =
      BANNER_HOLD + CARD_DURATION;

    const firstCardEndProgress =
      firstCardEndUnits / totalUnits;

    function releaseFirstGate(reason) {
      if (!firstGateHolding) return;

      firstGateHolding = false;
      firstGateSeen = true;

      clearTimeout(firstGateTimer);
      firstGateTimer = null;

      console.info(
        '[Banner Products] First-card hold released:',
        reason
      );
    }

    function startFirstGate() {
      if (
        !FIRST_CARD_GATE.enabled ||
        firstGateSeen ||
        firstGateHolding
      ) return;

      firstGateHolding = true;
      firstGateStarted = performance.now();
      firstGateLastWheel = firstGateStarted;

      firstGateTimer = setTimeout(
        () => releaseFirstGate('failsafe timeout'),
        FIRST_CARD_GATE.maxWaitMs
      );

      console.info(
        '[Banner Products] First-card hold started.'
      );
    }

    function firstCardEndY() {
      return bannerTrigger
        ? bannerTrigger.start +
            firstCardEndProgress *
            (bannerTrigger.end - bannerTrigger.start)
        : null;
    }

    function onBannerWheel(event) {
      if (
        !FIRST_CARD_GATE.enabled ||
        firstGateSeen ||
        !bannerTrigger ||
        event.deltaY <= 0
      ) return;

      // Do not interfere with Ctrl+wheel browser zoom.
      if (event.ctrlKey) return;

      const y = window.scrollY;
      const endY = firstCardEndY();

      if (endY === null) return;

      // Only intervene inside the first card's range.
      // Widget navigation is not intercepted.

      const nearFirstCard =
        y >= bannerTrigger.start &&
        y <= endY + 2;

      if (!nearFirstCard) return;

      const now = performance.now();

      if (firstGateHolding) {
        const freshGesture =
          now - firstGateLastWheel >=
          FIRST_CARD_GATE.gestureQuietMs;

        const enoughTime =
          now - firstGateStarted >=
          FIRST_CARD_GATE.minimumHoldMs;

        firstGateLastWheel = now;

        if (freshGesture && enoughTime) {
          releaseFirstGate('new downward gesture');
          return;
        }

        event.preventDefault();
        return;
      }

      // Catch a fast wheel gesture that would
      // otherwise skip the first card.

      const deltaPixels =
        event.deltaY *
        (
          event.deltaMode === 1
            ? 16
            : event.deltaMode === 2
              ? window.innerHeight
              : 1
        );

      if (y + deltaPixels >= endY - 2) {
        event.preventDefault();

        startFirstGate();

        window.scrollTo({
          top: endY,
          behavior: 'instant'
        });

        ScrollTrigger.update();
      }
    }

    window.addEventListener(
      'wheel',
      onBannerWheel,
      {
        passive: false,
        capture: true
      }
    );

    // ==========================================
    // VIDEO CONTROLLERS
    // ==========================================

    const products = slides.map((slide, index) => {
      const video = slide.querySelector('video');
      const content = slide.querySelector(
        '.product_content'
      );

      if (!video || !content) {
        console.warn(
          '[Banner Products] Missing video or content:',
          index + 1
        );
      }

      if (content) {
        gsap.set(content, { opacity: 0 });
      }

      if (video) {
        video.muted = true;
        video.defaultMuted = true;
        video.loop = false;
        video.playsInline = true;

        video.setAttribute('muted', '');
        video.setAttribute('playsinline', '');

        video.pause();
      }

      let animationFrame = null;
      let completed = false;
      let resetPending = false;

      // ----------------------------------------
      // TRACKING
      // ----------------------------------------

      function stopTracking() {
        if (animationFrame !== null) {
          cancelAnimationFrame(animationFrame);
          animationFrame = null;
        }
      }

      function updateText() {
        if (!video || !content) return;

        const duration = video.duration;

        if (
          !Number.isFinite(duration) ||
          duration <= 0
        ) return;

        const fadeStart = duration * 0.5;

        const opacity = gsap.utils.clamp(
          0,
          1,
          (video.currentTime - fadeStart) / 1
        );

        gsap.set(content, { opacity });
      }

      function trackPlayback() {
        updateText();

        if (video && !video.paused && !video.ended) {
          animationFrame =
            requestAnimationFrame(trackPlayback);
        } else {
          animationFrame = null;
        }
      }

      // ----------------------------------------
      // RESET COMPLETED VIDEO
      // ----------------------------------------

      function resetToBeginning() {
        if (!video) return;

        stopTracking();
        video.pause();

        completed = false;

        if (content) {
          gsap.set(content, { opacity: 0 });
        }

        try {
          video.currentTime = 0;
          resetPending = false;
        } catch (error) {
          resetPending = true;
        }
      }

      // ----------------------------------------
      // PAUSE ON DEACTIVATION
      // ----------------------------------------

      function pause() {
        if (!video) return;

        stopTracking();
        video.pause();

        if (completed || video.ended) {
          resetToBeginning();
        }
      }

      // ----------------------------------------
      // PLAY OR RESUME
      // ----------------------------------------

      function play() {
        if (!video) return;

        stopTracking();

        if (completed || video.ended) {
          updateText();
          return;
        }

        const promise = video.play();

        if (
          promise &&
          typeof promise.catch === 'function'
        ) {
          promise.catch(error => {
            console.warn(
              '[Banner Products] Video playback failed:',
              error
            );
          });
        }

        animationFrame =
          requestAnimationFrame(trackPlayback);
      }

      // ----------------------------------------
      // VIDEO EVENTS
      // ----------------------------------------

      if (video) {
        video.addEventListener(
          'timeupdate',
          updateText
        );

        video.addEventListener('ended', () => {
          completed = true;

          if (index === 0) {
            releaseFirstGate('video ended');
          }

          stopTracking();
          updateText();
        });

        video.addEventListener(
          'loadedmetadata',
          () => {
            if (resetPending) {
              resetToBeginning();
            }
          }
        );
      }

      return { pause, play };
    });

    // ==========================================
    // PRODUCT ACTIVATION
    // ==========================================

    function activateProduct(index) {
      if (index < 0 || index > lastIndex) return;
      if (activeIndex === index) return;

      if (activeIndex >= 0) {
        products[activeIndex].pause();
      }

      activeIndex = index;
      products[index].play();

      console.log(
        '[Banner Products] Active product:',
        index + 1
      );
    }

    function deactivateProducts() {
      if (activeIndex === -1) return;

      products[activeIndex].pause();
      activeIndex = -1;
    }

    // ==========================================
    // STABLE VIDEO ACTIVATION
    // ==========================================

    function syncActiveProduct(units) {
      if (
        units <=
        BANNER_HOLD +
        BACKWARD_ACTIVATION * CARD_DURATION
      ) {
        deactivateProducts();
        return;
      }

      let forwardIndex = -1;

      for (let i = 0; i <= lastIndex; i++) {
        const activationPoint =
          BANNER_HOLD +
          (i + FORWARD_ACTIVATION) *
          CARD_DURATION;

        if (units >= activationPoint) {
          forwardIndex = i;
        }
      }

      if (activeIndex === -1) {
        if (forwardIndex >= 0) {
          activateProduct(forwardIndex);
        }
        return;
      }

      // Forward scrolling.

      if (forwardIndex > activeIndex) {
        activateProduct(forwardIndex);
        return;
      }

      // Backward scrolling.

      let backwardIndex = activeIndex;

      while (backwardIndex > 0) {
        const cardStart =
          BANNER_HOLD +
          backwardIndex * CARD_DURATION;

        const backwardPoint =
          cardStart +
          BACKWARD_ACTIVATION *
          CARD_DURATION;

        if (units <= backwardPoint) {
          backwardIndex--;
        } else {
          break;
        }
      }

      if (backwardIndex !== activeIndex) {
        activateProduct(backwardIndex);
      }
    }

    // ==========================================
    // INITIAL SLIDE POSITIONS
    // ==========================================

    gsap.set(slides, {
      yPercent: 100,
      zIndex: i => i + 1
    });

    gsap.set(viewport, { opacity: 1 });

    // ==========================================
    // SCROLL TIMELINE
    // ==========================================

    const timeline = gsap.timeline({
      defaults: { ease: 'none' },

      scrollTrigger: {
        trigger: section,
        start: 'top top',

        end: () =>
          '+=' +
          window.innerHeight * totalUnits,

        pin: true,
        scrub: 0.65,
        anticipatePin: 1,
        invalidateOnRefresh: true,

        snap: {
          snapTo: progress => {
            if (
              firstGateHolding &&
              progress <=
                firstCardEndProgress + 0.01
            ) {
              return firstCardEndProgress;
            }

            return snapPoints.reduce(
              (closest, point) =>
                Math.abs(point - progress) <
                Math.abs(closest - progress)
                  ? point
                  : closest
            );
          },

          duration: {
            min: 0.2,
            max: 0.45
          },

          delay: 0.12,
          ease: 'power2.inOut'
        },

        onUpdate: self => {
          const units =
            self.progress * totalUnits;

          syncActiveProduct(units);
        }
      }
    });

    bannerTrigger = timeline.scrollTrigger;

    // ==========================================
    // SNAP POINTS
    // ==========================================

    const snapPoints = [
      0,

      BANNER_HOLD / totalUnits,

      ...slides.map((_, i) =>
        (
          BANNER_HOLD +
          (i + 1) * CARD_DURATION
        ) / totalUnits
      ),

      1
    ];

    timeline.to({}, {
      duration: BANNER_HOLD
    });

    slides.forEach(slide => {
      timeline.to(slide, {
        yPercent: 0,
        duration: CARD_DURATION
      });
    });

    timeline.to({}, {
      duration: END_HOLD
    });

    // ==========================================
    // INTERSECTION OBSERVER
    // ==========================================

    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0];

        if (!entry.isIntersecting) {
          deactivateProducts();
          return;
        }

        const trigger = timeline.scrollTrigger;
        if (!trigger) return;

        const units =
          trigger.progress * totalUnits;

        syncActiveProduct(units);
      },
      { threshold: 0 }
    );

    observer.observe(section);

    console.log(
      '[Banner Products] Carousel ready — first-pass UPI test.'
    );
  }

  if (document.readyState === 'complete') {
    initBannerProducts();
  } else {
    window.addEventListener(
      'load',
      initBannerProducts,
      { once: true }
    );
  }
})();
