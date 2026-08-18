(()=>{
  const q=s=>document.querySelector(s),prefs=()=>window.getAngelLogPreferences?.()||{};
  let applying=false;

  function ensureLocationUi(){
    const sheet=q('#aaSheet'),save=q('#aaSaveCatch');if(!sheet||!save)return;
    let wrap=q('#aaCatchLocationWrap');
    if(!wrap){
      wrap=document.createElement('div');wrap.id='aaCatchLocationWrap';wrap.style.cssText='margin:10px 0 14px;padding:11px 12px;border:1px solid #48494a;border-radius:9px;background:#252627;color:#ddd';
      wrap.innerHTML=`<label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer"><input id="aaShareCatchLocation" type="checkbox" style="width:18px;height:18px;margin-top:2px;accent-color:#61d000"><span><b>📍 Fangort auf Karte teilen</b><small style="display:block;color:#999;margin-top:4px;line-height:1.35">Nur bei einem öffentlichen Fang. Die genaue GPS-Position wird anderen AngelLog-Nutzern angezeigt.</small></span></label>`;
      const photo=q('#aaCatchPhotoWrap');(photo||save).parentNode.insertBefore(wrap,photo||save)
    }
    const cb=q('#aaShareCatchLocation'),vis=q('#aaCatchVisibility');
    if(cb&&!cb.dataset.initialized){cb.checked=!!prefs().share_exact_location;cb.dataset.initialized='1'}
    const sync=()=>{if(!cb)return;const isPublic=(vis?.value||prefs().default_catch_visibility||'public')==='public';cb.disabled=!isPublic;if(!isPublic)cb.checked=false;else if(cb.dataset.wasPrivate==='1'){cb.checked=!!prefs().share_exact_location;cb.dataset.wasPrivate='0'};if(!isPublic)cb.dataset.wasPrivate='1';wrap.style.opacity=isPublic?'1':'.55'};
    if(vis&&!vis.dataset.locationBound){vis.dataset.locationBound='1';vis.addEventListener('change',sync)}sync()
  }

  function photoExtension(type){return type==='image/png'?'png':type==='image/webp'?'webp':'jpg'}
  async function uploadPhoto(file,visibility){
    if(!file)return null;if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Bitte JPG, PNG oder WebP auswählen.');if(file.size>8*1024*1024)throw new Error('Das Foto darf maximal 8 MB groß sein.');
    const bucket=visibility==='public'?'community-catch-photos':'catch-photos',rand=globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2),path=`${aaUser.id}/${Date.now()}-${rand}.${photoExtension(file.type)}`;
    const {error}=await sb.storage.from(bucket).upload(path,file,{cacheControl:'3600',contentType:file.type,upsert:false});if(error)throw error;
    return {bucket,path,photoUrl:visibility==='public'?(sb.storage.from(bucket).getPublicUrl(path).data?.publicUrl||null):null}
  }

  function currentGps(){
    return new Promise((resolve,reject)=>{
      if(!navigator.geolocation)return reject(new Error('Standortzugriff wird von diesem Gerät nicht unterstützt.'));
      navigator.geolocation.getCurrentPosition(p=>resolve({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy}),e=>reject(new Error(e?.message||'Standort konnte nicht bestimmt werden.')),{enableHighAccuracy:true,timeout:9000,maximumAge:60000})
    })
  }

  async function saveCatchWithLocation(){
    if(applying)return;if(!window.aaUser)return toast('Bitte zuerst anmelden.');
    const species=q('#aaSpecies')?.value.trim();if(!species)return toast('Fischart fehlt.');
    const length=+q('#aaLength')?.value||null,weight=+q('#aaWeight')?.value||null,bait=q('#aaBait')?.value.trim()||null,method=q('#aaMethod')?.value||null;
    const pref=prefs(),visibility=q('#aaCatchVisibility')?.value||pref.default_catch_visibility||'public',waterId=window.aaCurrentWater?.id||null,waterName=window.aaCurrentWater?.name||null,file=q('#aaCatchPhoto')?.files?.[0]||null;
    const wantsLocation=visibility==='public'&&!!q('#aaShareCatchLocation')?.checked;
    const btn=q('#aaSaveCatch'),old=btn?.textContent||'Fang speichern';if(btn){btn.disabled=true;btn.textContent=wantsLocation?'Standort wird bestimmt …':(file?'Foto wird hochgeladen …':'Fang wird gespeichert …')}
    let uploaded=null,location=null,exactLocationShared=false;applying=true;
    try{
      if(wantsLocation){try{location=await currentGps();exactLocationShared=true}catch(e){toast('Standort nicht verfügbar – Fang wird ohne Kartenposition gespeichert.')}}
      if(btn)btn.textContent=file?'Foto wird hochgeladen …':'Fang wird gespeichert …';uploaded=await uploadPhoto(file,visibility);if(btn)btn.textContent='Fang wird gespeichert …';
      const {error}=await sb.from('catches').insert({user_id:aaUser.id,species,caught_on:new Date().toISOString().slice(0,10),length_cm:length,weight_kg:weight,bait,method,water_id:waterId,water_name:waterName,visibility,latitude:location?.latitude||null,longitude:location?.longitude||null,exact_location_shared:exactLocationShared,photo_url:uploaded?.photoUrl||null,photo_bucket:uploaded?.bucket||null,photo_path:uploaded?.path||null});
      if(error)throw error;
      toast(visibility==='public'?(exactLocationShared?'Fang + Fangort veröffentlicht.':'Fang veröffentlicht.'):'Fang privat gespeichert.');
      const photo=q('#aaCatchPhoto'),preview=q('#aaCatchPhotoPreview'),img=preview?.querySelector('img');if(photo)photo.value='';if(img?.dataset.url){URL.revokeObjectURL(img.dataset.url);delete img.dataset.url;img.removeAttribute('src')}if(preview)preview.style.display='none';
      if(q('#aaShareCatchLocation')){q('#aaShareCatchLocation').checked=!!prefs().share_exact_location;q('#aaShareCatchLocation').dataset.initialized='1'}
      closeAdd();if(waterId&&typeof window.loadIntel==='function')window.loadIntel(waterId);else if(waterId&&typeof loadIntel==='function')loadIntel(waterId);if(typeof loadFeed==='function')loadFeed();window.AngelLogCatchMap?.refresh?.()
    }catch(e){
      if(uploaded?.bucket&&uploaded?.path)try{await sb.storage.from(uploaded.bucket).remove([uploaded.path])}catch{}toast(e?.message||'Fang konnte nicht gespeichert werden.')
    }finally{applying=false;if(btn){btn.disabled=false;btn.textContent=old}}
  }

  function enhance(){ensureLocationUi();const save=q('#aaSaveCatch');if(save&&save.onclick!==saveCatchWithLocation)save.onclick=saveCatchWithLocation}
  const originalOpenAdd=window.openAdd;window.openAdd=function(){const r=originalOpenAdd?.apply(this,arguments);setTimeout(enhance,70);return r};
  function boot(){enhance();q('#aaPlus')?.addEventListener('click',()=>setTimeout(enhance,90));q('#aaCheckinBtn')?.addEventListener('click',()=>setTimeout(enhance,120));setInterval(()=>{const sheet=q('#aaSheet');if(sheet&&!sheet.classList.contains('hidden'))enhance()},1200)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1300),{once:true});else setTimeout(boot,1300)
})();
