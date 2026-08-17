(()=>{
  const DATA_URL='/api/seenvermessung';
  const OFFICIAL_MAP='https://apw.brandenburg.de/?th=seenverm&POS-XY=%20327000%7c%205808000%20&POS-OFFSET=8000&POS-MARK=false';
  const MIN_ZOOM=9;
  const MAX_VISIBLE=1500;

  let enabled=false,loading=false,loaded=false;
  let records=[],officialLayer=null,canvasRenderer=null;
  let depthChip=null,renderQueued=false,eventsBound=false;

  function setStatus(text){
    const el=document.getElementById('bbMapDepthStatus');
    if(el)el.textContent=text;
    const el2=document.getElementById('bbDepthStatus');
    if(el2)el2.textContent=text;
  }

  function setChip(){
    if(!depthChip)return;
    depthChip.classList.toggle('active-chip',enabled);
    depthChip.style.cursor='pointer';
    depthChip.setAttribute('aria-pressed',enabled?'true':'false');
    depthChip.title=enabled?'Amtliche Tiefen ausblenden':'Amtliche Tiefen einblenden';
    depthChip.textContent=loading?'Tiefen …':(enabled?'✓ Tiefen':'Tiefen');
  }

  function ensureShp(){
    if(window.shp)return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/shpjs@latest/dist/shp.js';
      s.onload=resolve;
      s.onerror=()=>reject(new Error('Shapefile-Modul konnte nicht geladen werden'));
      document.head.appendChild(s);
    });
  }

  function flattenGeoJSON(data){
    if(Array.isArray(data))return data.flatMap(flattenGeoJSON);
    if(!data)return[];
    if(data.type==='FeatureCollection')return data.features||[];
    if(data.type==='Feature')return[data];
    return[];
  }

  function bboxOf(feature){
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    const walk=c=>{
      if(!Array.isArray(c))return;
      if(typeof c[0]==='number'&&typeof c[1]==='number'){
        const x=+c[0],y=+c[1];
        if(Number.isFinite(x)&&Number.isFinite(y)){
          if(x<minX)minX=x;if(x>maxX)maxX=x;
          if(y<minY)minY=y;if(y>maxY)maxY=y;
        }
        return;
      }
      for(const part of c)walk(part);
    };
    walk(feature?.geometry?.coordinates);
    return Number.isFinite(minX)?[minX,minY,maxX,maxY]:null;
  }

  function depthValue(props={}){
    for(const [k,v] of Object.entries(props)){
      const key=String(k).toLowerCase();
      if(key.includes('tiefe')||key.includes('depth')||key.includes('rel')){
        const n=Number(String(v).replace(',','.'));
        if(Number.isFinite(n))return n;
      }
    }
    return null;
  }

  function nameValue(props={}){
    return props.NAME||props.Name||props.name||props.GEW_NAME||props.SEE_NAME||props.GEWNAME||props.SEE||'';
  }

  function colorFor(d,max){
    if(d==null)return '#2d8fd5';
    const r=max?Math.max(0,Math.min(1,d/max)):0;
    if(r<.2)return '#59e0cf';
    if(r<.4)return '#39bfd7';
    if(r<.6)return '#2f91d5';
    if(r<.8)return '#2869bb';
    return '#183f79';
  }

  function intersects(bb,bounds){
    return bb[2]>=bounds.getWest()&&bb[0]<=bounds.getEast()&&bb[3]>=bounds.getSouth()&&bb[1]<=bounds.getNorth();
  }

  function clearLayer(){
    if(officialLayer&&typeof map!=='undefined'&&map){
      try{map.removeLayer(officialLayer)}catch{}
    }
    officialLayer=null;
  }

  function queueRender(){
    if(renderQueued)return;
    renderQueued=true;
    requestAnimationFrame(()=>{renderQueued=false;renderVisible()});
  }

  function renderVisible(){
    if(!enabled||!loaded||typeof map==='undefined'||!map)return;
    clearLayer();

    const zoom=map.getZoom();
    if(zoom<MIN_ZOOM){
      setStatus(`Amtliche Tiefen sind aktiv. Bitte bis mindestens Zoom ${MIN_ZOOM} heranzoomen.`);
      return;
    }

    const bounds=map.getBounds();
    const visible=records.filter(r=>intersects(r.bbox,bounds));
    if(!visible.length){
      setStatus('In diesem Kartenausschnitt liegen keine amtlichen Seenvermessungsflächen.');
      return;
    }
    if(visible.length>MAX_VISIBLE){
      setStatus(`${visible.length.toLocaleString('de-DE')} Tiefenflächen im Ausschnitt. Bitte noch etwas näher heranzoomen.`);
      return;
    }

    const values=visible.map(r=>depthValue(r.feature.properties)).filter(Number.isFinite);
    const max=values.length?Math.max(...values):1;
    if(!canvasRenderer)canvasRenderer=L.canvas({padding:.25});

    officialLayer=L.geoJSON({type:'FeatureCollection',features:visible.map(r=>r.feature)}, {
      renderer:canvasRenderer,
      smoothFactor:1.5,
      style:f=>{
        const d=depthValue(f.properties),c=colorFor(d,max);
        return {color:c,weight:1,opacity:.9,fillColor:c,fillOpacity:.48,interactive:true};
      },
      onEachFeature:(f,l)=>{
        const d=depthValue(f.properties),name=nameValue(f.properties);
        l.bindTooltip(`${name?name+' · ':''}${d!=null?d+' m relative Tiefe':'amtliche Tiefenfläche'}`,{sticky:true});
      }
    }).addTo(map);

    setStatus(`${visible.length.toLocaleString('de-DE')} amtliche Tiefenflächen im sichtbaren Ausschnitt · Quelle: Landesamt für Umwelt Brandenburg.`);
  }

  async function loadData(){
    if(loaded){queueRender();return}
    if(loading)return;
    loading=true;setChip();setStatus('Amtliche Tiefendaten werden einmalig geladen …');
    try{
      await ensureShp();
      const res=await fetch(DATA_URL,{cache:'no-store'});
      if(!res.ok)throw new Error('HTTP '+res.status);
      const buf=await res.arrayBuffer();
      if(buf.byteLength<1000)throw new Error('Datensatz leer');
      const parsed=await window.shp(buf);
      const features=flattenGeoJSON(parsed);
      records=features.map(feature=>({feature,bbox:bboxOf(feature)})).filter(r=>r.bbox);
      loaded=true;
      setStatus(`${records.length.toLocaleString('de-DE')} amtliche Tiefenflächen geladen. Angezeigt wird nur der sichtbare Kartenausschnitt.`);
      queueRender();
    }catch(err){
      console.error('Brandenburg depth overlay',err);
      enabled=false;
      setStatus('Amtliche Tiefendaten konnten nicht geladen werden: '+(err?.message||'unbekannter Fehler'));
    }finally{
      loading=false;setChip();
    }
  }

  function bindMapEvents(){
    if(eventsBound||typeof map==='undefined'||!map)return;
    map.on('moveend zoomend',queueRender);
    eventsBound=true;
  }

  function toggleDepth(force){
    if(typeof map==='undefined'||!map){
      if(typeof initMap==='function')initMap();
    }
    setTimeout(()=>{
      if(force===true)enabled=true;
      else if(force===false)enabled=false;
      else enabled=!enabled;
      setChip();
      bindMapEvents();
      if(!enabled){clearLayer();setStatus('Amtliche Tiefen ausgeblendet.');return}
      if(map.getZoom()<MIN_ZOOM)map.setZoom(MIN_ZOOM);
      loadData();
    },80);
  }

  function showDepthOnMainMap(){
    if(typeof show==='function')show('mapsec');
    setTimeout(()=>toggleDepth(true),160);
  }

  function installMapUI(){
    const mapSec=document.getElementById('mapsec');
    if(!mapSec)return;
    const chips=[...mapSec.querySelectorAll('.map-floating .chip')];
    depthChip=chips.find(x=>x.textContent.trim().replace('✓','').trim()==='Tiefen')||null;
    if(depthChip&&!depthChip.dataset.depthBound){
      depthChip.dataset.depthBound='1';
      depthChip.setAttribute('role','button');depthChip.setAttribute('tabindex','0');depthChip.setAttribute('aria-pressed','false');
      depthChip.addEventListener('click',()=>toggleDepth());
      depthChip.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleDepth()}});
    }
    const shell=mapSec.querySelector('.map-shell');
    if(shell&&!document.getElementById('bbMapDepthStatus')){
      const status=document.createElement('div');
      status.id='bbMapDepthStatus';status.className='small status-line';
      status.style.marginTop='10px';
      status.textContent='Tiefen-Layer aus · Quelle bei Aktivierung: Landesamt für Umwelt Brandenburg.';
      shell.insertAdjacentElement('afterend',status);
    }
  }

  function installDepthUI(){
    const depth=document.getElementById('depth');
    if(!depth||document.getElementById('bbDepthBtn'))return;
    const firstCard=depth.querySelector('.premium-card');if(!firstCard)return;
    const box=document.createElement('div');box.className='official-depth-box';
    box.innerHTML=`<div class="card-kicker">AMTLICHE TIEFEN · BRANDENBURG</div><h3>Direkt auf deiner AngelLog-Karte</h3><p class="muted">Die amtlichen Seenvermessungsflächen werden jetzt über die normale Karte gelegt. AngelLog zeichnet dabei nur den sichtbaren Ausschnitt und nutzt Canvas, damit das Zoomen speicherschonend bleibt.</p><div class="buttons"><button id="bbDepthBtn" class="primary" type="button">Auf Karte mit Tiefen anzeigen</button><a class="secondary-link" target="_blank" rel="noopener" href="${OFFICIAL_MAP}">Amtliche Originalkarte</a></div><div id="bbDepthStatus" class="small status-line">Quelle: Landesamt für Umwelt Brandenburg · Datenlizenz Deutschland – Namensnennung 2.0.</div>`;
    firstCard.prepend(box);
    document.getElementById('bbDepthBtn').addEventListener('click',showDepthOnMainMap);
  }

  function install(){installMapUI();installDepthUI()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();