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

    // A new card becomes active when it has
    // almost completely covered the previous card.

    const FORWARD_ACTIVATION = 0.95;

    // When scrolling backwards, return to the
    // previous card only after the current card
    // has mostly moved out of view.

    const BACKWARD_ACTIVATION = 0.15;

    let activeIndex = -1;

    // ==========================================
    // VIDEO CONTROLLERS
    // ==========================================

    const products = slides.map((slide, index) => {
      const video = slide.querySelector('video');
      const content = slide.querySelector('.product_content');

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

        if (!Number.isFinite(duration) || duration <= 0) {
          return;
        }

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

        // Completed videos return to frame 1
        // when the user leaves their card.

        if (completed || video.ended) {
          resetToBeginning();
        }

        // Unfinished videos retain currentTime.
        // Their text opacity is also preserved.
      }

      // ----------------------------------------
      // PLAY OR RESUME
      // ----------------------------------------

      function play() {
        if (!video) return;

        stopTracking();

        // Do not restart a completed video
        // while its card is still active.

        if (completed || video.ended) {
          updateText();
          return;
        }

        // Important:
        // No currentTime = 0 here.
        //
        // Previously paused videos continue
        // from their existing playback position.

        const promise = video.play();

        if (promise && typeof promise.catch === 'function') {
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
        video.addEventListener('timeupdate', updateText);

        video.addEventListener('ended', () => {
          completed = true;
          stopTracking();
          updateText();

          // Hold the final frame until the
          // user navigates away from this card.
        });

        video.addEventListener('loadedmetadata', () => {
          if (resetPending) {
            resetToBeginning();
          }
        });
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

      // Already active:
      // Do not restart or replay the video.

      if (activeIndex === index) return;

      // Pause the previous active product.
      // Incomplete videos preserve playback time.
      // Completed videos reset to first frame.

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
      // Before the first card:
      // preserve the original banner hold.

      if (
        units <=
        BANNER_HOLD +
        BACKWARD_ACTIVATION * CARD_DURATION
      ) {
        deactivateProducts();
        return;
      }

      // Determine how many cards have almost
      // fully entered the viewport.
      //
      // This is the forward activation target.

      let forwardIndex = -1;

      for (let i = 0; i <= lastIndex; i++) {
        const activationPoint =
          BANNER_HOLD +
          (i + FORWARD_ACTIVATION) * CARD_DURATION;

        if (units >= activationPoint) {
          forwardIndex = i;
        }
      }

      // First activation:
      // wait until Card 1 is almost fully visible.

      if (activeIndex === -1) {
        if (forwardIndex >= 0) {
          activateProduct(forwardIndex);
        }

        return;
      }

      // ----------------------------------------
      // FORWARD SCROLLING
      // ----------------------------------------

      if (forwardIndex > activeIndex) {
        activateProduct(forwardIndex);
        return;
      }

      // ----------------------------------------
      // BACKWARD SCROLLING
      // ----------------------------------------

      // Keep the current video active while
      // its card is still mostly visible.
      //
      // Switch back only after it has mostly
      // moved down and revealed the prior card.

      let backwardIndex = activeIndex;

      while (backwardIndex > 0) {
        const cardStart =
          BANNER_HOLD +
          backwardIndex * CARD_DURATION;

        const backwardPoint =
          cardStart +
          BACKWARD_ACTIVATION * CARD_DURATION;

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
    // INITIAL SLIDE POSITIONS — UNCHANGED
    // ==========================================

    gsap.set(slides, {
      yPercent: 100,
      zIndex: i => i + 1
    });

    gsap.set(viewport, {
      opacity: 1
    });

    // ==========================================
    // SCROLL TIMELINE — ORIGINAL SETTINGS
    // ==========================================

    const timeline = gsap.timeline({
      defaults: { ease: 'none' },

      scrollTrigger: {
        trigger: section,
        start: 'top top',

        end: () =>
          '+=' + window.innerHeight * totalUnits,

        pin: true,
        scrub: 0.65,
        anticipatePin: 1,
        invalidateOnRefresh: true,

        snap: {
          snapTo: progress => {
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

    // ==========================================
    // SNAP POINTS — UNCHANGED
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

        // Use the SAME activation logic as
        // ScrollTrigger to avoid conflicting
        // video switching decisions.

        syncActiveProduct(units);
      },
      {
        threshold: 0
      }
    );

    observer.observe(section);

    console.log(
      '[Banner Products] Carousel ready — resumable video playback.'
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
