(()=>{
  let renderedMarkers=[],timer=null,renderTimer=null,lastKey='',loadToken=0;
  const tileCache=new Map(),visibleByKey=new Map();
  const status=()=>{let el=document.getElementById('aaWaterLoadStatus');if(el)return el;const map=document.getElementById('aaMap');if(!map)return null;el=document.createElement('div');el.id='aaWaterLoadStatus';el.style.cssText='position:absolute;left:14px;bottom:86px;z-index:700;background:rgba(25,26,27,.88);color:#ddd;padding:7px 10px;border-radius:7px;font-size:11px;pointer-events:none;max-width:250px;box-shadow:0 5px 18px rgba(0,0,0,.25)';map.parentElement.appendChild(el);return el};
  function clearRendered(){renderedMarkers.forEach(m=>{try{m.remove()}catch{}});renderedMarkers=[]}
  function removeAll(){clearRendered();visibleByKey.clear()}
  function waterIcon(env){const glyph=env==='saltwater'?'≈':'≋';return L.divIcon({className:'',html:`<div style="width:38px;height:46px;position:relative"><div style="position:absolute;left:3px;top:0;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#0799cf;border:2px solid white;box-shadow:0 2px 7px rgba(0,0,0,.35)"></div><div style="position:absolute;left:10px;top:7px;width:18px;height:18px;display:grid;place-items:center;color:white;font-size:18px;font-weight:700">${glyph}</div></div>`,iconSize:[38,46],iconAnchor:[19,43],popupAnchor:[0,-40]})}
  function clusterIcon(count){const size=count>99?54:count>19?50:46;return L.divIcon({className:'',html:`<div style="width:${size}px;height:${size}px;border-radius:50%;display:grid;place-items:center;background:rgba(28,30,31,.96);border:3px solid #61d000;color:#fff;font-weight:800;font-size:${count>99?13:15}px;box-shadow:0 4px 16px rgba(0,0,0,.45),0 0 0 3px rgba(97,208,0,.14)">${count>999?'999+':count}</div>`,iconSize:[size,size],iconAnchor:[size/2,size/2]})}
  function envLabel(v){return v==='saltwater'?'🌊 Salzwasser':v==='brackish'?'≈ Brackwasser':'💧 Süßwasser'}
  function schedule(){clearTimeout(timer);timer=setTimeout(loadVisible,300)}
  function scheduleRender(){clearTimeout(renderTimer);renderTimer=setTimeout(renderClusters,55)}
  function tilesForBounds(b){const s=b.getSouth(),n=b.getNorth(),w=b.getWest(),e=b.getEast(),my=(s+n)/2,mx=(w+e)/2;return [[s,w,my,mx],[s,mx,my,e],[my,w,n,mx],[my,mx,n,e]]}
  async function fetchTile(t,token){
    const key=t.map(x=>x.toFixed(3)).join('|');
    if(tileCache.has(key))return tileCache.get(key);
    const [s,w,n,e]=t,u=`/api/osm-waters?s=${s}&w=${w}&n=${n}&e=${e}`;
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),7500);
    const p=fetch(u,{cache:'no-store',signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||('HTTP '+r.status));return d.waters||[]}).catch(()=>[]).finally(()=>clearTimeout(timeout));
    tileCache.set(key,p);const result=await p;return token===loadToken?result:[];
  }
  function addWaters(waters){
    for(const w of waters){if(!w?.source_key||visibleByKey.has(w.source_key)||visibleByKey.size>=350)continue;visibleByKey.set(w.source_key,w)}
    scheduleRender()
  }
  function openPopupFor(m,w){m.bindPopup(`<div style="min-width:190px"><b style="font-size:16px">${esc(w.name)}</b><div style="margin-top:4px;color:#999">${esc(w.water_type||'Gewässer')} · ${envLabel(w.water_environment)}</div><button style="margin-top:9px;width:100%;border:0;border-radius:6px;padding:9px;background:#58c900;color:white" onclick='aaOpenOsmWater(${JSON.stringify(JSON.stringify(w))})'>Gewässer öffnen</button></div>`)}
  function cellSize(z){return z<=9?92:z===10?82:z===11?72:z===12?62:z===13?52:42}
  function renderClusters(){
    if(typeof aaMap==='undefined'||!aaMap)return;clearRendered();
    const waters=[...visibleByKey.values()];if(!waters.length)return;
    const z=aaMap.getZoom(),size=cellSize(z),groups=new Map();
    for(const w of waters){const p=aaMap.project([w.latitude,w.longitude],z),key=`${Math.floor(p.x/size)}|${Math.floor(p.y/size)}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(w)}
    for(const group of groups.values()){
      if(group.length===1||z>=15){for(const w of group){const m=L.marker([w.latitude,w.longitude],{icon:waterIcon(w.water_environment),keyboard:false}).addTo(aaMap);openPopupFor(m,w);renderedMarkers.push(m)}continue}
      const pts=group.map(w=>[w.latitude,w.longitude]),bounds=L.latLngBounds(pts),center=bounds.getCenter();
      const m=L.marker(center,{icon:clusterIcon(group.length),keyboard:false,zIndexOffset:300}).addTo(aaMap);
      m.on('click',()=>{const next=Math.min(15,z+2);if(bounds.isValid()&&bounds.getNorthEast().distanceTo(bounds.getSouthWest())>35)aaMap.fitBounds(bounds.pad(.35),{maxZoom:next,animate:true});else aaMap.setView(center,next,{animate:true})});
      m.bindTooltip(`${group.length} Gewässer`,{direction:'top',offset:[0,-20],opacity:.9});renderedMarkers.push(m)
    }
  }
  async function loadVisible(){
    if(typeof aaMap==='undefined'||!aaMap)return;
    const z=aaMap.getZoom(),el=status();
    if(z<8){removeAll();if(el)el.textContent='Zoome näher heran, um Gewässer weltweit anzuzeigen.';return}
    const b=aaMap.getBounds(),key=[z,b.getCenter().lat.toFixed(2),b.getCenter().lng.toFixed(2)].join('|');
    if(key===lastKey&&visibleByKey.size){renderClusters();return}lastKey=key;
    const token=++loadToken;removeAll();if(el)el.textContent='Gewässer weltweit werden geladen …';
    let finished=0;
    const jobs=tilesForBounds(b).map(async t=>{const waters=await fetchTile(t,token);if(token!==loadToken)return;addWaters(waters);finished++;if(el){if(visibleByKey.size)el.textContent=`${visibleByKey.size} Gewässer gefunden${finished<4?' · weitere folgen …':''}`;else if(finished<4)el.textContent='Gewässer weltweit werden geladen …'}});
    await Promise.allSettled(jobs);if(token!==loadToken)return;renderClusters();
    if(el)el.textContent=visibleByKey.size?`${visibleByKey.size} Gewässer im Kartenausschnitt · weltweit`:'Keine Gewässerdaten verfügbar – zoome etwas näher heran oder verschiebe die Karte.';
  }
  window.aaOpenOsmWater=async raw=>{
    let w;try{w=typeof raw==='string'?JSON.parse(raw):raw}catch{return}
    try{
      const q=await sb.from('waters').select('id').eq('source_key',w.source_key).maybeSingle();
      if(q.data?.id)return openWater(q.data.id);
      if(!aaUser){toast('Zum Öffnen als AngelLog-Gewässer bitte anmelden.');return}
      const row={source_key:w.source_key,name:w.name,water_type:w.water_type||'Gewässer',water_environment:w.water_environment||null,latitude:w.latitude,longitude:w.longitude,official_url:w.website||null,association:w.operator||null,source_name:w.source_name||(w.official?'Landesamt für Umwelt Brandenburg':'OpenStreetMap'),source_license:w.official?'Datenlizenz Deutschland – Namensnennung 2.0':'ODbL',created_by:aaUser.id};
      const ins=await sb.from('waters').upsert(row,{onConflict:'source_key'}).select('id').single();
      if(ins.error)return toast(ins.error.message);openWater(ins.data.id)
    }catch(e){toast('Gewässerprofil konnte nicht geöffnet werden.')}
  };
  function bind(){if(typeof aaMap==='undefined'||!aaMap)return setTimeout(bind,150);aaMap.on('moveend zoomend',schedule);loadVisible()}
  function loadProUi(){if(!document.querySelector('link[href="/v6-pro.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/v6-pro.css';document.head.appendChild(l)}if(!document.querySelector('script[src="/v6-pro.js"]')){const s=document.createElement('script');s.src='/v6-pro.js';s.defer=true;document.body.appendChild(s)}}
  loadProUi();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(bind,250));else setTimeout(bind,250);
})();