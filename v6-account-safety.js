(()=>{
  const q=s=>document.querySelector(s),safe=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  let blocked=new Set(),loaded=false,loading=null;

  async function refreshBlocked(force=false){
    if(loading&&!force)return loading;
    loading=(async()=>{
      blocked=new Set();loaded=true;
      if(!window.aaUser)return blocked;
      const {data}=await sb.from('user_blocks').select('blocked_id').eq('blocker_id',aaUser.id);
      blocked=new Set((data||[]).map(x=>x.blocked_id));
      return blocked
    })();
    try{return await loading}finally{loading=null}
  }
  async function ensureBlocked(){if(!loaded)await refreshBlocked();return blocked}
  async function blockUser(userId){
    if(!window.aaUser)return toast('Bitte zuerst anmelden.');
    if(!userId||userId===aaUser.id)return;
    if(!confirm('Diesen Nutzer blockieren? Seine Community-Inhalte werden für dich ausgeblendet.'))return;
    const {error}=await sb.from('user_blocks').upsert({blocker_id:aaUser.id,blocked_id:userId},{onConflict:'blocker_id,blocked_id'});
    if(error)return toast(error.message);blocked.add(userId);toast('Nutzer blockiert.');applyBlockedContent();renderBlockedManager()
  }
  async function unblockUser(userId){
    if(!window.aaUser)return;
    const {error}=await sb.from('user_blocks').delete().eq('blocker_id',aaUser.id).eq('blocked_id',userId);
    if(error)return toast(error.message);blocked.delete(userId);toast('Blockierung aufgehoben.');renderBlockedManager();window.loadFeed?.();window.loadReviews?.(window.aaCurrentWater?.id)
  }

  function styles(){if(q('#aaSafetyStyles'))return;const s=document.createElement('style');s.id='aaSafetyStyles';s.textContent=`
    .aa-safety-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.aa-safety-actions button{border:0;background:transparent;color:#9da0a1;padding:3px 0;font-size:11px;text-decoration:underline}.aa-safety-actions button.danger{color:#ff9b9b}.aa-blocked-overlay{position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:7000;display:grid;place-items:end center}.aa-blocked-modal{width:min(100%,620px);max-height:88vh;overflow:auto;background:#343637;color:#fff;border-radius:16px 16px 0 0;padding:20px;box-sizing:border-box}.aa-blocked-modal h2{margin:0 44px 6px 0}.aa-blocked-close{position:absolute;right:16px;top:14px;border:0;background:#222;color:#fff;width:38px;height:38px;border-radius:50%;font-size:22px}.aa-blocked-row{display:flex;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid #4a4b4c}.aa-blocked-row div{flex:1;min-width:0}.aa-blocked-row b{display:block}.aa-blocked-row small{color:#999}.aa-blocked-row button{border:1px solid #666;background:#252627;color:#eee;border-radius:7px;padding:8px 10px}.aa-delete-note{color:#ffb0b0!important}
  `;document.head.appendChild(s)}

  async function overrideFeed(){
    window.loadFeed=async function(){
      const el=q('#aaFeedList');if(!el)return;el.innerHTML='<div style="padding:30px;color:#aaa">Fänge werden geladen …</div>';
      await ensureBlocked();
      const {data,error}=await sb.from('catches').select('id,user_id,species,caught_on,length_cm,weight_kg,water_name,notes,photo_url').eq('visibility','public').order('created_at',{ascending:false}).limit(60);
      if(error){el.innerHTML='<div style="padding:30px">Feed konnte nicht geladen werden.</div>';return}
      const rows=(data||[]).filter(c=>!blocked.has(c.user_id));
      el.innerHTML=rows.slice(0,30).map(c=>`<article class="aa-feed-card" data-catch="${safe(c.id)}" data-user="${safe(c.user_id)}"><div class="aa-feed-user"><div class="aa-avatar">A</div><div><b>Angler</b><small>${safe(c.water_name||'AngelLog Gewässer')}</small></div><span style="margin-left:auto;color:#aaa">${safe(c.caught_on||'')}</span></div>${c.photo_url?`<img src="${safe(c.photo_url)}" alt="Fangfoto" style="width:100%;max-height:460px;object-fit:cover;display:block">`:'<div class="aa-feed-image">🐟</div>'}<div class="aa-feed-caption"><div class="aa-feed-fish">${safe(c.species||'Fang')}</div><div>${c.length_cm?safe(c.length_cm)+' cm':''}${c.weight_kg?' · '+safe(c.weight_kg)+' kg':''}</div>${c.notes?`<p style="color:#aaa">${safe(c.notes)}</p>`:''}${window.aaUser&&c.user_id!==aaUser.id?`<div class="aa-safety-actions"><button data-report-catch="${safe(c.id)}">Fang melden</button><button class="danger" data-block-user="${safe(c.user_id)}">Nutzer blockieren</button></div>`:''}</div></article>`).join('')||'<div style="padding:30px;color:#aaa">Noch keine öffentlichen Fänge.</div>';
      el.querySelectorAll('[data-block-user]').forEach(b=>b.onclick=e=>{e.stopPropagation();blockUser(b.dataset.blockUser)});
      el.querySelectorAll('[data-report-catch]').forEach(b=>b.onclick=e=>{e.stopPropagation();window.reportContent?.('catch',b.dataset.reportCatch)})
    }
  }

  function applyBlockedForum(){
    if(!loaded)return;
    for(const card of document.querySelectorAll('.forum-thread-card[data-thread]')){
      const t=(window.__forumCache||[]).find(x=>x.id===card.dataset.thread);if(t&&blocked.has(t.user_id))card.remove()
    }
    for(const card of document.querySelectorAll('.forum-post[data-post-id]')){
      const p=(window.__currentForumPosts||[]).find(x=>x.id===card.dataset.postId);if(p&&blocked.has(p.user_id))card.remove()
    }
  }
  function hookForumModeration(){
    const base=window.enhanceForumModeration;if(typeof base!=='function'||base.__safetyWrapped)return;
    const wrapped=async function(thread,posts){
      const r=await base.apply(this,arguments);await ensureBlocked();applyBlockedForum();
      const head=q('.forum-thread-head');if(head&&window.aaUser&&thread?.user_id&&thread.user_id!==aaUser.id&&!blocked.has(thread.user_id)&&!head.querySelector(`[data-block-user="${thread.user_id}"]`)){
        const a=head.querySelector('.mod-actions')||head.appendChild(Object.assign(document.createElement('div'),{className:'mod-actions'}));
        a.insertAdjacentHTML('beforeend',`<button class="report-btn" data-block-user="${safe(thread.user_id)}">Nutzer blockieren</button>`)
      }
      for(const p of posts||[]){if(!window.aaUser||p.user_id===aaUser.id||blocked.has(p.user_id))continue;const card=q(`[data-post-id="${p.id}"]`);if(!card)continue;const a=card.querySelector('.mod-actions');if(a&&!a.querySelector(`[data-block-user="${p.user_id}"]`))a.insertAdjacentHTML('beforeend',`<button class="report-btn" data-block-user="${safe(p.user_id)}">Nutzer blockieren</button>`)}
      document.querySelectorAll('[data-block-user]').forEach(b=>{if(!b.__safety){b.__safety=true;b.addEventListener('click',e=>{e.stopPropagation();blockUser(b.dataset.blockUser)})}});return r
    };wrapped.__safetyWrapped=true;window.enhanceForumModeration=wrapped
  }

  async function overrideReviews(){
    window.loadReviews=async function(id){
      if(!id)return;await ensureBlocked();
      const {data}=await sb.from('water_reviews').select('id,rating,review,user_id,created_at').eq('water_id',id).order('created_at',{ascending:false}).limit(30);
      const rows=(data||[]).filter(r=>!blocked.has(r.user_id)),avg=rows.length?(rows.reduce((a,b)=>a+Number(b.rating||0),0)/rows.length).toFixed(1):'–';
      const rating=q('#aaRating'),list=q('#aaReviewList');if(rating)rating.textContent='★ '+avg;if(!list)return;
      list.innerHTML=rows.map((r,i)=>`<div class="aa-review" data-review="${safe(r.id)}"><div><div class="aa-reviewpic"></div><small>Angler ${i+1}</small></div><div><div class="aa-review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div><div>${safe(r.review||'Bewertung ohne Text')}</div><small style="color:#999">${new Date(r.created_at).toLocaleDateString('de-DE')}</small>${window.aaUser&&r.user_id!==aaUser.id?`<div class="aa-safety-actions"><button data-report-review="${safe(r.id)}">Bewertung melden</button><button class="danger" data-block-user="${safe(r.user_id)}">Nutzer blockieren</button></div>`:''}</div></div>`).join('')||'<div style="color:#aaa">Noch keine Bewertungen.</div>';
      list.querySelectorAll('[data-block-user]').forEach(b=>b.onclick=()=>blockUser(b.dataset.blockUser));list.querySelectorAll('[data-report-review]').forEach(b=>b.onclick=()=>window.reportContent?.('water_review',b.dataset.reportReview))
    }
  }

  function injectSettingsActions(){
    const account=q('#setAccount')?.closest('.set-card');if(!account||q('#setBlockedUsers'))return;
    const blockedBtn=document.createElement('button');blockedBtn.id='setBlockedUsers';blockedBtn.className='set-action';blockedBtn.textContent='🚫 Blockierte Nutzer';blockedBtn.onclick=openBlockedManager;account.appendChild(blockedBtn);
    if(!window.aaUser)return;
    const del=document.createElement('button');del.id='setDeleteAccount';del.className='set-action danger';del.textContent='🗑 Konto und Daten löschen';del.onclick=deleteAccount;account.appendChild(del)
  }

  async function openBlockedManager(){await refreshBlocked(true);renderBlockedManager()}
  async function renderBlockedManager(){
    let o=q('#aaBlockedOverlay');if(!o){o=document.createElement('div');o.id='aaBlockedOverlay';o.className='aa-blocked-overlay';o.innerHTML='<div class="aa-blocked-modal" style="position:relative"><button class="aa-blocked-close">×</button><h2>Blockierte Nutzer</h2><div id="aaBlockedList"></div></div>';document.body.appendChild(o);o.querySelector('.aa-blocked-close').onclick=()=>o.remove();o.onclick=e=>{if(e.target===o)o.remove()}}
    const el=q('#aaBlockedList');if(!blocked.size){el.innerHTML='<p style="color:#999">Du hast aktuell niemanden blockiert.</p>';return}
    const ids=[...blocked],{data}=await sb.from('profiles').select('id,display_name,username').in('id',ids);const pm=new Map((data||[]).map(x=>[x.id,x]));
    el.innerHTML=ids.map(id=>{const p=pm.get(id),name=p?.display_name||p?.username||'Blockierter Nutzer';return `<div class="aa-blocked-row"><div><b>${safe(name)}</b><small>Community-Inhalte ausgeblendet</small></div><button data-unblock="${safe(id)}">Freigeben</button></div>`}).join('');el.querySelectorAll('[data-unblock]').forEach(b=>b.onclick=()=>unblockUser(b.dataset.unblock))
  }

  async function removeOwnCatchPhotos(){
    const uid=window.aaUser?.id;if(!uid)return;
    const {data}=await sb.from('catches').select('photo_bucket,photo_path').eq('user_id',uid).not('photo_path','is',null).limit(5000);
    const by=new Map();for(const x of data||[]){if(!x.photo_bucket||!x.photo_path)continue;if(!by.has(x.photo_bucket))by.set(x.photo_bucket,[]);by.get(x.photo_bucket).push(x.photo_path)}
    for(const [bucket,paths] of by){for(let i=0;i<paths.length;i+=100){const {error}=await sb.storage.from(bucket).remove(paths.slice(i,i+100));if(error)throw error}}
  }
  async function deleteAccount(){
    if(!window.aaUser)return;
    const {data:admin}=await sb.rpc('is_admin');if(admin===true)return toast('Das Admin-Hauptkonto ist gegen Selbstlöschung geschützt.');
    if(!confirm('Konto wirklich dauerhaft löschen? Fänge, Fotos, Forumbeiträge, Bewertungen und Profildaten werden entfernt.'))return;
    const typed=prompt('Zur Bestätigung bitte LÖSCHEN eingeben:');if(typed!=='LÖSCHEN')return;
    const btn=q('#setDeleteAccount');if(btn){btn.disabled=true;btn.textContent='Konto wird gelöscht …'}
    try{await removeOwnCatchPhotos();const {error}=await sb.rpc('delete_my_account');if(error)throw error;try{await sb.auth.signOut({scope:'local'})}catch{}try{localStorage.removeItem('angellog_v6_preferences')}catch{}alert('Dein AngelLog-Konto und die zugehörigen Daten wurden gelöscht.');location.replace('/v6.html')}catch(e){toast(e?.message?.includes('DELETE_STORAGE_FIRST')?'Einige eigene Dateien konnten noch nicht gelöscht werden. Bitte erneut versuchen.':(e?.message||'Konto konnte nicht gelöscht werden.'));if(btn){btn.disabled=false;btn.textContent='🗑 Konto und Daten löschen'}}
  }

  function applyBlockedContent(){applyBlockedForum();document.querySelectorAll('[data-user]').forEach(el=>{if(blocked.has(el.dataset.user))el.remove()})}
  function bindUi(){
    document.addEventListener('click',e=>{const nav=e.target.closest?.('[data-screen="aaSettingsScreen"],[data-screen="aaForumScreen"]');if(nav){setTimeout(()=>{injectSettingsActions();applyBlockedForum()},120);setTimeout(()=>applyBlockedForum(),600)}const b=e.target.closest?.('[data-block-user]');if(b&&!b.__safety){e.preventDefault();e.stopPropagation();blockUser(b.dataset.blockUser)}},true);
    document.addEventListener('input',e=>{if(e.target?.id==='forumSearch')setTimeout(applyBlockedForum,60)},true)
  }

  async function boot(){styles();await refreshBlocked();overrideFeed();overrideReviews();hookForumModeration();bindUi();setTimeout(()=>{hookForumModeration();injectSettingsActions();applyBlockedContent()},1200);window.loadFeed?.();if(window.aaCurrentWater?.id)window.loadReviews?.(window.aaCurrentWater.id);try{sb.auth.onAuthStateChange(()=>setTimeout(async()=>{loaded=false;await refreshBlocked(true);injectSettingsActions();window.loadFeed?.()},180))}catch{}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1150),{once:true});else setTimeout(boot,1150);
  window.AngelLogSafety={refresh:refreshBlocked,isBlocked:id=>blocked.has(id),block:blockUser,unblock:unblockUser,get blocked(){return new Set(blocked)}}
})();