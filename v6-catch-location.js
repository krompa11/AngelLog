(()=>{
  const q=s=>document.querySelector(s),prefs=()=>window.getAngelLogPreferences?.()||{};
  let applying=false,pro=false;

  async function getPro(){for(let i=0;i<20&&!window.angelLogHasProAccess;i++)await new Promise(r=>setTimeout(r,100));try{return !!(await window.angelLogHasProAccess?.())}catch{return false}}
  function syncLocationGate(){
    const wrap=q('#aaCatchLocationWrap'),cb=q('#aaShareCatchLocation'),badge=q('#aaCatchLocationPro'),vis=q('#aaCatchVisibility');if(!wrap||!cb)return;
    const isPublic=(vis?.value||prefs().default_catch_visibility||'public')==='public';
    cb.disabled=!pro||!isPublic;if(!pro||!isPublic)cb.checked=false;wrap.style.opacity=isPublic?'1':'.55';
    if(badge){badge.textContent=pro?'PRO aktiv':'PRO';badge.style.color=pro?'#61d000':'#f1d16c'}
  }
  function ensureLocationUi(){
    const sheet=q('#aaSheet'),save=q('#aaSaveCatch');if(!sheet||!save)return;let wrap=q('#aaCatchLocationWrap');
    if(!wrap){
      wrap=document.createElement('div');wrap.id='aaCatchLocationWrap';wrap.style.cssText='margin:10px 0 14px;padding:11px 12px;border:1px solid #48494a;border-radius:9px;background:#252627;color:#ddd';
      wrap.innerHTML=`<label id="aaCatchLocationLabel" style="display:flex;align-items:flex-start;gap:10px;cursor:pointer"><input id="aaShareCatchLocation" type="checkbox" style="width:18px;height:18px;margin-top:2px;accent-color:#61d000"><span style="flex:1"><b>📍 Fangort auf Karte teilen <em id="aaCatchLocationPro" style="font-style:normal;color:#f1d16c;font-size:11px;margin-left:5px">PRO</em></b><small style="display:block;color:#999;margin-top:4px;line-height:1.35">Nur mit AngelLog Pro und nur bei öffentlichen Fängen. Die genaue GPS-Position wird Pro-Mitgliedern auf der Fangortkarte angezeigt.</small></span></label>`;
      const photo=q('#aaCatchPhotoWrap');(photo||save).parentNode.insertBefore(wrap,photo||save);
      q('#aaCatchLocationLabel')?.addEventListener('click',async e=>{if(pro)return;e.preventDefault();await window.angelLogRequirePro?.('Fangorte auf der Karte')});
      const vis=q('#aaCatchVisibility');if(vis&&!vis.dataset.locationBound){vis.dataset.locationBound='1';vis.addEventListener('change',syncLocationGate)}
    }
    syncLocationGate()
  }
  function photoExtension(type){return type==='image/png'?'png':type==='image/webp'?'webp':'jpg'}
  async function uploadPhoto(file,visibility){
    if(!file)return null;if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Bitte JPG, PNG oder WebP auswählen.');if(file.size>8*1024*1024)throw new Error('Das Foto darf maximal 8 MB groß sein.');
    const bucket=visibility==='public'?'community-catch-photos':'catch-photos',rand=globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2),path=`${aaUser.id}/${Date.now()}-${rand}.${photoExtension(file.type)}`;
    const {error}=await sb.storage.from(bucket).upload(path,file,{cacheControl:'3600',contentType:file.type,upsert:false});if(error)throw error;
    return {bucket,path,photoUrl:visibility==='public'?(sb.storage.from(bucket).getPublicUrl(path).data?.publicUrl||null):null}
  }
  function currentGps(){return new Promise((resolve,reject)=>{if(!navigator.geolocation)return reject(new Error('Standortzugriff wird von diesem Gerät nicht unterstützt.'));navigator.geolocation.getCurrentPosition(p=>resolve({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy}),e=>reject(new Error(e?.message||'Standort konnte nicht bestimmt werden.')),{enableHighAccuracy:true,timeout:9000,maximumAge:60000})})}
  async function saveCatchWithLocation(){
    if(applying)return;if(!window.aaUser)return toast('Bitte zuerst anmelden.');const species=q('#aaSpecies')?.value.trim();if(!species)return toast('Fischart fehlt.');
    const length=+q('#aaLength')?.value||null,weight=+q('#aaWeight')?.value||null,bait=q('#aaBait')?.value.trim()||null,method=q('#aaMethod')?.value||null,pref=prefs(),visibility=q('#aaCatchVisibility')?.value||pref.default_catch_visibility||'public',waterId=window.aaCurrentWater?.id||null,waterName=window.aaCurrentWater?.name||null,file=q('#aaCatchPhoto')?.files?.[0]||null;
    let wantsLocation=visibility==='public'&&!!q('#aaShareCatchLocation')?.checked;if(wantsLocation&&!pro){if(!(await window.angelLogRequirePro?.('Fangorte auf der Karte')))return;pro=await getPro();if(!pro)return}
    const btn=q('#aaSaveCatch'),old=btn?.textContent||'Fang speichern';if(btn){btn.disabled=true;btn.textContent=wantsLocation?'Standort wird bestimmt …':(file?'Foto wird hochgeladen …':'Fang wird gespeichert …')}
    let uploaded=null,location=null,catchId=null,mapShared=false;applying=true;
    try{
      if(wantsLocation){try{location=await currentGps()}catch{toast('Standort nicht verfügbar – Fang wird ohne Fangort gespeichert.');wantsLocation=false}}
      if(btn)btn.textContent=file?'Foto wird hochgeladen …':'Fang wird gespeichert …';uploaded=await uploadPhoto(file,visibility);if(btn)btn.textContent='Fang wird gespeichert …';
      const {data:created,error}=await sb.from('catches').insert({user_id:aaUser.id,species,caught_on:new Date().toISOString().slice(0,10),length_cm:length,weight_kg:weight,bait,method,water_id:waterId,water_name:waterName,visibility,latitude:null,longitude:null,exact_location_shared:!!(wantsLocation&&location),photo_url:uploaded?.photoUrl||null,photo_bucket:uploaded?.bucket||null,photo_path:uploaded?.path||null}).select('id').single();
      if(error)throw error;catchId=created?.id||null;
      if(catchId&&wantsLocation&&location){
        const {error:locError}=await sb.from('catch_map_locations').insert({catch_id:catchId,user_id:aaUser.id,latitude:location.latitude,longitude:location.longitude,accuracy_m:location.accuracy||null});
        if(locError){await sb.from('catches').update({exact_location_shared:false}).eq('id',catchId);toast('Fang gespeichert, Fangort konnte aber nicht freigegeben werden.')}else mapShared=true
      }
      if(!mapShared)toast(visibility==='public'?'Fang veröffentlicht.':'Fang privat gespeichert.');else toast('Fang + Pro-Fangort veröffentlicht.');
      const photo=q('#aaCatchPhoto'),preview=q('#aaCatchPhotoPreview'),img=preview?.querySelector('img');if(photo)photo.value='';if(img?.dataset.url){URL.revokeObjectURL(img.dataset.url);delete img.dataset.url;img.removeAttribute('src')}if(preview)preview.style.display='none';if(q('#aaShareCatchLocation'))q('#aaShareCatchLocation').checked=false;
      closeAdd();if(waterId&&typeof window.loadIntel==='function')window.loadIntel(waterId);else if(waterId&&typeof loadIntel==='function')loadIntel(waterId);if(typeof loadFeed==='function')loadFeed();window.AngelLogCatchMap?.refresh?.()
    }catch(e){if(!catchId&&uploaded?.bucket&&uploaded?.path)try{await sb.storage.from(uploaded.bucket).remove([uploaded.path])}catch{}toast(e?.message||'Fang konnte nicht gespeichert werden.')}finally{applying=false;if(btn){btn.disabled=false;btn.textContent=old}}
  }
  function enhance(){ensureLocationUi();const save=q('#aaSaveCatch');if(save&&save.onclick!==saveCatchWithLocation)save.onclick=saveCatchWithLocation}
  const originalOpenAdd=window.openAdd;window.openAdd=function(){const r=originalOpenAdd?.apply(this,arguments);setTimeout(enhance,70);return r};
  async function updateAccess(){pro=await getPro();ensureLocationUi();syncLocationGate()}
  function boot(){enhance();updateAccess();q('#aaPlus')?.addEventListener('click',()=>setTimeout(enhance,90));q('#aaCheckinBtn')?.addEventListener('click',()=>setTimeout(enhance,120));setInterval(()=>{const sheet=q('#aaSheet');if(sheet&&!sheet.classList.contains('hidden'))enhance()},1200)}
  window.addEventListener('angelLog:entitlement',e=>{pro=!!e.detail?.isPro;syncLocationGate()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1300),{once:true});else setTimeout(boot,1300)
})();