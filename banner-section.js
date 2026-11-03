
/*
 * POPClub V2 — Banner Section
 *
 * Spotlight + scroll-driven product carousel
 * Experimental first-pass holds on all cards.
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
    // ORIGINAL SCROLL SETTINGS
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
    // FIRST-PASS HOLD SETTINGS
    // ==========================================

    const GATE = {
      enabled: true,

      // Extra viewing time after video ends.
      afterVideoMs: 700,

      // Minimum time before manual skipping.
      minimumSkipMs: 2000,

      // Quiet period distinguishing scroll attempts.
      gestureQuietMs: 500,

      // Safety release if video stalls.
      maxWaitMs: 6000
    };

    // A gate is used only once per card.
    const visited = new Set();

    let holdingIndex = -1;
    let holdStartedAt = 0;
    let lastWheelAt = 0;
    let holdTimer = null;
    let releaseTimer = null;

    function cardEndProgress(index) {
      return (
        BANNER_HOLD +
        (index + 1) * CARD_DURATION
      ) / totalUnits;
    }

    function cardEndY(index) {
      if (!bannerTrigger) return null;

      return bannerTrigger.start +
        cardEndProgress(index) *
        (bannerTrigger.end - bannerTrigger.start);
    }

    function clearGateTimers() {
      clearTimeout(holdTimer);
      clearTimeout(releaseTimer);

      holdTimer = null;
      releaseTimer = null;
    }

    function releaseGate(reason) {
      if (holdingIndex < 0) return;

      const releasedIndex = holdingIndex;

      clearGateTimers();

      holdingIndex = -1;

      console.info(
        '[Banner Products] Card',
        releasedIndex + 1,
        'hold released:',
        reason
      );
    }

    function beginGate(index) {
      if (
        !GATE.enabled ||
        visited.has(index) ||
        holdingIndex >= 0
      ) return;

      visited.add(index);

      holdingIndex = index;
      holdStartedAt = performance.now();
      lastWheelAt = holdStartedAt;

      holdTimer = setTimeout(
        () => releaseGate('safety timeout'),
        GATE.maxWaitMs
      );

      console.info(
        '[Banner Products] Holding card',
        index + 1
      );
    }

    function videoFinished(index) {
      if (holdingIndex !== index) return;

      clearTimeout(releaseTimer);

      releaseTimer = setTimeout(
        () => releaseGate('video completed'),
        GATE.afterVideoMs
      );
    }

    // ==========================================
    // FIRST-PASS WHEEL CONTROL
    // ==========================================

    function onBannerWheel(event) {
      if (
        !GATE.enabled ||
        !bannerTrigger ||
        event.deltaY <= 0 ||
        event.ctrlKey ||
        event.defaultPrevented
      ) return;

      const y = window.scrollY;

      if (
        y < bannerTrigger.start - 2 ||
        y > bannerTrigger.end + 2
      ) return;

      const now = performance.now();

      // ----------------------------------------
      // ACTIVE HOLD
      // ----------------------------------------

      if (holdingIndex >= 0) {
        const boundary = cardEndY(holdingIndex);

        if (boundary === null) return;

        // A navigation-widget jump can bypass
        // the gate without being pulled backward.
        if (y > boundary + 4) {
          releaseGate('navigation bypass');
          return;
        }

        const elapsed = now - holdStartedAt;

        const freshGesture =
          now - lastWheelAt >=
          GATE.gestureQuietMs;

        lastWheelAt = now;

        if (
          elapsed >= GATE.minimumSkipMs &&
          freshGesture
        ) {
          releaseGate('deliberate scroll skip');
          return;
        }

        event.preventDefault();

        return;
      }

      // ----------------------------------------
      // FIND NEXT UNVISITED CARD
      // ----------------------------------------

      let nextIndex = -1;

      for (let i = 0; i <= lastIndex; i++) {
        if (!visited.has(i)) {
          nextIndex = i;
          break;
        }
      }

      if (nextIndex < 0) return;

      const boundary = cardEndY(nextIndex);
      if (boundary === null) return;

      // Normalize wheel deltas.
      const multiplier =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? window.innerHeight
            : 1;

      const delta = event.deltaY * multiplier;

      // If the scroll would reach or cross
      // the next card's completed position,
      // stop exactly at that card.
      if (
        y <= boundary + 2 &&
        y + delta >= boundary - 2
      ) {
        event.preventDefault();

        window.scrollTo({
          top: boundary,
          behavior: 'instant'
        });

        ScrollTrigger.update();

        beginGate(nextIndex);

        // Ensure playback starts even when a
        // large scroll lands at the boundary.
        activateProduct(nextIndex);
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

          stopTracking();
          updateText();

          // Release the first-pass hold
          // after the additional viewing delay.
          videoFinished(index);
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
            // While holding, snap to the
            // current card's finished position.
            if (holdingIndex >= 0) {
              return cardEndProgress(
                holdingIndex
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

          // Programmatic navigation may
          // jump beyond a held card.
          if (holdingIndex >= 0) {
            const boundary =
              cardEndProgress(holdingIndex);

            if (
              self.progress >
              boundary + 0.01
            ) {
              releaseGate('programmatic navigation');
            }
          }

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

    // Final Pop Shop hold.
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
      {
        threshold: 0
      }
    );

    observer.observe(section);

    console.log(
      '[Banner Products] Carousel ready — all-card first-pass hold test.'
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
