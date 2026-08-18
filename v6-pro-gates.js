(()=>{
  const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
  let pro=false,ready=false,applying=false,scheduled=false;
  const PRO_STYLE_ID='aaProGateStyles';

  function styles(){
    if(q('#'+PRO_STYLE_ID))return;
    const s=document.createElement('style');s.id=PRO_STYLE_ID;s.textContent=`
      .aa-pro-ui-locked{position:relative;opacity:.82}.aa-pro-ui-locked .aa-pro-tag,.aa-pro-tag{display:inline-flex;align-items:center;border:1px solid #9a7d1d;border-radius:999px;padding:2px 6px;color:#f1d16c;background:rgba(120,92,10,.16);font-size:9px;font-weight:900;letter-spacing:.05em;margin-left:6px;vertical-align:middle}
      .aa-pro-gate-card{margin:10px 0 4px;padding:14px;border:1px solid #5a512a;border-radius:10px;background:linear-gradient(135deg,rgba(68,58,24,.55),rgba(36,37,38,.96));color:#ddd}.aa-pro-gate-card b{display:block;color:#f1d16c;font-size:14px;margin-bottom:5px}.aa-pro-gate-card small{color:#aaa;line-height:1.4}.aa-pro-gate-card button{margin-top:10px;width:100%;border:0;border-radius:7px;padding:10px;background:#61d000;color:#fff;font-weight:800}
      .aa-pro-free-hidden{display:none!important}.set-row.aa-pro-setting-locked{opacity:.78}.set-row.aa-pro-setting-locked .set-copy b:after{content:' PRO';color:#f1d16c;font-size:10px;margin-left:6px}.set-row.aa-pro-setting-locked select,.set-row.aa-pro-setting-locked input{cursor:not-allowed}
    `;document.head.appendChild(s)
  }

  async function getPro(){
    for(let i=0;i<25&&!window.angelLogHasProAccess;i++)await new Promise(r=>setTimeout(r,100));
    try{return !!(await window.angelLogHasProAccess?.())}catch{return false}
  }
  async function requirePro(name){
    if(pro)return true;
    if(window.angelLogRequirePro)return window.angelLogRequirePro(name);
    window.openPro?.();return false
  }
  function tagButton(btn){
    if(!btn)return;
    btn.classList.toggle('aa-pro-ui-locked',!pro);
    let tag=btn.querySelector('.aa-pro-tag');
    if(!pro&&!tag){
      const b=btn.querySelector('b');
      if(b){tag=document.createElement('span');tag.className='aa-pro-tag';tag.textContent='PRO';b.appendChild(tag)}
    }
    if(pro)tag?.remove()
  }
  function gateMap(){
    qa('[data-map-layer="satellite"],[data-map-layer="depth"]').forEach(tagButton);
    const layer=q('#aaLayerBtn');
    if(layer){layer.title=pro?'Satellit':'Satellit · PRO';layer.setAttribute('aria-label',layer.title);layer.classList.toggle('aa-pro-ui-locked',!pro)}
    if(!pro&&window.getAngelLogMapStyle?.()==='satellite')window.setAngelLogMapStyle?.('osm')
  }
  function gateSettings(){
    const map=q('#setMap'),exact=q('#setExact'),waters=q('#setWaters');
    if(map){const sat=map.querySelector('option[value="satellite"]');if(sat)sat.textContent=pro?'Satellit':'Satellit · PRO';map.closest('.set-row')?.classList.toggle('aa-pro-setting-locked',!pro)}
    if(exact){if(!pro)exact.checked=false;exact.disabled=!pro;exact.closest('.set-row')?.classList.toggle('aa-pro-setting-locked',!pro)}
    if(waters){if(!pro)waters.checked=false;waters.disabled=!pro;waters.closest('.set-row')?.classList.toggle('aa-pro-setting-locked',!pro)}
  }
  function ensureGate(host,id,title,copy){
    if(!host)return;
    let el=q('#'+id);
    if(pro){el?.remove();return}
    if(!el){
      el=document.createElement('div');el.id=id;el.className='aa-pro-gate-card';
      el.innerHTML=`<b>🔒 ${title} · PRO</b><small>${copy}</small><button type="button">AngelLog Pro ansehen</button>`;
      el.querySelector('button').onclick=()=>requirePro(title);
      host.appendChild(el)
    }
  }
  function gateIntel(){
    const stats=q('#intelStats'),statsBody=q('#intelStatsBody');
    if(stats&&statsBody){statsBody.classList.toggle('aa-pro-free-hidden',!pro);ensureGate(stats,'aaProStatsGate','Köder- & Methodenstatistik','Detaillierte Fangstatistiken, beste Köder und erfolgreiche Methoden je Gewässer sind Pro-Funktionen.')}
    const forecast=q('#intelForecast'),forecastBody=q('#intelForecastBody');
    if(forecast&&forecastBody){
      forecastBody.querySelector('.intel-weather-bars')?.classList.toggle('aa-pro-free-hidden',!pro);
      forecastBody.querySelector('.intel-days')?.classList.toggle('aa-pro-free-hidden',!pro);
      ensureGate(forecast,'aaProForecastGate','48h Fangfaktor & Mehrtageswetter','Aktuelle Bedingungen bleiben frei. Beste Fangzeiten, Mehrtagesvorhersage und 48h-Auswertung gehören zu AngelLog Pro.')
    }
    q('#aaBars')?.classList.toggle('aa-pro-free-hidden',!pro);
    q('.pro-water-locks')?.classList.toggle('aa-pro-free-hidden',pro)
  }
  function apply(){
    if(applying||!ready)return;
    applying=true;
    try{styles();gateMap();gateSettings();gateIntel()}finally{applying=false}
  }
  function scheduleApply(delay=40){
    if(scheduled)return;
    scheduled=true;
    setTimeout(()=>{scheduled=false;apply()},delay)
  }
  async function refreshAccess(){pro=await getPro();ready=true;apply()}

  document.addEventListener('click',async e=>{
    if(!pro){
      const advanced=e.target.closest?.('[data-map-layer="satellite"],[data-map-layer="depth"],#aaLayerBtn');
      if(advanced){
        e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
        await requirePro(advanced.matches?.('[data-map-layer="depth"]')?'Tiefenkarten':'Erweiterte Karten-Layer');
        return
      }
    }
    scheduleApply(80)
  },true);

  document.addEventListener('change',async e=>{
    if(!pro){
      if(e.target?.id==='setMap'&&e.target.value==='satellite'){
        e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();e.target.value='osm';window.setAngelLogMapStyle?.('osm');await requirePro('Satellit und erweiterte Karten-Layer');return
      }
      if((e.target?.id==='setExact'||e.target?.id==='setWaters')&&e.target.checked){
        e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();e.target.checked=false;await requirePro(e.target.id==='setExact'?'Fangorte auf der Karte':'Pro-Benachrichtigungen für Lieblingsgewässer');return
      }
    }
    scheduleApply(80)
  },true);

  window.addEventListener('angelLog:entitlement',e=>{pro=!!e.detail?.isPro;ready=true;apply()});
  window.addEventListener('hashchange',()=>scheduleApply(80));

  function hookShowScreen(){
    const fn=window.showScreen;
    if(typeof fn!=='function'||fn.__proGateWrapped)return;
    const wrapped=function(){const r=fn.apply(this,arguments);scheduleApply(100);return r};
    wrapped.__proGateWrapped=true;window.showScreen=wrapped
  }
  function boot(){
    styles();hookShowScreen();refreshAccess();
    setTimeout(()=>{hookShowScreen();scheduleApply(0)},1000);
    setTimeout(()=>scheduleApply(0),3500)
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,900),{once:true});else setTimeout(boot,900);
  window.AngelLogProGates={refresh:refreshAccess,apply,get pro(){return pro}}
})();