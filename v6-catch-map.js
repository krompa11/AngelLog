(()=>{
  const q=s=>document.querySelector(s),safe=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  let markers=[],rows=[],panel=null,button=null,select=null,countEl=null,statusEl=null,enabled=true,token=0,timer=null,boundMap=null;

  function addStyles(){
    if(q('#aaCatchMapStyles'))return;
    const s=document.createElement('style');s.id='aaCatchMapStyles';s.textContent=`
      .aa-catch-map-control{position:absolute;z-index:745;left:12px;top:12px;display:flex;flex-direction:column;align-items:flex-start;gap:7px;pointer-events:auto}
      .aa-catch-map-btn{border:1px solid #505253;background:rgba(31,32,33,.95);color:#fff;border-radius:999px;min-height:40px;padding:0 13px;font-weight:800;font-size:13px;box-shadow:0 8px 22px rgba(0,0,0,.28);cursor:pointer}.aa-catch-map-btn.active{border-color:#61d000;box-shadow:0 0 0 2px rgba(97,208,0,.18),0 8px 22px rgba(0,0,0,.28)}
      .aa-catch-map-panel{width:min(280px,calc(100vw - 32px));background:rgba(31,32,33,.98);border:1px solid #4d4f50;border-radius:12px;padding:11px;box-shadow:0 16px 35px rgba(0,0,0,.42)}.aa-catch-map-panel.hidden{display:none!important}
      .aa-catch-map-panel label{display:block;color:#aaa;font-size:11px;text-transform:uppercase;letter-spacing:1.2px;margin:0 0 6px}.aa-catch-map-panel select{width:100%;height:42px;border:1px solid #555;background:#272829;color:#fff;border-radius:8px;padding:0 10px;font-size:14px}
      .aa-catch-map-toggle{display:flex;align-items:center;gap:9px;margin-top:10px;color:#ddd;font-size:13px}.aa-catch-map-toggle input{accent-color:#61d000;width:17px;height:17px}.aa-catch-map-status{margin-top:9px;color:#969798;font-size:11px;line-height:1.35}
      .aa-catch-pin{width:34px;height:34px;border-radius:50% 50% 50% 7px;transform:rotate(-45deg);background:#61d000;border:2px solid #151515;display:grid;place-items:center;box-shadow:0 3px 10px rgba(0,0,0,.45)}.aa-catch-pin span{transform:rotate(45deg);font-size:16px;line-height:1}
      .aa-catch-popup{min-width:190px;color:#222}.aa-catch-popup b{font-size:16px}.aa-catch-popup .meta{margin-top:4px;font-size:12px;color:#555;line-height:1.4}.aa-catch-popup img{display:block;width:100%;max-height:130px;object-fit:cover;border-radius:7px;margin:7px 0}.aa-catch-popup .shared{font-size:10px;color:#6b6b6b;margin-top:7px}
    `;document.head.appendChild(s)
  }

  function clearMarkers(){markers.forEach(m=>{try{m.remove()}catch{}});markers=[]}
  function icon(){return L.divIcon({className:'',html:'<div class="aa-catch-pin"><span>🐟</span></div>',iconSize:[36,40],iconAnchor:[18,37],popupAnchor:[0,-34]})}
  function fmtDate(v){if(!v)return'';try{return new Date(v+'T12:00:00').toLocaleDateString('de-DE')}catch{return String(v)}}

  function render(){
    const map=window.aaMap;if(!map)return;clearMarkers();
    if(!enabled){if(countEl)countEl.textContent='aus';return}
    const species=select?.value||'';
    const visible=rows.filter(r=>!species||String(r.species||'')===species);
    for(const c of visible){
      const lat=Number(c.latitude),lng=Number(c.longitude);if(!Number.isFinite(lat)||!Number.isFinite(lng))continue;
      const popup=`<div class="aa-catch-popup">${c.photo_url?`<img src="${safe(c.photo_url)}" alt="Fang">`:''}<b>🐟 ${safe(c.species||'Fang')}</b><div class="meta">${c.length_cm?`${safe(c.length_cm)} cm`:''}${c.weight_kg?`${c.length_cm?' · ':''}${safe(c.weight_kg)} kg`:''}${c.water_name?`<br>${safe(c.water_name)}`:''}${c.caught_on?`<br>${safe(fmtDate(c.caught_on))}`:''}${c.method?`<br>Methode: ${safe(c.method)}`:''}${c.bait?`<br>Köder: ${safe(c.bait)}`:''}</div><div class="shared">Genauer Fangort vom Angler freigegeben.</div></div>`;
      const m=L.marker([lat,lng],{icon:icon(),zIndexOffset:700}).addTo(map).bindPopup(popup,{maxWidth:260});markers.push(m)
    }
    if(countEl)countEl.textContent=String(visible.length);
    if(statusEl)statusEl.textContent=rows.length?`${visible.length} von ${rows.length} freigegebenen Fangorten im Kartenausschnitt.`:'In diesem Kartenausschnitt wurden noch keine genauen Fangorte freigegeben.'
  }

  function syncSpecies(){
    if(!select)return;const current=select.value;
    const names=[...new Set(rows.map(r=>String(r.species||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'de'));
    select.innerHTML='<option value="">Alle Fischarten</option>'+names.map(n=>`<option value="${safe(n)}">${safe(n)}</option>`).join('');
    if(names.includes(current))select.value=current
  }

  async function refresh(){
    const map=window.aaMap;if(!map||!enabled)return;
    clearTimeout(timer);timer=setTimeout(async()=>{
      if(!enabled)return;
      if(map.getZoom()<7){rows=[];syncSpecies();clearMarkers();if(countEl)countEl.textContent='0';if(statusEl)statusEl.textContent='Für Fangorte bitte näher heranzoomen.';return}
      const b=map.getBounds(),myToken=++token;
      if(statusEl)statusEl.textContent='Fangorte werden geladen …';
      try{
        const {data,error}=await sb.from('catches').select('id,species,caught_on,length_cm,weight_kg,bait,method,water_name,latitude,longitude,photo_url').eq('visibility','public').eq('exact_location_shared',true).not('latitude','is',null).not('longitude','is',null).gte('latitude',b.getSouth()).lte('latitude',b.getNorth()).gte('longitude',b.getWest()).lte('longitude',b.getEast()).order('created_at',{ascending:false}).limit(500);
        if(myToken!==token)return;if(error)throw error;rows=data||[];syncSpecies();render()
      }catch(e){if(myToken!==token)return;rows=[];clearMarkers();if(countEl)countEl.textContent='0';if(statusEl)statusEl.textContent='Fangorte konnten gerade nicht geladen werden.'}
    },180)
  }

  function ensureUi(){
    if(button)return;const host=q('.aa-map-screen');if(!host)return;addStyles();
    const wrap=document.createElement('div');wrap.className='aa-catch-map-control';wrap.innerHTML=`<button id="aaCatchMapBtn" class="aa-catch-map-btn active" type="button">🐟 Fangorte <span id="aaCatchMapCount">0</span></button><div id="aaCatchMapPanel" class="aa-catch-map-panel hidden"><label for="aaCatchSpeciesFilter">Nach Fischart filtern</label><select id="aaCatchSpeciesFilter"><option value="">Alle Fischarten</option></select><label class="aa-catch-map-toggle"><input id="aaCatchMapEnabled" type="checkbox" checked> Fangorte auf Karte anzeigen</label><div id="aaCatchMapStatus" class="aa-catch-map-status">Fangorte werden geladen …</div></div>`;host.appendChild(wrap);
    button=q('#aaCatchMapBtn');panel=q('#aaCatchMapPanel');select=q('#aaCatchSpeciesFilter');countEl=q('#aaCatchMapCount');statusEl=q('#aaCatchMapStatus');
    button.onclick=e=>{e.preventDefault();e.stopPropagation();panel.classList.toggle('hidden')};
    select.onchange=render;
    q('#aaCatchMapEnabled').onchange=e=>{enabled=!!e.target.checked;button.classList.toggle('active',enabled);if(enabled)refresh();else{clearMarkers();if(countEl)countEl.textContent='aus';if(statusEl)statusEl.textContent='Fangorte sind ausgeblendet.'}};
    wrap.addEventListener('click',e=>e.stopPropagation());
    document.addEventListener('click',e=>{if(panel&&!panel.classList.contains('hidden')&&!wrap.contains(e.target))panel.classList.add('hidden')});
  }

  function boot(){
    ensureUi();const map=window.aaMap;if(!map){setTimeout(boot,150);return}
    if(boundMap!==map){boundMap=map;map.on('moveend zoomend',refresh)}
    refresh()
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1100),{once:true});else setTimeout(boot,1100);
  window.AngelLogCatchMap={refresh,render,get enabled(){return enabled}}
})();
