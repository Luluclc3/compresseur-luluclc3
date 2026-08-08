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
    bar.style.width=shown+'%';pct.textContent=Math.round(shown)+'%';
    if(Math.abs(target-shown)>=.08)raf=requestAnimationFrame(paint);else raf=0;
  };
  const smoothProgress=(p,s,d)=>{target=clamp(p);stage.textContent=s||'';detail.textContent=d||'';if(!raf)raf=requestAnimationFrame(paint)};
  const smoothShow=(title)=>{if(raf)cancelAnimationFrame(raf);shown=0;target=0;bar.style.width='0%';pct.textContent='0%';pname.textContent=title||'Préparation…';stage.textContent='ANALYSE';detail.textContent='Préparation locale…'};
  window.progress=smoothProgress;window.showProgress=smoothShow;

  const getProfile=()=>typeof profile==='string'?profile:'smart';
  const getFiles=()=>Array.isArray(files)?files:[];
  const readVipTarget=()=>{
    if(typeof vip==='undefined'||!vip)return null;
    const input=$('#target'),unit=$('#unit'),value=Number(input?.value);
    if(!value)return null;
    return bytesFrom(value,unit?.value||'Ko');
  };

  const imageInfo=f=>{
    const n=f.name.toLowerCase(),type=f.type||'';
    if(type==='image/jpeg'||type==='image/jpg'||/\.(jpe?g)$/i.test(n))return {kind:'jpeg',mime:'image/webp',ext:'.webp'};
    if(type==='image/png'||/\.png$/i.test(n))return {kind:'png',mime:'image/webp',ext:'.webp'};
    if(type==='image/webp'||/\.webp$/i.test(n))return {kind:'webp',mime:'image/webp',ext:'.webp'};
    return null;
  };

  // Le profil « Plus petit » cherche volontairement très agressivement la plus petite image.
  // Plusieurs qualités/résolutions sont testées et seul le plus petit résultat est conservé.
  const imageCandidates=profileName=>{
    if(profileName==='small'||profileName==='ultra')return [
      {q:.18,max:1280},{q:.22,max:1280},{q:.18,max:1024},{q:.25,max:1024},
      {q:.30,max:1280},{q:.20,max:1600},{q:.28,max:1600}
    ];
    return [{q:.55,max:2560},{q:.65,max:2560},{q:.45,max:1920}];
  };

  async function blobToBytes(blob){return new Uint8Array(await blob.arrayBuffer())}

  async function compressImageFile(file,profileName,index,totalImages){
    const info=imageInfo(file);
    if(!info)return {name:file.name,data:new Uint8Array(await file.arrayBuffer()),changed:false};
    progress(5+(index/Math.max(totalImages,1))*25,'OPTIMISATION','Compression réelle de '+file.name+'…');
    try{
      const bitmap=await createImageBitmap(file);
      const original=new Uint8Array(await file.arrayBuffer());
      const candidates=imageCandidates(profileName);
      let best=null;

      for(let i=0;i<candidates.length;i++){
        const c=candidates[i];
        const scale=Math.min(1,c.max/Math.max(bitmap.width,bitmap.height));
        const width=Math.max(1,Math.round(bitmap.width*scale));
        const height=Math.max(1,Math.round(bitmap.height*scale));
        const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
        const ctx=canvas.getContext('2d',{alpha:true});
        if(!ctx)throw new Error('Canvas indisponible');
        ctx.drawImage(bitmap,0,0,width,height);
        const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Compression image impossible')),info.mime,c.q));
        const out=await blobToBytes(blob);
        if(!best||out.length<best.data.length)best={data:out,q:c.q,max:c.max,width,height};
        progress(5+((index+i/candidates.length)/Math.max(totalImages,1))*25,'OPTIMISATION',file.name+' · test '+(i+1)+'/'+candidates.length+' · '+fmt(out.length));
        await new Promise(r=>setTimeout(r,0));
      }
      bitmap.close?.();
      if(!best||best.data.length>=original.length){
        return {name:file.name,data:original,changed:false,mime:file.type||'application/octet-stream'};
      }
      const base=file.name.replace(/\.[^.]+$/,'');
      const newName=base+info.ext;
      progress(30+(index/Math.max(totalImages,1))*25,'OPTIMISATION',fmt(file.size)+' → '+fmt(best.data.length)+' · '+newName);
      return {name:newName,data:best.data,changed:true,mime:info.mime};
    }catch(e){
      console.warn('Compression image impossible',file.name,e);
      return {name:file.name,data:new Uint8Array(await file.arrayBuffer()),changed:false,mime:file.type||'application/octet-stream'};
    }
  }

  async function prepareData(currentFiles,profileName){
    const data={},images=currentFiles.filter(f=>imageInfo(f)),total=currentFiles.length;let done=0;
    for(const f of currentFiles){
      if($('#pname'))$('#pname').textContent=f.name;
      const imageIndex=images.indexOf(f);
      if(imageIndex>=0){const result=await compressImageFile(f,profileName,imageIndex,images.length);data[result.name]=result.data}
      else{const buf=await f.arrayBuffer();data[f.name]=new Uint8Array(buf)}
      done++;progress(35+(done/Math.max(total,1))*25,'ANALYSE','Fichier '+done+'/'+total+' préparé');await new Promise(r=>setTimeout(r,0));
    }
    return data;
  }

  async function buildZip(data,profileName,targetBytes){
    const levels=profileName==='small'||profileName==='ultra'?[9]:profileName==='smart'?[6]:[0,1,2,3,4,5,6,7,8,9];
    let best=null,bestUnderTarget=null;const lastIndex=Math.max(levels.length-1,1);
    for(let i=0;i<levels.length;i++){
      const level=levels[i];await new Promise(r=>setTimeout(r,0));
      const out=fflate.zipSync(data,{level});
      if(!best||out.length<best.length)best=out;
      if(targetBytes&&out.length<=targetBytes&&(!bestUnderTarget||out.length>bestUnderTarget.length))bestUnderTarget=out;
      progress(65+(i/lastIndex)*30,'COMPRESSION','Archive ZIP · niveau '+level+'/9…');
    }
    progress(92,'FINALISATION','Archive prête à être générée…');
    return targetBytes&&bestUnderTarget?bestUnderTarget:best;
  }

  const startBtn=$('#start');
  if(startBtn)startBtn.onclick=async()=>{
    const currentFiles=getFiles();if(!currentFiles.length)return;
    const currentProfile=getProfile(),targetInput=$('#target'),targetValue=targetInput?.value?.trim?.()??'';
    if(typeof vip!=='undefined'&&!vip&&targetValue){if($('#targetRead'))$('#targetRead').innerHTML='✦ La cible exacte est réservée au VIP.';if(typeof openVip==='function')openVip();return}
    showProgress('Préparation de la compression');
    const total=currentFiles.reduce((a,f)=>a+(f?.size||0),0);
    const onlyOneImage=currentFiles.length===1&&!!imageInfo(currentFiles[0]);

    // Une image seule doit ressortir comme une vraie image compressée, pas comme une archive ZIP.
    if(onlyOneImage){
      const result=await compressImageFile(currentFiles[0],currentProfile,0,1);
      const outBlob=new Blob([result.data],{type:result.mime||'image/webp'});
      archive=outBlob;
      downloadName=result.name;
      progress(100,'TERMINÉ',result.changed?'Image réellement compressée localement':'Image déjà plus petite que les réglages disponibles');
      await new Promise(r=>setTimeout(r,300));
      $('#progress')?.classList.add('hidden');$('#result')?.classList.remove('hidden');
      if($('#resultEyebrow'))$('#resultEyebrow').textContent='COMPRESSION TERMINÉE';
      if($('#resultTitle'))$('#resultTitle').textContent='Votre image compressée est prête.';
      if($('#before'))$('#before').textContent=fmt(total);
      if($('#after'))$('#after').textContent=fmt(result.data.length);
      if($('#saving'))$('#saving').textContent=Math.max(0,(1-result.data.length/total)*100).toFixed(1)+' %';
      if($('#targetMetric'))$('#targetMetric').textContent=currentProfile==='small'?'Plus petit':'Smart';
      if($('#status')){$('#status').className='status '+(result.changed?'good':'warn');$('#status').textContent=result.changed?'✓ Image recompressée réellement : le fichier de sortie est plus petit.':'⚠ Cette image est déjà très optimisée avec les formats disponibles.'}
      if($('#note'))$('#note').textContent='La sortie est une vraie image '+(result.name.toLowerCase().endsWith('.webp')?'WebP':'compressée')+' et non un ZIP. Tout le traitement reste local dans votre navigateur.';
      return;
    }

    const data=await prepareData(currentFiles,currentProfile),target=readVipTarget(),out=await buildZip(data,currentProfile,target);
    archive=new Blob([out],{type:'application/zip'});downloadName='compresseur-de-luluclc3.zip';progress(100,'TERMINÉ','Compression maximale terminée localement');await new Promise(r=>setTimeout(r,300));
    $('#progress')?.classList.add('hidden');$('#result')?.classList.remove('hidden');
    if($('#resultEyebrow'))$('#resultEyebrow').textContent='COMPRESSION TERMINÉE';if($('#resultTitle'))$('#resultTitle').textContent='Votre archive est prête.';
    if($('#before'))$('#before').textContent=fmt(total);if($('#after'))$('#after').textContent=fmt(out.length);if($('#saving'))$('#saving').textContent=Math.max(0,(1-out.length/total)*100).toFixed(1)+' %';if($('#targetMetric'))$('#targetMetric').textContent=target?fmt(target):(currentProfile==='small'?'Plus petit':'Smart');
    const exactTarget=target?out.length<=target:null;
    if($('#status')){$('#status').className='status '+(target?(exactTarget?'good':'warn'):'good');$('#status').textContent=target?(exactTarget?'✓ Cible atteinte : l’archive est sous la taille demandée.':'⚠ Cible trop basse : même après compression maximale, cette taille n’est pas atteignable sans dégradation supplémentaire.'):(currentProfile==='small'?'✓ Compression maximale : plusieurs qualités et résolutions ont été testées.':'✓ Compression réelle appliquée localement.')}
    const hasVideo=currentFiles.some(f=>f.type?.startsWith('video')||/\.(mp4|mov|mkv|avi|webm)$/i.test(f.name));
    if($('#note'))$('#note').textContent=hasVideo?'Les images sont compressées au maximum dans le navigateur. Les vidéos restent intactes pour le moment : une vraie réduction vidéo nécessite FFmpeg.':'Les images sont compressées au maximum dans le navigateur puis archivées en ZIP. Aucun fichier n’est envoyé à un serveur.';
  };

  const originalUpdateTargetUI=window.updateTargetUI;
  if(typeof originalUpdateTargetUI==='function'){
    window.updateTargetUI=()=>{
      if(typeof vip!=='undefined'&&!vip){const input=$('#target'),range=$('#targetRange'),rangePct=$('#rangePct'),read=$('#targetRead');if(input)input.value='';if(range)range.value='100';if(rangePct)rangePct.textContent='100 %';if(read)read.innerHTML='Aucune cible précise en mode standard. <b>Smart</b> et <b>Plus petit</b> sont disponibles sans VIP.';return}
      originalUpdateTargetUI();
    };window.updateTargetUI();
  }
})();