document.addEventListener("DOMContentLoaded", () => {
const section = document.querySelector(".section_cta");
const effect = document.querySelector(".cta_bg_effect");

  if (!section || !effect || !window.gsap) return;

  gsap.set(effect, {
    scale: 0.25,
    opacity: 0,
    filter: "blur(35px)",
    transformOrigin: "50% 50%"
  });

  const tl = gsap.timeline({ paused: true });

  tl.to(effect, {
    scale: 1,
    opacity: 1,
    filter: "blur(0px)",
    duration: 1.1,
    ease: "power3.out"
  }, 1.5);

  ScrollTrigger.create({
    trigger: section,
    start: "top 80%",
    once: true,
    onEnter: () => tl.play()
  });
});
