
(() => {
  function initSoftSectionAlignment() {
    if (!window.gsap || !window.ScrollTrigger) {
      console.warn('[Soft Align] GSAP or ScrollTrigger missing.');
      return;
    }

    const CONFIG = {
      sections: [
        '.section_cta',
        '.section_partners'
      ],
      threshold: 0.15,
      idleDelay: 280,
      touchIdleDelay: 500,
      duration: 0.65,
      alignedTolerance: 2,
      rearmDistance: 24
    };

    const sections = CONFIG.sections
      .map(selector => document.querySelector(selector))
      .filter(Boolean);

    if (!sections.length) {
      console.warn('[Soft Align] No matching sections.');
      return;
    }

    let idleTimer = null;
    let animation = null;
    let isAligning = false;

    let touchActive = false;
    let touchScrolling = false;
    let lastInput = 'wheel';
    let touchIdleUntil = 0;

    let lastAlignedTarget = null;
    let lastAlignedY = null;

    function clearIdleTimer() {
      if (idleTimer !== null) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
    }

    function cancelAlignment() {
      clearIdleTimer();

      if (animation) {
        const current = animation;
        animation = null;
        current.kill();
      }

      isAligning = false;
    }

    function markTouchInput() {
      lastInput = 'touch';
      touchIdleUntil =
        performance.now() + CONFIG.touchIdleDelay;
    }

    function getTarget() {
      const vh = window.innerHeight;
      const tolerance = vh * CONFIG.threshold;

      for (const section of sections) {
        const rect = section.getBoundingClientRect();

        if (Math.abs(rect.top) > tolerance) continue;

        if (Math.abs(rect.height - vh) > vh * 0.15) {
          continue;
        }

        if (Math.abs(rect.top) < CONFIG.alignedTolerance) {
          continue;
        }

        return {
          section,
          y: window.scrollY + rect.top
        };
      }

      return null;
    }

    function alignIfNeeded() {
      idleTimer = null;

      if (isAligning || touchActive) return;

      if (lastInput === 'touch') {
        const remaining =
          touchIdleUntil - performance.now();

        if (remaining > 0) {
          scheduleAlignment(remaining);
          return;
        }
      }

      const target = getTarget();
      if (!target) return;

      const startY = window.scrollY;
      const distance = target.y - startY;

      if (Math.abs(distance) < CONFIG.alignedTolerance) {
        return;
      }

      // Avoid pulling the user back to a section
      // they have only just moved away from.
      if (
        target.section === lastAlignedTarget &&
        lastAlignedY !== null &&
        Math.abs(startY - lastAlignedY) <
          CONFIG.rearmDistance
      ) {
        return;
      }

      isAligning = true;

      const state = { y: startY };

      animation = gsap.to(state, {
        y: target.y,
        duration: CONFIG.duration,
        ease: 'power2.out',
        overwrite: true,

        onUpdate() {
          window.scrollTo(0, state.y);
        },

        onComplete() {
          window.scrollTo(0, target.y);

          lastAlignedTarget = target.section;
          lastAlignedY = target.y;

          isAligning = false;
          animation = null;
        },

        onInterrupt() {
          isAligning = false;
          animation = null;
        }
      });
    }

    function scheduleAlignment(delay) {
      clearIdleTimer();

      if (touchActive || isAligning) return;

      idleTimer = setTimeout(
        alignIfNeeded,
        Math.max(0, delay)
      );
    }

    function onScroll() {
      if (isAligning) return;

      clearIdleTimer();

      if (touchActive) return;

      if (lastInput === 'touch') {
        // Every momentum scroll event extends the
        // settling window.
        touchIdleUntil =
          performance.now() + CONFIG.touchIdleDelay;

        scheduleAlignment(CONFIG.touchIdleDelay);
      } else {
        scheduleAlignment(CONFIG.idleDelay);
      }
    }

    function onTouchStart() {
      touchActive = true;
      touchScrolling = true;

      markTouchInput();
      cancelAlignment();
    }

    function onTouchMove() {
      markTouchInput();

      // Never align while a finger is dragging.
      clearIdleTimer();
    }

    function onTouchEnd(event) {
      if (event.touches.length > 0) return;

      touchActive = false;
      markTouchInput();

      // Allow native momentum scrolling to finish.
      // Further scroll events will keep postponing
      // this alignment.
      scheduleAlignment(CONFIG.touchIdleDelay);
    }

    function onTouchCancel(event) {
      if (event.touches.length > 0) return;

      touchActive = false;
      touchScrolling = false;

      markTouchInput();
      cancelAlignment();

      scheduleAlignment(CONFIG.touchIdleDelay);
    }

    function onWheel() {
      lastInput = 'wheel';
      touchScrolling = false;

      cancelAlignment();
    }

    function onKeyDown(event) {
      const keys = [
        'ArrowUp',
        'ArrowDown',
        'PageUp',
        'PageDown',
        'Home',
        'End',
        ' '
      ];

      if (!keys.includes(event.key)) return;

      lastInput = 'keyboard';
      touchScrolling = false;

      cancelAlignment();
    }

    window.addEventListener('wheel', onWheel, {
      passive: true
    });

    window.addEventListener('touchstart', onTouchStart, {
      passive: true
    });

    window.addEventListener('touchmove', onTouchMove, {
      passive: true
    });

    window.addEventListener('touchend', onTouchEnd, {
      passive: true
    });

    window.addEventListener('touchcancel', onTouchCancel, {
      passive: true
    });

    window.addEventListener('keydown', onKeyDown);

    window.addEventListener('scroll', onScroll, {
      passive: true
    });

    window.addEventListener('resize', () => {
      cancelAlignment();
      lastAlignedTarget = null;
      lastAlignedY = null;
    });

    console.log(
      '[Soft Align] CTA and Partners touch-aware alignment ready.'
    );
  }

  if (document.readyState === 'complete') {
    initSoftSectionAlignment();
  } else {
    window.addEventListener(
      'load',
      initSoftSectionAlignment,
      { once: true }
    );
  }
})();
