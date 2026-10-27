
/*
 * POPCLUB V2 — PROBLEM MESSAGE
 *
 * Scrolling text and existing GSAP timeline.
 * No barrel distortion, animated grain,
 * flicker, jitter, or pointer tilt.
 *
 * Preserves the ScrollTrigger used by
 * problem-animation.js.
 */

(function () {
  'use strict';

  function initProblemMessage() {

    const screen = document.querySelector('.problem_crt_screen');
    const message = document.querySelector('.problem_message');
    const section = document.querySelector('.section_problem');

    if (!screen || !message || !section) {
      console.warn('[Problem Message] Required elements missing.');
      return;
    }

    if (!window.gsap || !window.ScrollTrigger) {
      console.warn('[Problem Message] GSAP or ScrollTrigger missing.');
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // -----------------------------------------
    // MESSAGE CONTENT — UNCHANGED
    // -----------------------------------------

    message.innerHTML = `
      <div class="crt-roll">

        <div class="crt-title">
          The Problem
        </div>

        <div class="crt-headline">
          Payments<br>
          that don’t<br>
          reward you
        </div>

        <div class="crt-paragraph">
          You pay bills.<br>
          You buy coffee.<br>
          You shop.
        </div>

        <div class="crt-question">
          And your reward?
        </div>

        <div class="crt-paragraph">
          Coupons that’ll expire before<br>
          you remember them
        </div>

        <div class="crt-paragraph">
          Cashback so small it doesn't<br>
          show up on your statement
        </div>

        <div class="crt-paragraph">
          Scratchcards that always say<br>
          <span class="crt-emphasis">Better luck next time</span>
        </div>

        <div class="crt-question-serif">
          And?
        </div>

        <div class="crt-paragraph">
          Your <span class="crt-emphasis">loyalty</span> gets wasted on<br>
          apps that don’t see your<br>
          <span class="crt-emphasis">potential</span>
        </div>

        <div class="crt-ending">
          You’re already paying for the<br>
          life you want. You’re just not<br>
          getting it.
        </div>

      </div>
    `;

    const roll = message.querySelector('.crt-roll');

    // -----------------------------------------
    // EXISTING SCROLL SETTINGS — UNCHANGED
    // -----------------------------------------

    const PROBLEM_SCROLL_DISTANCE = 11300;
    const TV_ZOOM_PORTION = 0.3;
    const BELIEF_TIMELINE_DURATION = 1.26;

    // -----------------------------------------
    // EXISTING GSAP TIMELINE — UNCHANGED
    // -----------------------------------------

    const crtTimeline = gsap.timeline({
      scrollTrigger: {
  trigger: section,
  start: 'top top',
  end: '+=' + PROBLEM_SCROLL_DISTANCE,
  scrub: 1,
  pin: true,
  invalidateOnRefresh: true,

  onEnter: () => screen.classList.add('grain-active'),
  onEnterBack: () => screen.classList.add('grain-active'),
  onLeave: () => screen.classList.remove('grain-active'),
  onLeaveBack: () => screen.classList.remove('grain-active'),

  onRefresh: (self) => {
    screen.classList.toggle('grain-active', self.isActive);
  }
}
    });

    crtTimeline.set(
      roll,
      {
        y: () => screen.clientHeight * 0.68
      },
      0
    );

    crtTimeline.to(
      {},
      {
        duration: TV_ZOOM_PORTION
      },
      0
    );

    crtTimeline.to(
      {},
      {
        duration: BELIEF_TIMELINE_DURATION
      },
      1
    );

    crtTimeline.to(
      roll,
      {
        y: () => -roll.scrollHeight,
        ease: 'none',
        duration: 1 - TV_ZOOM_PORTION
      },
      TV_ZOOM_PORTION
    );

    // -----------------------------------------
    // REFRESH SCROLLTRIGGER
    // -----------------------------------------

    requestAnimationFrame(function () {
      ScrollTrigger.refresh();
    });

    console.log('[Problem Message] Clean CRT initialized.');
  }

  // -----------------------------------------
  // INITIALIZE
  // -----------------------------------------

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      initProblemMessage
    );
  } else {
    initProblemMessage();
  }

})();
