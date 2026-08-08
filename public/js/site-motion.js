(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  // Smooth mode changes (compression/decompression and quality choices).
  document.addEventListener('click', (event) => {
    const el = event.target.closest('button,[role="button"],a,.choice,.tab,.mode,.mainbtn');
    if (!el) return;
    el.animate([
      { transform: 'scale(.97)', filter: 'brightness(1)' },
      { transform: 'scale(1.015)', filter: 'brightness(1.1)' },
      { transform: 'scale(1)', filter: 'brightness(1)' }
    ], { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' });
  }, { passive: true });

  // Crossfade the page when a major UI state changes.
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== 'attributes' && mutation.type !== 'childList') continue;
      const target = mutation.target instanceof Element ? mutation.target : null;
      if (!target) continue;
      if (target.matches('.result,.progress,.files,.drop,.choices,.tabs') || target.closest('.result,.progress,.files,.choices,.tabs')) {
        const node = target.matches('.result,.progress,.files,.drop,.choices,.tabs') ? target : target.closest('.result,.progress,.files,.drop,.choices,.tabs');
        if (node && node.animate) node.animate([
          { opacity: .55, transform: 'translateY(6px) scale(.99)' },
          { opacity: 1, transform: 'translateY(0) scale(1)' }
        ], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class','style','hidden','aria-selected'] });

  // Network/connection indicator: tiny, non-blocking status pill.
  const badge = document.createElement('div');
  badge.id = 'connection-status';
  badge.setAttribute('aria-live', 'polite');
  badge.innerHTML = '<span></span><b>Connexion</b>';
  Object.assign(badge.style, {
    position:'fixed', right:'14px', bottom:'14px', zIndex:'9999', display:'flex', alignItems:'center', gap:'7px',
    padding:'8px 11px', border:'1px solid rgba(255,255,255,.12)', borderRadius:'999px',
    background:'rgba(10,10,14,.72)', backdropFilter:'blur(14px)', color:'#ddd', font:'600 11px system-ui',
    opacity:'.78', pointerEvents:'none', boxShadow:'0 10px 30px rgba(0,0,0,.28)'
  });
  const dot = badge.querySelector('span');
  Object.assign(dot.style, { width:'7px', height:'7px', borderRadius:'50%', background:'#67e8a5', boxShadow:'0 0 12px #67e8a5' });
  document.body.appendChild(badge);

  const setStatus = (online, label) => {
    badge.querySelector('b').textContent = label;
    dot.style.background = online ? '#67e8a5' : '#ff6b7a';
    dot.style.boxShadow = online ? '0 0 12px #67e8a5' : '0 0 12px #ff6b7a';
    badge.animate([{ transform:'translateY(8px)', opacity:.1 }, { transform:'translateY(0)', opacity:.78 }], { duration:350, easing:'cubic-bezier(.22,1,.36,1)' });
  };
  window.addEventListener('online', () => setStatus(true, 'Connecté'));
  window.addEventListener('offline', () => setStatus(false, 'Hors connexion'));
  setStatus(navigator.onLine, navigator.onLine ? 'Connecté' : 'Hors connexion');
})();
