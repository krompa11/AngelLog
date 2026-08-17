(()=>{
  let osmMarkers=[],timer=null,lastKey='',loadToken=0;
  const tileCache=new Map(),markerByKey=new Map();
  const status=()=>{let el=document.getElementById('aaWaterLoadStatus');if(el)return el;const map=document.getElementById('aaMap');if(!map)return null;el=document.createElement('div');el.id='aaWaterLoadStatus';el.style.cssText='position:absolute;left:14px;bottom:86px;z-index:700;background:rgba(35,35,35,.88);color:#ddd;padding:7px 10px;border-radius:6px;font-size:12px;pointer-events:none;max-width:250px';map.parentElement.appendChild(el);return el};
  function removeAll(){osmMarkers.forEach(m=>{try{m.remove()}catch{}});osmMarkers=[];markerByKey.clear()}
  function waterIcon(){return L.divIcon({className:'',html:'<div style="width:38px;height:46px;position:relative"><div style="position:absolute;left:3px;top:0;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#0799cf;border:2px solid white;box-shadow:0 2px 7px rgba(0,0,0,.35)"></div><div style="position:absolute;left:10px;top:7px;width:18px;height:18px;display:grid;place-items:center;color:white;font-size:18px;font-weight:700">≋</div></div>',iconSize:[38,46],iconAnchor:[19,43],popupAnchor:[0,-40]})}
  function schedule(){clearTimeout(timer);timer=setTimeout(loadVisible,300)}
  function tilesForBounds(b){const s=b.getSouth(),n=b.getNorth(),w=b.getWest(),e=b.getEast(),my=(s+n)/2,mx=(w+e)/2;return [[s,w,my,mx],[s,mx,my,e],[my,w,n,mx],[my,mx,n,e]]}
  async function fetchTile(t,token){
    const key=t.map(x=>x.toFixed(3)).join('|');
    if(tileCache.has(key))return tileCache.get(key);
    const [s,w,n,e]=t,u=`/api/osm-waters?s=${s}&w=${w}&n=${n}&e=${e}`;
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),6500);
    const p=fetch(u,{cache:'no-store',signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||('HTTP '+r.status));return d.waters||[]}).catch(()=>[]).finally(()=>clearTimeout(timeout));
    tileCache.set(key,p);const result=await p;return token===loadToken?result:[];
  }
  function addWaters(waters){
    for(const w of waters){if(!w?.source_key||markerByKey.has(w.source_key)||osmMarkers.length>=180)continue;
      const m=L.marker([w.latitude,w.longitude],{icon:waterIcon(),keyboard:false}).addTo(aaMap);
      m.bindPopup(`<div style="min-width:190px"><b style="font-size:16px">${esc(w.name)}</b><div style="margin-top:4px;color:#777">${esc(w.water_type||'Gewässer')}</div><button style="margin-top:9px;width:100%;border:0;border-radius:5px;padding:8px;background:#58c900;color:white" onclick='aaOpenOsmWater(${JSON.stringify(JSON.stringify(w))})'>Gewässer öffnen</button></div>`);
      markerByKey.set(w.source_key,m);osmMarkers.push(m);
    }
  }
  async function loadVisible(){
    if(typeof aaMap==='undefined'||!aaMap)return;
    const z=aaMap.getZoom(),el=status();
    if(z<9){removeAll();if(el)el.textContent='Zoome näher heran, um Gewässer anzuzeigen.';return}
    const b=aaMap.getBounds(),key=[z,b.getCenter().lat.toFixed(2),b.getCenter().lng.toFixed(2)].join('|');
    if(key===lastKey&&osmMarkers.length)return;lastKey=key;
    const token=++loadToken;removeAll();if(el)el.textContent='Gewässer werden geladen …';
    let finished=0;
    const jobs=tilesForBounds(b).map(async t=>{const waters=await fetchTile(t,token);if(token!==loadToken)return;addWaters(waters);finished++;if(el){if(osmMarkers.length)el.textContent=`${osmMarkers.length} Gewässer geladen${finished<4?' · weitere folgen …':''}`;else if(finished<4)el.textContent='Gewässer werden geladen …'}});
    await Promise.allSettled(jobs);if(token!==loadToken)return;
    if(el)el.textContent=osmMarkers.length?`${osmMarkers.length} Gewässer im Kartenausschnitt`:'Keine Gewässerdaten verfügbar – zoome etwas näher heran oder verschiebe die Karte.';
  }
  window.aaOpenOsmWater=async raw=>{
    let w;try{w=typeof raw==='string'?JSON.parse(raw):raw}catch{return}
    try{const q=await sb.from('waters').select('id').eq('source_key',w.source_key).maybeSingle();if(q.data?.id)return openWater(q.data.id);if(!aaUser){toast('Zum Öffnen als AngelLog-Gewässer bitte anmelden.');return}
      const row={source_key:w.source_key,name:w.name,water_type:w.water_type,latitude:w.latitude,longitude:w.longitude,website:w.website||null,association:w.operator||null,source_name:'OpenStreetMap',source_license:'ODbL',created_by:aaUser.id};
      const ins=await sb.from('waters').upsert(row,{onConflict:'source_key'}).select('id').single();if(ins.error)return toast(ins.error.message);openWater(ins.data.id)}catch(e){toast('Gewässerprofil konnte nicht geöffnet werden.')}
  };
  function bind(){if(typeof aaMap==='undefined'||!aaMap)return setTimeout(bind,150);aaMap.on('moveend zoomend',schedule);loadVisible()}
  function loadProUi(){if(!document.querySelector('link[href="/v6-pro.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/v6-pro.css';document.head.appendChild(l)}if(!document.querySelector('script[src="/v6-pro.js"]')){const s=document.createElement('script');s.src='/v6-pro.js';s.defer=true;document.body.appendChild(s)}}
  loadProUi();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(bind,250));else setTimeout(bind,250);
})();