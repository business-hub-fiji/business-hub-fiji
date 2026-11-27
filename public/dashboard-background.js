(() => {
  'use strict';
  const header = document.querySelector('.dashboard-sunrise');
  if (!header) return;
  const still = header.querySelector('.sunrise-still');
  const next = header.querySelector('.sunrise-next');
  const button = header.querySelector('.sunrise-control');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const slideCount = 6;
  let slide = 1;
  let paused = false;
  let advancing = false;
  let timer;

  function schedule() {
    clearTimeout(timer);
    if (!advancing && !paused && !reduced.matches && !document.hidden) timer = setTimeout(advance, 6000);
  }

  async function advance() {
    advancing = true;
    slide = slide % slideCount + 1;
    next.src = '/dashboard-sunrise/sunrise-' + slide + '.jpg';
    try {
      await next.decode();
      if (paused || reduced.matches || document.hidden) return;
      next.classList.add('fading');
      await new Promise(resolve => setTimeout(resolve, 1450));
      still.src = next.src;
    } catch {
      // Keep the current photo if the next one cannot load.
    } finally {
      next.classList.remove('fading');
      advancing = false;
      schedule();
    }
  }

  button.addEventListener('click', () => {
    paused = !paused;
    button.textContent = paused ? 'Resume photos' : 'Pause photos';
    schedule();
  });
  function updateMotion() {
    button.hidden = reduced.matches;
    schedule();
  }
  reduced.addEventListener('change', updateMotion);
  document.addEventListener('visibilitychange', schedule);
  updateMotion();
})();
