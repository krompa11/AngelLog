(()=>{
  const q=s=>document.querySelector(s);
  const safe=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  let token=0,filterMarker=null;
  const REF_FIELDS='display_name,country,state,manager_type,association,association_url,access_network,access_category,network_water_code,guest_card_available,guest_card_url,guest_card_info,official_url,access_source_name,access_source_url,access_verified_at';

  function normalizeName(v){return String(v||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE')}
  function safeUrl(v){try{const u=new URL(String(v||''),location.origin);return /^https?:$/.test(u.protocol)?u.href:''}catch{return''}}
  function fmtDate(v){if(!v)return'';try{return new Date(v).toLocaleDateString('de-DE')}catch{return''}}
  function managerLabel(v){return ({fishery_business:'Fischereibetrieb',association:'Angelverein / Verband',private:'Privat / Pächter',public:'Öffentliche Bewirtschaftung'})[v]||''}
  function hasAccessData(w){return !!(w&&(w.manager_type||w.access_network||w.access_category||w.network_water_code||w.association||w.guest_card_info||w.guest_card_url||w.access_source_name||w.guest_card_available===true||w.guest_card_available===false))}

  function styles(){
    if(q('#aaWaterAccessStyles'))return;
    const s=document.createElement('style');s.id='aaWaterAccessStyles';s.textContent=`
      .aa-access-card{margin:0 0 16px;border:1px solid #454748;border-radius:12px;background:#242526;overflow:hidden}.aa-access-head{display:flex;align-items:center;gap:9px;padding:13px 14px;border-bottom:1px solid #414243}.aa-access-head b{font-size:16px}.aa-access-badges{margin-left:auto;display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}.aa-access-badge{border:1px solid #555;border-radius:999px;padding:3px 7px;font-size:9px;font-weight:900;color:#bbb}.aa-access-badge.ok{border-color:#4f8f20;color:#83df3a;background:rgba(97,208,0,.08)}.aa-access-badge.lavb{border-color:#88722a;color:#f1d16c;background:rgba(160,126,25,.10)}
      .aa-access-grid{padding:4px 14px}.aa-access-row{display:grid;grid-template-columns:minmax(115px,.9fr) minmax(0,1.4fr);gap:12px;padding:10px 0;border-bottom:1px solid #383a3b;align-items:start}.aa-access-row:last-child{border-bottom:0}.aa-access-row span{color:#999;font-size:12px}.aa-access-row strong{color:#e8e8e8;font-size:13px;text-align:right;overflow-wrap:anywhere}.aa-access-row strong.good{color:#7bd633}.aa-access-row strong.warn{color:#d7ad43}
      .aa-access-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px 14px 13px;border-top:1px solid #414243}.aa-access-actions a{display:flex;align-items:center;justify-content:center;min-height:42px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:850}.aa-access-buy{background:#61d000;color:#fff}.aa-access-source{border:1px solid #555;color:#ddd;background:#303132}.aa-access-note{padding:0 14px 13px;color:#858687;font-size:10px;line-height:1.4}.aa-access-empty{padding:14px;color:#999;font-size:12px;line-height:1.45}
      #aaWaterFilterBtn{height:44px;border:1px solid #555;border-radius:9px;background:#2d2f30;color:#fff;padding:0 11px;font-weight:800;font-size:12px;white-space:nowrap}#aaWaterFilterBtn .pro{color:#f1d16c;font-size:9px;margin-left:4px}
      #aaWaterFilterPanel{position:absolute;z-index:1650;left:8px;right:8px;bottom:8px;max-height:min(72vh,620px);overflow:auto;background:#202223;border:1px solid #505253;border-radius:15px;box-shadow:0 16px 45px rgba(0,0,0,.58);padding:14px;color:#eee}#aaWaterFilterPanel.hidden{display:none}#aaWaterFilterPanel h3{margin:0;font-size:18px}#aaWaterFilterPanel .wf-head{display:flex;align-items:center;gap:8px;margin-bottom:11px}#aaWaterFilterPanel .wf-head b{color:#f1d16c;font-size:9px;border:1px solid #8a742a;border-radius:999px;padding:3px 7px}#aaWaterFilterClose{margin-left:auto;border:0;background:transparent;color:#ddd;font-size:25px}
      .wf-controls{display:grid;grid-template-columns:1fr;gap:8px}.wf-controls input,.wf-controls select{width:100%;box-sizing:border-box;border:1px solid #505253;border-radius:8px;background:#2a2c2d;color:#fff;padding:11px;font-size:13px}.wf-controls button{border:0;border-radius:8px;background:#61d000;color:#fff;padding:11px;font-weight:850}.wf-note{color:#8f9293;font-size:10px;line-height:1.4;margin:9px 0}.wf-results{display:grid;gap:7px}.wf-result{width:100%;text-align:left;border:1px solid #444748;border-radius:10px;background:#292b2c;color:#eee;padding:10px;cursor:pointer}.wf-result strong{display:block;font-size:13px;margin-bottom:4px}.wf-result small{display:block;color:#9da0a1;line-height:1.35}.wf-result .wf-tags{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px}.wf-tag{border:1px solid #555;border-radius:999px;padding:2px 6px;font-size:9px;color:#bbb}.wf-tag.ok{border-color:#4f8f20;color:#80dc37}.wf-tag.gold{border-color:#87712b;color:#f1d16c}.wf-empty{padding:16px 4px;color:#9da0a1;font-size:12px;text-align:center}
    `;document.head.appendChild(s)
  }

  function ensureUi(){
    styles();const panel=q('.aa-tabpanel[data-panel="info"]');if(!panel)return null;
    let card=q('#aaWaterAccessCard');if(card)return card;
    card=document.createElement('section');card.id='aaWaterAccessCard';card.className='aa-access-card';card.innerHTML='<div class="aa-access-empty">Bewirtschaftung und Angelkarten werden geprüft …</div>';
    panel.insertBefore(card,panel.firstChild);return card
  }

  function chooseUnique(rows,w){
    if(!rows?.length)return null;if(rows.length===1)return rows[0];
    const state=normalizeName(w?.state);if(state){const same=rows.filter(x=>normalizeName(x.state)===state);if(same.length===1)return same[0]}
    return null
  }

  async function referenceFor(w){
    const raw=String(w?.name||'').trim(),name=normalizeName(raw),country=w?.country||'DE';if(!name)return null;
    try{
      let r=await sb.from('water_access_reference').select(REF_FIELDS).eq('normalized_name',name).eq('country',country).limit(10);
      if(!r.error){const exact=chooseUnique(r.data,w);if(exact)return exact}
      if(raw.length<4)return null;
      for(const pattern of [`${raw},%`,`${raw} %`]){
        r=await sb.from('water_access_reference').select(REF_FIELDS).eq('country',country).ilike('display_name',pattern).limit(10);
        if(!r.error){const candidate=chooseUnique(r.data,w);if(candidate)return candidate}
      }
      return null
    }catch{return null}
  }

  async function resolveAccess(w){
    const ref=await referenceFor(w);
    if(!ref)return hasAccessData(w)?w:null;
    const merged={...w,...ref};
    if(w?.official_url)merged.official_url=w.official_url;
    if(w?.association_url&&!ref.association_url)merged.association_url=w.association_url;
    return merged
  }

  function render(w,a){
    const card=ensureUi();if(!card)return;
    if(!a){
      card.innerHTML='<div class="aa-access-head"><b>🎣 Bewirtschaftung & Angelkarten</b></div><div class="aa-access-empty">Für dieses Gewässer liegen noch keine verifizierten Angaben zu Bewirtschafter oder Angelkarten vor.<br><br><b>Keine Angabe bedeutet nicht, dass das Angeln frei erlaubt ist.</b></div>';
      const assoc=q('#aaAssociation');if(assoc)assoc.textContent='Noch nicht bestätigt';const guest=q('#aaGuest');if(guest){guest.textContent='Gastkarte nicht bestätigt';guest.classList.remove('aa-outline-green')}
      return
    }
    const manager=a.association||managerLabel(a.manager_type)||'Nicht bestätigt';
    const network=a.access_network||'Nicht bestätigt';
    const category=a.access_category||'Nicht bestätigt';
    const code=a.network_water_code||'–';
    const guest=a.guest_card_available===true?'✓ Verfügbar':a.guest_card_available===false?'Nicht verfügbar':'Nicht bestätigt';
    const guestClass=a.guest_card_available===true?'good':a.guest_card_available===null||a.guest_card_available===undefined?'warn':'';
    const source=a.access_source_name||'Nicht bestätigt',verified=fmtDate(a.access_verified_at);
    const buy=safeUrl(a.guest_card_url),sourceUrl=safeUrl(a.access_source_url||a.official_url||a.association_url);
    const badges=[a.access_network?`<span class="aa-access-badge ${/lavb/i.test(a.access_network)?'lavb':''}">${safe(a.access_network)}</span>`:'',a.access_source_name?'<span class="aa-access-badge ok">✓ geprüft</span>':''].join('');
    card.innerHTML=`<div class="aa-access-head"><b>🎣 Bewirtschaftung & Angelkarten</b><div class="aa-access-badges">${badges}</div></div><div class="aa-access-grid">
      <div class="aa-access-row"><span>Bewirtschafter</span><strong>${safe(manager)}</strong></div>
      <div class="aa-access-row"><span>Verband / Netz</span><strong>${safe(network)}</strong></div>
      <div class="aa-access-row"><span>Kategorie</span><strong>${safe(category)}</strong></div>
      <div class="aa-access-row"><span>Gewässer-Nr.</span><strong>${safe(code)}</strong></div>
      <div class="aa-access-row"><span>Gastkarte</span><strong class="${guestClass}">${safe(guest)}</strong></div>
      ${a.guest_card_info?`<div class="aa-access-row"><span>Karteninfo</span><strong>${safe(a.guest_card_info)}</strong></div>`:''}
      <div class="aa-access-row"><span>Quelle</span><strong>${safe(source)}${verified?` · geprüft ${safe(verified)}`:''}</strong></div>
    </div>${buy||sourceUrl?`<div class="aa-access-actions">${buy?`<a class="aa-access-buy" href="${safe(buy)}" target="_blank" rel="noopener noreferrer">Angelkarte kaufen</a>`:'<span></span>'}${sourceUrl?`<a class="aa-access-source" href="${safe(sourceUrl)}" target="_blank" rel="noopener noreferrer">Offizielle Quelle</a>`:''}</div>`:''}<div class="aa-access-note">Alle Angaben ohne Gewähr. Maßgeblich sind der aktuelle Erlaubnisschein, die Gewässerordnung und die Angaben des Fischereirechtsinhabers bzw. Bewirtschafters.</div>`;
    const assoc=q('#aaAssociation');if(assoc)assoc.textContent=manager;
    const guestEl=q('#aaGuest');if(guestEl){guestEl.textContent=a.guest_card_available===true?'✓ Gastkarten verfügbar':a.guest_card_available===false?'Gastkarten nicht verfügbar':'Gastkarte nicht bestätigt';guestEl.classList.toggle('aa-outline-green',a.guest_card_available===true)}
  }

  async function loadAccess(){
    const my=++token,card=ensureUi();if(card)card.innerHTML='<div class="aa-access-empty">Bewirtschaftung und Angelkarten werden geprüft …</div>';
    const w=window.aaCurrentWater;if(!w)return;
    const a=await resolveAccess(w);if(my!==token||window.aaCurrentWater?.id!==w.id)return;render(w,a)
  }

  async function hasPro(){
    for(let i=0;i<20&&!window.angelLogHasProAccess;i++)await new Promise(r=>setTimeout(r,100));
    try{return !!(await window.angelLogHasProAccess?.())}catch{return false}
  }

  async function requireFilterPro(){
    if(await hasPro())return true;
    if(window.angelLogRequirePro)await window.angelLogRequirePro('Erweiterte Gewässersuche');else window.openPro?.();
    return false
  }

  function ensureFilterUi(){
    styles();const mapBottom=q('.aa-map-bottom'),mapScreen=q('.aa-map-screen');if(!mapBottom||!mapScreen)return;
    let btn=q('#aaWaterFilterBtn');
    if(!btn){btn=document.createElement('button');btn.id='aaWaterFilterBtn';btn.type='button';btn.innerHTML='⚙ Filter <span class="pro">PRO</span>';const searchBtn=q('#aaSearchBtn');mapBottom.insertBefore(btn,searchBtn||null);btn.onclick=openFilter}
    if(!q('#aaWaterFilterPanel')){
      const p=document.createElement('section');p.id='aaWaterFilterPanel';p.className='hidden';p.innerHTML=`<div class="wf-head"><h3>Gewässerfilter</h3><b>PRO</b><button id="aaWaterFilterClose" type="button">×</button></div><div class="wf-controls"><input id="aaWaterFilterText" placeholder="Gewässername, z. B. Maxsee"><select id="aaWaterFilterType"><option value="all">Alle bestätigten Gewässer</option><option value="lavb">LAVB</option><option value="regular">LAVB · Verbandsgewässer</option><option value="contract">LAVB · Verbandsvertragsgewässer</option><option value="salmonid">LAVB · Salmonidengewässer</option><option value="fishery">Fischereibetrieb</option><option value="guest">Gastkarte verfügbar</option></select><button id="aaWaterFilterSearch" type="button">Gewässer suchen</button></div><div class="wf-note">Verifizierte Betreiber- und Karteninformationen. Bei LAVB-Gewässern springt AngelLog über die offizielle Gewässernummer zur hinterlegten Position.</div><div id="aaWaterFilterResults" class="wf-results"><div class="wf-empty">Filter auswählen oder einen Gewässernamen eingeben.</div></div>`;mapScreen.appendChild(p);
      q('#aaWaterFilterClose').onclick=()=>p.classList.add('hidden');q('#aaWaterFilterSearch').onclick=runFilter;q('#aaWaterFilterText').addEventListener('keydown',e=>{if(e.key==='Enter')runFilter()})
    }
  }

  async function openFilter(){
    if(!await requireFilterPro())return;ensureFilterUi();q('#aaWaterFilterPanel')?.classList.remove('hidden');setTimeout(()=>q('#aaWaterFilterText')?.focus(),60)
  }

  async function runFilter(){
    if(!await requireFilterPro())return;
    const results=q('#aaWaterFilterResults'),term=String(q('#aaWaterFilterText')?.value||'').trim(),type=q('#aaWaterFilterType')?.value||'all';
    if(type==='all'&&!term){results.innerHTML='<div class="wf-empty">Bitte einen Gewässernamen eingeben oder einen Filter auswählen.</div>';return}
    results.innerHTML='<div class="wf-empty">Gewässer werden gesucht …</div>';
    let query=sb.from('water_access_reference').select(REF_FIELDS).eq('country','DE');
    if(term)query=query.ilike('display_name',`%${term.replace(/[%_]/g,'')}%`);
    if(type==='lavb')query=query.eq('access_network','LAVB');
    if(type==='regular')query=query.eq('access_network','LAVB').eq('access_category','Verbandsgewässer');
    if(type==='contract')query=query.eq('access_network','LAVB').eq('access_category','Verbandsvertragsgewässer');
    if(type==='salmonid')query=query.eq('access_network','LAVB').eq('access_category','Salmonidengewässer');
    if(type==='fishery')query=query.eq('manager_type','fishery_business');
    if(type==='guest')query=query.eq('guest_card_available',true);
    const {data,error}=await query.order('display_name',{ascending:true}).limit(80);
    if(error){results.innerHTML='<div class="wf-empty">Filter konnte gerade nicht geladen werden.</div>';return}
    const rows=data||[];if(!rows.length){results.innerHTML='<div class="wf-empty">Keine passenden bestätigten Gewässer gefunden.</div>';return}
    results.innerHTML=rows.map((r,i)=>`<button class="wf-result" type="button" data-wf="${i}"><strong>${safe(r.display_name)}</strong><small>${safe(r.association||managerLabel(r.manager_type)||'Bewirtschaftung bestätigt')}${r.network_water_code?` · ${safe(r.network_water_code)}`:''}</small><span class="wf-tags">${r.access_network?`<i class="wf-tag gold">${safe(r.access_network)}</i>`:''}${r.access_category?`<i class="wf-tag">${safe(r.access_category)}</i>`:''}${r.guest_card_available===true?'<i class="wf-tag ok">Gastkarte</i>':''}</span></button>`).join('')+(rows.length===80?'<div class="wf-empty">Es werden die ersten 80 Treffer angezeigt. Suche genauer, um die Liste einzugrenzen.</div>':'');
    results.querySelectorAll('[data-wf]').forEach(b=>b.onclick=()=>focusReference(rows[Number(b.dataset.wf)]) )
  }

  async function focusReference(r){
    const panel=q('#aaWaterFilterPanel');
    try{
      let lat=null,lng=null,label=r.display_name;
      if(r.access_network==='LAVB'&&r.network_water_code){
        toast('Offizielle LAVB-Position wird geladen …');const res=await fetch('/api/lavb-water-detail?id='+encodeURIComponent(r.network_water_code),{cache:'default'}),d=await res.json();if(res.ok){lat=Number(d.latitude);lng=Number(d.longitude);label=d.name||label}
      }
      if(!Number.isFinite(lat)||!Number.isFinite(lng)){
        const res=await fetch('https://photon.komoot.io/api/?limit=3&lang=de&q='+encodeURIComponent(label+' Brandenburg'));const d=await res.json(),f=(d.features||[])[0];if(f){lng=Number(f.geometry.coordinates[0]);lat=Number(f.geometry.coordinates[1])}
      }
      if(!Number.isFinite(lat)||!Number.isFinite(lng))return toast('Für dieses Gewässer ist noch keine eindeutige Kartenposition verfügbar.');
      if(typeof aaMap==='undefined'||!aaMap)return;
      panel?.classList.add('hidden');aaMap.setView([lat,lng],14,{animate:true});
      if(filterMarker){try{filterMarker.remove()}catch{}}
      filterMarker=L.marker([lat,lng]).addTo(aaMap).bindPopup(`<div style="min-width:190px"><b>${safe(label)}</b><div style="color:#999;margin-top:4px">${safe(r.access_category||r.access_network||managerLabel(r.manager_type)||'Gewässer')}</div>${r.network_water_code?`<div style="margin-top:4px">Nr. ${safe(r.network_water_code)}</div>`:''}${r.guest_card_available===true?'<div style="color:#61d000;margin-top:5px">✓ Gastkarte verfügbar</div>':''}</div>`).openPopup();
    }catch{toast('Gewässerposition konnte nicht geladen werden.')}
  }

  function hookOpenWater(){
    const fn=window.openWater;if(typeof fn!=='function'||fn.__waterAccess)return;
    const wrapped=async function(){const r=await fn.apply(this,arguments);setTimeout(loadAccess,50);return r};wrapped.__waterAccess=true;window.openWater=wrapped
  }
  function boot(){ensureUi();ensureFilterUi();hookOpenWater();setTimeout(hookOpenWater,600);setTimeout(()=>{if(window.aaCurrentWater)loadAccess()},900)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,350),{once:true});else setTimeout(boot,350);
  window.AngelLogWaterAccess={load:loadAccess,openFilter,runFilter}
})();
