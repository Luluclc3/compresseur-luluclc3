(()=>{
  const ready=()=>{
    const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
    const vipCodes=new Set(['luluclc3','luluadmin','lulu admin','lulu']);
    const modal=$('#modal'), code=$('#code'), unlock=$('#unlock'), error=$('#error'), vipOpen=$('#vipOpen');
    if(!modal||!code||!unlock)return;
    let unlocked=false;
    const open=()=>{modal.classList.remove('hidden');code.value='';error.textContent='';setTimeout(()=>code.focus(),80)};
    vipOpen?.addEventListener('click',open,true);
    const accepted=()=>vipCodes.has(code.value.trim().toLowerCase());
    // Normalize every accepted VIP code to the canonical code used by the page's own logic.
    unlock.addEventListener('click',()=>{
      if(!accepted())return;
      code.value='luluclc3';
      setTimeout(()=>{
        unlocked=true;
        document.body.classList.add('vipon');
        $$('.choice').forEach(b=>b.classList.toggle('active',b.dataset.profile==='ultra'));
        window.__VIP_ACTIVE__=true;
        window.__VIP_PROFILE__='ultra';
        vipOpen.textContent='✦ VIP';
        const read=$('#targetRead');
        if(read)read.innerHTML='✦ <b>Ultra VIP actif.</b> Tu peux régler la cible avec le curseur.';
        const hint=document.querySelector('.viphint');if(hint)hint.style.display='block';
      },30);
    },true);
    code.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();unlock.click()}},true);
    $$('.choice').forEach(b=>b.addEventListener('click',()=>{
      if(b.dataset.profile==='ultra'&&!unlocked){setTimeout(open,0);return}
      if(b.dataset.profile==='ultra'&&unlocked){
        $$('.choice').forEach(x=>x.classList.remove('active'));b.classList.add('active');
        window.__VIP_PROFILE__='ultra';
      }
    },true));
    const boot=$('#boot'),state=$('#bootstate');
    if(boot&&state){
      [['Initialisation…',0],['Vérification du service…',650],['Connexion établie ✓',1350]].forEach(([text,delay])=>setTimeout(()=>state.textContent=text,delay));
      setTimeout(()=>boot.classList.add('hide'),2200);
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
