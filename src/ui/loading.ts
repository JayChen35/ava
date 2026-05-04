export function hideLoading() {
  const el = document.getElementById('loading');
  if (!el) return;
  el.classList.add('is-hidden');
  // After the fade-out completes, fully detach from layout.
  window.setTimeout(() => {
    el.style.display = 'none';
  }, 850);
}
