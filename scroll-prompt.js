
/* POPCLUB V2 — Global Scroll Prompt
   Standalone observer. Does not create pins or modify existing animations.
   Load AFTER the Coin, Problem, Belief and Products scripts.
*/
(() => {
  'use strict';

  function init() {
    const prompt = document.querySelector('.scroll_prompt');
    if (!prompt || !window.gsap || !window.ScrollTrigger) {
      console.warn('[Scroll Prompt] Missing .scroll_prompt, GSAP or ScrollTrigger.');
      return;
    }

    const coin = document.querySelector('.section_coin');
    const problem = document.querySelector('.section_problem');
    const banner = document.querySelector('.section_banner');
    const cta = document.querySelector('.section_cta');
    const partners = document.querySelector('.section_partners');
    const slides = banner ? Array.from(banner.querySelectorAll('.products_viewport.banner_products .product_slide')) : [];
    const videos = slides.map(slide => slide.querySelector('video'));

    const FADE_IN = 1;
    const FADE_OUT = 0.5;
    const CTA_DELAY_MS = 3000;
    const BELIEF_FRAMES = new Set([1, 49, 89, 129, 168]);
    const BELIEF_HOLDS = new Set([49, 89, 129]);
    const BANNER_HOLD = 0.75;
    const TOTAL_UNITS = BANNER_HOLD + slides.length + 0.35;

    gsap.set(prompt, { autoAlpha: 0, pointerEvents: 'none' });
    let wanted = false;
    let mode = '';
    let introDone = false;
    let sawCoinLock = false;
    let ctaEnteredAt = null;
    let lastBeliefFrame = -1;
    let beliefSequence = null;
    let beliefAnchor = null;
    let productActive = -1;
    let lastUnits = 0;
    const completed = videos.map(() => false);

    function findPin(section) {
      if (!section) return null;
      return ScrollTrigger.getAll().find(st => st.trigger === section && st.vars.pin === true) || null;
    }

    function show(value) {
      if (wanted === value) return;
      wanted = value;
      gsap.killTweensOf(prompt);
      gsap.to(prompt, {
        autoAlpha: value ? 1 : 0,
        duration: value ? FADE_IN : FADE_OUT,
        ease: 'power2.out',
        overwrite: true
      });
    }

    function cancelBelief() {
      if (beliefSequence) {
        beliefSequence.kill();
        beliefSequence = null;
      }
      beliefAnchor = null;
    }

    function setMode(next) {
      if (mode === next) return;
      if (mode === 'belief') cancelBelief();
      if (next !== 'cta') ctaEnteredAt = null;
      mode = next;
      show(false);
    }

    // Coin intro locks the page by setting overflow:hidden on both roots.
    // Its completion unlocks both. Observing this avoids editing coin-animation.js.
    function inspectCoinLock() {
      const locked = document.documentElement.style.overflow === 'hidden' &&
                     document.body.style.overflow === 'hidden';
      if (locked) sawCoinLock = true;
      if (sawCoinLock && !locked) introDone = true;
    }
    const lockObserver = new MutationObserver(inspectCoinLock);
    lockObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    lockObserver.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    inspectCoinLock();

    videos.forEach((video, index) => {
      if (!video) return;
      video.addEventListener('ended', () => { completed[index] = true; });
      video.addEventListener('seeked', () => {
        if (video.currentTime < 0.1) completed[index] = false;
      });
    });

    function fullyVisible(element) {
      if (!element) return false;
      const r = element.getBoundingClientRect();
      const tolerance = 3;
      return r.width > 0 && r.height > 0 &&
        r.top >= -tolerance && r.bottom <= window.innerHeight + tolerance;
    }

    function activePin(st) {
      return !!st && st.isActive && window.scrollY >= st.start - 2 && window.scrollY <= st.end + 2;
    }

    function getProblemFrame(st) {
      const earlyStart = window.innerHeight * 0.2;
      const scrollPosition = window.scrollY - (st.start - earlyStart);
      const progress = gsap.utils.clamp(0, 1, scrollPosition / (1500 + earlyStart));
      return Math.min(54, Math.floor(progress * 54));
    }

    // Mirror the existing carousel's activation thresholds, without touching videos.
    function updateProductActive(units) {
      if (units <= BANNER_HOLD + 0.15) {
        productActive = -1;
        return;
      }
      let forward = -1;
      for (let i = 0; i < slides.length; i++) {
        if (units >= BANNER_HOLD + i + 0.95) forward = i;
      }
      if (productActive === -1) {
        if (forward >= 0) productActive = forward;
      } else if (forward > productActive) {
        productActive = forward;
      } else if (units < lastUnits) {
        while (productActive > 0 && units <= BANNER_HOLD + productActive + 0.15) {
          productActive--;
        }
      }
      lastUnits = units;
    }

    function startBeliefCycle(frame) {
      cancelBelief();
      beliefAnchor = frame;
      wanted = true;
      gsap.killTweensOf(prompt);
      gsap.set(prompt, { autoAlpha: 0 });
      beliefSequence = gsap.timeline({
        onComplete: () => {
          beliefSequence = null;
          beliefAnchor = null;
          wanted = false;
        }
      });
      beliefSequence.to(prompt, { autoAlpha: 1, duration: FADE_IN, ease: 'power2.out' })
        .to({}, { duration: 1 })
        .to(prompt, { autoAlpha: 0, duration: FADE_OUT, ease: 'power2.out' });
    }

    function tick() {
      const coinST = findPin(coin);
      const problemST = findPin(problem);
      const bannerST = findPin(banner);

      // Priority follows the page's pinned sections, then ordinary sections.
      if (activePin(coinST)) {
        setMode('coin');
        const frame = 75 + coinST.progress * 44;
        show(introDone && frame < 115);
        return;
      }

      if (activePin(problemST)) {
        const distance = problemST.progress * 11300;
        if (distance < 5000) {
          setMode('problem');
          const frame = getProblemFrame(problemST);
          show(frame >= 10 && frame < 45);
          return;
        }

        setMode('belief');
        const frame = Number.isFinite(window.beliefCurrentFrame)
          ? window.beliefCurrentFrame : -1;
        const newFrame = frame !== lastBeliefFrame;
        if (newFrame) {
          // A prompt belongs to its pause point; cancel when it is skipped.
          if (beliefAnchor !== null && frame !== beliefAnchor) {
            const holdingFrame = BELIEF_HOLDS.has(beliefAnchor);
            const tolerance = holdingFrame ? 2 : 8;
            if (Math.abs(frame - beliefAnchor) > tolerance) {
              cancelBelief();
              show(false);
            }
          }
          if (BELIEF_FRAMES.has(frame) && frame !== lastBeliefFrame) {
            startBeliefCycle(frame);
          }
          lastBeliefFrame = frame;
        }
        return;
      }
      lastBeliefFrame = -1;

      if (activePin(bannerST) && slides.length) {
        setMode('products');
        const units = bannerST.progress * TOTAL_UNITS;
        updateProductActive(units);
        // Banner opening is held at units 0–0.75. Hide at the first card movement.
        if (units <= BANNER_HOLD + 0.005) {
          show(true);
        } else if (productActive >= 0) {
          const video = videos[productActive];
          const finished = !!video && (video.ended ||
            (completed[productActive] && video.duration > 0 && video.currentTime >= video.duration - 0.15));
          show(finished);
        } else {
          show(false);
        }
        return;
      }
      productActive = -1;
      lastUnits = 0;

      if (fullyVisible(cta)) {
        setMode('cta');
        if (ctaEnteredAt === null) ctaEnteredAt = performance.now();
        show(performance.now() - ctaEnteredAt >= CTA_DELAY_MS);
        return;
      }
      ctaEnteredAt = null;

      if (fullyVisible(partners)) {
        setMode('partners');
        show(true);
        return;
      }

      // Social Proof, Footer, section transitions and all other states: hidden.
      setMode('none');
      show(false);
    }

    gsap.ticker.add(tick);
    tick();
    console.log('[Scroll Prompt] Ready.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
