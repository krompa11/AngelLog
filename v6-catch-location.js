(()=>{
  const q=s=>document.querySelector(s),prefs=()=>window.getAngelLogPreferences?.()||{};
  let applying=false,pro=false,selectedLocation=null,pickerMap=null,pickerMarker=null,pickerLayer=null;

  const SPECIES=[
    'Aal','Äsche','Aland','Bachforelle','Bachsaibling','Barbe','Bitterling','Brasse','Döbel','Elritze','Flussbarsch','Giebel','Gründling','Güster','Hasel','Hecht','Huchen','Karausche','Karpfen','Kaulbarsch','Lachs','Maifisch','Maräne','Meerforelle','Nase','Quappe','Rapfen','Regenbogenforelle','Rotauge','Rotfeder','Schleie','Schneider','Seeforelle','Seesaibling','Stint','Wels','Zander','Zährte','Zope','Zwergwels','Sonnenbarsch','Stör',
    'Dorsch / Kabeljau','Köhler / Seelachs','Pollack','Makrele','Hering','Hornhecht','Flunder','Scholle','Kliesche','Steinbutt','Heilbutt','Wolfsbarsch','Meeräsche','Goldbrasse / Dorade','Rotbarsch','Leng','Lumb','Seehecht','Schellfisch','Wittling','Sardine','Sardelle','Conger','Petermännchen','Seeteufel','Bonito','Blauflossen-Thunfisch','Gelbflossen-Thunfisch','Schwertfisch','Mahi-Mahi','Barrakuda',
    'Forellenbarsch (Largemouth Bass)','Smallmouth Bass','Striped Bass','Bluefish','Redfish / Red Drum','Snook','Tarpon','Bonefish','Permit','Grouper','Snapper','Channel Catfish','Flathead Catfish','Blue Catfish','Muskellunge','Walleye','Northern Pike','Crappie','Bluegill','Peacock Bass','Golden Dorado','Arapaima'
  ];
  const METHODS=['Spinning','Grund','Pose','Vertikal','Fliege','Köderfisch','Feedern','Jiggen','Dropshot','Brandungsangeln','Pilken','Bootsangeln','Schleppen','Sonstiges'];

  async function getPro(){for(let i=0;i<20&&!window.angelLogHasProAccess;i++)await new Promise(r=>setTimeout(r,100));try{return !!(await window.angelLogHasProAccess?.())}catch{return false}}
  function isPublic(){return (q('#aaCatchVisibility')?.value||prefs().default_catch_visibility||'public')==='public'}
  function fmtCoord(v){return Number(v).toFixed(5)}

  function ensureSpeciesUi(){
    const input=q('#aaSpecies');if(!input)return;
    let list=q('#aaSpeciesList');if(!list){list=document.createElement('datalist');list.id='aaSpeciesList';document.body.appendChild(list)}
    if(!list.dataset.ready){list.innerHTML=SPECIES.map(x=>`<option value="${String(x).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"></option>`).join('');list.dataset.ready='1'}
    input.setAttribute('list','aaSpeciesList');input.setAttribute('autocomplete','off');input.placeholder='Fischart suchen oder eingeben';
  }
  function ensureMethods(){
    const select=q('#aaMethod');if(!select)return;
    const current=select.value,known=new Set([...select.options].map(o=>o.value||o.textContent));
    METHODS.forEach(m=>{if(!known.has(m)){const o=document.createElement('option');o.value=m;o.textContent=m;select.appendChild(o)}});
    if(current)select.value=current;
  }

  function ensurePickerUi(){
    if(q('#aaCatchLocationPicker'))return;
    const overlay=document.createElement('div');overlay.id='aaCatchLocationPicker';overlay.style.cssText='display:none;position:fixed;inset:0;z-index:5000;background:rgba(8,9,10,.82);align-items:center;justify-content:center;padding:0';
    overlay.innerHTML=`<div style="width:min(540px,100vw);height:min(760px,100vh);background:#202122;display:flex;flex-direction:column;box-shadow:0 20px 70px rgba(0,0,0,.55)">
      <div style="display:flex;align-items:center;gap:10px;padding:14px 14px 10px;border-bottom:1px solid #414243"><button id="aaCatchPickerClose" type="button" style="border:0;background:#343536;color:#fff;border-radius:7px;padding:9px 12px">×</button><div style="flex:1"><b style="color:#fff">📍 Genauen Fangort markieren</b><small style="display:block;color:#999;margin-top:2px">Tippe auf die Karte oder verschiebe den Marker.</small></div></div>
      <div id="aaCatchPickerMap" style="flex:1;min-height:390px;background:#151617"></div>
      <div style="padding:12px;border-top:1px solid #414243;background:#252627"><div id="aaCatchPickerCoords" style="font-size:12px;color:#aaa;margin-bottom:10px">Noch kein Punkt gewählt.</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button id="aaCatchPickerGps" type="button" style="border:1px solid #555;background:#343536;color:#fff;border-radius:8px;padding:11px">⌖ Meine Position</button><button id="aaCatchPickerSave" type="button" style="border:0;background:#61d000;color:#fff;border-radius:8px;padding:11px;font-weight:800">Punkt übernehmen</button></div></div>
    </div>`;
    document.body.appendChild(overlay);
    q('#aaCatchPickerClose').onclick=closePicker;
    q('#aaCatchPickerGps').onclick=async()=>{const b=q('#aaCatchPickerGps'),old=b.textContent;b.disabled=true;b.textContent='Standort wird gesucht …';try{const p=await currentGps();setPickerPoint(p.latitude,p.longitude,p.accuracy,true)}catch(e){toast(e.message||'Standort nicht verfügbar.')}finally{b.disabled=false;b.textContent=old}};
    q('#aaCatchPickerSave').onclick=()=>{if(!pickerMarker)return toast('Bitte zuerst einen Punkt auf der Karte markieren.');const p=pickerMarker.getLatLng();selectedLocation={latitude:p.lat,longitude:p.lng,accuracy:null,source:'manual'};updateLocationSummary();const cb=q('#aaShareCatchLocation');if(cb)cb.checked=true;closePicker()};
  }
  function pickerCenter(){
    if(selectedLocation)return [selectedLocation.latitude,selectedLocation.longitude];
    const w=window.aaCurrentWater,lat=Number(w?.latitude),lng=Number(w?.longitude);if(Number.isFinite(lat)&&Number.isFinite(lng))return [lat,lng];
    try{const c=window.aaMap?.getCenter?.();if(c)return [c.lat,c.lng]}catch{}
    return [52.52,13.405]
  }
  function initPickerMap(){
    ensurePickerUi();if(pickerMap)return;
    const center=pickerCenter();pickerMap=L.map('aaCatchPickerMap',{zoomControl:true,attributionControl:true}).setView(center,15);
    pickerLayer=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(pickerMap);
    pickerMap.on('click',e=>setPickerPoint(e.latlng.lat,e.latlng.lng,null,false));
  }
  function setPickerPoint(lat,lng,accuracy=null,pan=false){
    if(!pickerMap)initPickerMap();
    if(!pickerMarker){pickerMarker=L.marker([lat,lng],{draggable:true}).addTo(pickerMap);pickerMarker.on('dragend',()=>{const p=pickerMarker.getLatLng();q('#aaCatchPickerCoords').textContent=`Markiert: ${fmtCoord(p.lat)}, ${fmtCoord(p.lng)}`})}else pickerMarker.setLatLng([lat,lng]);
    if(pan)pickerMap.setView([lat,lng],Math.max(16,pickerMap.getZoom()));
    const acc=Number.isFinite(Number(accuracy))?` · GPS ± ${Math.round(accuracy)} m`:'';q('#aaCatchPickerCoords').textContent=`Markiert: ${fmtCoord(lat)}, ${fmtCoord(lng)}${acc}`;
  }
  async function openPicker(){
    if(!pro){await window.angelLogRequirePro?.('Genauen Fangort markieren');return}
    if(!isPublic()){toast('Fangorte können nur bei öffentlichen Fängen geteilt werden.');return}
    ensurePickerUi();q('#aaCatchLocationPicker').style.display='flex';setTimeout(()=>{initPickerMap();pickerMap.invalidateSize();const c=pickerCenter();pickerMap.setView(c,selectedLocation?17:15);if(selectedLocation)setPickerPoint(selectedLocation.latitude,selectedLocation.longitude,selectedLocation.accuracy,false)},60)
  }
  function closePicker(){const el=q('#aaCatchLocationPicker');if(el)el.style.display='none'}
  function updateLocationSummary(){
    const el=q('#aaCatchLocationSummary');if(!el)return;
    if(!selectedLocation){el.textContent='Noch kein genauer Punkt gewählt.';el.style.color='#999';return}
    el.textContent=`✓ Fangpunkt gesetzt: ${fmtCoord(selectedLocation.latitude)}, ${fmtCoord(selectedLocation.longitude)}`;el.style.color='#77d638'
  }

  function syncLocationGate(){
    const wrap=q('#aaCatchLocationWrap'),cb=q('#aaShareCatchLocation'),badge=q('#aaCatchLocationPro');if(!wrap||!cb)return;
    const pub=isPublic();cb.disabled=!pro||!pub;if(!pro||!pub)cb.checked=false;wrap.style.opacity=pub?'1':'.55';
    q('#aaCatchPickBtn')?.toggleAttribute('disabled',!pro||!pub);q('#aaCatchGpsBtn')?.toggleAttribute('disabled',!pro||!pub);
    if(badge){badge.textContent=pro?'PRO aktiv':'PRO';badge.style.color=pro?'#61d000':'#f1d16c'}
  }
  function ensureLocationUi(){
    const sheet=q('#aaSheet'),save=q('#aaSaveCatch');if(!sheet||!save)return;let wrap=q('#aaCatchLocationWrap');
    if(!wrap){
      wrap=document.createElement('div');wrap.id='aaCatchLocationWrap';wrap.style.cssText='margin:10px 0 14px;padding:11px 12px;border:1px solid #48494a;border-radius:9px;background:#252627;color:#ddd';
      wrap.innerHTML=`<label id="aaCatchLocationLabel" style="display:flex;align-items:flex-start;gap:10px;cursor:pointer"><input id="aaShareCatchLocation" type="checkbox" style="width:18px;height:18px;margin-top:2px;accent-color:#61d000"><span style="flex:1"><b>📍 Genauen Fangort teilen <em id="aaCatchLocationPro" style="font-style:normal;color:#f1d16c;font-size:11px;margin-left:5px">PRO</em></b><small style="display:block;color:#999;margin-top:4px;line-height:1.35">Nur bei öffentlichen Fängen. Pro-Mitglieder können den freigegebenen Fangpunkt auf der Karte sehen.</small></span></label><div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px"><button id="aaCatchPickBtn" type="button" style="border:1px solid #565758;background:#343536;color:#fff;border-radius:7px;padding:9px">🗺 Auf Karte markieren</button><button id="aaCatchGpsBtn" type="button" style="border:1px solid #565758;background:#343536;color:#fff;border-radius:7px;padding:9px">⌖ Meine Position</button></div><small id="aaCatchLocationSummary" style="display:block;color:#999;margin-top:8px">Noch kein genauer Punkt gewählt.</small>`;
      const photo=q('#aaCatchPhotoWrap');(photo||save).parentNode.insertBefore(wrap,photo||save);
      q('#aaCatchLocationLabel')?.addEventListener('click',async e=>{if(pro)return;e.preventDefault();await window.angelLogRequirePro?.('Fangorte auf der Karte')});
      q('#aaShareCatchLocation')?.addEventListener('change',()=>{if(q('#aaShareCatchLocation').checked&&!selectedLocation)setTimeout(openPicker,30)});
      q('#aaCatchPickBtn').onclick=openPicker;
      q('#aaCatchGpsBtn').onclick=async()=>{if(!pro)return window.angelLogRequirePro?.('Fangorte auf der Karte');if(!isPublic())return toast('Fangorte können nur bei öffentlichen Fängen geteilt werden.');const b=q('#aaCatchGpsBtn'),old=b.textContent;b.disabled=true;b.textContent='Suche …';try{const p=await currentGps();selectedLocation={...p,source:'gps'};q('#aaShareCatchLocation').checked=true;updateLocationSummary()}catch(e){toast(e.message||'Standort nicht verfügbar.')}finally{b.disabled=false;b.textContent=old}};
      const vis=q('#aaCatchVisibility');if(vis&&!vis.dataset.locationBound){vis.dataset.locationBound='1';vis.addEventListener('change',syncLocationGate)}
    }
    updateLocationSummary();syncLocationGate()
  }

  function photoExtension(type){return type==='image/png'?'png':type==='image/webp'?'webp':'jpg'}
  async function uploadPhoto(file,visibility){
    if(!file)return null;if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Bitte JPG, PNG oder WebP auswählen.');if(file.size>8*1024*1024)throw new Error('Das Foto darf maximal 8 MB groß sein.');
    const user=window.aaUser;if(!user)throw new Error('Bitte zuerst anmelden.');const bucket=visibility==='public'?'community-catch-photos':'catch-photos',rand=globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2),path=`${user.id}/${Date.now()}-${rand}.${photoExtension(file.type)}`;
    const {error}=await sb.storage.from(bucket).upload(path,file,{cacheControl:'3600',contentType:file.type,upsert:false});if(error)throw error;
    return {bucket,path,photoUrl:visibility==='public'?(sb.storage.from(bucket).getPublicUrl(path).data?.publicUrl||null):null}
  }
  function currentGps(){return new Promise((resolve,reject)=>{if(!navigator.geolocation)return reject(new Error('Standortzugriff wird von diesem Gerät nicht unterstützt.'));navigator.geolocation.getCurrentPosition(p=>resolve({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy}),e=>reject(new Error(e?.message||'Standort konnte nicht bestimmt werden.')),{enableHighAccuracy:true,timeout:10000,maximumAge:30000})})}

  async function saveCatchWithLocation(){
    if(applying)return;const user=window.aaUser;if(!user)return toast('Bitte zuerst anmelden.');const species=q('#aaSpecies')?.value.trim();if(!species)return toast('Fischart fehlt.');
    const length=+q('#aaLength')?.value||null,weight=+q('#aaWeight')?.value||null,bait=q('#aaBait')?.value.trim()||null,method=q('#aaMethod')?.value||null,pref=prefs(),visibility=q('#aaCatchVisibility')?.value||pref.default_catch_visibility||'public',waterId=window.aaCurrentWater?.id||null,waterName=window.aaCurrentWater?.name||null,file=q('#aaCatchPhoto')?.files?.[0]||null;
    let wantsLocation=visibility==='public'&&!!q('#aaShareCatchLocation')?.checked;if(wantsLocation&&!pro){if(!(await window.angelLogRequirePro?.('Fangorte auf der Karte')))return;pro=await getPro();if(!pro)return}
    const btn=q('#aaSaveCatch'),old=btn?.textContent||'Fang speichern';if(btn){btn.disabled=true;btn.textContent=file?'Foto wird hochgeladen …':'Fang wird gespeichert …'}
    let uploaded=null,location=selectedLocation,catchId=null,mapShared=false;applying=true;
    try{
      if(wantsLocation&&!location){try{location=await currentGps();selectedLocation={...location,source:'gps'}}catch{toast('Kein Fangpunkt gewählt – Fang wird ohne öffentlichen Fangort gespeichert.');wantsLocation=false}}
      uploaded=await uploadPhoto(file,visibility);if(btn)btn.textContent='Fang wird gespeichert …';
      const {data:created,error}=await sb.from('catches').insert({user_id:user.id,species,caught_on:new Date().toISOString().slice(0,10),length_cm:length,weight_kg:weight,bait,method,water_id:waterId,water_name:waterName,visibility,latitude:null,longitude:null,exact_location_shared:!!(wantsLocation&&location),photo_url:uploaded?.photoUrl||null,photo_bucket:uploaded?.bucket||null,photo_path:uploaded?.path||null}).select('id').single();
      if(error)throw error;catchId=created?.id||null;
      if(catchId&&wantsLocation&&location){
        const {error:locError}=await sb.from('catch_map_locations').insert({catch_id:catchId,user_id:user.id,latitude:location.latitude,longitude:location.longitude,accuracy_m:location.accuracy||null});
        if(locError){await sb.from('catches').update({exact_location_shared:false}).eq('id',catchId);toast('Fang gespeichert, Fangort konnte aber nicht freigegeben werden.')}else mapShared=true
      }
      toast(mapShared?'Fang + genauer Pro-Fangort veröffentlicht.':(visibility==='public'?'Fang veröffentlicht.':'Fang privat gespeichert.'));
      const photo=q('#aaCatchPhoto'),preview=q('#aaCatchPhotoPreview'),img=preview?.querySelector('img');if(photo)photo.value='';if(img?.dataset.url){URL.revokeObjectURL(img.dataset.url);delete img.dataset.url;img.removeAttribute('src')}if(preview)preview.style.display='none';if(q('#aaShareCatchLocation'))q('#aaShareCatchLocation').checked=false;selectedLocation=null;updateLocationSummary();
      window.closeAdd?.();if(waterId&&typeof window.loadIntel==='function')window.loadIntel(waterId);else if(waterId&&typeof loadIntel==='function')loadIntel(waterId);if(typeof loadFeed==='function')loadFeed();window.AngelLogCatchMap?.refresh?.()
    }catch(e){if(!catchId&&uploaded?.bucket&&uploaded?.path)try{await sb.storage.from(uploaded.bucket).remove([uploaded.path])}catch{}toast(e?.message||'Fang konnte nicht gespeichert werden.')}finally{applying=false;if(btn){btn.disabled=false;btn.textContent=old}}
  }

  function enhance(){ensureSpeciesUi();ensureMethods();ensureLocationUi();const save=q('#aaSaveCatch');if(save&&save.onclick!==saveCatchWithLocation)save.onclick=saveCatchWithLocation}
  function resetForNewCatch(){selectedLocation=null;updateLocationSummary();const cb=q('#aaShareCatchLocation');if(cb)cb.checked=false}
  const originalOpenAdd=window.openAdd;if(typeof originalOpenAdd==='function'&&!originalOpenAdd.__exactPicker){const wrapped=function(){resetForNewCatch();const r=originalOpenAdd.apply(this,arguments);setTimeout(enhance,60);return r};wrapped.__exactPicker=true;window.openAdd=wrapped}
  async function updateAccess(){pro=await getPro();ensureLocationUi();syncLocationGate()}
  function boot(){enhance();updateAccess();q('#aaPlus')?.addEventListener('click',()=>setTimeout(enhance,80));q('#aaCheckinBtn')?.addEventListener('click',()=>setTimeout(enhance,100));setTimeout(enhance,1800)}
  window.addEventListener('angelLog:entitlement',e=>{pro=!!e.detail?.isPro;syncLocationGate()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1200),{once:true});else setTimeout(boot,1200)
})();