(()=>{
  const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
  const safe=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const RULES_VERSION='2026-08-18';
  let admin=false,rulesCache=[];

  async function refreshRole(){
    if(!window.aaUser){admin=false;paintAdmin();return false}
    const {data}=await sb.from('user_roles').select('role').eq('user_id',aaUser.id).maybeSingle();
    admin=data?.role==='admin';paintAdmin();return admin
  }

  async function loadRules(){
    if(rulesCache.length)return rulesCache;
    const {data}=await sb.from('community_rules').select('id,rule_key,title,body,sort_order').eq('active',true).order('sort_order');
    rulesCache=data||[];return rulesCache
  }

  function injectStyles(){if(q('#adminRulesStyles'))return;const s=document.createElement('style');s.id='adminRulesStyles';s.textContent=`
    .rules-wrap,.admin-wrap{padding:22px 20px 110px;max-width:760px;margin:auto}.rules-hero{background:#303132;border-bottom:1px solid #444;padding:20px;margin:-22px -20px 20px}.rules-hero h2{margin:0 0 8px;font-size:26px}.rules-hero p{margin:0;color:#bbb;line-height:1.5}.rule-card{background:#292a2b;border:1px solid #454647;border-radius:8px;padding:16px;margin:10px 0}.rule-card b{display:block;color:#fff;font-size:17px;margin-bottom:7px}.rule-card p{margin:0;color:#c8c8c8;line-height:1.55}.rules-note{color:#999;font-size:13px;line-height:1.45;margin-top:18px}.admin-badge{display:inline-flex;align-items:center;gap:5px;color:#161616;background:#f5c400;border-radius:5px;padding:3px 7px;font-size:11px;font-weight:800}.mod-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.mod-btn{border:1px solid #666;background:#28292a;color:#eee;border-radius:5px;padding:7px 10px;font-size:12px}.mod-btn.danger{border-color:#a84040;color:#ff8e8e}.mod-btn.lock{border-color:#d2a500;color:#ffd640}.report-btn{border:0;background:transparent;color:#999;padding:5px 0;font-size:12px;text-decoration:underline}.rules-overlay{position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:5000;display:grid;place-items:end center}.rules-modal{width:min(100%,620px);max-height:88vh;overflow:auto;background:#353637;color:#fff;border-radius:16px 16px 0 0;padding:22px}.rules-modal h2{margin:0 40px 8px 0}.rules-modal-close{position:absolute;right:18px;top:18px;border:0;background:#222;color:#fff;border-radius:50%;width:38px;height:38px;font-size:22px}.rules-accept{width:100%;border:0;border-radius:7px;padding:15px;background:#58c900;color:#fff;font-weight:800;font-size:17px;margin-top:15px}.admin-report{background:#292a2b;border:1px solid #444;border-radius:8px;padding:14px;margin:10px 0}.admin-report b{color:#fff}.admin-report small{color:#999;display:block;margin:5px 0}.admin-report p{color:#ccc}.admin-report-actions{display:flex;gap:8px}.admin-report-actions button{border:0;border-radius:5px;padding:8px 10px}.admin-resolve{background:#58c900;color:#fff}.admin-dismiss{background:#555;color:#fff}
  `;document.head.appendChild(s)}

  function injectScreens(){
    if(q('#aaRulesScreen'))return;
    const app=q('.aa-app'),plus=q('#aaPlus');
    const rules=document.createElement('section');rules.id='aaRulesScreen';rules.className='aa-screen hidden';rules.innerHTML=`<header class="aa-topbar"><button class="aa-iconbtn" onclick="openDrawer()">☰</button><h1>Community-Regeln</h1><div></div></header><div class="rules-wrap"><div class="rules-hero"><h2>Fair am Wasser. Fair in der Community.</h2><p>Diese Regeln gelten für Forum, Kommentare, Fangmeldungen, Profile und alle anderen Community-Bereiche von AngelLog.</p></div><div id="rulesList">Regeln werden geladen …</div><p class="rules-note">Bei schweren oder wiederholten Verstößen können Inhalte entfernt, Diskussionen gesperrt und Konten eingeschränkt werden. Entscheidungen der Moderation werden nicht automatisch durch einzelne Meldungen ausgelöst.</p></div>`;
    app.insertBefore(rules,plus);
    const adminScreen=document.createElement('section');adminScreen.id='aaAdminScreen';adminScreen.className='aa-screen hidden';adminScreen.innerHTML=`<header class="aa-topbar"><button class="aa-iconbtn" onclick="openDrawer()">☰</button><h1>Admin</h1><div class="admin-badge">ADMIN</div></header><div class="admin-wrap"><h2>Moderation</h2><p style="color:#aaa">Offene Meldungen aus der Community.</p><div id="adminReports">Meldungen werden geladen …</div></div>`;app.insertBefore(adminScreen,plus);
    const menu=q('.aa-menu');if(menu){const settings=qa('.aa-menu button').find(b=>/Einstellungen/i.test(b.textContent));const rb=document.createElement('button');rb.dataset.screen='aaRulesScreen';rb.innerHTML='<span>§</span>Community-Regeln';menu.insertBefore(rb,settings||null);rb.addEventListener('click',()=>setTimeout(renderRules,20));const ab=document.createElement('button');ab.id='aaAdminMenu';ab.dataset.screen='aaAdminScreen';ab.style.display='none';ab.innerHTML='<span>⚑</span>Admin & Meldungen';menu.insertBefore(ab,settings||null);ab.addEventListener('click',()=>setTimeout(loadReports,20))}
  }

  async function renderRules(){const rows=await loadRules(),el=q('#rulesList');if(!el)return;el.innerHTML=rows.map((r,i)=>`<div class="rule-card"><b>${i+1}. ${safe(r.title)}</b><p>${safe(r.body)}</p></div>`).join('')}
  function paintAdmin(){const m=q('#aaAdminMenu');if(m)m.style.display=admin?'flex':'none';const label=q('#aaAuthLabel');if(label&&admin&&!label.textContent.includes('Admin'))label.textContent=(aaUser?.email||'Profil')+' · Admin'}

  window.ensureCommunityRulesAccepted=async function(){
    if(!aaUser){toast('Bitte zuerst anmelden.');return false}
    const {data}=await sb.from('rule_acceptances').select('rules_version').eq('user_id',aaUser.id).maybeSingle();
    if(data?.rules_version===RULES_VERSION)return true;
    const rows=await loadRules();q('#rulesAcceptanceOverlay')?.remove();
    return await new Promise(resolve=>{const o=document.createElement('div');o.id='rulesAcceptanceOverlay';o.className='rules-overlay';o.innerHTML=`<div class="rules-modal" style="position:relative"><button class="rules-modal-close">×</button><h2>Community-Regeln akzeptieren</h2><p style="color:#bbb">Bevor du selbst Beiträge veröffentlichst, bestätige bitte unser Regelwerk.</p>${rows.map((r,i)=>`<div class="rule-card"><b>${i+1}. ${safe(r.title)}</b><p>${safe(r.body)}</p></div>`).join('')}<button class="rules-accept">Regeln akzeptieren & fortfahren</button></div>`;document.body.appendChild(o);const close=()=>{o.remove();resolve(false)};o.querySelector('.rules-modal-close').onclick=close;o.addEventListener('click',e=>{if(e.target===o)close()});o.querySelector('.rules-accept').onclick=async()=>{const {error}=await sb.from('rule_acceptances').upsert({user_id:aaUser.id,rules_version:RULES_VERSION,accepted_at:new Date().toISOString()},{onConflict:'user_id'});if(error){toast(error.message);return}o.remove();toast('Community-Regeln akzeptiert.');resolve(true)}})
  };

  window.reportContent=async function(type,id){
    if(!aaUser)return toast('Bitte zuerst anmelden.');
    const reason=prompt('Warum möchtest du diesen Inhalt melden?\n(z. B. Beleidigung, Spam, Drohung, falscher Inhalt)');if(!reason)return;
    const details=prompt('Optional: kurze Erklärung')||null;
    const {error}=await sb.from('content_reports').insert({reporter_id:aaUser.id,target_type:type,target_id:id,reason,details});
    toast(error?error.message:'Inhalt wurde der Moderation gemeldet.')
  };

  async function deleteThread(id){if(!admin)return;if(!confirm('Dieses Thema wirklich löschen? Alle Antworten werden ebenfalls gelöscht.'))return;const {error}=await sb.from('forum_threads').delete().eq('id',id);toast(error?error.message:'Thema gelöscht.');if(!error){document.querySelector('#forumThreadView')?.classList.add('hidden');document.querySelector('#forumListView')?.classList.remove('hidden');window.location.hash='';setTimeout(()=>document.querySelector('[data-screen="aaForumScreen"]')?.click(),50)}}
  async function deletePost(id){if(!admin)return;if(!confirm('Diese Antwort wirklich löschen?'))return;const {error}=await sb.from('forum_posts').delete().eq('id',id);toast(error?error.message:'Antwort gelöscht.');if(!error)document.querySelector(`[data-post-id="${id}"]`)?.remove()}
  async function toggleLock(thread){if(!admin)return;const {error}=await sb.from('forum_threads').update({is_locked:!thread.is_locked}).eq('id',thread.id);toast(error?error.message:(thread.is_locked?'Thema wieder geöffnet.':'Thema gesperrt.'));if(!error){thread.is_locked=!thread.is_locked;window.enhanceForumModeration(thread,window.__currentForumPosts||[])}}

  window.enhanceForumModeration=async function(thread,posts){
    window.__currentForumPosts=posts||[];await refreshRole();
    const head=q('.forum-thread-head');if(head&&!q('#forumThreadMod')){const d=document.createElement('div');d.id='forumThreadMod';d.className='mod-actions';d.innerHTML=`<button class="report-btn" id="reportThreadBtn">Thema melden</button>`;head.appendChild(d);q('#reportThreadBtn').onclick=()=>reportContent('forum_thread',thread.id)}
    const mod=q('#forumThreadMod');if(mod){mod.querySelectorAll('[data-admin-action]').forEach(x=>x.remove());if(admin){mod.insertAdjacentHTML('beforeend',`<button class="mod-btn lock" data-admin-action="lock">${thread.is_locked?'Entsperren':'Thema sperren'}</button><button class="mod-btn danger" data-admin-action="delete">Thema löschen</button>`);mod.querySelector('[data-admin-action="lock"]').onclick=()=>toggleLock(thread);mod.querySelector('[data-admin-action="delete"]').onclick=()=>deleteThread(thread.id)}}
    for(const p of posts||[]){const card=q(`[data-post-id="${p.id}"]`);if(!card)continue;let a=card.querySelector('.mod-actions');if(!a){a=document.createElement('div');a.className='mod-actions';a.innerHTML=`<button class="report-btn">Antwort melden</button>`;a.querySelector('button').onclick=()=>reportContent('forum_post',p.id);card.querySelector('.forum-post-copy')?.appendChild(a)}if(admin&&!a.querySelector('[data-admin-delete]')){a.insertAdjacentHTML('beforeend','<button class="mod-btn danger" data-admin-delete>Antwort löschen</button>');a.querySelector('[data-admin-delete]').onclick=()=>deletePost(p.id)}}
    const reply=q('.forum-reply');if(reply){const btn=q('#forumReplyBtn'),ta=q('#forumReplyText');if(thread.is_locked&&!admin){if(btn)btn.disabled=true;if(ta){ta.disabled=true;ta.placeholder='Dieses Thema wurde von der Moderation gesperrt.'}}}
  };

  async function loadReports(){if(!admin)return;const el=q('#adminReports');if(!el)return;el.innerHTML='Meldungen werden geladen …';const {data,error}=await sb.from('content_reports').select('id,reporter_id,target_type,target_id,reason,details,status,created_at').in('status',['open','reviewing']).order('created_at',{ascending:false}).limit(100);if(error){el.textContent='Meldungen konnten nicht geladen werden.';return}const rows=data||[];el.innerHTML=rows.length?rows.map(r=>`<div class="admin-report"><b>${safe(r.target_type)}</b><small>${new Date(r.created_at).toLocaleString('de-DE')}</small><p><strong>${safe(r.reason)}</strong>${r.details?`<br>${safe(r.details)}`:''}</p><div class="admin-report-actions"><button class="admin-resolve" data-resolve="${r.id}">Erledigt</button><button class="admin-dismiss" data-dismiss="${r.id}">Verwerfen</button></div></div>`).join(''):'<div style="color:#aaa">Keine offenen Meldungen.</div>';el.querySelectorAll('[data-resolve]').forEach(b=>b.onclick=()=>finishReport(b.dataset.resolve,'resolved'));el.querySelectorAll('[data-dismiss]').forEach(b=>b.onclick=()=>finishReport(b.dataset.dismiss,'dismissed'))}
  async function finishReport(id,status){const {error}=await sb.from('content_reports').update({status,resolved_by:aaUser.id,resolved_at:new Date().toISOString()}).eq('id',id);toast(error?error.message:'Meldung aktualisiert.');if(!error)loadReports()}

  function boot(){injectStyles();injectScreens();renderRules();setTimeout(refreshRole,500);sb.auth.onAuthStateChange(()=>setTimeout(refreshRole,50))}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,120));else setTimeout(boot,120)
})();