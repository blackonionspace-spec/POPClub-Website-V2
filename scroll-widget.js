
/*
 * POPClub V2 — Scroll Widget V3
 *
 * Visual and mouse interaction prototype.
 * No GSAP or page scrolling integration yet.
 *
 * V3 updates:
 * - Section labels increased to 2vh
 * - Labels are clickable
 * - Larger invisible label hit areas
 *
 * Existing design preserved:
 * - 60vh widget height
 * - 20vh top offset
 * - 4vw right offset
 * - 8 rounded capsules
 * - 0.4vh segment gaps
 * - 3px inactive / 6px expanded thickness
 * - 6vw proximity hover zone
 */

(() => {
  'use strict';

  const SECTIONS = [
    'Home',
    'The Problem',
    'Our Belief',
    'Products',
    'Download App',
    'Partners',
    'Social Proof',
    'Footer'
  ];

  const STYLE_ID = 'pop-scroll-widget-styles';
  const WIDGET_ID = 'pop-scroll-widget';

  function init() {
    if (document.getElementById(WIDGET_ID)) return;

    // ==========================================
    // 1. INJECT CSS
    // ==========================================

    if (!document.getElementById(STYLE_ID)) {
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
        }

        #${WIDGET_ID},
        #${WIDGET_ID} *,
        #${WIDGET_ID} *::before,
        #${WIDGET_ID} *::after {
          box-sizing: border-box;
        }

        /*
         * Continuous invisible proximity zone.
         * Extends 6vw horizontally.
         */

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

        /* Eight equal rounded capsules */

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

        /* Capsule track */

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

        /* Expand all capsules on proximity hover */

        #${WIDGET_ID}.is-expanded .pop-scroll-track {
          width: 6px;
        }

        /* Completed progress */

        #${WIDGET_ID} .pop-scroll-fill {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 0%;

          border-radius: 999px;
          background: #fff;

          transition: height 220ms ease;
        }

        /*
         * Section labels
         * Font size scales with viewport height.
         */

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

        /*
         * Expanded label hit area.
         * This becomes clickable when visible.
         */

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

        /* Keyboard focus */

        #${WIDGET_ID} .pop-scroll-segment:focus-visible {
          outline: 2px solid white;
          outline-offset: 5px;
          border-radius: 999px;
        }

        /* Desktop only */

        @media (max-width: 767px) {
          #${WIDGET_ID} {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          #${WIDGET_ID} .pop-scroll-track,
          #${WIDGET_ID} .pop-scroll-fill,
          #${WIDGET_ID} .pop-scroll-label {
            transition: none;
          }
        }
      `;

      document.head.appendChild(style);
    }

    // ==========================================
    // 2. CREATE WIDGET
    // ==========================================

    const widget = document.createElement('nav');
    widget.id = WIDGET_ID;

    widget.setAttribute(
      'aria-label',
      'Page sections (visual prototype)'
    );

    let activeIndex = 0;
    let hoveredIndex = null;
    let expanded = false;

    const segments = [];

    SECTIONS.forEach((name, index) => {
      const segment = document.createElement('button');

      segment.type = 'button';
      segment.className = 'pop-scroll-segment';
      segment.setAttribute('aria-label', name);
      segment.title = name;

      const track = document.createElement('span');
      track.className = 'pop-scroll-track';

      const fill = document.createElement('span');
      fill.className = 'pop-scroll-fill';

      track.appendChild(fill);

      const label = document.createElement('span');
      label.className = 'pop-scroll-label';
      label.textContent = name;
      label.setAttribute('aria-hidden', 'true');

      segment.append(track, label);
      widget.appendChild(segment);

      segments.push({ segment, fill });

      /*
       * Both the capsule and its label are
       * children of the same button.
       *
       * Clicking either activates the section.
       */

      segment.addEventListener('click', () => {
        activeIndex = index;
        update();
      });

      // Keyboard focus

      segment.addEventListener('focus', () => {
        expanded = true;
        hoveredIndex = index;
        update();
      });

      segment.addEventListener('blur', () => {
        hoveredIndex = null;
        update();
      });
    });

    // ==========================================
    // 3. PROXIMITY HOVER
    // ==========================================

    widget.addEventListener('mouseenter', () => {
      expanded = true;
      update();
    });

    widget.addEventListener('mouseleave', () => {
      expanded = false;
      hoveredIndex = null;
      update();
    });

    /*
     * Find the closest section by pointer Y.
     * This works across the invisible hover zone.
     */

    widget.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;

      const widgetRect = widget.getBoundingClientRect();

      if (
        event.clientY < widgetRect.top ||
        event.clientY > widgetRect.bottom
      ) {
        if (hoveredIndex !== null) {
          hoveredIndex = null;
          update();
        }
        return;
      }

      let nearestIndex = 0;
      let nearestDistance = Infinity;

      segments.forEach(({ segment }, index) => {
        const rect = segment.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;

        const distance = Math.abs(
          event.clientY - centerY
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      if (hoveredIndex !== nearestIndex) {
        hoveredIndex = nearestIndex;
        update();
      }
    });

    widget.addEventListener('focusout', (event) => {
      if (
        !widget.contains(event.relatedTarget) &&
        !widget.matches(':hover')
      ) {
        expanded = false;
        hoveredIndex = null;
        update();
      }
    });

    // ==========================================
    // 4. UPDATE VISUAL STATE
    // ==========================================

    function update() {
      widget.classList.toggle('is-expanded', expanded);

      segments.forEach(({ segment, fill }, index) => {
        const active = index === activeIndex;

        const labelVisible =
          expanded &&
          (
            hoveredIndex === null
              ? active
              : hoveredIndex === index
          );

        segment.classList.toggle('is-active', active);

        segment.classList.toggle(
          'is-label-visible',
          labelVisible
        );

        segment.style.setProperty(
          '--pop-label-opacity',
          hoveredIndex !== null && !active
            ? '0.65'
            : '1'
        );

        segment.setAttribute(
          'aria-current',
          active ? 'location' : 'false'
        );

        // Simulated progress

        fill.style.height =
          index < activeIndex
            ? '100%'
            : active
              ? '50%'
              : '0%';
      });
    }

    // ==========================================
    // 5. INITIALIZE
    // ==========================================

    document.body.appendChild(widget);
    update();

    console.info(
      '[POPClub] Scroll widget V3 initialized.'
    );
  }

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
