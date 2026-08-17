(()=>{
  const q=s=>document.querySelector(s);
  const KEY='angellog_v6_preferences';
  const defaults={language:'de',default_catch_visibility:'public',share_exact_location:false,map_style:'osm',notify_forum:true,notify_waters:true,notify_moderation:true};
  let prefs={...defaults};
  let busy=false;

  const text={
    de:{settings:'Einstellungen',general:'Allgemein',language:'Sprache',map:'Startkarte',standard:'Standardkarte',sat:'Satellit',privacy:'Privatsphäre & Fänge',visibility:'Neue Fänge standardmäßig',public:'Öffentlich',private:'Privat',exact:'Genaue Fangposition teilen',notify:'Benachrichtigungen',forum:'Forum-Antworten',waters:'Gewässer-Updates',moderation:'Moderationshinweise',account:'Community & Konto',openNotify:'Benachrichtigungen öffnen',openRules:'Community-Regeln ansehen',login:'Anmelden',logout:'Abmelden',notLogged:'Nicht angemeldet',saved:'Gespeichert',reset:'Einstellungen zurücksetzen',about:'AngelLog v6 · Community Preview',navWaters:'Gewässer entdecken',navCatches:'Neueste Fänge',navConditions:'Angelbedingungen',navSettings:'Einstellungen',bottomWaters:'Gewässer',bottomCatches:'Fänge',bottomConditions:'Bedingungen',bottomMore:'Mehr',catchPublic:'Öffentlich · im Community-Feed sichtbar',catchPrivate:'Privat · nur für dich'},
    en:{settings:'Settings',general:'General',language:'Language',map:'Default map',standard:'Standard map',sat:'Satellite',privacy:'Privacy & catches',visibility:'New catches by default',public:'Public',private:'Private',exact:'Share exact catch location',notify:'Notifications',forum:'Forum replies',waters:'Water updates',moderation:'Moderation notices',account:'Community & account',openNotify:'Open notifications',openRules:'View community rules',login:'Sign in',logout:'Sign out',notLogged:'Not signed in',saved:'Saved',reset:'Reset settings',about:'AngelLog v6 · Community Preview',navWaters:'Discover waters',navCatches:'Latest catches',navConditions:'Fishing conditions',navSettings:'Settings',bottomWaters:'Waters',bottomCatches:'Catches',bottomConditions:'Conditions',bottomMore:'More',catchPublic:'Public · visible in the community feed',catchPrivate:'Private · only for you'}
  };
  const t=k=>(text[prefs.language]||text.de)[k]||k;

  function readLocal(){
    try{prefs={...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{prefs={...defaults}}
    if(!['de','en'].includes(prefs.language))prefs.language='de';
    if(!['public','private'].includes(prefs.default_catch_visibility))prefs.default_catch_visibility='public';
    if(!['osm','satellite'].includes(prefs.map_style))prefs.map_style='osm';
  }
  function writeLocal(){try{localStorage.setItem(KEY,JSON.stringify(prefs))}catch{}}

  async function loadAccountPrefs(){
    try{
      const {data:{session}}=await sb.auth.getSession();
      if(session?.user)window.aaUser=session.user;
      if(!window.aaUser)return;
      const {data,error}=await sb.from('user_preferences').select('language,default_catch_visibility,share_exact_location,map_style,notify_forum,notify_waters,notify_moderation').eq('user_id',aaUser.id).maybeSingle();
      if(!error&&data){prefs={...prefs,...data};writeLocal()}
    }catch{}
  }

  async function savePrefs(){
    if(busy)return;busy=true;writeLocal();window.angelLogPreferences={...prefs};
    try{
      if(window.aaUser){
        await sb.from('user_preferences').upsert({user_id:aaUser.id,language:prefs.language,default_catch_visibility:prefs.default_catch_visibility,share_exact_location:!!prefs.share_exact_location,map_style:prefs.map_style,notify_forum:!!prefs.notify_forum,notify_waters:!!prefs.notify_waters,notify_moderation:true,updated_at:new Date().toISOString()},{onConflict:'user_id'});
      }
      flashSaved();
    }catch{}
    busy=false;
  }

  window.getAngelLogPreferences=()=>({...prefs});

  function styles(){
    if(q('#settingsStableStyles'))return;
    const s=document.createElement('style');s.id='settingsStableStyles';s.textContent=`
      .set-wrap{padding:18px 16px 115px;max-width:720px;margin:auto}.set-title{font-size:12px;color:#929292;text-transform:uppercase;letter-spacing:.08em;margin:20px 2px 8px}.set-card{background:#292a2b;border:1px solid #454647;border-radius:10px;overflow:hidden;margin-bottom:18px}.set-row{display:flex;align-items:center;gap:12px;min-height:66px;padding:11px 14px;border-bottom:1px solid #404142}.set-row:last-child{border-bottom:0}.set-copy{flex:1;min-width:0}.set-copy b{display:block;color:#fff}.set-copy small{display:block;color:#999;line-height:1.35;margin-top:3px}.set-row select{max-width:160px;background:#202122;color:#fff;border:1px solid #555;border-radius:7px;padding:9px}.set-switch{position:relative;width:48px;height:28px;flex:0 0 auto}.set-switch input{opacity:0;width:0;height:0}.set-slider{position:absolute;inset:0;border-radius:999px;background:#555}.set-slider:before{content:'';position:absolute;width:22px;height:22px;left:3px;top:3px;border-radius:50%;background:#fff;transition:.15s}.set-switch input:checked+.set-slider{background:#58c900}.set-switch input:checked+.set-slider:before{transform:translateX(20px)}.set-switch input:disabled+.set-slider{opacity:.45}.set-action{width:100%;border:0;background:transparent;color:#fff;text-align:left;padding:16px 14px;border-bottom:1px solid #404142;font-size:15px}.set-action:last-child{border-bottom:0}.set-action.danger{color:#ff8e8e}.set-account{padding:14px;color:#aaa}.set-account b{display:block;color:#fff;margin-bottom:4px}.set-save{font-size:12px;color:#7bd13d;opacity:0}.set-save.show{opacity:1}
    `;document.head.appendChild(s)
  }

  function render(){
    const screen=q('#aaSettingsScreen');if(!screen)return;
    screen.innerHTML=`<header class="aa-topbar"><button class="aa-iconbtn" onclick="openDrawer()">☰</button><h1>${t('settings')}</h1><div id="setSaved" class="set-save">${t('saved')}</div></header><div class="set-wrap">
      <div class="set-title">${t('general')}</div><div class="set-card">
        <div class="set-row"><div class="set-copy"><b>${t('language')}</b><small>Deutsch / English</small></div><select id="setLanguage"><option value="de">Deutsch</option><option value="en">English</option></select></div>
        <div class="set-row"><div class="set-copy"><b>${t('map')}</b><small>${prefs.language==='en'?'Choose the default map view.':'Wähle die Standard-Kartenansicht.'}</small></div><select id="setMap"><option value="osm">${t('standard')}</option><option value="satellite">${t('sat')}</option></select></div>
      </div>
      <div class="set-title">${t('privacy')}</div><div class="set-card">
        <div class="set-row"><div class="set-copy"><b>${t('visibility')}</b><small>${prefs.language==='en'?'You can change this for each catch.':'Kann bei jedem Fang einzeln geändert werden.'}</small></div><select id="setVisibility"><option value="public">${t('public')}</option><option value="private">${t('private')}</option></select></div>
        <div class="set-row"><div class="set-copy"><b>${t('exact')}</b><small>${prefs.language==='en'?'Off by default.':'Standardmäßig ausgeschaltet.'}</small></div><label class="set-switch"><input id="setExact" type="checkbox"><span class="set-slider"></span></label></div>
      </div>
      <div class="set-title">${t('notify')}</div><div class="set-card">
        <div class="set-row"><div class="set-copy"><b>${t('forum')}</b><small>${prefs.language==='en'?'Replies to your discussions.':'Antworten auf deine Diskussionen.'}</small></div><label class="set-switch"><input id="setForum" type="checkbox"><span class="set-slider"></span></label></div>
        <div class="set-row"><div class="set-copy"><b>${t('waters')}</b><small>${prefs.language==='en'?'Updates for followed waters.':'Updates zu gefolgten Gewässern.'}</small></div><label class="set-switch"><input id="setWaters" type="checkbox"><span class="set-slider"></span></label></div>
        <div class="set-row"><div class="set-copy"><b>${t('moderation')}</b><small>${prefs.language==='en'?'Always enabled for account safety.':'Bleibt für die Kontosicherheit immer aktiv.'}</small></div><label class="set-switch"><input type="checkbox" checked disabled><span class="set-slider"></span></label></div>
      </div>
      <div class="set-title">${t('account')}</div><div class="set-card"><div id="setAccount" class="set-account"></div><button id="setNotifications" class="set-action">🔔 ${t('openNotify')}</button><button id="setRules" class="set-action">§ ${t('openRules')}</button><button id="setAuth" class="set-action"></button></div>
      <div class="set-title">AngelLog</div><div class="set-card"><div class="set-account"><b>${t('about')}</b><small>${window.aaUser?(prefs.language==='en'?'Preferences are synced with your account.':'Einstellungen werden mit deinem Konto synchronisiert.'):(prefs.language==='en'?'Guest settings stay on this device.':'Gast-Einstellungen bleiben auf diesem Gerät.')}</small></div><button id="setReset" class="set-action danger">↺ ${t('reset')}</button></div>
    </div>`;
    q('#setLanguage').value=prefs.language;q('#setMap').value=prefs.map_style;q('#setVisibility').value=prefs.default_catch_visibility;q('#setExact').checked=!!prefs.share_exact_location;q('#setForum').checked=!!prefs.notify_forum;q('#setWaters').checked=!!prefs.notify_waters;
    q('#setAccount').innerHTML=window.aaUser?`<b>${prefs.language==='en'?'Account':'Konto'}</b><small>${String(aaUser.email||'')}</small>`:`<b>${t('notLogged')}</b><small>${prefs.language==='en'?'Settings are stored locally.':'Einstellungen werden lokal gespeichert.'}</small>`;
    q('#setAuth').textContent=window.aaUser?'↪ '+t('logout'):'♙ '+t('login');
    bind();translateNav();syncCatchDialog()
  }

  function bind(){
    q('#setLanguage').onchange=async e=>{prefs.language=e.target.value;await savePrefs();render()};
    q('#setMap').onchange=async e=>{prefs.map_style=e.target.value;window.setAngelLogMapStyle?.(prefs.map_style);await savePrefs()};
    q('#setVisibility').onchange=async e=>{prefs.default_catch_visibility=e.target.value;syncCatchDialog();await savePrefs()};
    q('#setExact').onchange=async e=>{prefs.share_exact_location=e.target.checked;await savePrefs()};
    q('#setForum').onchange=async e=>{prefs.notify_forum=e.target.checked;await savePrefs()};
    q('#setWaters').onchange=async e=>{prefs.notify_waters=e.target.checked;await savePrefs()};
    q('#setNotifications').onclick=()=>window.showScreen?.('aaNotificationsScreen');
    q('#setRules').onclick=()=>window.showScreen?.('aaRulesScreen');
    q('#setAuth').onclick=async()=>{if(window.aaUser){await sb.auth.signOut();window.aaUser=null;render()}else q('#aaAuthBtn')?.click()};
    q('#setReset').onclick=async()=>{if(!confirm(prefs.language==='en'?'Reset settings?':'Einstellungen wirklich zurücksetzen?'))return;prefs={...defaults};window.setAngelLogMapStyle?.('osm');await savePrefs();render()}
  }

  function flashSaved(){const el=q('#setSaved');if(!el)return;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1000)}
  function setDirectText(el,value){if(el&&el.textContent!==value)el.textContent=value}
  function setButtonText(selector,value){const el=q(selector);if(!el)return;const node=[...el.childNodes].find(n=>n.nodeType===3&&n.nodeValue.trim());if(node&&node.nodeValue.trim()!==value)node.nodeValue=' '+value+' '}

  function translateNav(){
    document.documentElement.lang=prefs.language;
    setButtonText('.aa-menu button[data-screen="aaMapScreen"]',t('navWaters'));
    setButtonText('.aa-menu button[data-screen="aaFeedScreen"]',t('navCatches'));
    setButtonText('.aa-menu button[data-screen="aaConditionsScreen"]',t('navConditions'));
    setButtonText('.aa-menu button[data-screen="aaSettingsScreen"]',t('navSettings'));
    setButtonText('.aa-bottomnav button[data-screen="aaMapScreen"]',t('bottomWaters'));
    setButtonText('.aa-bottomnav button[data-screen="aaFeedScreen"]',t('bottomCatches'));
    setButtonText('.aa-bottomnav button[data-screen="aaConditionsScreen"]',t('bottomConditions'));
    setButtonText('.aa-bottomnav button[data-screen="aaSettingsScreen"]',t('bottomMore'));
    setDirectText(q('#aaMapScreen .aa-topbar h1'),prefs.language==='en'?'Waters':'Gewässer');
    setDirectText(q('#aaFeedScreen .aa-topbar h1'),prefs.language==='en'?'Latest catches':'Neueste Fänge');
  }

  function syncCatchDialog(){
    const el=q('#aaCatchVisibility');if(!el)return;
    el.value=prefs.default_catch_visibility;
    const pub=el.querySelector('option[value="public"]'),priv=el.querySelector('option[value="private"]');
    if(pub&&pub.textContent!==t('catchPublic'))pub.textContent=t('catchPublic');
    if(priv&&priv.textContent!==t('catchPrivate'))priv.textContent=t('catchPrivate')
  }

  async function boot(){
    styles();readLocal();await loadAccountPrefs();window.angelLogPreferences={...prefs};window.setAngelLogMapStyle?.(prefs.map_style);render();
    q('#aaPlus')?.addEventListener('click',()=>setTimeout(syncCatchDialog,30));
    sb.auth.onAuthStateChange(()=>setTimeout(async()=>{await loadAccountPrefs();render()},180));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,250));else setTimeout(boot,250)
})();