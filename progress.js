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

  const getProfile=()=>typeof profile==='string' ? profile : 'smart';
  const getFiles=()=>Array.isArray(files) ? files : [];
  const readVipTarget=()=>{
    if(typeof vip==='undefined' || !vip) return null;
    const input=$('#target');
    const unit=$('#unit');
    const value=Number(input?.value);
    if(!value) return null;
    return bytesFrom(value, unit?.value||'Ko');
  };

  async function buildZip(data, profileName, targetBytes){
    const levels=profileName==='small'
      ? [9]
      : profileName==='smart'
        ? [6]
        : [0,1,2,3,4,5,6,7,8,9];

    let best=null;
    let bestUnderTarget=null;
    const lastIndex=Math.max(levels.length-1,1);

    for(let i=0;i<levels.length;i++){
      const level=levels[i];
      await new Promise(r=>setTimeout(r,0));
      const out=fflate.zipSync(data,{level});
      if(!best||out.length<best.length) best=out;
      if(targetBytes&&out.length<=targetBytes&&(!bestUnderTarget||out.length>bestUnderTarget.length)) bestUnderTarget=out;

      if(profileName==='smart'){
        progress(72,'COMPRESSION','Profil Smart · niveau ZIP 6/9');
      }else if(profileName==='small'){
        progress(78,'COMPRESSION','Profil Plus petit · niveau ZIP 9/9');
      }else{
        progress(65+(i/lastIndex)*30,'OPTIMISATION','Test du niveau ZIP '+level+'/9…');
      }
    }

    progress(92,'FINALISATION','Archive prête à être générée…');
    return targetBytes&&bestUnderTarget ? bestUnderTarget : best;
  }

  const startBtn=$('#start');
  if(startBtn){
    startBtn.onclick=async()=>{
      const currentFiles=getFiles();
      if(!currentFiles.length) return;

      const currentProfile=getProfile();
      const targetInput=$('#target');
      const targetValue=targetInput?.value?.trim?.() ?? '';
      if(typeof vip!=='undefined' && !vip && targetValue){
        if($('#targetRead')) $('#targetRead').innerHTML='✦ La cible exacte est réservée au VIP.';
        if(typeof openVip==='function') openVip();
        return;
      }

      if(typeof showProgress==='function') showProgress('Préparation de l’archive');
      else smoothShow('Préparation de l’archive');

      const total=typeof totalSize==='function' ? totalSize() : currentFiles.reduce((a,f)=>a+(f?.size||0),0);
      const data={};
      let done=0;
      for(const f of currentFiles){
        if($('#pname')) $('#pname').textContent=f.name;
        const buf=await f.arrayBuffer();
        data[f.name]=new Uint8Array(buf);
        done+=(f.size||0);
        progress(Math.min(60,total?done/total*60:60),'LECTURE','Lecture locale de '+f.name);
      }

      const target=readVipTarget();
      const out=await buildZip(data,currentProfile,target);
      archive=new Blob([out],{type:'application/zip'});
      downloadName='compresseur-de-luluclc3.zip';

      progress(100,'TERMINÉ','Archive générée localement');
      await new Promise(r=>setTimeout(r,300));
      $('#progress')?.classList.add('hidden');
      $('#result')?.classList.remove('hidden');
      if($('#resultEyebrow')) $('#resultEyebrow').textContent='COMPRESSION TERMINÉE';
      if($('#resultTitle')) $('#resultTitle').textContent='Votre archive est prête.';
      if($('#before')) $('#before').textContent=fmt(total);
      if($('#after')) $('#after').textContent=fmt(out.length);
      if($('#saving')) $('#saving').textContent=Math.max(0,(1-out.length/total)*100).toFixed(1)+' %';
      if($('#targetMetric')) $('#targetMetric').textContent=target?fmt(target):(currentProfile==='small'?'Plus petit':'Smart');

      const exactTarget=target?out.length<=target:null;
      const statusText=target
        ? (exactTarget
            ? '✓ Cible atteinte : l’archive est sous la taille demandée.'
            : '⚠ Cible trop basse : même avec le meilleur niveau ZIP, cette taille n’est pas atteignable sans modifier les fichiers.')
        : (currentProfile==='small'
            ? '✓ Profil Plus petit appliqué : compression maximale ZIP.'
            : '✓ Profil Smart appliqué : compression équilibrée ZIP.');

      if($('#status')){
        $('#status').className='status '+(target?(exactTarget?'good':'warn'):'good');
        $('#status').textContent=statusText;
      }

      const hasVideo=currentFiles.some(f=>f.type?.startsWith('video')||/\.(mp4|mov|mkv|avi|webm)$/i.test(f.name));
      if($('#note')){
        $('#note').textContent=hasVideo
          ? 'Les vidéos sont conservées sans perte : ZIP ne réencode pas leur contenu. Pour une forte réduction de MP4/MOV/MKV, une future version FFmpeg pourra proposer un vrai réglage qualité/taille.'
          : (currentProfile==='small'
              ? 'Le profil Plus petit force le niveau ZIP maximal. Aucun fichier n’a été envoyé à un serveur.'
              : 'Le profil Smart applique un bon compromis. Aucun fichier n’a été envoyé à un serveur.');
      }
    };
  }

  const originalUpdateTargetUI=window.updateTargetUI;
  if(typeof originalUpdateTargetUI==='function'){
    window.updateTargetUI=()=>{
      if(typeof vip!=='undefined' && !vip){
        const input=$('#target'),range=$('#targetRange'),rangePct=$('#rangePct'),read=$('#targetRead');
        if(input) input.value='';
        if(range) range.value='100';
        if(rangePct) rangePct.textContent='100 %';
        if(read) read.innerHTML='Aucune cible précise en mode standard. <b>Smart</b> et <b>Plus petit</b> sont disponibles sans VIP.';
        return;
      }
      originalUpdateTargetUI();
    };
    window.updateTargetUI();
  }
})();
