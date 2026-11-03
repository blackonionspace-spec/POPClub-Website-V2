
/*
 * POPClub V2 — Banner Section
 *
 * 1. Mouse-following background spotlight
 * 2. Scroll-driven products carousel
 * 3. Mandatory first-pass video viewing
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

        if (initialized) {
          section.style.setProperty(
            '--spot-x',
            currentX + 'px'
          );

          section.style.setProperty(
            '--spot-y',
            currentY + 'px'
          );
        }
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
      console.warn(
        '[Banner Products] GSAP or ScrollTrigger missing.'
      );
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
      console.warn(
        '[Banner Products] Missing banner, viewport, or slides.'
      );
      return;
    }

    const lastIndex = slides.length - 1;

    // ==========================================
    // ORIGINAL CAROUSEL SETTINGS
    // ==========================================

    const BANNER_HOLD = 0.75;
    const CARD_DURATION = 1;
    const END_HOLD = 0.35;

    const totalUnits =
      BANNER_HOLD +
      slides.length * CARD_DURATION +
      END_HOLD;

    const FORWARD_ACTIVATION = 0.95;
    const BACKWARD_ACTIVATION = 0.15;

    let activeIndex = -1;
    let bannerTrigger = null;

    // ==========================================
    // FIRST-PASS VIEWING GATE
    // ==========================================

    const GATE = {
      enabled: true,

      // Emergency release if playback stalls.
      maxWaitMs: 8000,

      // Temporary exemption for navigation clicks.
      navigationBypassMs: 1500,

      // Tolerance around scroll boundaries.
      tolerancePx: 2
    };

    // Cards unlock in sequence, once per page load.
    // Initially, no card has been completed.
    let unlockedThrough = -1;

    let gateTimer = null;
    let gateCardIndex = -1;

    let bypassUntil = 0;
    let correctingScroll = false;

    const videos = [];

    function gateEnabled() {
      return (
        GATE.enabled &&
        unlockedThrough < lastIndex
      );
    }

    function isBypassing() {
      return performance.now() < bypassUntil;
    }

    function cardEndProgress(index) {
      return (
        BANNER_HOLD +
        (index + 1) * CARD_DURATION
      ) / totalUnits;
    }

    function cardEndY(index) {
      if (!bannerTrigger) return null;

      return (
        bannerTrigger.start +
        cardEndProgress(index) *
        (bannerTrigger.end - bannerTrigger.start)
      );
    }

    function nextLockedIndex() {
      return Math.min(
        unlockedThrough + 1,
        lastIndex
      );
    }

    function currentBoundary() {
      if (!gateEnabled()) return null;

      return cardEndY(nextLockedIndex());
    }

    function clearGateTimer() {
      if (gateTimer !== null) {
        clearTimeout(gateTimer);
        gateTimer = null;
      }
    }

    function unlockCard(index, reason) {
      // Never unlock cards out of sequence.
      if (index !== unlockedThrough + 1) return;

      clearGateTimer();
      gateCardIndex = -1;

      unlockedThrough = index;

      console.info(
        '[Banner Products] Unlocked card',
        index + 1,
        reason
      );
    }

    function startGateTimer(index) {
      if (
        index !== nextLockedIndex() ||
        gateCardIndex === index
      ) return;

      clearGateTimer();

      gateCardIndex = index;

      gateTimer = setTimeout(() => {
        if (index === nextLockedIndex()) {
          console.warn(
            '[Banner Products] Playback timeout:',
            index + 1
          );

          unlockCard(index, 'failsafe');
        }
      }, GATE.maxWaitMs);
    }

    function enforceBoundary() {
      if (
        !bannerTrigger ||
        !gateEnabled() ||
        isBypassing() ||
        correctingScroll
      ) return;

      const boundary = currentBoundary();
      if (boundary === null) return;

      const y = window.scrollY;

      // Do not interfere before the banner.
      if (y < bannerTrigger.start) return;

      // Only constrain forward progression.
      if (y <= boundary + GATE.tolerancePx) return;

      correctingScroll = true;

      window.scrollTo({
        top: boundary,
        behavior: 'instant'
      });

      ScrollTrigger.update();

      correctingScroll = false;

      // Activate the card after reaching
      // its completed entry position.
      activateProduct(nextLockedIndex());
    }

    // ==========================================
    // NAVIGATION WIDGET BYPASS
    // ==========================================

    // The widget uses window.scrollTo() directly.
    // Its click is marked as an intentional jump.

    document.addEventListener(
      'click',
      event => {
        if (
          event.target.closest(
            '#pop-scroll-widget .pop-scroll-segment'
          )
        ) {
          bypassUntil =
            performance.now() +
            GATE.navigationBypassMs;

          clearGateTimer();
          gateCardIndex = -1;

          console.info(
            '[Banner Products] Navigation bypass.'
          );
        }
      },
      true
    );

    // ==========================================
    // WHEEL INTERCEPTION
    // ==========================================

    function onWheel(event) {
      if (
        !gateEnabled() ||
        !bannerTrigger ||
        isBypassing() ||
        event.ctrlKey ||
        event.deltaY <= 0 ||
        event.defaultPrevented
      ) return;

      const boundary = currentBoundary();
      if (boundary === null) return;

      const y = window.scrollY;

      // Wheel input may arrive before the
      // banner begins. Catch gestures that
      // would cross the next boundary.

      const multiplier =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? window.innerHeight
            : 1;

      const delta = event.deltaY * multiplier;

      if (
        y <= boundary + GATE.tolerancePx &&
        y + delta >= boundary - GATE.tolerancePx
      ) {
        event.preventDefault();

        window.scrollTo({
          top: boundary,
          behavior: 'instant'
        });

        ScrollTrigger.update();

        activateProduct(nextLockedIndex());

        return;
      }

      if (y >= boundary - GATE.tolerancePx) {
        event.preventDefault();
      }
    }

    window.addEventListener(
      'wheel',
      onWheel,
      {
        passive: false,
        capture: true
      }
    );

    // Catch overshoots caused by momentum,
    // keyboard scrolling or other native input.
    window.addEventListener(
      'scroll',
      enforceBoundary,
      { passive: true }
    );

    // ==========================================
    // VIDEO CONTROLLERS
    // ==========================================

    const products = slides.map((slide, index) => {
      const video = slide.querySelector('video');

      const content = slide.querySelector(
        '.product_content'
      );

      videos[index] = video;

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

        // Start the failsafe when the locked
        // card's playback is requested.
        if (index === nextLockedIndex()) {
          startGateTimer(index);
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

            // Never permanently trap the user.
            if (index === nextLockedIndex()) {
              unlockCard(index, 'playback failure');
            }
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

          stopTracking();
          updateText();

          // Actual video completion is the
          // primary first-pass unlock signal.
          if (index === nextLockedIndex()) {
            unlockCard(index, 'video ended');
          }
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

      return {
        pause,
        play
      };
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

    gsap.set(viewport, {
      opacity: 1
    });

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
            // Prevent snapping forward into
            // a card that has not been unlocked.
            if (
              gateEnabled() &&
              !isBypassing()
            ) {
              const limit =
                cardEndProgress(nextLockedIndex());

              const permitted = snapPoints.filter(
                point => point <= limit + 0.0001
              );

              return permitted.reduce(
                (closest, point) =>
                  Math.abs(point - progress) <
                  Math.abs(closest - progress)
                    ? point
                    : closest
              );
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

          // Catch large jumps that bypass
          // ordinary wheel-event detection.
          enforceBoundary();
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

    // Initial banner hold.
    timeline.to({}, {
      duration: BANNER_HOLD
    });

    // Every card rises from below.
    slides.forEach(slide => {
      timeline.to(slide, {
        yPercent: 0,
        duration: CARD_DURATION
      });
    });

    // Final hold.
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
      '[Banner Products] Carousel ready — mandatory first-pass video gates.'
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
