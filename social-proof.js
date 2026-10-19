
/* POPClub V2 — Seamless Social Proof Logo Runner */

(() => {
  function initSocialProofRunner() {
    const runner = document.querySelector('.social_proof_runner');
    const track = document.querySelector('.social_proof_runner_track');

    if (!runner || !track || !window.gsap) {
      console.warn('[Social Proof] Missing runner, track, or GSAP.');
      return;
    }

    if (track.dataset.runnerInitialized === 'true') return;
    track.dataset.runnerInitialized = 'true';

    const originalSet = track.querySelector('.social_proof_logo_set');

    if (!originalSet) {
      console.warn('[Social Proof] No logo set found.');
      return;
    }

    const SPEED = 45; // Pixels per second
    let tween = null;

    // Remove existing duplicate sets.
    const allSets = Array.from(
      track.querySelectorAll('.social_proof_logo_set')
    );

    allSets.slice(1).forEach(set => set.remove());

    async function waitForImages() {
      const images = Array.from(originalSet.querySelectorAll('img'));

      await Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve();

        return new Promise(resolve => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        });
      }));
    }

    function rebuildRunner() {
      if (tween) {
        tween.kill();
        tween = null;
      }

      gsap.set(track, { x: 0 });

      // Remove previously generated copies.
      Array.from(track.children).forEach(child => {
        if (child !== originalSet) child.remove();
      });

      const setWidth = originalSet.getBoundingClientRect().width;
      const runnerWidth = runner.getBoundingClientRect().width;

      if (setWidth <= 0 || runnerWidth <= 0) return;

      // Enough copies to cover the viewport throughout one cycle.
      const copiesNeeded = Math.ceil(runnerWidth / setWidth) + 2;

      for (let i = 0; i < copiesNeeded; i++) {
        const clone = originalSet.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.appendChild(clone);
      }

      // Animate by exactly one original logo-set width.
      tween = gsap.to(track, {
        x: -setWidth,
        duration: setWidth / SPEED,
        ease: 'none',
        repeat: -1
      });
    }

    waitForImages().then(rebuildRunner);

    let resizeFrame = null;

    window.addEventListener('resize', () => {
      if (resizeFrame) cancelAnimationFrame(resizeFrame);

      resizeFrame = requestAnimationFrame(rebuildRunner);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSocialProofRunner);
  } else {
    initSocialProofRunner();
  }
})();
