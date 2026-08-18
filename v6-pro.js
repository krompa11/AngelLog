(()=>{
  const FEATURES=[
    ['Fänge teilen, liken und kommentieren',1],
    ['Digitales Fangbuch mit Basisstatistik',1],
    ['Gewässersuche und allgemeine Gewässerinfos',1],
    ['Community und Bewertungen',1],
    ['Fangorte auf der Karte sehen und nach Fischart filtern',0],
    ['Tiefenkarten und erweiterte Karten-Layer',0],
    ['Detaillierte Fangstatistiken für Gewässer und Fischarten',0],
    ['Beste Köder und Angelmethoden je Gewässer',0],
    ['Angelwetter mit Mehrtagesvorhersage',0],
    ['Pegelstände und Wasserstandstrends',0],
    ['48h Fangfaktor mit besten Fangzeiten',0],
    ['Erweiterte Gewässersuche mit Filtern',0],
    ['Pro-Benachrichtigungen für Lieblingsgewässer',0]
  ];
  let selectedPlan='yearly',entitlement={tier:'free',status:'inactive',admin:false,serverAccess:false},entitlementLoaded=false,entitlementPromise=null;
  const $=s=>document.querySelector(s);
  function money(){return selectedPlan==='yearly'?'34,99 €':'4,99 €'}
  function inject(){
    if($('#aaProScreen'))return;
    const s=document.createElement('section');s.id='aaProScreen';s.className='aa-screen hidden pro-page';
    s.innerHTML=`<header class="pro-head"><button id="proClose" class="pro-close">×</button><h1>AngelLog Pro</h1><span id="proStatus" class="pro-status-pill">FREE</span></header>
      <div class="pro-hero"><div class="pro-medal">✺</div><div class="pro-title">Hol dir AngelLog Pro</div><div class="pro-sub">Mehr Fangwissen für jedes Gewässer: Tiefen, Fangzeiten, Köder, Methoden, Wetter und Pegel.</div></div>
      <div class="pro-preview">
        <div class="pro-preview-card"><div class="pro-preview-visual depth"></div><h3>Fangorte & Tiefenkarten</h3><p>Erweiterte Kartenebenen, Fischartenfilter und eigene sowie verfügbare Tiefendaten.</p></div>
        <div class="pro-preview-card"><div class="pro-preview-visual stats"><div class="pro-donut"></div></div><h3>Köder- & Methodenstatistik</h3><p>Erkenne, welche Köder und Methoden an einem Gewässer in den AngelLog-Communitydaten besonders häufig erfolgreich waren.</p></div>
      </div>
      <div class="pro-matrix"><div class="pro-matrix-title"><h2>ALLE PRO FUNKTIONEN</h2><div class="pro-cols"><span class="pro-col">Free</span><span class="pro-col pro">Pro</span></div></div><div id="proRows"></div></div>
      <div class="pro-note">Die angezeigten Fangstatistiken basieren auf öffentlichen AngelLog-Communitydaten. Der Fangfaktor wird als heuristische Prognose aus Wetter-, Zeit-, Pegel- und Communitydaten berechnet und ist keine Fanggarantie. Store-Abos werden erst zur Veröffentlichung über Apple App Store bzw. Google Play aktiviert.</div>
      <div class="pro-prices"><div class="pro-price-grid"><button id="proMonthly" class="pro-price"><strong>4,99 €</strong><span>pro Monat</span></button><button id="proYearly" class="pro-price active"><b class="pro-save">Spare ca. 42 %</b><strong>34,99 €</strong><span>pro Jahr</span></button></div><button id="proBuy" class="pro-buy">Jahresabo auswählen</button></div>`;
    const plus=$('#aaPlus');(plus?.parentNode||document.body).insertBefore(s,plus||null);
    $('#proRows').innerHTML=FEATURES.map(([name,free])=>`<div class="pro-row"><span>${name}</span><span>${free?'<i class="pro-check">✓</i>':'<i class="pro-lock">▢</i>'}</span><span><i class="pro-check">✓</i></span></div>`).join('');
    $('#proClose').onclick=closePro;$('#proMonthly').onclick=()=>selectPlan('monthly');$('#proYearly').onclick=()=>selectPlan('yearly');$('#proBuy').onclick=buyPreview;
    document.querySelectorAll('.aa-pro,.aa-gold').forEach(el=>{el.style.cursor='pointer';el.addEventListener('click',openPro)});
    injectLocks();
  }
  function injectLocks(){
    const water=$('#aaWaterScreen');if(water&&!water.querySelector('.pro-water-locks')){
      const wrap=document.createElement('div');wrap.className='pro-water-locks aa-tabbody';wrap.innerHTML=`
        <div class="pro-lock-card"><span class="badge">PRO · 48H</span><h3>Fangfaktor & beste Fangzeiten</h3><p>Heute, morgen und die nächsten 48 Stunden mit Zeitfenstern, Wetter, Luftdruck, Wind und – wo vorhanden – Pegeltrend.</p><div class="pro-mini-bars"><i style="height:28%"></i><i style="height:42%"></i><i style="height:58%"></i><i style="height:74%"></i><i style="height:52%"></i><i style="height:82%"></i><i style="height:64%"></i></div><button data-open-pro>Pro-Fangfaktor freischalten</button></div>
        <div class="pro-lock-card"><span class="badge">PRO · STATISTIK</span><h3>Beste Köder & Methoden</h3><p>Vergleiche Spinning, Grund, Pose, Vertikal und weitere Methoden sowie die erfolgreichsten Köder je Fischart und Gewässer.</p><button data-open-pro>Detaillierte Statistik freischalten</button></div>`;
      const factor=water.querySelector('.aa-factor');factor?.insertAdjacentElement('afterend',wrap);
    }
    document.querySelectorAll('[data-open-pro]').forEach(b=>b.onclick=openPro);
  }
  function selectPlan(p){selectedPlan=p;$('#proMonthly')?.classList.toggle('active',p==='monthly');$('#proYearly')?.classList.toggle('active',p==='yearly');if($('#proBuy'))$('#proBuy').textContent=p==='yearly'?'Jahresabo auswählen':'Monatsabo auswählen'}
  function isPro(){return entitlement.serverAccess===true||entitlement.admin===true||(entitlement.tier==='pro'&&['active','trialing','grace_period'].includes(entitlement.status)&&(!entitlement.current_period_end||new Date(entitlement.current_period_end).getTime()>Date.now()))}
  function emitEntitlement(){try{window.dispatchEvent(new CustomEvent('angelLog:entitlement',{detail:{...entitlement,isPro:isPro()}}))}catch{}}
  function setStatus(){const p=$('#proStatus');if(p){p.textContent=entitlement.admin?'ADMIN · PRO':(isPro()?'PRO AKTIV':'FREE');p.classList.toggle('on',isPro());if($('#proBuy'))$('#proBuy').textContent=entitlement.admin?'Admin: alle Pro-Funktionen aktiv':(isPro()?'Pro ist auf diesem Konto aktiv':(selectedPlan==='yearly'?'Jahresabo auswählen':'Monatsabo auswählen'))}emitEntitlement()}
  async function loadEntitlement(force=false){
    if(entitlementPromise&&!force)return entitlementPromise;
    entitlementPromise=(async()=>{
      try{
        const {data:{session}}=await sb.auth.getSession();
        if(!session?.user){entitlement={tier:'free',status:'inactive',admin:false,serverAccess:false};entitlementLoaded=true;setStatus();return entitlement}
        const [accessRes,adminRes,subRes]=await Promise.all([
          sb.rpc('has_active_pro'),
          sb.rpc('is_admin'),
          sb.from('subscription_entitlements').select('tier,plan,status,current_period_end,provider,product_id').eq('user_id',session.user.id).maybeSingle()
        ]);
        const serverAccess=accessRes.data===true,admin=adminRes.data===true,sub=subRes.data||null;
        if(admin)entitlement={...(sub||{}),tier:'pro',plan:sub?.plan||'yearly',status:'active',current_period_end:null,admin:true,serverAccess:true};
        else if(serverAccess)entitlement={...(sub||{}),tier:'pro',status:sub?.status||'active',admin:false,serverAccess:true};
        else entitlement={...(sub||{tier:'free',status:'inactive'}),admin:false,serverAccess:false};
      }catch{entitlement={tier:'free',status:'inactive',admin:false,serverAccess:false}}
      entitlementLoaded=true;setStatus();return entitlement
    })();
    try{return await entitlementPromise}finally{entitlementPromise=null}
  }
  async function hasProAccess(){if(!entitlementLoaded)await loadEntitlement();return isPro()}
  async function requirePro(feature='Diese Funktion'){
    if(await hasProAccess())return true;
    toast(`${feature} ist nur mit AngelLog Pro verfügbar.`);openPro();return false
  }
  function openPro(){inject();showScreen('aaProScreen');$('.aa-bottomnav')?.classList.add('hidden');$('#aaPlus')?.classList.add('hidden');window.scrollTo({top:0,behavior:'instant'});loadEntitlement(true)}
  function closePro(){showScreen('aaMapScreen');$('.aa-bottomnav')?.classList.remove('hidden');$('#aaPlus')?.classList.remove('hidden')}
  function buyPreview(){if(entitlement.admin)return toast('Admin-Konto: alle Pro-Funktionen sind freigeschaltet.');if(isPro())return toast('AngelLog Pro ist bereits aktiv.');toast(`${money()} · Store-Kauf wird beim App-Release aktiviert.`)}
  function loadProGates(){if(document.querySelector('script[data-pro-gates="1"]'))return;const s=document.createElement('script');s.src='/v6-pro-gates.js?v=admin4';s.defer=true;s.dataset.proGates='1';document.body.appendChild(s)}
  window.openPro=openPro;window.angelLogIsPro=isPro;window.angelLogHasProAccess=hasProAccess;window.angelLogRequirePro=requirePro;window.angelLogRefreshPro=()=>loadEntitlement(true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{inject();loadEntitlement();loadProGates()});else{inject();loadEntitlement();loadProGates()}
  try{sb.auth.onAuthStateChange(()=>{entitlementLoaded=false;loadEntitlement(true)})}catch{}
})();