(() => {
  const run = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (sessionStorage.getItem('siteConnectionSeen') === '1') return;
    sessionStorage.setItem('siteConnectionSeen', '1');

    const overlay = document.createElement('div');
    overlay.className = 'site-connection-overlay';
    overlay.innerHTML = `
      <div class="site-connection-card">
        <div class="site-connection-logo">CL3</div>
        <div class="site-connection-line"><i></i></div>
        <div class="site-connection-text" data-state="connecting">Connexion au service…</div>
        <div class="site-connection-status">● Connexion sécurisée</div>
      </div>`;
    document.body.appendChild(overlay);

    setTimeout(() => {
      const text = overlay.querySelector('.site-connection-text');
      text.textContent = 'Connexion établie ✓';
      text.dataset.state = 'connected';
    }, 750);

    setTimeout(() => {
      overlay.classList.add('site-connection-leave');
      setTimeout(() => overlay.remove(), 550);
    }, 1250);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
})();
