// Keep this decorative illustration out of the initial HTML and animation work
// out of the critical path. Its accessible image also works without JavaScript.
const card = document.querySelector('[data-anatomy-card]');
if (card) {
  let loading = false;
  let observer;
  const load = async () => {
    if (loading) return;
    loading = true;
    const stage = card.querySelector('[data-anatomy-stage]');
    const preview = stage?.querySelector('img[data-anatomy-preview]');
    if (!preview) return;
    try {
      const response = await fetch(preview.src, { cache: 'force-cache' });
      if (!response.ok) throw new Error('Illustration unavailable');
      const parsed = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
      const svg = parsed.querySelector('svg.anatomy-svg');
      if (!svg || parsed.querySelector('parsererror')) throw new Error('Invalid illustration');
      // Import before replacing the image so a failed module request keeps a
      // complete static illustration instead of a broken animation control.
      const { initAnatomy } = await import('./live.js?v=20261015-seo-1');
      stage.replaceChildren(window.document.importNode(svg, true));
      initAnatomy(card);
      observer?.disconnect();
    } catch {
      // Leave the accessible static image in place; retry when the user returns.
      loading = false;
    }
  };
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) load();
    }, { rootMargin: '320px 0px' });
    observer.observe(card);
  } else {
    load();
  }
}
