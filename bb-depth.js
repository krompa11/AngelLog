(()=>{
  const DATA_URL='https://data.geobasis-bb.de/geofachdaten/Wasser/Hydrologie/seenvermessung.zip';
  const OFFICIAL_MAP='https://apw.brandenburg.de/?th=seenverm&POS-XY=%20327000%7c%205808000%20&POS-OFFSET=8000&POS-MARK=false';
  let officialLayer=null, loading=false, visible=false;

  function ensureShp(){
    if(window.shp)return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/shpjs@latest/dist/shp.js';
      s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
    });
  }

  function depthValue(props={}){
    const entries=Object.entries(props);
    for(const [k,v] of entries){
      const key=String(k).toLowerCase();
      if(key.includes('tiefe')||key.includes('depth')||key.includes('rel')){
        const n=Number(String(v).replace(',','.'));
        if(Number.isFinite(n))return n;
      }
    }
    for(const [,v] of entries){const n=Number(String(v).replace(',','.'));if(Number.isFinite(n)&&n>=0&&n<300)return n}
    return null;
  }

  function colorFor(d,max){
    if(d==null)return '#2b7da8';
    const r=max?Math.max(0,Math.min(1,d/max)):0;
    if(r<.2)return '#54e1cf';
    if(r<.4)return '#35b9d5';
    if(r<.6)return '#2d8fd5';
    if(r<.8)return '#2567b8';
    return '#173f78';
  }

  function flattenGeoJSON(data){
    if(Array.isArray(data))return data.flatMap(flattenGeoJSON);
    if(!data)return [];
    if(data.type==='FeatureCollection')return data.features||[];
    if(data.type==='Feature')return [data];
    return [];
  }

  async function loadOfficialDepth(){
    if(loading)return;
    if(typeof depthMap==='undefined'||!depthMap){
      if(typeof initDepthMap==='function')initDepthMap();
      await new Promise(r=>setTimeout(r,200));
    }
    if(officialLayer){
      visible=!visible;
      if(visible)officialLayer.addTo(depthMap);else depthMap.removeLayer(officialLayer);
      setStatus(visible?'Amtliche Tiefen eingeblendet.':'Amtliche Tiefen ausgeblendet.');
      setButton();
      return;
    }
    loading=true;setStatus('Amtliche Tiefendaten werden geladen …');setButton();
    try{
      await ensureShp();
      const res=await fetch(DATA_URL,{mode:'cors'});
      if(!res.ok)throw new Error('HTTP '+res.status);
      const buf=await res.arrayBuffer();
      const parsed=await window.shp(buf);
      const features=flattenGeoJSON(parsed);
      if(!features.length)throw new Error('Keine Geometrien gefunden');
      const vals=features.map(f=>depthValue(f.properties)).filter(Number.isFinite);
      const max=vals.length?Math.max(...vals):1;
      officialLayer=L.geoJSON({type:'FeatureCollection',features},{
        style:f=>{const d=depthValue(f.properties);return {color:colorFor(d,max),weight:1,fillColor:colorFor(d,max),fillOpacity:.42}},
        onEachFeature:(f,l)=>{const d=depthValue(f.properties);const p=f.properties||{};const name=p.NAME||p.Name||p.name||p.GEW_NAME||p.SEE_NAME||'';l.bindTooltip(`${name?name+' · ':''}${d!=null?d+' m relative Tiefe':'amtliche Tiefenfläche'}`)}
      }).addTo(depthMap);
      visible=true;
      try{depthMap.fitBounds(officialLayer.getBounds(),{padding:[20,20]})}catch{}
      setStatus(`${features.length.toLocaleString('de-DE')} amtliche Tiefenflächen geladen · Quelle: Landesamt für Umwelt Brandenburg.`);
      setButton();
    }catch(err){
      console.error('Brandenburg depth layer',err);
      setStatus('Direktes Laden wurde vom Datenserver/Browser blockiert. Die amtliche Kartenansicht kann trotzdem geöffnet werden.');
      const fallback=document.getElementById('bbDepthFallback');if(fallback)fallback.classList.remove('hidden');
    }finally{loading=false;setButton()}
  }

  function setStatus(t){const el=document.getElementById('bbDepthStatus');if(el)el.textContent=t}
  function setButton(){const b=document.getElementById('bbDepthBtn');if(b)b.textContent=loading?'Lädt …':(visible?'✓ Amtliche Tiefen an':'Amtliche Tiefen einblenden')}

  function installUI(){
    const depth=document.getElementById('depth');if(!depth||document.getElementById('bbDepthBtn'))return;
    const firstCard=depth.querySelector('.premium-card');if(!firstCard)return;
    const box=document.createElement('div');
    box.className='official-depth-box';
    box.innerHTML=`<div class="card-kicker">ONLINE-TIEFEN · BRANDENBURG</div><h3>Amtliche Seenvermessung</h3><p class="muted">Vermessene Seen mit relativen Tiefenflächen des Landes Brandenburg. Datenstand/Abdeckung unterscheiden sich je Gewässer.</p><div class="buttons"><button id="bbDepthBtn" class="primary" type="button">Amtliche Tiefen einblenden</button><a id="bbDepthFallback" class="secondary-link hidden" target="_blank" rel="noopener" href="${OFFICIAL_MAP}">Amtliche Originalkarte öffnen</a></div><div id="bbDepthStatus" class="small status-line">Quelle: Landesamt für Umwelt Brandenburg · Datenlizenz Deutschland – Namensnennung 2.0.</div>`;
    firstCard.prepend(box);
    document.getElementById('bbDepthBtn').addEventListener('click',loadOfficialDepth);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUI);else installUI();
})();