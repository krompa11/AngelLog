(()=>{
  const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
  const KEY='angellog_v6_preferences';
  let prefs=null, saving=false, applyingLanguage=false;

  const defaults=()=>({
    language:(navigator.language||'de').toLowerCase().startsWith('en')?'en':'de',
    default_catch_visibility:'public',
    share_exact_location:false,
    map_style:'osm',
    notify_forum:true,
    notify_waters:true,
    notify_moderation:true
  });

  const T={
    de:{
      settings:'Einstellungen',general:'Allgemein',language:'Sprache',languageSub:'Sprache für Navigation und zentrale App-Bereiche.',map:'Startkarte',mapSub:'Welche Kartenansicht AngelLog standardmäßig verwendet.',osm:'Standardkarte',satellite:'Satellit',privacy:'Privatsphäre & Fänge',visibility:'Neue Fänge standardmäßig',visibilitySub:'Du kannst die Sichtbarkeit bei jedem Fang noch ändern.',public:'Öffentlich',private:'Privat',exact:'Genaue Fangposition teilen',exactSub:'Bleibt standardmäßig aus. Nur relevant, wenn später eine genaue Fangposition erfasst wird.',notifications:'Benachrichtigungen',forumNotify:'Forum-Antworten',forumNotifySub:'Hinweise bei Antworten auf eigene Diskussionen.',waterNotify:'Gewässer-Updates',waterNotifySub:'Hinweise zu gefolgten Gewässern, wenn solche Updates verfügbar sind.',modNotify:'Moderationshinweise',modNotifySub:'Verwarnungen, Sperren und Einspruchsentscheidungen bleiben aus Sicherheitsgründen immer aktiv.',community:'Community & Konto',openNotifications:'Benachrichtigungen öffnen',openRules:'Community-Regeln ansehen',logout:'Abmelden',login:'Anmelden',notLogged:'Nicht angemeldet',account:'Konto',stored:'Einstellungen werden mit deinem AngelLog-Konto synchronisiert.',local:'Als Gast werden Einstellungen nur auf diesem Gerät gespeichert.',reset:'Einstellungen zurücksetzen',resetSub:'Setzt Sprache, Karte und Standardwerte auf den Ausgangszustand zurück.',about:'Über AngelLog',version:'AngelLog v6 · Community Preview',saved:'Gespeichert',saveError:'Konnte nicht gespeichert werden',resetConfirm:'Einstellungen wirklich zurücksetzen?',catchPublic:'Öffentlich · im Community-Feed sichtbar',catchPrivate:'Privat · nur für dich',catchHint:'Sichtbarkeit für diesen Fang',navWaters:'Gewässer entdecken',navCatches:'Neueste Fänge',navConditions:'Angelbedingungen',navForum:'Forum',navProfile:'Mein Profil',navSettings:'Einstellungen',navRules:'Community-Regeln',navNotifications:'Benachrichtigungen',navAdmin:'Admin & Meldungen',bottomWaters:'Gewässer',bottomCatches:'Fänge',bottomConditions:'Bedingungen',bottomMore:'Mehr',mapTitle:'Gewässer',feedTitle:'Neueste Fänge',conditionsTitle:'Bedingungen'
    },
    en:{
      settings:'Settings',general:'General',language:'Language',languageSub:'Language for navigation and key app areas.',map:'Default map',mapSub:'Which map view AngelLog should use by default.',osm:'Standard map',satellite:'Satellite',privacy:'Privacy & catches',visibility:'New catches by default',visibilitySub:'You can still change visibility for each catch.',public:'Public',private:'Private',exact:'Share exact catch location',exactSub:'Off by default. Only applies when an exact catch position is recorded.',notifications:'Notifications',forumNotify:'Forum replies',forumNotifySub:'Alerts for replies to your own discussions.',waterNotify:'Water updates',waterNotifySub:'Alerts for followed waters when those updates are available.',modNotify:'Moderation notices',modNotifySub:'Warnings, suspensions and appeal decisions always stay enabled for safety.',community:'Community & account',openNotifications:'Open notifications',openRules:'View community rules',logout:'Sign out',login:'Sign in',notLogged:'Not signed in',account:'Account',stored:'Settings are synced with your AngelLog account.',local:'As a guest, settings are stored only on this device.',reset:'Reset settings',resetSub:'Resets language, map and default values.',about:'About AngelLog',version:'AngelLog v6 · Community Preview',saved:'Saved',saveError:'Could not save',resetConfirm:'Reset settings?',catchPublic:'Public · visible in the community feed',catchPrivate:'Private · only for you',catchHint:'Visibility for this catch',navWaters:'Discover waters',navCatches:'Latest catches',navConditions:'Fishing conditions',navForum:'Forum',navProfile:'My profile',navSettings:'Settings',navRules:'Community rules',navNotifications:'Notifications',navAdmin:'Admin & reports',bottomWaters:'Waters',bottomCatches:'Catches',bottomConditions:'Conditions',bottomMore:'More',mapTitle:'Waters',feedTitle:'Latest catches',conditionsTitle:'Conditions'
    }
  };

  function tr(k){return T[prefs?.language||'de']?.[k]||T.de[k]||k}
  function loadLocal(){try{return {...defaults(),...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return defaults()}}
  function saveLocal(){try{localStorage.setItem(KEY,JSON.stringify(prefs))}catch{}}

  async function loadPreferences(){
    prefs=loadLocal();
    if(window.aaUser){
      const {data,error}=await sb.from('user_preferences').select('language,default_catch_visibility,share_exact_location,map_style,notify_forum,notify_waters,notify_moderation').eq('user_id',aaUser.id).maybeSingle();
      if(!error&&data){prefs={...prefs,...data};saveLocal()}
      else if(!error&&!data)await persist(false)
    }
    window.angelLogPreferences={...prefs};
    return prefs
  }

  async function persist(show=true){
    if(saving)return;saving=true;saveLocal();window.angelLogPreferences={...prefs};
    let error=null;
    if(window.aaUser){
      const r=await sb.from('user_preferences').upsert({user_id:aaUser.id,language:prefs.language,default_catch_visibility:prefs.default_catch_visibility,share_exact_location:!!prefs.share_exact_location,map_style:prefs.map_style,notify_forum:!!prefs.notify_forum,notify_waters:!!prefs.notify_waters,notify_moderation:true,updated_at:new Date().toISOString()},{onConflict:'user_id'});error=r.error
    }
    saving=false;if(show)flashSaved(!error);return !error
  }

  window.getAngelLogPreferences=()=>({...prefs||loadLocal()});

  function injectStyles(){if(q('#settingsV6Styles'))return;const s=document.createElement('style');s.id='settingsV6Styles';s.textContent=`
    .settings-v6{padding:18px 16px 120px;max-width:760px;margin:auto}.settings-card{background:#292a2b;border:1px solid #454647;border-radius:10px;margin:12px 0 20px;overflow:hidden}.settings-section-title{margin:22px 2px 9px;color:#9b9b9b;font-size:13px;text-transform:uppercase;letter-spacing:.08em}.settings-row{display:flex;align-items:center;gap:14px;min-height:68px;padding:12px 14px;border-bottom:1px solid #404142}.settings-row:last-child{border-bottom:0}.settings-copy{min-width:0;flex:1}.settings-copy b{display:block;color:#fff;font-size:16px;margin-bottom:3px}.settings-copy small{display:block;color:#a9a9a9;line-height:1.35}.settings-control select{max-width:165px;background:#202122;color:#fff;border:1px solid #555;border-radius:7px;padding:9px 30px 9px 10px}.settings-switch{position:relative;width:48px;height:28px;flex:0 0 auto}.settings-switch input{opacity:0;width:0;height:0}.settings-slider{position:absolute;inset:0;border-radius:999px;background:#555;transition:.18s}.settings-slider:before{content:'';position:absolute;width:22px;height:22px;left:3px;top:3px;border-radius:50%;background:#fff;transition:.18s}.settings-switch input:checked+.settings-slider{background:#58c900}.settings-switch input:checked+.settings-slider:before{transform:translateX(20px)}.settings-switch input:disabled+.settings-slider{opacity:.45}.settings-action{width:100%;text-align:left;border:0;background:transparent;color:#fff;padding:17px 14px;font-size:16px;border-bottom:1px solid #404142;display:flex;align-items:center;justify-content:space-between;gap:10px}.settings-action:last-child{border-bottom:0}.settings-action span:last-child{color:#888}.settings-action.danger{color:#ff8f8f}.settings-account{padding:14px}.settings-account b{display:block;color:#fff}.settings-account small{display:block;color:#aaa;margin-top:4px;overflow-wrap:anywhere}.settings-save{font-size:12px;color:#8ddb58;opacity:0;transition:.2s}.settings-save.show{opacity:1}.settings-save.error{color:#ff8c8c}.settings-info{padding:14px;color:#aaa;line-height:1.5}.settings-info b{color:#fff}.settings-privacy-note{margin:8px 0 0;color:#888;font-size:12px;line-height:1.45}.settings-badge{font-size:11px;border:1px solid #555;border-radius:999px;padding:4px 8px;color:#bbb}.settings-select-full{width:100%;background:#202122;color:#fff;border:1px solid #555;border-radius:7px;padding:11px;margin-top:9px}
  `;document.head.appendChild(s)}

  function render(){
    const screen=q('#aaSettingsScreen');if(!screen)return;
    screen.innerHTML=`<header class="aa-topbar"><button class="aa-iconbtn" onclick="openDrawer()">☰</button><h1>${tr('settings')}</h1><div id="settingsSaveState" class="settings-save">${tr('saved')}</div></header><div class="settings-v6">
      <div class="settings-section-title">${tr('general')}</div><div class="settings-card">
        <div class="settings-row"><div class="settings-copy"><b>${tr('language')}</b><small>${tr('languageSub')}</small></div><div class="settings-control"><select id="settingLanguage"><option value="de">Deutsch</option><option value="en">English</option></select></div></div>
        <div class="settings-row"><div class="settings-copy"><b>${tr('map')}</b><small>${tr('mapSub')}</small></div><div class="settings-control"><select id="settingMap"><option value="osm">${tr('osm')}</option><option value="satellite">${tr('satellite')}</option></select></div></div>
      </div>
      <div class="settings-section-title">${tr('privacy')}</div><div class="settings-card">
        <div class="settings-row"><div class="settings-copy"><b>${tr('visibility')}</b><small>${tr('visibilitySub')}</small></div><div class="settings-control"><select id="settingVisibility"><option value="public">${tr('public')}</option><option value="private">${tr('private')}</option></select></div></div>
        <div class="settings-row"><div class="settings-copy"><b>${tr('exact')}</b><small>${tr('exactSub')}</small></div><label class="settings-switch"><input id="settingExact" type="checkbox"><span class="settings-slider"></span></label></div>
      </div>
      <div class="settings-section-title">${tr('notifications')}</div><div class="settings-card">
        <div class="settings-row"><div class="settings-copy"><b>${tr('forumNotify')}</b><small>${tr('forumNotifySub')}</small></div><label class="settings-switch"><input id="settingForumNotify" type="checkbox"><span class="settings-slider"></span></label></div>
        <div class="settings-row"><div class="settings-copy"><b>${tr('waterNotify')}</b><small>${tr('waterNotifySub')}</small></div><label class="settings-switch"><input id="settingWaterNotify" type="checkbox"><span class="settings-slider"></span></label></div>
        <div class="settings-row"><div class="settings-copy"><b>${tr('modNotify')}</b><small>${tr('modNotifySub')}</small></div><label class="settings-switch"><input type="checkbox" checked disabled><span class="settings-slider"></span></label></div>
      </div>
      <div class="settings-section-title">${tr('community')}</div><div class="settings-card">
        <div id="settingsAccount" class="settings-account"></div>
        <button id="settingsNotificationsBtn" class="settings-action"><span>🔔 ${tr('openNotifications')}</span><span>›</span></button>
        <button id="settingsRulesBtn" class="settings-action"><span>§ ${tr('openRules')}</span><span>›</span></button>
        <button id="settingsAuthAction" class="settings-action"><span></span><span>›</span></button>
      </div>
      <div class="settings-section-title">${tr('about')}</div><div class="settings-card">
        <div class="settings-info"><b>${tr('version')}</b><div style="margin-top:6px">${window.aaUser?tr('stored'):tr('local')}</div></div>
        <button id="settingsReset" class="settings-action danger"><span>${tr('reset')}</span><span>↺</span></button>
      </div>
    </div>`;
    bind();syncControls();renderAccount();applyLanguage();syncCatchDialog()
  }

  function bind(){
    q('#settingLanguage').onchange=e=>change('language',e.target.value,true);
    q('#settingMap').onchange=e=>change('map_style',e.target.value,true);
    q('#settingVisibility').onchange=e=>change('default_catch_visibility',e.target.value,true);
    q('#settingExact').onchange=e=>change('share_exact_location',e.target.checked,true);
    q('#settingForumNotify').onchange=e=>change('notify_forum',e.target.checked,true);
    q('#settingWaterNotify').onchange=e=>change('notify_waters',e.target.checked,true);
    q('#settingsRulesBtn').onclick=()=>window.showScreen&&showScreen('aaRulesScreen');
    q('#settingsNotificationsBtn').onclick=()=>window.showScreen&&showScreen('aaNotificationsScreen');
    q('#settingsAuthAction').onclick=async()=>{if(window.aaUser){await sb.auth.signOut();aaUser=null;toast(prefs.language==='en'?'Signed out.':'Abgemeldet.');render()}else q('#aaAuthBtn')?.click()};
    q('#settingsReset').onclick=async()=>{if(!confirm(tr('resetConfirm')))return;prefs=defaults();await persist(false);applyAll();render();flashSaved(true)}
  }

  async function change(key,val,rerender=false){prefs[key]=val;if(key==='notify_moderation')prefs.notify_moderation=true;applyAll();await persist();if(rerender&&key==='language')render();else syncCatchDialog()}
  function syncControls(){if(!prefs)return;const v={settingLanguage:prefs.language,settingMap:prefs.map_style,settingVisibility:prefs.default_catch_visibility};for(const [id,val] of Object.entries(v)){const el=q('#'+id);if(el)el.value=val}if(q('#settingExact'))q('#settingExact').checked=!!prefs.share_exact_location;if(q('#settingForumNotify'))q('#settingForumNotify').checked=!!prefs.notify_forum;if(q('#settingWaterNotify'))q('#settingWaterNotify').checked=!!prefs.notify_waters}
  function renderAccount(){const box=q('#settingsAccount'),btn=q('#settingsAuthAction');if(!box||!btn)return;if(window.aaUser){box.innerHTML=`<b>${tr('account')}</b><small>${String(aaUser.email||'')}</small>`;btn.querySelector('span').textContent='↪ '+tr('logout')}else{box.innerHTML=`<b>${tr('notLogged')}</b><small>${tr('local')}</small>`;btn.querySelector('span').textContent='♙ '+tr('login')}}
  function flashSaved(ok){const el=q('#settingsSaveState');if(!el)return;el.textContent=ok?tr('saved'):tr('saveError');el.classList.toggle('error',!ok);el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),1500)}

  function setButtonLabel(el,text){if(!el)return;const nodes=[...el.childNodes].filter(n=>n.nodeType===3);if(nodes.length){if(nodes[0].nodeValue.trim()!==text)nodes[0].nodeValue=' '+text+' '}else if(!el.children.length&&el.textContent!==text)el.textContent=text}
  function applyLanguage(){
    if(!prefs||applyingLanguage)return;applyingLanguage=true;document.documentElement.lang=prefs.language;
    const drawer={aaFeedScreen:'navCatches',aaConditionsScreen:'navConditions',aaMapScreen:'navWaters',aaSettingsScreen:'navSettings'};for(const [screen,key] of Object.entries(drawer)){setButtonLabel(q(`.aa-menu button[data-screen="${screen}"]`),tr(key))}
    setButtonLabel(q('#aaAuthBtn'),window.aaUser?(aaUser.email||tr('navProfile')):tr('login'));
    setButtonLabel(q('.aa-menu button[data-screen="aaForumScreen"]'),tr('navForum'));setButtonLabel(q('.aa-menu button[data-screen="aaRulesScreen"]'),tr('navRules'));setButtonLabel(q('#notifyMenuBtn'),tr('navNotifications'));setButtonLabel(q('#aaAdminMenu'),tr('navAdmin'));
    setButtonLabel(q('.aa-bottomnav button[data-screen="aaMapScreen"]'),tr('bottomWaters'));setButtonLabel(q('.aa-bottomnav button[data-screen="aaFeedScreen"]'),tr('bottomCatches'));setButtonLabel(q('.aa-bottomnav button[data-screen="aaConditionsScreen"]'),tr('bottomConditions'));setButtonLabel(q('.aa-bottomnav button[data-screen="aaSettingsScreen"]'),tr('bottomMore'));
    const heads=[['#aaMapScreen .aa-topbar h1','mapTitle'],['#aaFeedScreen .aa-topbar h1','feedTitle'],['#aaConditionsScreen .aa-topbar h1','conditionsTitle'],['#aaSettingsScreen .aa-topbar h1','settings']];for(const [sel,key] of heads){const el=q(sel);if(el&&el.textContent!==tr(key))el.textContent=tr(key)}
    const cv=q('#aaCatchVisibility');if(cv){cv.querySelector('option[value="public"]').textContent=tr('catchPublic');cv.querySelector('option[value="private"]').textContent=tr('catchPrivate')}const hint=q('#aaCatchPrivacyHint');if(hint)hint.textContent=tr('catchHint');
    applyingLanguage=false
  }

  function syncCatchDialog(){const el=q('#aaCatchVisibility');if(el){el.value=prefs?.default_catch_visibility||'public';const pub=el.querySelector('option[value="public"]'),priv=el.querySelector('option[value="private"]');if(pub)pub.textContent=tr('catchPublic');if(priv)priv.textContent=tr('catchPrivate')}const hint=q('#aaCatchPrivacyHint');if(hint)hint.textContent=tr('catchHint')}
  function applyAll(){if(!prefs)return;window.angelLogPreferences={...prefs};window.setAngelLogMapStyle?.(prefs.map_style);applyLanguage();syncCatchDialog()}

  async function authChanged(){await loadPreferences();applyAll();render()}

  async function boot(){injectStyles();await loadPreferences();applyAll();render();q('#aaPlus')?.addEventListener('click',()=>setTimeout(syncCatchDialog,20));const observer=new MutationObserver(()=>{applyLanguage();syncCatchDialog()});observer.observe(document.body,{childList:true,subtree:true});sb.auth.onAuthStateChange(()=>setTimeout(authChanged,180))}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,900));else setTimeout(boot,900)
})();