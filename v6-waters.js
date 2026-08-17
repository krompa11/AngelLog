(()=>{
  let osmMarkers=[],timer=null,lastKey='';
  const cache=new Map();
  const status=()=>{let el=document.getElementById('aaWaterLoadStatus');if(el)return el;const map=document.getElementById('aaMap');if(!map)return null;el=document.createElement('div');el.id='aaWaterLoadStatus';el.style.cssText='position:absolute;left:14px;bottom:86px;z-index:700;background:rgba(35,35,35,.86);color:#ddd;padding:7px 10px;border-radius:6px;font-size:12px;pointer-events:none';map.parentElement.appendChild(el);return el};
  function clear(){osmMarkers.forEach(m=>{try{m.remove()}catch{}});osmMarkers=[]}
  function waterIcon(){return L.divIcon({className:'',html:'<div style="width:34px;height:42px;position:relative"><div style="position:absolute;left:2px;top:0;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#0799cf;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div><div style="position:absolute;left:8px;top:7px;width:18px;height:18px;display:grid;place-items:center;color:white;font-size:18px;font-weight:700">≋</div></div>',iconSize:[34,42],iconAnchor:[17,40],popupAnchor:[0,-38]})}
  function schedule(){clearTimeout(timer);timer=setTimeout(loadVisible,350)}
  function tilesForBounds(b){
    const s=b.getSouth(),n=b.getNorth(),w=b.getWest(),e=b.getEast(),my=(s+n)/2,mx=(w+e)/2;
    return [[s,w,my,mx],[s,mx,my,e],[my,w,n,mx],[my,mx,n,e]];
  }
  async function fetchTile(t){
    const key=t.map(x=>x.toFixed(3)).join('|');
    if(cache.has(key))return cache.get(key);
    const [s,w,n,e]=t,u=`/api/osm-waters?s=${s}&w=${w}&n=${n}&e=${e}`;
    const p=fetch(u,{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||('HTTP '+r.status));return d.waters||[]}).catch(()=>[]);
    cache.set(key,p);
    return p;
  }
  function renderWaters(waters){
    clear();
    for(const w of waters){
      const m=L.marker([w.latitude,w.longitude],{icon:waterIcon(),keyboard:false}).addTo(aaMap);
      m.bindPopup(`<div style="min-width:180px"><b style="font-size:16px">${esc(w.name)}</b><div style="margin-top:4px;color:#777">${esc(w.water_type||'Gewässer')}</div><button style="margin-top:9px;width:100%;border:0;border-radius:5px;padding:8px;background:#58c900;color:white" onclick='aaOpenOsmWater(${JSON.stringify(JSON.stringify(w))})'>Gewässer öffnen</button></div>`);
      osmMarkers.push(m);
    }
  }
  async function loadVisible(){
    if(typeof aaMap==='undefined'||!aaMap)return;
    const z=aaMap.getZoom(),el=status();
    if(z<9){clear();if(el)el.textContent='Zoome näher heran, um Gewässer anzuzeigen.';return}
    const b=aaMap.getBounds(),key=[z,b.getCenter().lat.toFixed(2),b.getCenter().lng.toFixed(2)].join('|');
    if(key===lastKey)return;lastKey=key;
    if(el)el.textContent='Gewässer werden geladen …';
    const parts=await Promise.all(tilesForBounds(b).map(fetchTile));
    const seen=new Set(),all=[];
    for(const arr of parts)for(const w of arr){if(!seen.has(w.source_key)){seen.add(w.source_key);all.push(w)}}
    renderWaters(all.slice(0,180));
    if(el)el.textContent=all.length?`${all.length} Gewässer im Kartenausschnitt`:'Keine benannten Gewässer gefunden – zoome etwas näher heran.';
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
