(()=>{
  const q=s=>document.querySelector(s);
  const safe=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const fmt=d=>d?new Date(d).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'–';
  let admin=false, searchTimer=null;

  function injectStyles(){if(q('#userModStyles'))return;const s=document.createElement('style');s.id='userModStyles';s.textContent=`
    .user-mod-box{margin:26px 0 32px;padding-top:22px;border-top:1px solid #4b4c4d}.user-mod-box h2{margin:0 0 5px}.user-mod-sub{color:#aaa;margin:0 0 14px;line-height:1.45}.user-mod-search{display:flex;gap:8px;margin-bottom:14px}.user-mod-search input{flex:1;min-width:0;background:#202122;color:#fff;border:1px solid #555;border-radius:7px;padding:12px}.user-mod-search button{border:0;border-radius:7px;background:#58c900;color:#fff;padding:0 15px;font-weight:800}.user-card{background:#292a2b;border:1px solid #464748;border-radius:9px;padding:14px;margin:9px 0}.user-card-head{display:flex;gap:10px;align-items:flex-start}.user-card-avatar{width:42px;height:42px;border-radius:50%;background:#1d1e1f;display:grid;place-items:center;font-weight:900;font-size:18px;flex:0 0 auto}.user-card-name{min-width:0;flex:1}.user-card-name b{display:block;color:#fff;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.user-card-name small{display:block;color:#999;margin-top:3px;overflow-wrap:anywhere}.user-mod-flags{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.user-flag{font-size:11px;border-radius:999px;padding:4px 8px;background:#393a3b;color:#ccc;border:1px solid #555}.user-flag.warn{color:#ffd45b;border-color:#8c741c}.user-flag.ban{color:#ff9b9b;border-color:#8c3d3d;background:#3b2626}.user-flag.ok{color:#85dc46;border-color:#48792a}.user-mod-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.user-mod-actions button{border:1px solid #606162;background:#222324;color:#eee;border-radius:6px;padding:8px 10px;font-size:12px}.user-mod-actions .warn{border-color:#987d20;color:#ffd45b}.user-mod-actions .ban{border-color:#9a4141;color:#ff9b9b}.user-mod-actions .good{border-color:#4c862d;color:#8be34d}.user-mod-empty{color:#999;padding:14px 0}.mod-user-overlay{position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:6000;display:grid;place-items:end center}.mod-user-modal{position:relative;width:min(100%,620px);max-height:90vh;overflow:auto;background:#353637;color:#fff;border-radius:16px 16px 0 0;padding:22px}.mod-user-modal h2{margin:0 45px 5px 0}.mod-user-modal p{color:#aaa;line-height:1.45}.mod-user-modal label{display:block;color:#bbb;font-size:13px;margin:13px 0 5px}.mod-user-modal textarea,.mod-user-modal select{width:100%;box-sizing:border-box;background:#202122;color:#fff;border:1px solid #555;border-radius:7px;padding:11px}.mod-user-modal textarea{min-height:110px;resize:vertical}.mod-user-close{position:absolute;right:16px;top:16px;border:0;background:#222;color:#fff;border-radius:50%;width:38px;height:38px;font-size:22px}.mod-user-submit{width:100%;border:0;border-radius:7px;padding:14px;margin-top:14px;font-size:16px;font-weight:900;background:#58c900;color:#fff}.mod-user-submit.danger{background:#b63c3c}.mod-history-row{border-bottom:1px solid #4a4b4c;padding:12px 0}.mod-history-row b{display:block}.mod-history-row small{color:#999}.mod-history-row p{margin:5px 0;color:#ccc}.mod-self-banner{position:fixed;left:12px;right:12px;top:12px;z-index:6500;background:#3b2626;color:#fff;border:1px solid #9a4141;border-radius:10px;padding:13px 42px 13px 14px;box-shadow:0 8px 28px rgba(0,0,0,.4)}.mod-self-banner.warning{background:#3b351f;border-color:#987d20}.mod-self-banner b{display:block;margin-bottom:4px}.mod-self-banner small{color:#ddd;line-height:1.4}.mod-self-close{position:absolute;right:10px;top:9px;border:0;background:transparent;color:#fff;font-size:22px}
  `;document.head.appendChild(s)}

  async function isAdmin(){if(!window.aaUser)return false;const {data}=await sb.from('user_roles').select('role').eq('user_id',aaUser.id).maybeSingle();admin=data?.role==='admin';return admin}

  function injectAdminUsers(){
    const wrap=q('#aaAdminScreen .admin-wrap');if(!wrap||q('#adminUsersBox'))return false;
    const box=document.createElement('section');box.id='adminUsersBox';box.className='user-mod-box';box.innerHTML=`<h2>Nutzer verwalten</h2><p class="user-mod-sub">Verwarnungen und Kontosperren für Community-Bereiche. Lesen und der Zugriff auf das eigene Konto bleiben möglich.</p><div class="user-mod-search"><input id="adminUserSearch" placeholder="Name oder E-Mail suchen"><button id="adminUserSearchBtn">Suchen</button></div><div id="adminUserResults" class="user-mod-empty">Nutzer werden geladen …</div>`;
    wrap.insertBefore(box,wrap.firstChild);
    q('#adminUserSearchBtn').onclick=searchUsers;
    q('#adminUserSearch').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(searchUsers,350)});
    searchUsers();return true;
  }

  async function searchUsers(){
    if(!admin&&!await isAdmin())return;
    const el=q('#adminUserResults');if(!el)return;el.innerHTML='<div class="user-mod-empty">Nutzer werden geladen …</div>';
    const term=q('#adminUserSearch')?.value.trim()||'';
    const {data,error}=await sb.rpc('admin_search_users',{p_query:term});
    if(error){el.innerHTML=`<div class="user-mod-empty">${safe(error.message)}</div>`;return}
    const rows=data||[];if(!rows.length){el.innerHTML='<div class="user-mod-empty">Keine Nutzer gefunden.</div>';return}
    el.innerHTML=rows.map(userCard).join('');
    el.querySelectorAll('[data-mod-action]').forEach(b=>b.onclick=()=>{const u=rows.find(x=>x.user_id===b.dataset.user);if(!u)return;const a=b.dataset.modAction;if(a==='history')openHistory(u);else if(a==='unsuspend')openAction(u,'unsuspend');else if(a==='warning')openAction(u,'warning');else if(a==='temporary')openAction(u,'temporary');else if(a==='permanent')openAction(u,'permanent')});
  }

  function userCard(u){
    const name=u.display_name||u.username||u.email||'Nutzer',own=window.aaUser?.id===u.user_id;
    const status=u.suspended?(u.permanent?'Dauerhaft gesperrt':`Gesperrt bis ${fmt(u.suspended_until)}`):'Aktiv';
    return `<article class="user-card"><div class="user-card-head"><div class="user-card-avatar">${safe(name.slice(0,1).toUpperCase())}</div><div class="user-card-name"><b>${safe(name)}${own?' · Du':''}</b><small>${safe(u.email||'')}</small></div></div><div class="user-mod-flags"><span class="user-flag ${u.suspended?'ban':'ok'}">${safe(status)}</span><span class="user-flag ${u.warning_count?'warn':''}">${Number(u.warning_count||0)} Verwarnungen</span>${u.moderation_reason?`<span class="user-flag">Grund: ${safe(u.moderation_reason)}</span>`:''}</div><div class="user-mod-actions">${own?'':`<button class="warn" data-mod-action="warning" data-user="${u.user_id}">Verwarnen</button><button class="ban" data-mod-action="temporary" data-user="${u.user_id}">Temporär sperren</button><button class="ban" data-mod-action="permanent" data-user="${u.user_id}">Dauerhaft sperren</button>${u.suspended?`<button class="good" data-mod-action="unsuspend" data-user="${u.user_id}">Entsperren</button>`:''}`}<button data-mod-action="history" data-user="${u.user_id}">Verlauf</button></div></article>`
  }

  function openAction(u,type){
    q('#modUserOverlay')?.remove();const name=u.display_name||u.username||u.email||'Nutzer';
    const titles={warning:'Nutzer verwarnen',temporary:'Nutzer temporär sperren',permanent:'Nutzer dauerhaft sperren',unsuspend:'Nutzer entsperren'};
    const danger=type==='temporary'||type==='permanent';
    const o=document.createElement('div');o.id='modUserOverlay';o.className='mod-user-overlay';o.innerHTML=`<div class="mod-user-modal"><button class="mod-user-close">×</button><h2>${titles[type]}</h2><p><b>${safe(name)}</b><br>${safe(u.email||'')}</p>${type==='temporary'?`<label>Dauer</label><select id="modDays"><option value="1">1 Tag</option><option value="3">3 Tage</option><option value="7" selected>7 Tage</option><option value="14">14 Tage</option><option value="30">30 Tage</option><option value="90">90 Tage</option></select>`:''}<label>${type==='unsuspend'?'Notiz':'Begründung'}</label><textarea id="modReason" placeholder="${type==='unsuspend'?'Warum wird die Sperre aufgehoben?':'Konkreter Grund für die Moderationsmaßnahme …'}"></textarea><button id="modSubmit" class="mod-user-submit ${danger?'danger':''}">${titles[type]}</button></div>`;document.body.appendChild(o);
    const close=()=>o.remove();o.querySelector('.mod-user-close').onclick=close;o.onclick=e=>{if(e.target===o)close()};q('#modSubmit').onclick=()=>submitAction(u,type)
  }

  async function submitAction(u,type){
    const reason=q('#modReason')?.value.trim()||'';if(type!=='unsuspend'&&reason.length<3)return toast('Bitte eine Begründung eingeben.');const btn=q('#modSubmit');btn.disabled=true;
    let r;if(type==='warning')r=await sb.rpc('admin_warn_user',{p_user_id:u.user_id,p_reason:reason});else if(type==='temporary')r=await sb.rpc('admin_suspend_user',{p_user_id:u.user_id,p_reason:reason,p_days:Number(q('#modDays').value)});else if(type==='permanent')r=await sb.rpc('admin_suspend_user',{p_user_id:u.user_id,p_reason:reason,p_days:null});else r=await sb.rpc('admin_unsuspend_user',{p_user_id:u.user_id,p_reason:reason||'Sperre aufgehoben'});
    btn.disabled=false;if(r.error)return toast(r.error.message);q('#modUserOverlay')?.remove();toast(type==='warning'?'Verwarnung gespeichert.':type==='unsuspend'?'Nutzer entsperrt.':'Nutzer gesperrt.');searchUsers()
  }

  async function openHistory(u){
    q('#modUserOverlay')?.remove();const name=u.display_name||u.username||u.email||'Nutzer';const {data,error}=await sb.from('user_moderation_actions').select('action,reason,expires_at,created_at').eq('target_user_id',u.user_id).order('created_at',{ascending:false}).limit(100);
    const labels={warning:'Verwarnung',temporary_suspension:'Temporäre Sperre',permanent_suspension:'Dauerhafte Sperre',unsuspend:'Entsperrt'};
    const o=document.createElement('div');o.id='modUserOverlay';o.className='mod-user-overlay';o.innerHTML=`<div class="mod-user-modal"><button class="mod-user-close">×</button><h2>Moderationsverlauf</h2><p>${safe(name)}</p>${error?`<div class="user-mod-empty">${safe(error.message)}</div>`:(data||[]).map(a=>`<div class="mod-history-row"><b>${safe(labels[a.action]||a.action)}</b><small>${fmt(a.created_at)}${a.expires_at?` · bis ${fmt(a.expires_at)}`:''}</small><p>${safe(a.reason)}</p></div>`).join('')||'<div class="user-mod-empty">Noch keine Maßnahmen.</div>'}</div>`;document.body.appendChild(o);o.querySelector('.mod-user-close').onclick=()=>o.remove();o.onclick=e=>{if(e.target===o)o.remove()}
  }

  async function showOwnStatus(){
    q('#modSelfBanner')?.remove();if(!window.aaUser)return;const {data,error}=await sb.rpc('get_my_moderation_status');if(error)return;const s=Array.isArray(data)?data[0]:data;if(!s)return;
    if(!s.suspended&&!Number(s.warning_count||0))return;
    const b=document.createElement('div');b.id='modSelfBanner';b.className='mod-self-banner '+(s.suspended?'':'warning');
    const title=s.suspended?(s.permanent?'Dein Community-Zugang ist dauerhaft gesperrt':`Dein Community-Zugang ist bis ${fmt(s.suspended_until)} gesperrt`):`Du hast ${Number(s.warning_count)} Verwarnung${Number(s.warning_count)===1?'':'en'}`;
    b.innerHTML=`<button class="mod-self-close">×</button><b>${safe(title)}</b><small>${safe(s.reason||'Bitte beachte die AngelLog Community-Regeln.')} ${s.suspended?'Du kannst weiterhin Inhalte lesen, aber keine neuen Community-Beiträge veröffentlichen.':''}</small>`;document.body.appendChild(b);b.querySelector('button').onclick=()=>b.remove()
  }

  async function boot(){injectStyles();for(let i=0;i<30&&!q('#aaAdminScreen');i++)await new Promise(r=>setTimeout(r,100));admin=await isAdmin();if(admin)injectAdminUsers();showOwnStatus();const menu=q('#aaAdminMenu');if(menu)menu.addEventListener('click',()=>setTimeout(()=>{injectAdminUsers();searchUsers()},40));sb.auth.onAuthStateChange(()=>setTimeout(async()=>{admin=await isAdmin();if(admin)injectAdminUsers();showOwnStatus()},120))}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,180));else setTimeout(boot,180)
})();