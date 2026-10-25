
/*
 * POPClub V2 — Scroll Widget V4
 *
 * Reads existing GSAP ScrollTriggers.
 * Does not create additional pins.
 */

(() => {
  'use strict';

  const WIDGET_ID = 'pop-scroll-widget';
  const STYLE_ID = 'pop-scroll-widget-styles';

  const LABELS = [
    'Home',
    'The Problem',
    'Our Belief',
    'Products',
    'Download App',
    'Partners',
    'Social Proof',
    'Footer'
  ];

  const clamp = (v) => Math.max(0, Math.min(1, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const BELIEF_SEGMENTS = [
    { kind: 'hold', from: 0, to: 0, d: 300 },
    { kind: 'move', from: 0, to: 49, d: 900 },
    { kind: 'hold', from: 49, to: 49, d: 600 },
    { kind: 'move', from: 49, to: 89, d: 900 },
    { kind: 'hold', from: 89, to: 89, d: 600 },
    { kind: 'move', from: 89, to: 129, d: 900 },
    { kind: 'hold', from: 129, to: 129, d: 600 },
    { kind: 'move', from: 129, to: 169, d: 900 },
    { kind: 'hold', from: 169, to: 169, d: 600 }
  ];

  function init() {
    if (document.getElementById(WIDGET_ID)) return;

    // ==========================================
    // 1. CSS
    // ==========================================

    const style = document.createElement('style');
    style.id = STYLE_ID;

    style.textContent = `
      #${WIDGET_ID} {
        position: fixed;
        top: 20vh;
        right: 4vw;
        height: 60vh;
        width: 6px;

        display: flex;
        flex-direction: column;
        gap: 0.4vh;

        z-index: 9999;
        overflow: visible;
        isolation: isolate;

        opacity: 0;
        pointer-events: none;
        transition: opacity 300ms ease;
      }

      #${WIDGET_ID}.is-ready {
        opacity: 1;
        pointer-events: auto;
      }

      #${WIDGET_ID},
      #${WIDGET_ID} *,
      #${WIDGET_ID} *::before,
      #${WIDGET_ID} *::after {
        box-sizing: border-box;
      }

      #${WIDGET_ID}::before {
        content: '';
        position: absolute;
        top: -12px;
        bottom: -12px;
        left: -6vw;
        right: -6vw;
        background: transparent;
        pointer-events: auto;
      }

      #${WIDGET_ID} .pop-scroll-segment {
        position: relative;
        flex: 1 1 0;
        min-height: 0;
        width: 6px;

        border: 0;
        padding: 0;
        margin: 0;
        background: transparent;
        appearance: none;

        cursor: pointer;
        overflow: visible;
        color: white;
        font: inherit;
      }

      #${WIDGET_ID} .pop-scroll-track {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);

        width: 3px;
        border-radius: 999px;

        background: rgba(255, 255, 255, 0.5);
        overflow: hidden;
        pointer-events: none;

        transition: width 220ms ease;
      }

      #${WIDGET_ID}.is-expanded .pop-scroll-track {
        width: 6px;
      }

      #${WIDGET_ID} .pop-scroll-fill {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 0%;

        border-radius: 999px;
        background: #fff;

        transition: height 90ms linear;
      }

      #${WIDGET_ID} .pop-scroll-label {
        position: absolute;
        top: 50%;
        right: 24px;

        transform: translate(7px, -50%);

        color: #fff;
        font-family: 'Figtree', sans-serif;
        font-size: 2vh;
        font-weight: 500;
        line-height: 1.2;
        white-space: nowrap;

        opacity: 0;
        visibility: hidden;
        pointer-events: none;

        transition:
          opacity 180ms ease,
          transform 180ms ease,
          visibility 180ms ease;

        text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
      }

      #${WIDGET_ID} .pop-scroll-label::before {
        content: '';
        position: absolute;
        inset: -12px -14px;
        background: transparent;
      }

      #${WIDGET_ID}.is-expanded
      .pop-scroll-segment.is-label-visible
      .pop-scroll-label {
        opacity: var(--pop-label-opacity, 1);
        visibility: visible;
        transform: translate(0, -50%);
        pointer-events: auto;
        cursor: pointer;
      }

      #${WIDGET_ID} .pop-scroll-segment:focus-visible {
        outline: 2px solid white;
        outline-offset: 5px;
        border-radius: 999px;
      }

      @media (max-width: 767px) {
        #${WIDGET_ID} {
          display: none;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #${WIDGET_ID},
        #${WIDGET_ID} .pop-scroll-track,
        #${WIDGET_ID} .pop-scroll-fill,
        #${WIDGET_ID} .pop-scroll-label {
          transition: none;
        }
      }
    `;

    document.head.appendChild(style);

    // ==========================================
    // 2. WIDGET STATE
    // ==========================================

    const widget = document.createElement('nav');
    widget.id = WIDGET_ID;

    widget.setAttribute(
      'aria-label',
      'Page sections'
    );

    let activeIndex = 0;
    let hoveredIndex = null;
    let expanded = false;

    const segments = [];

    // ==========================================
    // 3. FIND EXISTING SCROLLTRIGGERS
    // ==========================================

    const getTrigger = (selector) => {
      if (!window.ScrollTrigger) return null;

      const el = document.querySelector(selector);
      if (!el) return null;

      return ScrollTrigger.getAll().find(
        t => t.trigger === el && t.vars.pin === true
      ) || null;
    };

    const getCoin = () => getTrigger('.section_coin');

    const getCRT = () => getTrigger('.section_problem');

    const getProducts = () => getTrigger('.section_banner');

    // ==========================================
    // 4. STANDARD SECTION POSITION
    // ==========================================

    const sectionStart = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;

      return window.scrollY +
        el.getBoundingClientRect().top;
    };

    /*
     * Progress as the section enters the viewport:
     *
     * Top at viewport bottom = 0%
     * Top at viewport middle = 50%
     * Top at viewport top = 100%
     */

    const entranceProgress = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return 0;

      const top = el.getBoundingClientRect().top;

      return clamp(
        (window.innerHeight - top) /
        window.innerHeight
      );
    };

    // ==========================================
    // 5. BELIEF FRAME PROGRESS
    // ==========================================

    function beliefFrameProgress(distance) {
      let cursor = 0;

      for (const segment of BELIEF_SEGMENTS) {
        if (distance < cursor + segment.d) {
          if (segment.kind === 'hold') {
            return segment.from / 169;
          }

          const t = clamp(
            (distance - cursor) / segment.d
          );

          return clamp(
            lerp(segment.from, segment.to, t) / 169
          );
        }

        cursor += segment.d;
      }

      return 1;
    }

    // ==========================================
    // 6. CALCULATE ALL EIGHT PROGRESS VALUES
    // ==========================================

    function values() {
      const coin = getCoin();
      const crt = getCRT();
      const products = getProducts();

      // HOME
      // Only the scroll-controlled Coin exit.
      // Autoplay is excluded.

      const coinProgress = coin
        ? clamp(coin.progress)
        : 0;

      let problemProgress = 0;
      let beliefProgress = 0;

      if (crt) {
        // THE PROBLEM
        // Matches problem-animation.js.

        const early = window.innerHeight * 0.2;

        problemProgress = clamp(
          (
            window.scrollY -
            (crt.start - early)
          ) /
          (1500 + early)
        );

        // OUR BELIEF
        // Matches belief-animation.js.
        // Starts 5000px into the shared timeline.

        const beliefDistance =
          clamp(
            (
              clamp(crt.progress) * 11300 -
              5000
            ) / 6300
          ) * 6300;

        beliefProgress =
          beliefFrameProgress(beliefDistance);
      }

      // PRODUCTS
      // Banner hold = 0%.
      // Five card entrances = 20% each.
      // Final hold = 100%.

      let productProgress = 0;

      if (products) {
        const slideCount =
          document.querySelectorAll(
            '.section_banner ' +
            '.products_viewport.banner_products ' +
            '.product_slide'
          ).length;

        if (slideCount > 0) {
          const total =
            0.75 + slideCount + 0.35;

          productProgress = clamp(
            (
              clamp(products.progress) * total -
              0.75
            ) / slideCount
          );
        }
      }

      // Remaining sections:
      // viewport-based entrance progress.

      return [
        coinProgress,
        problemProgress,
        beliefProgress,
        productProgress,

        entranceProgress('.section_cta'),
        entranceProgress('.section_partners'),
        entranceProgress('.section_social_proof'),
        entranceProgress('.section_footer')
      ];
    }

    // ==========================================
    // 7. NAVIGATION TARGETS
    // ==========================================

    function starts() {
      const coin = getCoin();
      const crt = getCRT();
      const products = getProducts();

      return [
        // Home: scroll-controlled sequence start.
        coin
          ? coin.start
          : sectionStart('.section_coin'),

        // Problem: 20vh before CRT pin starts.
        crt
          ? crt.start - window.innerHeight * 0.2
          : sectionStart('.section_problem'),

        // Belief: 5000px into shared timeline.
        crt
          ? crt.start +
            (5000 / 11300) *
            (crt.end - crt.start)
          : null,

        // Products: initial banner.
        products
          ? products.start
          : sectionStart('.section_banner'),

        sectionStart('.section_cta'),
        sectionStart('.section_partners'),
        sectionStart('.section_social_proof'),
        sectionStart('.section_footer')
      ];
    }

    // ==========================================
    // 8. UPDATE WIDGET
    // ==========================================

    function render() {
      const progress = values();
      const positions = starts();

      /*
       * Active section is the latest section
       * whose starting position has been reached.
       */

      let nextActive = 0;

      positions.forEach((pos, index) => {
        if (
          pos !== null &&
          window.scrollY >= pos - 2
        ) {
          nextActive = index;
        }
      });

      activeIndex = nextActive;

      widget.classList.toggle(
        'is-expanded',
        expanded
      );

      segments.forEach(
        ({ segment, fill }, index) => {
          const visible =
            expanded &&
            (
              hoveredIndex === null
                ? index === activeIndex
                : index === hoveredIndex
            );

          segment.classList.toggle(
            'is-label-visible',
            visible
          );

          segment.classList.toggle(
            'is-active',
            index === activeIndex
          );

          segment.style.setProperty(
            '--pop-label-opacity',
            hoveredIndex !== null &&
            index !== activeIndex
              ? '.65'
              : '1'
          );

          segment.setAttribute(
            'aria-current',
            index === activeIndex
              ? 'location'
              : 'false'
          );

          fill.style.height =
            `${
              Math.round(
                progress[index] * 10000
              ) / 100
            }%`;
        }
      );
    }

    // ==========================================
    // 9. CLICK-TO-SECTION NAVIGATION
    // ==========================================

    function goTo(index) {
      const target = starts()[index];

      if (
        target === null ||
        !Number.isFinite(target)
      ) {
        console.warn(
          '[POPClub] Navigation target unavailable:',
          LABELS[index]
        );

        return;
      }

      /*
       * Scroll to the section's actual start.
       * Existing ScrollTriggers handle animation.
       */

      window.scrollTo({
        top: Math.max(0, target),
        behavior: 'instant'
      });

      if (window.ScrollTrigger) {
        ScrollTrigger.update();
      }

      render();
    }

    // ==========================================
    // 10. CREATE CAPSULES AND LABELS
    // ==========================================

    LABELS.forEach((name, index) => {
      const segment =
        document.createElement('button');

      segment.type = 'button';
      segment.className = 'pop-scroll-segment';

      segment.setAttribute(
        'aria-label',
        name
      );

      const track =
        document.createElement('span');

      track.className = 'pop-scroll-track';

      const fill =
        document.createElement('span');

      fill.className = 'pop-scroll-fill';

      track.appendChild(fill);

      const label =
        document.createElement('span');

      label.className = 'pop-scroll-label';
      label.textContent = name;

      label.setAttribute(
        'aria-hidden',
        'true'
      );

      segment.append(track, label);
      widget.appendChild(segment);

      segments.push({
        segment,
        fill
      });

      // Capsule and label share the same button.

      segment.addEventListener(
        'click',
        () => goTo(index)
      );

      segment.addEventListener(
        'focus',
        () => {
          expanded = true;
          hoveredIndex = index;
          render();
        }
      );

      segment.addEventListener(
        'blur',
        () => {
          hoveredIndex = null;
          render();
        }
      );
    });

    // ==========================================
    // 11. PROXIMITY HOVER
    // ==========================================

    widget.addEventListener(
      'mouseenter',
      () => {
        expanded = true;
        render();
      }
    );

    widget.addEventListener(
      'mouseleave',
      () => {
        expanded = false;
        hoveredIndex = null;
        render();
      }
    );

    widget.addEventListener(
      'pointermove',
      (event) => {
        if (event.pointerType === 'touch') {
          return;
        }

        const rect =
          widget.getBoundingClientRect();

        if (
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        ) {
          if (hoveredIndex !== null) {
            hoveredIndex = null;
            render();
          }

          return;
        }

        let nearest = 0;
        let best = Infinity;

        segments.forEach(
          ({ segment }, i) => {
            const r =
              segment.getBoundingClientRect();

            const d = Math.abs(
              event.clientY -
              (r.top + r.height / 2)
            );

            if (d < best) {
              best = d;
              nearest = i;
            }
          }
        );

        if (hoveredIndex !== nearest) {
          hoveredIndex = nearest;
          render();
        }
      }
    );

    widget.addEventListener(
      'focusout',
      (event) => {
        if (
          !widget.contains(event.relatedTarget) &&
          !widget.matches(':hover')
        ) {
          expanded = false;
          hoveredIndex = null;
          render();
        }
      }
    );

    // ==========================================
    // 12. INITIALIZE
    // ==========================================

    document.body.appendChild(widget);

    render();

    /*
     * Intro visibility:
     *
     * Wait until page load.
     * Remain hidden for 3 seconds.
     * Fade in over 300ms.
     */

    const reveal = () => {
      window.setTimeout(() => {
        widget.classList.add('is-ready');
      }, 3000);
    };

    if (document.readyState === 'complete') {
      reveal();
    } else {
      window.addEventListener(
        'load',
        reveal,
        { once: true }
      );
    }

    /*
     * Keep widget synced with GSAP and
     * the site's current scroll position.
     */

    if (window.gsap) {
      gsap.ticker.add(render);
    } else {
      window.addEventListener(
        'scroll',
        render,
        { passive: true }
      );
    }

    window.addEventListener(
      'resize',
      render,
      { passive: true }
    );

    window.addEventListener(
      'load',
      render,
      { once: true }
    );

    console.info(
      '[POPClub] Scroll widget V4 initialized.'
    );
  }

  // ==========================================
  // 13. START
  // ==========================================

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      init,
      { once: true }
    );
  } else {
    init();
  }
})();
