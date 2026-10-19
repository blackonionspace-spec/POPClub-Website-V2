
/* POPClub V2 — Social Proof Logo Runner */

(() => {
  function initSocialProofRunner() {
    const runner = document.querySelector('.social_proof_runner');
    const track = document.querySelector('.social_proof_runner_track');

    if (!runner || !track || !window.gsap) {
      console.warn('[Social Proof] Runner, track, or GSAP missing.');
      return;
    }

    if (track.dataset.runnerInitialized === 'true') return;

    const sets = track.querySelectorAll('.social_proof_logo_set');

    if (sets.length !== 2) {
      console.warn('[Social Proof] Expected exactly two logo sets.');
      return;
    }

    track.dataset.runnerInitialized = 'true';

    const SPEED = 45; // pixels per second
    let tween = null;

    function startRunner() {
      if (tween) tween.kill();

      gsap.set(track, { x: 0 });

      // Measure the distance between identical logo sets.
      const distance = sets[1].offsetLeft - sets[0].offsetLeft;

      if (distance <= 0) {
        console.warn('[Social Proof] Invalid logo set width.');
        return;
      }

      tween = gsap.to(track, {
        x: -distance,
        duration: distance / SPEED,
        ease: 'none',
        repeat: -1
      });
    }

    // Wait for images to load before measuring widths.
    const images = Array.from(track.querySelectorAll('img'));

    Promise.all(
      images.map(img => {
        if (img.complete) return Promise.resolve();

        return new Promise(resolve => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        });
      })
    ).then(startRunner);

    // Recalculate when the browser is resized.
    window.addEventListener('resize', startRunner);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSocialProofRunner);
  } else {
    initSocialProofRunner();
  }
})();
