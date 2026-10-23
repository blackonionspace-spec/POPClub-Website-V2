
/* POPCLUB — Text Effects v1 | Glow V5 + pointer tilt */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const configs = [];

  let raf = 0;
  let pointerX = window.innerWidth / 2;
  let pointerY = window.innerHeight / 2;
  let lastFrame = 0;

  function setup() {
    const sections = document.querySelectorAll('[data-text-effects-section]');

    sections.forEach((section) => {
      const elements = [...section.querySelectorAll('[data-text-effects]')];
      if (!elements.length) return;

      const config = {
        section,
        elements,
        active: false,
        x: 0,
        y: 0,
        tx: 0,
        ty: 0
      };

      configs.push(config);

      elements.forEach((el) => {
        if (!el.hasAttribute('data-glow')) {
          el.setAttribute('data-glow', el.textContent.trim());
        }

        el.classList.add('pop-text-fx');
      });
    });

    if (!configs.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        const config = configs.find((c) => c.section === target);
        if (!config) return;

        config.active = isIntersecting;

        config.elements.forEach((el) => {
          el.classList.toggle(
            'glow-active',
            isIntersecting && !reduceMotion.matches
          );
        });

        if (!isIntersecting) {
          config.tx = 0;
          config.ty = 0;
          config.x = 0;
          config.y = 0;

          config.elements.forEach((el) => {
            el.style.transform = '';
          });
        }
      });

      schedule();
    }, { threshold: 0 });

    configs.forEach((c) => observer.observe(c.section));

    window.addEventListener('pointermove', (e) => {
      if (!finePointer.matches || reduceMotion.matches) return;
      if (!configs.some((c) => c.active)) return;

      pointerX = e.clientX;
      pointerY = e.clientY;

      configs.forEach((c) => {
        if (!c.active) return;

        c.ty = ((pointerX / window.innerWidth) * 2 - 1) * 6;
        c.tx = (1 - (pointerY / window.innerHeight) * 2) * 6;
      });

      schedule();
    }, { passive: true });

    function handlePreferences() {
      configs.forEach((c) => {
        c.elements.forEach((el) => {
          el.classList.toggle(
            'glow-active',
            c.active && !reduceMotion.matches
          );
        });

        if (reduceMotion.matches || !finePointer.matches) {
          c.tx = c.ty = c.x = c.y = 0;

          c.elements.forEach((el) => {
            el.style.transform = '';
          });
        }
      });

      schedule();
    }

    reduceMotion.addEventListener('change', handlePreferences);
    finePointer.addEventListener('change', handlePreferences);
  }

  function schedule() {
    if (!raf && !reduceMotion.matches && finePointer.matches) {
      raf = requestAnimationFrame(tick);
    }
  }

  function tick(time) {
    raf = 0;

    const delta = lastFrame
      ? Math.min(time - lastFrame, 64)
      : 16.7;

    lastFrame = time;

    const factor =
      1 - Math.pow(1 - 0.08, delta / (1000 / 60));

    let moving = false;

    configs.forEach((c) => {
      if (!c.active) return;

      c.x += (c.tx - c.x) * factor;
      c.y += (c.ty - c.y) * factor;

      if (Math.abs(c.tx - c.x) < 0.01) c.x = c.tx;
      if (Math.abs(c.ty - c.y) < 0.01) c.y = c.ty;

      c.elements.forEach((el) => {
        el.style.transform =
          `perspective(1000px) rotateX(${c.x.toFixed(3)}deg) rotateY(${c.y.toFixed(3)}deg)`;
      });

      if (c.x !== c.tx || c.y !== c.ty) {
        moving = true;
      }
    });

    if (moving) {
      schedule();
    } else {
      lastFrame = 0;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup, {
      once: true
    });
  } else {
    setup();
  }
})();
