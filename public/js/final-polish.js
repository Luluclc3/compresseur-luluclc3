(()=>{
  const ready=()=>{
    const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
    const vipCodes=new Set(['luluclc3','luluadmin','lulu admin','lulu']);
    const modal=$('#modal'), code=$('#code'), unlock=$('#unlock'), error=$('#error'), vipOpen=$('#vipOpen');
    if(!modal||!code||!unlock)return;
    let unlocked=Boolean(window.__VIP_ACTIVE__===true);
    const range=document.querySelector('input[type="range"]');
    const FREE_MIN=50;
    const VIP_MIN=1;

    const applyRangeAccess=()=>{
      if(!range)return;
      const isVip=unlocked||window.__VIP_ACTIVE__===true;
      range.min=String(isVip?VIP_MIN:FREE_MIN);
      if(Number(range.value)<Number(range.min))range.value=range.min;
      range.setAttribute('aria-valuemin',range.min);
      range.title=isVip?'Réglage VIP : jusqu’à 1 %':'Version gratuite : minimum 50 %';
    };

    const open=()=>{modal.classList.remove('hidden');code.value='';error.textContent='';setTimeout(()=>code.focus(),80)};
    vipOpen?.addEventListener('click',open,true);
    const accepted=()=>vipCodes.has(code.value.trim().toLowerCase());
    unlock.addEventListener('click',()=>{
      if(!accepted()){error.textContent='Code VIP invalide.';return;}
      code.value='luluclc3';
      setTimeout(()=>{
        unlocked=true;
        document.body.classList.add('vipon');
        window.__VIP_ACTIVE__=true;
        window.__VIP_PROFILE__='ultra';
        $$('.choice').forEach(b=>b.classList.toggle('active',b.dataset.profile==='ultra'));
        vipOpen.textContent='✦ VIP';
        const read=$('#targetRead');
        if(read)read.innerHTML='✦ <b>Ultra VIP actif.</b> Tu peux régler la cible jusqu’à 1 %.'.replace('jusqu’à 1 %.','jusqu’à 1 %.');
        const hint=document.querySelector('.viphint');if(hint)hint.style.display='block';
        applyRangeAccess();
        modal.classList.add('hidden');
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

    if(range){
      range.addEventListener('input',()=>{
        if(!unlocked&&Number(range.value)<FREE_MIN){
          range.value=String(FREE_MIN);
          error?.replaceChildren();
          const read=$('#targetRead');
          if(read)read.innerHTML='🔒 <b>50 % minimum en version gratuite.</b> Passe en VIP pour descendre plus bas.';
        }
      },true);
      range.addEventListener('change',()=>{
        if(!unlocked&&Number(range.value)<FREE_MIN)range.value=String(FREE_MIN);
      },true);
    }
    applyRangeAccess();

    const boot=$('#boot'),state=$('#bootstate');
    if(boot&&state){
      [['Initialisation…',0],['Vérification du service…',650],['Connexion établie ✓',1350]].forEach(([text,delay])=>setTimeout(()=>state.textContent=text,delay));
      setTimeout(()=>boot.classList.add('hide'),2200);
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
