(()=>{
  let osmMarkers=[],timer=null,lastKey='';
  const status=()=>{let el=document.getElementById('aaWaterLoadStatus');if(el)return el;const map=document.getElementById('aaMap');if(!map)return null;el=document.createElement('div');el.id='aaWaterLoadStatus';el.style.cssText='position:absolute;left:14px;bottom:86px;z-index:700;background:rgba(35,35,35,.86);color:#ddd;padding:7px 10px;border-radius:6px;font-size:12px;pointer-events:none';map.parentElement.appendChild(el);return el};
  function clear(){osmMarkers.forEach(m=>{try{m.remove()}catch{}});osmMarkers=[]}
  function waterIcon(){return L.divIcon({className:'',html:'<div style="width:34px;height:42px;position:relative"><div style="position:absolute;left:2px;top:0;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#0799cf;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div><div style="position:absolute;left:8px;top:7px;width:18px;height:18px;display:grid;place-items:center;color:white;font-size:18px;font-weight:700;transform:rotate(0deg)">≋</div></div>',iconSize:[34,42],iconAnchor:[17,40],popupAnchor:[0,-38]})}
  function schedule(){clearTimeout(timer);timer=setTimeout(loadVisible,450)}
  async function loadVisible(){
    if(typeof aaMap==='undefined'||!aaMap)return;
    const z=aaMap.getZoom(),el=status();
    if(z<9){clear();if(el)el.textContent='Zoome näher heran, um Gewässer anzuzeigen.';return}
    const b=aaMap.getBounds(),key=[z,b.getSouth().toFixed(3),b.getWest().toFixed(3),b.getNorth().toFixed(3),b.getEast().toFixed(3)].join('|');
    if(key===lastKey)return;lastKey=key;
    if(el)el.textContent='Gewässer werden geladen …';
    try{
      const u=`/api/osm-waters?s=${b.getSouth()}&w=${b.getWest()}&n=${b.getNorth()}&e=${b.getEast()}`;
      const r=await fetch(u,{cache:'no-store'}),d=await r.json();
      if(!r.ok)throw new Error(d.error||('HTTP '+r.status));
      clear();
      for(const w of d.waters||[]){
        const m=L.marker([w.latitude,w.longitude],{icon:waterIcon(),keyboard:false}).addTo(aaMap);
        m.bindPopup(`<div style="min-width:180px"><b style="font-size:16px">${esc(w.name)}</b><div style="margin-top:4px;color:#777">${esc(w.water_type||'Gewässer')}</div><button style="margin-top:9px;width:100%;border:0;border-radius:5px;padding:8px;background:#58c900;color:white" onclick='aaOpenOsmWater(${JSON.stringify(JSON.stringify(w))})'>Gewässer öffnen</button></div>`);
        osmMarkers.push(m);
      }
      if(el)el.textContent=`${(d.waters||[]).length} Gewässer im Kartenausschnitt`;
    }catch(err){if(el)el.textContent='Gewässer konnten gerade nicht geladen werden.';console.error(err)}
  }
  window.aaOpenOsmWater=async raw=>{
    let w;try{w=typeof raw==='string'?JSON.parse(raw):raw}catch{return}
    try{
      const q=await sb.from('waters').select('id').eq('source_key',w.source_key).maybeSingle();
      if(q.data?.id)return openWater(q.data.id);
      if(!aaUser){toast('Zum Öffnen als AngelLog-Gewässer bitte anmelden.');return}
      const row={source_key:w.source_key,name:w.name,water_type:w.water_type,latitude:w.latitude,longitude:w.longitude,website:w.website||null,association:w.operator||null,source_name:'OpenStreetMap',source_license:'ODbL',created_by:aaUser.id};
      const ins=await sb.from('waters').upsert(row,{onConflict:'source_key'}).select('id').single();
      if(ins.error)return toast(ins.error.message);
      openWater(ins.data.id);
    }catch(e){toast('Gewässerprofil konnte nicht geöffnet werden.')}
  };
  function bind(){
    if(typeof aaMap==='undefined'||!aaMap)return setTimeout(bind,150);
    aaMap.on('moveend zoomend',schedule);
    loadVisible();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(bind,250));else setTimeout(bind,250);
})();
