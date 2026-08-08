(()=>{
  const $=s=>document.querySelector(s);
  const bar=$('#bar'),pct=$('#pct'),stage=$('#stage'),detail=$('#detail'),pname=$('#pname');
  if(!bar||!pct||!stage||!detail||!pname)return;

  const style=document.createElement('style');
  style.textContent=`
    #progress .bar{position:relative;height:11px;border:1px solid #202531;box-shadow:inset 0 1px 3px #0008}
    #progress .bar i{position:relative;min-width:0;background:linear-gradient(90deg,var(--violet),var(--cyan));box-shadow:0 0 18px #65e6ff2a;will-change:width}
    #progress .bar i::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,#ffffff35,transparent);transform:translateX(-100%);animation:progressShine 1.15s linear infinite}
    #progress .pct{font-variant-numeric:tabular-nums;min-width:70px;text-align:right}
    #progress .foot{align-items:center}
    #progress .foot #detail{max-width:78%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    @keyframes progressShine{to{transform:translateX(100%)}}
  `;
  document.head.appendChild(style);

  let shown=0,target=0,raf=0;
  const clamp=n=>Math.max(0,Math.min(100,Number(n)||0));
  const paint=()=>{
    const diff=target-shown;
    if(Math.abs(diff)<.08){shown=target}else{shown+=diff*.16}
    bar.style.width=shown+'%';
    pct.textContent=Math.round(shown)+'%';
    if(Math.abs(target-shown)>=.08)raf=requestAnimationFrame(paint);else raf=0;
  };
  const smoothProgress=(p,s,d)=>{
    target=clamp(p);
    stage.textContent=s||'';
    detail.textContent=d||'';
    if(!raf)raf=requestAnimationFrame(paint);
  };
  const smoothShow=(title)=>{
    if(raf)cancelAnimationFrame(raf);
    shown=0;target=0;bar.style.width='0%';pct.textContent='0%';
    pname.textContent=title||'Préparation…';
    stage.textContent='ANALYSE';
    detail.textContent='Préparation locale…';
  };

  window.progress=smoothProgress;
  window.showProgress=smoothShow;
})();
