(()=>{
  const ready=()=>{
    const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
    const vipCodes=new Set(['luluclc3','luluadmin','lulu admin','lulu']);
    const modal=$('#modal'), code=$('#code'), unlock=$('#unlock'), error=$('#error'), vipOpen=$('#vipOpen');
    if(!modal||!code||!unlock)return;
    let unlocked=false;
    const open=()=>{modal.classList.remove('hidden');code.value='';error.textContent='';setTimeout(()=>code.focus(),80)};
    vipOpen?.addEventListener('click',open,true);
    const activate=()=>{
      const value=code.value.trim().toLowerCase();
      if(!vipCodes.has(value)){error.textContent='Code incorrect.';return}
      unlocked=true;
      document.body.classList.add('vipon');
      $$('.choice').forEach(b=>b.classList.toggle('active',b.dataset.profile==='ultra'));
      window.__VIP_ACTIVE__=true;
      window.__VIP_PROFILE__='ultra';
      // Keep the VIP button neutral so it can always reopen the access panel.
      vipOpen.textContent='✦ VIP';
      modal.classList.add('hidden');
      const read=$('#targetRead');
      if(read)read.innerHTML='✦ <b>Ultra VIP actif.</b> Tu peux régler la cible avec le curseur.';
      const hint=document.querySelector('.viphint'); if(hint)hint.style.display='block';
    };
    unlock.addEventListener('click',activate,true);
    code.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();activate()}},true);
    // Re-apply Ultra if another script changes the selected profile.
    $$('.choice').forEach(b=>b.addEventListener('click',()=>{
      if(b.dataset.profile==='ultra'&&!unlocked){setTimeout(open,0);return}
      if(b.dataset.profile==='ultra'&&unlocked){
        $$('.choice').forEach(x=>x.classList.remove('active'));b.classList.add('active');
        window.__VIP_PROFILE__='ultra';
      }
    },true));

    // Longer, staged entrance animation: visible but still quick.
    const boot=$('#boot'), state=$('#bootstate');
    if(boot&&state){
      const steps=[['Initialisation…',0],['Vérification du service…',650],['Connexion établie ✓',1350]];
      steps.forEach(([text,delay])=>setTimeout(()=>{if(state)state.textContent=text},delay));
      setTimeout(()=>boot.classList.add('hide'),2200);
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
