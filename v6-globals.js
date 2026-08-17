(()=>{
  try{Object.defineProperty(window,'aaUser',{configurable:true,get:()=>aaUser,set:v=>{aaUser=v}})}catch{}
  try{Object.defineProperty(window,'aaCurrentWater',{configurable:true,get:()=>aaCurrentWater,set:v=>{aaCurrentWater=v}})}catch{}
  try{Object.defineProperty(window,'aaMap',{configurable:true,get:()=>aaMap})}catch{}
  window.setAngelLogMapStyle=style=>{try{aaLayer=style==='satellite'?'sat':'osm';setBaseLayer()}catch{}};
  window.getAngelLogMapStyle=()=>{try{return aaLayer==='sat'?'satellite':'osm'}catch{return'osm'}};

  function tidyNavigation(){
    try{
      const conditionMenu=[...document.querySelectorAll('.aa-menu button')].find(b=>b.dataset.screen==='aaConditionsScreen'||/Angelbedingungen/i.test(b.textContent));
      conditionMenu?.remove();
      const conditionBottom=document.querySelector('.aa-bottomnav button[data-screen="aaConditionsScreen"]');
      if(conditionBottom){conditionBottom.dataset.screen='aaForumScreen';conditionBottom.innerHTML='<span>◌</span>Forum'}
      document.querySelector('#aaConditionsScreen')?.remove();
    }catch{}
  }
  tidyNavigation();
  document.addEventListener('DOMContentLoaded',tidyNavigation,{once:true});

  function syncCatchWaterLabel(){
    try{
      const sheet=document.querySelector('#aaSheet');if(!sheet)return;
      let box=document.querySelector('#aaCatchWaterBox');
      if(!box){
        box=document.createElement('div');box.id='aaCatchWaterBox';
        box.style.cssText='margin:8px 0 14px;padding:11px 12px;border-radius:8px;background:#252627;border:1px solid #48494a;color:#bbb;font-size:13px';
        sheet.querySelector('h2')?.insertAdjacentElement('afterend',box)
      }
      const w=window.aaCurrentWater;
      box.innerHTML=w?`<span style="color:#8c8c8c">Gewässer</span><br><b style="color:#fff;font-size:16px">≋ ${esc(w.name||'Gewässer')}</b>`:'<span style="color:#999">Kein Gewässer ausgewählt</span>'
    }catch{}
  }

  function ensureCatchPhotoUi(){
    const sheet=document.querySelector('#aaSheet'),save=document.querySelector('#aaSaveCatch');
    if(!sheet||!save)return;
    const method=document.querySelector('#aaMethod');
    if(method){
      const values=[...method.options].map(o=>o.value||o.textContent);
      const before=[...method.options].find(o=>/Sonstiges/i.test(o.textContent));
      for(const name of ['Köderfisch','Feedern']){
        if(values.includes(name))continue;
        const option=document.createElement('option');option.textContent=name;option.value=name;
        if(before)method.insertBefore(option,before);else method.appendChild(option)
      }
    }
    if(document.querySelector('#aaCatchPhoto'))return;
    const wrap=document.createElement('div');wrap.id='aaCatchPhotoWrap';wrap.style.cssText='margin:12px 0 14px';
    wrap.innerHTML=`<label for="aaCatchPhoto" style="display:block;border:1px dashed #5a5b5c;border-radius:9px;padding:13px;background:#252627;color:#fff;cursor:pointer"><b>📷 Fangfoto aufnehmen / auswählen</b><small style="display:block;color:#999;margin-top:4px">JPG, PNG oder WebP · maximal 8 MB</small></label><input id="aaCatchPhoto" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" style="display:none"><div id="aaCatchPhotoPreview" style="display:none;margin-top:10px;position:relative"><img alt="Fangfoto Vorschau" style="display:block;width:100%;max-height:260px;object-fit:cover;border-radius:9px"><button id="aaCatchPhotoRemove" type="button" style="position:absolute;right:8px;top:8px;border:0;border-radius:999px;background:rgba(0,0,0,.75);color:#fff;width:34px;height:34px;font-size:20px">×</button></div>`;
    save.parentNode.insertBefore(wrap,save);
    const input=document.querySelector('#aaCatchPhoto'),preview=document.querySelector('#aaCatchPhotoPreview'),img=preview?.querySelector('img');
    input?.addEventListener('change',()=>{
      const file=input.files?.[0];
      if(!file){if(preview)preview.style.display='none';return}
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)){toast('Bitte JPG, PNG oder WebP auswählen.');input.value='';return}
      if(file.size>8*1024*1024){toast('Das Foto darf maximal 8 MB groß sein.');input.value='';return}
      if(img){if(img.dataset.url)URL.revokeObjectURL(img.dataset.url);const url=URL.createObjectURL(file);img.dataset.url=url;img.src=url}
      if(preview)preview.style.display='block'
    });
    document.querySelector('#aaCatchPhotoRemove')?.addEventListener('click',()=>{
      if(input)input.value='';if(img?.dataset.url){URL.revokeObjectURL(img.dataset.url);delete img.dataset.url;img.removeAttribute('src')}if(preview)preview.style.display='none'
    })
  }

  function photoExtension(type){return type==='image/png'?'png':type==='image/webp'?'webp':'jpg'}
  async function uploadCatchPhoto(file,visibility){
    if(!file)return null;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Bitte JPG, PNG oder WebP auswählen.');
    if(file.size>8*1024*1024)throw new Error('Das Foto darf maximal 8 MB groß sein.');
    const bucket=visibility==='public'?'community-catch-photos':'catch-photos';
    const rand=globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2);
    const path=`${aaUser.id}/${Date.now()}-${rand}.${photoExtension(file.type)}`;
    const {error}=await sb.storage.from(bucket).upload(path,file,{cacheControl:'3600',contentType:file.type,upsert:false});
    if(error)throw error;
    let photoUrl=null;
    if(visibility==='public')photoUrl=sb.storage.from(bucket).getPublicUrl(path).data?.publicUrl||null;
    return {bucket,path,photoUrl}
  }

  async function saveCatchWithPhoto(){
    if(!window.aaUser)return toast('Bitte zuerst anmelden.');
    const species=document.querySelector('#aaSpecies')?.value.trim();if(!species)return toast('Fischart fehlt.');
    const length=+document.querySelector('#aaLength')?.value||null,weight=+document.querySelector('#aaWeight')?.value||null;
    const bait=document.querySelector('#aaBait')?.value.trim()||null,method=document.querySelector('#aaMethod')?.value||null;
    const pref=window.getAngelLogPreferences?.()||{},visibility=document.querySelector('#aaCatchVisibility')?.value||pref.default_catch_visibility||'public';
    const waterId=window.aaCurrentWater?.id||null,waterName=window.aaCurrentWater?.name||null,file=document.querySelector('#aaCatchPhoto')?.files?.[0]||null;
    const btn=document.querySelector('#aaSaveCatch'),old=btn?.textContent||'Fang speichern';if(btn){btn.disabled=true;btn.textContent=file?'Foto wird hochgeladen …':'Fang wird gespeichert …'}
    let uploaded=null;
    try{
      uploaded=await uploadCatchPhoto(file,visibility);
      if(btn)btn.textContent='Fang wird gespeichert …';
      const {error}=await sb.from('catches').insert({user_id:aaUser.id,species,caught_on:new Date().toISOString().slice(0,10),length_cm:length,weight_kg:weight,bait,method,water_id:waterId,water_name:waterName,visibility,photo_url:uploaded?.photoUrl||null,photo_bucket:uploaded?.bucket||null,photo_path:uploaded?.path||null});
      if(error)throw error;
      toast(visibility==='public'?'Fang veröffentlicht.':'Fang privat gespeichert.');
      const photo=document.querySelector('#aaCatchPhoto'),preview=document.querySelector('#aaCatchPhotoPreview'),img=preview?.querySelector('img');
      if(photo)photo.value='';if(img?.dataset.url){URL.revokeObjectURL(img.dataset.url);delete img.dataset.url;img.removeAttribute('src')}if(preview)preview.style.display='none';
      closeAdd();
      if(waterId&&typeof window.loadIntel==='function')window.loadIntel(waterId);else if(waterId&&typeof loadIntel==='function')loadIntel(waterId);
      if(typeof loadFeed==='function')loadFeed()
    }catch(e){
      if(uploaded?.bucket&&uploaded?.path)try{await sb.storage.from(uploaded.bucket).remove([uploaded.path])}catch{}
      toast(e?.message||'Fang konnte nicht gespeichert werden.')
    }finally{if(btn){btn.disabled=false;btn.textContent=old}}
  }

  function enhanceCatchForm(){
    ensureCatchPhotoUi();
    const save=document.querySelector('#aaSaveCatch');if(save)save.onclick=saveCatchWithPhoto
  }

  const baseOpenAdd=window.openAdd;
  window.openAdd=function(){
    if(!window.aaUser)return toast('Bitte zuerst anmelden.');
    syncCatchWaterLabel();
    ensureCatchPhotoUi();
    return baseOpenAdd?.()
  };

  window.checkin=async function(){
    if(!window.aaUser)return toast('Bitte zuerst anmelden.');
    const w=window.aaCurrentWater;if(!w)return toast('Bitte zuerst ein Gewässer auswählen.');
    const btn=document.querySelector('#aaCheckinBtn');if(btn)btn.disabled=true;
    try{
      const {error}=await sb.from('water_checkins').insert({water_id:w.id,user_id:aaUser.id});
      if(error)toast('Check-in konnte nicht gespeichert werden. Fangformular wird geöffnet.');
      else toast('Check-in gespeichert. Fang eintragen …');
    }catch{toast('Fangformular wird geöffnet.')}
    syncCatchWaterLabel();
    ensureCatchPhotoUi();
    window.openAdd();
    if(btn)btn.disabled=false
  };

  document.addEventListener('DOMContentLoaded',()=>{
    const btn=document.querySelector('#aaCheckinBtn');
    if(btn){btn.onclick=window.checkin;btn.title='Check-in speichern und Fang an diesem Gewässer posten'}
    document.querySelector('#aaPlus')?.addEventListener('click',()=>setTimeout(()=>{syncCatchWaterLabel();enhanceCatchForm()},30));
    setTimeout(enhanceCatchForm,180)
  },{once:true});

  function loadFeature(src,delay){
    setTimeout(()=>{
      if(document.querySelector(`script[src="${src}"]`))return;
      const s=document.createElement('script');s.src=src;s.async=false;document.body.appendChild(s)
    },delay)
  }
  loadFeature('/v6-user-moderation.js',450);
  loadFeature('/v6-notifications-appeals.js',650);
  loadFeature('/v6-settings.js',850)
})();