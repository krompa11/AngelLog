(()=>{
  let depthLayer=null,depthActive=false,refreshTimer=null,menu=null,statusEl=null,attributionAdded=false;
  let openFreeLayer=null,openFreeReady=null,openFreeAttribution=false;
  const BB={s:51.15,n:53.75,w:11.0,e:15.2};
  const OPENFREE_STYLE='https://tiles.openfreemap.org/styles/liberty';
  const MAPLIBRE_CSS='https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.css';
  const MAPLIBRE_JS='https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.js';
  const MAPLIBRE_LEAFLET='https://unpkg.com/@maplibre/maplibre-gl-leaflet/leaflet-maplibre-gl.js';
  const legacySetMapStyle=window.setAngelLogMapStyle;
  const q=s=>document.querySelector(s);
  const prefs=()=>window.getAngelLogPreferences?.()||{};
  const lang=()=>prefs().language==='en'?'en':'de';
  const text=(de,en)=>lang()==='en'?en:de;

  function addStyles(){
    if(q('#aaMapLayerStyles'))return;
    const s=document.createElement('style');s.id='aaMapLayerStyles';s.textContent=`
      .aa-map-layer-menu{position:absolute;z-index:760;right:18px;bottom:88px;width:min(310px,calc(100% - 36px));background:rgba(35,36,37,.98);border:1px solid #4c4d4e;border-radius:12px;box-shadow:0 16px 40px rgba(0,0,0,.42);padding:10px;backdrop-filter:blur(12px)}
      .aa-map-layer-menu.hidden{display:none!important}.aa-map-layer-title{padding:8px 10px 9px;color:#aaa;font-size:12px;letter-spacing:1.7px;text-transform:uppercase}
      .aa-map-layer-option{width:100%;min-height:54px;border:0;border-top:1px solid #444;background:transparent;color:#fff;display:grid;grid-template-columns:38px 1fr 24px;gap:8px;align-items:center;text-align:left;padding:8px 10px;cursor:pointer}
      .aa-map-layer-option:first-of-type{border-top:0}.aa-map-layer-option .ico{font-size:23px;color:#61d000;text-align:center}.aa-map-layer-option b{display:block;font-size:16px}.aa-map-layer-option small{display:block;color:#8f9091;font-size:11px;margin-top:2px;line-height:1.25}.aa-map-layer-option .check{color:#61d000;font-size:20px;text-align:right}
      .aa-map-depth-status{border-top:1px solid #444;margin-top:5px;padding:9px 10px 5px;color:#949596;font-size:11px;line-height:1.35}.aa-map-depth-status.ok{color:#78d72b}.aa-map-depth-status.warn{color:#e2b548}
      #aaSearchBtn.aa-layer-menu-active{box-shadow:0 0 0 3px rgba(97,208,0,.25),0 8px 25px rgba(0,0,0,.3)}
      .leaflet-control-attribution{background:rgba(250,250,250,.88)!important;color:#68696b!important;font-size:8px!important;line-height:1.15!important;padding:2px 4px!important;max-width:78%;white-space:normal;text-align:right;border-radius:4px 0 0 0}.leaflet-control-attribution a{color:#4d626e!important}.maplibregl-ctrl-attrib{display:none!important}
    `;document.head.appendChild(s)
  }

  function ensureMenu(){
    if(menu)return menu;
    const host=q('.aa-map-screen');if(!host)return null;
    menu=document.createElement('div');menu.id='aaMapLayerMenu';menu.className='aa-map-layer-menu hidden';
    menu.innerHTML=`<div class="aa-map-layer-title">${text('Kartenebenen','Map layers')}</div>
      <button class="aa-map-layer-option" data-map-layer="osm"><span class="ico">▦</span><span><b>${text('Standardkarte','Standard map')}</b><small>OpenFreeMap · OpenStreetMap</small></span><span class="check"></span></button>
      <button class="aa-map-layer-option" data-map-layer="satellite"><span class="ico">▱</span><span><b>${text('Satellit','Satellite')}</b><small>Esri World Imagery</small></span><span class="check"></span></button>
      <button class="aa-map-layer-option" data-map-layer="depth"><span class="ico">≋</span><span><b>${text('Tiefenkarte','Depth map')}</b><small>${text('Amtliche Seenvermessung Brandenburg','Official Brandenburg lake survey')}</small></span><span class="check"></span></button>
      <div id="aaMapDepthStatus" class="aa-map-depth-status">${text('Tiefenkarte derzeit für Brandenburg.','Depth map currently available for Brandenburg.')}</div>`;
    host.appendChild(menu);statusEl=q('#aaMapDepthStatus');
    menu.querySelectorAll('[data-map-layer]').forEach(b=>b.addEventListener('click',()=>selectLayer(b.dataset.mapLayer)));
    updateChecks();return menu
  }

  function loadCss(href){if(document.querySelector(`link[href="${href}"]`))return;const l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.appendChild(l)}
  function loadScript(src){return new Promise((resolve,reject)=>{const existing=document.querySelector(`script[src="${src}"]`);if(existing){if(existing.dataset.loaded==='1')return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}const s=document.createElement('script');s.src=src;s.async=true;s.onload=()=>{s.dataset.loaded='1';resolve()};s.onerror=reject;document.head.appendChild(s)})}
  function ensureOpenFree(){if(window.maplibregl&&window.L?.maplibreGL)return Promise.resolve();if(openFreeReady)return openFreeReady;openFreeReady=(async()=>{loadCss(MAPLIBRE_CSS);if(!window.maplibregl)await loadScript(MAPLIBRE_JS);if(!window.L?.maplibreGL)await loadScript(MAPLIBRE_LEAFLET);if(!window.L?.maplibreGL)throw new Error('MapLibre Leaflet konnte nicht geladen werden')})();return openFreeReady}

  function addOpenFreeAttribution(){const map=window.aaMap;if(!map||openFreeAttribution)return;try{map.attributionControl?.addAttribution('OpenFreeMap © OpenMapTiles · Data © OpenStreetMap contributors');openFreeAttribution=true}catch{}}
  function removeOpenFreeAttribution(){const map=window.aaMap;if(!map||!openFreeAttribution)return;try{map.attributionControl?.removeAttribution('OpenFreeMap © OpenMapTiles · Data © OpenStreetMap contributors')}catch{}openFreeAttribution=false}
  function clearOpenFree(){const map=window.aaMap;if(openFreeLayer&&map)try{map.removeLayer(openFreeLayer)}catch{}openFreeLayer=null;removeOpenFreeAttribution()}
  async function applyOpenFree(){
    const map=window.aaMap;if(!map||window.getAngelLogMapStyle?.()==='satellite')return;
    try{
      await ensureOpenFree();if(window.getAngelLogMapStyle?.()==='satellite')return;
      map.eachLayer(l=>{if(l instanceof L.TileLayer)try{map.removeLayer(l)}catch{}});
      if(openFreeLayer)try{map.removeLayer(openFreeLayer)}catch{}
      openFreeLayer=L.maplibreGL({style:OPENFREE_STYLE,attributionControl:false});openFreeLayer.addTo(map);addOpenFreeAttribution()
    }catch{openFreeLayer=null;removeOpenFreeAttribution()}
  }
  function setMapStyle(style){clearOpenFree();legacySetMapStyle?.(style);if(style!=='satellite')setTimeout(applyOpenFree,20);updateChecks()}
  window.setAngelLogMapStyle=setMapStyle;

  function updateChecks(){if(!menu)return;const base=window.getAngelLogMapStyle?.()||'osm';menu.querySelectorAll('[data-map-layer]').forEach(b=>{const v=b.dataset.mapLayer,on=v==='depth'?depthActive:(!depthActive&&v===base);const c=b.querySelector('.check');if(c)c.textContent=on?'✓':''})}
  function setStatus(msg,type=''){if(!statusEl)return;statusEl.textContent=msg;statusEl.className='aa-map-depth-status'+(type?' '+type:'')}
  function addAttribution(){const map=window.aaMap;if(!map||attributionAdded)return;try{map.attributionControl?.addAttribution('Tiefendaten © LfU Brandenburg');attributionAdded=true}catch{}}
  function removeAttribution(){const map=window.aaMap;if(!map||!attributionAdded)return;try{map.attributionControl?.removeAttribution('Tiefendaten © LfU Brandenburg')}catch{}attributionAdded=false}
  function clearDepth(){const map=window.aaMap;if(depthLayer&&map)try{map.removeLayer(depthLayer)}catch{}depthLayer=null;clearTimeout(refreshTimer)}
  function visibleDepthBounds(){const map=window.aaMap;if(!map)return null;const b=map.getBounds();const n=Math.min(b.getNorth(),BB.n),s=Math.max(b.getSouth(),BB.s),e=Math.min(b.getEast(),BB.e),w=Math.max(b.getWest(),BB.w);if(n<=s||e<=w)return null;return {n,s,e,w,b}}

  function refreshDepth(){
    if(!depthActive)return;const map=window.aaMap;if(!map)return;clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{
      if(!depthActive)return;const x=visibleDepthBounds();if(!x){clearDepth();setStatus(text('Hier sind noch keine amtlichen Tiefendaten angebunden.','No official depth data is connected here yet.'),'warn');return}
      const rect=map.getContainer().getBoundingClientRect(),fullW=Math.max(.001,x.b.getEast()-x.b.getWest()),fullH=Math.max(.001,x.b.getNorth()-x.b.getSouth());
      const width=Math.max(320,Math.min(1100,Math.round(rect.width*((x.e-x.w)/fullW)))),height=Math.max(320,Math.min(1100,Math.round(rect.height*((x.n-x.s)/fullH))));
      const url=`/api/depth-map?n=${x.n.toFixed(6)}&s=${x.s.toFixed(6)}&e=${x.e.toFixed(6)}&w=${x.w.toFixed(6)}&width=${width}&height=${height}`,bounds=L.latLngBounds([x.s,x.w],[x.n,x.e]);setStatus(text('Tiefenkarte wird geladen …','Loading depth map …'));
      const next=L.imageOverlay(url,bounds,{opacity:.82,interactive:false,zIndex:430});
      next.once('load',()=>{if(!depthActive){try{map.removeLayer(next)}catch{};return}if(depthLayer&&depthLayer!==next)try{map.removeLayer(depthLayer)}catch{}depthLayer=next;setStatus(text('Amtliche Tiefendaten aktiv · LfU Brandenburg','Official depth data active · LfU Brandenburg'),'ok');updateChecks()});
      next.once('error',()=>{try{map.removeLayer(next)}catch{};setStatus(text('Tiefendaten konnten für diesen Ausschnitt nicht geladen werden.','Depth data could not be loaded for this area.'),'warn')});next.addTo(map)
    },220)
  }

  function selectLayer(type){const map=window.aaMap;if(!map)return;if(type==='depth'){depthActive=!depthActive;if(depthActive){addAttribution();refreshDepth()}else{clearDepth();removeAttribution();setStatus(text('Tiefenkarte derzeit für Brandenburg.','Depth map currently available for Brandenburg.'))}}else{depthActive=false;clearDepth();removeAttribution();setMapStyle(type==='satellite'?'satellite':'osm');setStatus(text('Tiefenkarte derzeit für Brandenburg.','Depth map currently available for Brandenburg.'))}updateChecks();closeMenu()}
  function openMenu(){ensureMenu();if(!menu)return;menu.classList.remove('hidden');q('#aaSearchBtn')?.classList.add('aa-layer-menu-active');updateChecks()}
  function closeMenu(){menu?.classList.add('hidden');q('#aaSearchBtn')?.classList.remove('aa-layer-menu-active')}
  function toggleMenu(){ensureMenu();if(!menu)return;menu.classList.contains('hidden')?openMenu():closeMenu()}
  function boot(){addStyles();ensureMenu();const btn=q('#aaSearchBtn');if(!btn)return;btn.onclick=e=>{e.preventDefault();e.stopPropagation();toggleMenu()};btn.title=text('Kartenebenen','Map layers');btn.setAttribute('aria-label',btn.title);const layerBtn=q('#aaLayerBtn');if(layerBtn)layerBtn.onclick=()=>setMapStyle((window.getAngelLogMapStyle?.()||'osm')==='osm'?'satellite':'osm');const map=window.aaMap;if(map&&!map.__angelLogDepthEvents){map.__angelLogDepthEvents=true;map.on('moveend zoomend',()=>refreshDepth())}document.addEventListener('click',e=>{if(menu&&!menu.classList.contains('hidden')&&!menu.contains(e.target)&&e.target!==btn)closeMenu()});q('#aaSearch')?.addEventListener('keydown',e=>{if(e.key==='Enter')closeMenu()});if((window.getAngelLogMapStyle?.()||'osm')==='osm')setTimeout(applyOpenFree,20)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,80),{once:true});else setTimeout(boot,80);
  window.AngelLogMapLayers={refreshDepth,openMenu,closeMenu,applyOpenFree,get depthActive(){return depthActive}}
})();