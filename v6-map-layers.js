(()=>{
  let globalDepthLayer=null,officialDepthLayer=null,depthActive=false,refreshTimer=null,menu=null,statusEl=null;
  let globalDepthAttribution=false,officialDepthAttribution=false,openFreeLayer=null,openFreeReady=null,openFreeAttribution=false;
  const BB={s:51.15,n:53.75,w:11.0,e:15.2};
  const OPENFREE_STYLE='https://tiles.openfreemap.org/styles/liberty';
  const MAPLIBRE_CSS='https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.css';
  const MAPLIBRE_JS='https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.js';
  const MAPLIBRE_LEAFLET='https://unpkg.com/@maplibre/maplibre-gl-leaflet/leaflet-maplibre-gl.js';
  const legacySetMapStyle=window.setAngelLogMapStyle;
  const q=s=>document.querySelector(s),prefs=()=>window.getAngelLogPreferences?.()||{},lang=()=>prefs().language==='en'?'en':'de',text=(de,en)=>lang()==='en'?en:de;

  function addStyles(){
    if(q('#aaMapLayerStyles'))return;
    const s=document.createElement('style');s.id='aaMapLayerStyles';s.textContent=`
      .aa-map-layer-menu{position:absolute;z-index:760;right:18px;bottom:88px;width:min(310px,calc(100% - 36px));background:rgba(35,36,37,.98);border:1px solid #4c4d4e;border-radius:12px;box-shadow:0 16px 40px rgba(0,0,0,.42);padding:10px;backdrop-filter:blur(12px)}
      .aa-map-layer-menu.hidden{display:none!important}.aa-map-layer-title{padding:8px 10px 9px;color:#aaa;font-size:12px;letter-spacing:1.7px;text-transform:uppercase}
      .aa-map-layer-option{width:100%;min-height:54px;border:0;border-top:1px solid #444;background:transparent;color:#fff;display:grid;grid-template-columns:38px 1fr 24px;gap:8px;align-items:center;text-align:left;padding:8px 10px;cursor:pointer}.aa-map-layer-option:first-of-type{border-top:0}.aa-map-layer-option .ico{font-size:23px;color:#61d000;text-align:center}.aa-map-layer-option b{display:block;font-size:16px}.aa-map-layer-option small{display:block;color:#8f9091;font-size:11px;margin-top:2px;line-height:1.25}.aa-map-layer-option .check{color:#61d000;font-size:20px;text-align:right}
      .aa-map-depth-status{border-top:1px solid #444;margin-top:5px;padding:9px 10px 5px;color:#949596;font-size:11px;line-height:1.35}.aa-map-depth-status.ok{color:#78d72b}.aa-map-depth-status.warn{color:#e2b548}#aaSearchBtn.aa-layer-menu-active{box-shadow:0 0 0 3px rgba(97,208,0,.25),0 8px 25px rgba(0,0,0,.3)}
      .leaflet-control-attribution{background:rgba(250,250,250,.88)!important;color:#68696b!important;font-size:8px!important;line-height:1.15!important;padding:2px 4px!important;max-width:78%;white-space:normal;text-align:right;border-radius:4px 0 0 0}.leaflet-control-attribution a{color:#4d626e!important}.maplibregl-ctrl-attrib{display:none!important}
    `;document.head.appendChild(s)
  }
  function ensureMenu(){
    if(menu)return menu;const host=q('.aa-map-screen');if(!host)return null;
    menu=document.createElement('div');menu.id='aaMapLayerMenu';menu.className='aa-map-layer-menu hidden';
    menu.innerHTML=`<div class="aa-map-layer-title">${text('Kartenebenen','Map layers')}</div>
      <button class="aa-map-layer-option" data-map-layer="osm"><span class="ico">▦</span><span><b>${text('Standardkarte','Standard map')}</b><small>OpenFreeMap · OpenStreetMap</small></span><span class="check"></span></button>
      <button class="aa-map-layer-option" data-map-layer="satellite"><span class="ico">▱</span><span><b>${text('Satellit','Satellite')}</b><small>Esri World Imagery</small></span><span class="check"></span></button>
      <button class="aa-map-layer-option" data-map-layer="depth"><span class="ico">≋</span><span><b>${text('Tiefenkarte weltweit','Worldwide depth map')}</b><small>GEBCO 2026 · ${text('amtliche Detaildaten wo verfügbar','official detail where available')}</small></span><span class="check"></span></button>
      <div id="aaMapDepthStatus" class="aa-map-depth-status">${text('Weltweite Bathymetrie verfügbar. Binnengewässer können außerhalb amtlicher Quellen grob sein.','Worldwide bathymetry available. Inland lake detail can be coarse without official surveys.')}</div>`;
    host.appendChild(menu);statusEl=q('#aaMapDepthStatus');menu.querySelectorAll('[data-map-layer]').forEach(b=>b.addEventListener('click',()=>selectLayer(b.dataset.mapLayer)));updateChecks();return menu
  }
  function loadCss(href){if(document.querySelector(`link[href="${href}"]`))return;const l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.appendChild(l)}
  function loadScript(src){return new Promise((resolve,reject)=>{const existing=document.querySelector(`script[src="${src}"]`);if(existing){if(existing.dataset.loaded==='1')return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}const s=document.createElement('script');s.src=src;s.async=true;s.onload=()=>{s.dataset.loaded='1';resolve()};s.onerror=reject;document.head.appendChild(s)})}
  function ensureOpenFree(){if(window.maplibregl&&window.L?.maplibreGL)return Promise.resolve();if(openFreeReady)return openFreeReady;openFreeReady=(async()=>{loadCss(MAPLIBRE_CSS);if(!window.maplibregl)await loadScript(MAPLIBRE_JS);if(!window.L?.maplibreGL)await loadScript(MAPLIBRE_LEAFLET);if(!window.L?.maplibreGL)throw new Error('MapLibre Leaflet konnte nicht geladen werden')})();return openFreeReady}
  function addOpenFreeAttribution(){const map=window.aaMap;if(!map||openFreeAttribution)return;try{map.attributionControl?.addAttribution('OpenFreeMap © OpenMapTiles · Data © OpenStreetMap contributors');openFreeAttribution=true}catch{}}
  function removeOpenFreeAttribution(){const map=window.aaMap;if(!map||!openFreeAttribution)return;try{map.attributionControl?.removeAttribution('OpenFreeMap © OpenMapTiles · Data © OpenStreetMap contributors')}catch{}openFreeAttribution=false}
  function clearOpenFree(){const map=window.aaMap;if(openFreeLayer&&map)try{map.removeLayer(openFreeLayer)}catch{}openFreeLayer=null;removeOpenFreeAttribution()}
  async function applyOpenFree(){const map=window.aaMap;if(!map||window.getAngelLogMapStyle?.()==='satellite')return;try{await ensureOpenFree();if(window.getAngelLogMapStyle?.()==='satellite')return;map.eachLayer(l=>{if(l instanceof L.TileLayer)try{map.removeLayer(l)}catch{}});if(openFreeLayer)try{map.removeLayer(openFreeLayer)}catch{}openFreeLayer=L.maplibreGL({style:OPENFREE_STYLE,attributionControl:false});openFreeLayer.addTo(map);addOpenFreeAttribution()}catch{openFreeLayer=null;removeOpenFreeAttribution()}}
  function setMapStyle(style){clearOpenFree();legacySetMapStyle?.(style);if(style!=='satellite')setTimeout(applyOpenFree,20);updateChecks()}
  window.setAngelLogMapStyle=setMapStyle;

  function updateChecks(){if(!menu)return;const base=window.getAngelLogMapStyle?.()||'osm';menu.querySelectorAll('[data-map-layer]').forEach(b=>{const v=b.dataset.mapLayer,on=v==='depth'?depthActive:(!depthActive&&v===base);const c=b.querySelector('.check');if(c)c.textContent=on?'✓':''})}
  function setStatus(msg,type=''){if(!statusEl)return;statusEl.textContent=msg;statusEl.className='aa-map-depth-status'+(type?' '+type:'')}
  function addDepthAttribution(type){const map=window.aaMap;if(!map)return;if(type==='global'&&!globalDepthAttribution){try{map.attributionControl?.addAttribution('Bathymetrie © GEBCO Compilation Group 2026');globalDepthAttribution=true}catch{}}if(type==='official'&&!officialDepthAttribution){try{map.attributionControl?.addAttribution('Tiefendaten © LfU Brandenburg');officialDepthAttribution=true}catch{}}}
  function removeDepthAttributions(){const map=window.aaMap;if(map){if(globalDepthAttribution)try{map.attributionControl?.removeAttribution('Bathymetrie © GEBCO Compilation Group 2026')}catch{}if(officialDepthAttribution)try{map.attributionControl?.removeAttribution('Tiefendaten © LfU Brandenburg')}catch{}}globalDepthAttribution=false;officialDepthAttribution=false}
  function removeLayer(layer){const map=window.aaMap;if(layer&&map)try{map.removeLayer(layer)}catch{}}
  function clearDepth(){removeLayer(globalDepthLayer);removeLayer(officialDepthLayer);globalDepthLayer=null;officialDepthLayer=null;clearTimeout(refreshTimer);removeDepthAttributions()}
  function officialBounds(b){const n=Math.min(b.getNorth(),BB.n),s=Math.max(b.getSouth(),BB.s),e=Math.min(b.getEast(),BB.e),w=Math.max(b.getWest(),BB.w);return n>s&&e>w?{n,s,e,w,b}:null}
  function imageSize(map,bounds){const rect=map.getContainer().getBoundingClientRect(),fullW=Math.max(.001,bounds.getEast()-bounds.getWest()),fullH=Math.max(.001,bounds.getNorth()-bounds.getSouth());return {width:Math.max(320,Math.min(1100,Math.round(rect.width))),height:Math.max(320,Math.min(1100,Math.round(rect.height))),fullW,fullH,rect}}

  function refreshDepth(){
    if(!depthActive)return;const map=window.aaMap;if(!map)return;clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{
      if(!depthActive)return;const b=map.getBounds(),n=Math.min(90,b.getNorth()),s=Math.max(-90,b.getSouth()),w=Math.max(-180,b.getWest()),e=Math.min(360,b.getEast());if(n<=s||e<=w)return;
      const sz=imageSize(map,b),globalUrl=`/api/global-depth-map?n=${n.toFixed(6)}&s=${s.toFixed(6)}&e=${e.toFixed(6)}&w=${w.toFixed(6)}&width=${sz.width}&height=${sz.height}`;
      const globalNext=L.imageOverlay(globalUrl,L.latLngBounds([s,w],[n,e]),{opacity:.58,interactive:false,zIndex:410});
      setStatus(text('Weltweite Tiefenkarte wird geladen …','Loading worldwide depth map …'));
      globalNext.once('load',()=>{if(!depthActive){removeLayer(globalNext);return}if(globalDepthLayer&&globalDepthLayer!==globalNext)removeLayer(globalDepthLayer);globalDepthLayer=globalNext;addDepthAttribution('global');setStatus(text('Globale GEBCO-Tiefenkarte aktiv · nicht zur Navigation verwenden.','Global GEBCO depth map active · not for navigation.'),'ok');updateChecks()});
      globalNext.once('error',()=>{removeLayer(globalNext);setStatus(text('Globale Tiefenkarte konnte gerade nicht geladen werden.','Worldwide depth map could not be loaded right now.'),'warn')});globalNext.addTo(map);

      const x=officialBounds(b);if(!x){removeLayer(officialDepthLayer);officialDepthLayer=null;if(officialDepthAttribution){try{map.attributionControl?.removeAttribution('Tiefendaten © LfU Brandenburg')}catch{}officialDepthAttribution=false}return}
      const fullW=Math.max(.001,b.getEast()-b.getWest()),fullH=Math.max(.001,b.getNorth()-b.getSouth()),rect=map.getContainer().getBoundingClientRect();
      const width=Math.max(320,Math.min(1100,Math.round(rect.width*((x.e-x.w)/fullW)))),height=Math.max(320,Math.min(1100,Math.round(rect.height*((x.n-x.s)/fullH))));
      const officialUrl=`/api/depth-map?n=${x.n.toFixed(6)}&s=${x.s.toFixed(6)}&e=${x.e.toFixed(6)}&w=${x.w.toFixed(6)}&width=${width}&height=${height}`;
      const officialNext=L.imageOverlay(officialUrl,L.latLngBounds([x.s,x.w],[x.n,x.e]),{opacity:.84,interactive:false,zIndex:440});
      officialNext.once('load',()=>{if(!depthActive){removeLayer(officialNext);return}if(officialDepthLayer&&officialDepthLayer!==officialNext)removeLayer(officialDepthLayer);officialDepthLayer=officialNext;addDepthAttribution('official');setStatus(text('Globale Tiefenkarte + amtliche Brandenburg-Seenvermessung aktiv.','Global depth map + official Brandenburg lake survey active.'),'ok')});
      officialNext.once('error',()=>removeLayer(officialNext));officialNext.addTo(map)
    },170)
  }
  function selectLayer(type){const map=window.aaMap;if(!map)return;if(type==='depth'){depthActive=!depthActive;if(depthActive)refreshDepth();else{clearDepth();setStatus(text('Weltweite Bathymetrie verfügbar. Binnengewässer können außerhalb amtlicher Quellen grob sein.','Worldwide bathymetry available. Inland lake detail can be coarse without official surveys.'))}}else{depthActive=false;clearDepth();setMapStyle(type==='satellite'?'satellite':'osm');setStatus(text('Weltweite Bathymetrie verfügbar. Binnengewässer können außerhalb amtlicher Quellen grob sein.','Worldwide bathymetry available. Inland lake detail can be coarse without official surveys.'))}updateChecks();closeMenu()}
  function openMenu(){ensureMenu();if(!menu)return;menu.classList.remove('hidden');q('#aaSearchBtn')?.classList.add('aa-layer-menu-active');updateChecks()}
  function closeMenu(){menu?.classList.add('hidden');q('#aaSearchBtn')?.classList.remove('aa-layer-menu-active')}
  function toggleMenu(){ensureMenu();if(!menu)return;menu.classList.contains('hidden')?openMenu():closeMenu()}
  function boot(){addStyles();ensureMenu();const btn=q('#aaSearchBtn');if(!btn)return;btn.onclick=e=>{e.preventDefault();e.stopPropagation();toggleMenu()};btn.title=text('Kartenebenen','Map layers');btn.setAttribute('aria-label',btn.title);const layerBtn=q('#aaLayerBtn');if(layerBtn)layerBtn.onclick=()=>setMapStyle((window.getAngelLogMapStyle?.()||'osm')==='osm'?'satellite':'osm');const map=window.aaMap;if(map&&!map.__angelLogDepthEvents){map.__angelLogDepthEvents=true;map.on('moveend zoomend',()=>refreshDepth())}document.addEventListener('click',e=>{if(menu&&!menu.classList.contains('hidden')&&!menu.contains(e.target)&&e.target!==btn)closeMenu()});q('#aaSearch')?.addEventListener('keydown',e=>{if(e.key==='Enter')closeMenu()});if((window.getAngelLogMapStyle?.()||'osm')==='osm')setTimeout(applyOpenFree,20)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,80),{once:true});else setTimeout(boot,80);
  window.AngelLogMapLayers={refreshDepth,openMenu,closeMenu,applyOpenFree,get depthActive(){return depthActive}}
})();