(() => {
  const section = document.querySelector('[data-experience]');
  if (!section) return;
  const rail = section.querySelector('[data-experience-rail]');
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const group = rail.querySelector('.experience-group');
  group.querySelectorAll('img').forEach(image => image.draggable = false);
  const repeat = group.cloneNode(true);
  repeat.setAttribute('aria-hidden', 'true');
  rail.append(repeat);
  section.classList.add('experience-ready');
  let visible = false;
  const update = () => {
    section.dataset.running = String(visible && !document.hidden && !media.matches);
  };
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }).observe(section);
  media.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
  update();
})();
