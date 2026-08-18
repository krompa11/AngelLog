(()=>{
  const q=s=>document.querySelector(s);
  const safe=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  let token=0;
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

  function hookOpenWater(){
    const fn=window.openWater;if(typeof fn!=='function'||fn.__waterAccess)return;
    const wrapped=async function(){const r=await fn.apply(this,arguments);setTimeout(loadAccess,50);return r};wrapped.__waterAccess=true;window.openWater=wrapped
  }
  function boot(){ensureUi();hookOpenWater();setTimeout(hookOpenWater,600);setTimeout(()=>{if(window.aaCurrentWater)loadAccess()},900)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,350),{once:true});else setTimeout(boot,350);
  window.AngelLogWaterAccess={load:loadAccess}
})();