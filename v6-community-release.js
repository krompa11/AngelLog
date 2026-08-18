(()=>{
  const q=s=>document.querySelector(s),safe=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const blocked=id=>!!window.AngelLogSafety?.isBlocked?.(id);
  const nameOf=p=>p?.display_name||p?.username||'Angler';
  const avatar=(p,n)=>p?.avatar_url?`<img src="${safe(p.avatar_url)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:safe((n||'A').slice(0,1).toUpperCase());
  let feedRows=[];

  function styles(){if(q('#aaCommunityReleaseStyles'))return;const s=document.createElement('style');s.id='aaCommunityReleaseStyles';s.textContent=`
    .aa-social-btn{border:0;background:transparent;color:#bbb;padding:6px 6px 6px 0;font-size:13px;font-weight:700}.aa-social-btn.on{color:#ff7373}.aa-comment-overlay{position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:7200;display:grid;place-items:end center}.aa-comment-modal{width:min(100%,650px);max-height:88vh;overflow:auto;background:#343637;color:#fff;border-radius:16px 16px 0 0;padding:18px;box-sizing:border-box}.aa-comment-head{display:flex;align-items:center;gap:10px}.aa-comment-head h2{margin:0;flex:1}.aa-comment-close{border:0;background:#222;color:#fff;width:38px;height:38px;border-radius:50%;font-size:22px}.aa-comment-list{margin:12px 0;display:grid;gap:8px}.aa-comment-row{border:1px solid #484a4b;background:#292b2c;border-radius:9px;padding:10px}.aa-comment-row b{font-size:13px}.aa-comment-row small{color:#888;margin-left:7px}.aa-comment-row p{margin:6px 0 0;color:#ddd;line-height:1.4}.aa-comment-compose{display:flex;gap:8px;position:sticky;bottom:0;background:#343637;padding-top:10px}.aa-comment-compose textarea{flex:1;min-height:54px;max-height:130px;resize:vertical;background:#222425;border:1px solid #555;color:#fff;border-radius:8px;padding:10px}.aa-comment-compose button{border:0;border-radius:8px;background:#61d000;color:#fff;font-weight:800;padding:0 14px}.aa-feed-owner{display:flex;align-items:center;gap:9px}.aa-feed-owner .aa-avatar{overflow:hidden}.aa-review .aa-safety-actions,.aa-comment-row .aa-safety-actions{margin-top:7px}
  `;document.head.appendChild(s)}

  async function profilesFor(ids){if(!ids.length)return new Map();const {data}=await sb.from('profiles').select('id,username,display_name,avatar_url').in('id',[...new Set(ids)]);return new Map((data||[]).map(x=>[x.id,x]))}

  async function loadFeedRelease(){
    const el=q('#aaFeedList');if(!el)return;el.innerHTML='<div style="padding:30px;color:#aaa">Fänge werden geladen …</div>';
    try{await window.AngelLogSafety?.refresh?.()}catch{}
    const {data,error}=await sb.from('catches').select('id,user_id,species,caught_on,length_cm,weight_kg,water_name,notes,photo_url,created_at').eq('visibility','public').order('created_at',{ascending:false}).limit(60);
    if(error){el.innerHTML='<div style="padding:30px">Feed konnte nicht geladen werden.</div>';return}
    feedRows=(data||[]).filter(c=>!blocked(c.user_id)).slice(0,30);
    const ids=feedRows.map(c=>c.id),pm=await profilesFor(feedRows.map(c=>c.user_id));
    let likes=[],comments=[];
    if(ids.length){const [lr,cr]=await Promise.all([sb.from('catch_likes').select('catch_id,user_id').in('catch_id',ids),sb.from('catch_comments').select('id,catch_id,user_id').in('catch_id',ids)]);likes=lr.data||[];comments=(cr.data||[]).filter(x=>!blocked(x.user_id))}
    const lc=new Map(),cc=new Map(),mine=new Set();for(const x of likes){lc.set(x.catch_id,(lc.get(x.catch_id)||0)+1);if(window.aaUser&&x.user_id===aaUser.id)mine.add(x.catch_id)}for(const x of comments)cc.set(x.catch_id,(cc.get(x.catch_id)||0)+1);
    el.innerHTML=feedRows.map(c=>{const p=pm.get(c.user_id),n=nameOf(p);return `<article class="aa-feed-card" data-catch="${safe(c.id)}" data-user="${safe(c.user_id)}"><div class="aa-feed-user"><div class="aa-feed-owner"><div class="aa-avatar">${avatar(p,n)}</div><div><b>${safe(n)}</b><small>${safe(c.water_name||'AngelLog Gewässer')}</small></div></div><span style="margin-left:auto;color:#aaa">${safe(c.caught_on||'')}</span></div>${c.photo_url?`<img src="${safe(c.photo_url)}" alt="Fangfoto" loading="lazy" style="width:100%;max-height:460px;object-fit:cover;display:block">`:'<div class="aa-feed-image">🐟</div>'}<div class="aa-feed-caption"><div class="aa-social"><button class="aa-social-btn ${mine.has(c.id)?'on':''}" data-like="${safe(c.id)}">♥ ${lc.get(c.id)||0}</button><button class="aa-social-btn" data-comments="${safe(c.id)}">💬 ${cc.get(c.id)||0}</button></div><div class="aa-feed-fish">${safe(c.species||'Fang')}</div><div>${c.length_cm?safe(c.length_cm)+' cm':''}${c.weight_kg?' · '+safe(c.weight_kg)+' kg':''}</div>${c.notes?`<p style="color:#aaa">${safe(c.notes)}</p>`:''}${window.aaUser&&c.user_id!==aaUser.id?`<div class="aa-safety-actions"><button data-report-catch="${safe(c.id)}">Fang melden</button><button class="danger" data-block-user="${safe(c.user_id)}">Nutzer blockieren</button></div>`:''}</div></article>`}).join('')||'<div style="padding:30px;color:#aaa">Noch keine öffentlichen Fänge.</div>';
    el.querySelectorAll('[data-like]').forEach(b=>b.onclick=()=>toggleLike(b.dataset.like));el.querySelectorAll('[data-comments]').forEach(b=>b.onclick=()=>openComments(b.dataset.comments));el.querySelectorAll('[data-report-catch]').forEach(b=>b.onclick=()=>window.reportContent?.('catch',b.dataset.reportCatch));el.querySelectorAll('[data-block-user]').forEach(b=>b.onclick=()=>window.AngelLogSafety?.block?.(b.dataset.blockUser))
  }

  async function toggleLike(catchId){
    if(!window.aaUser)return toast('Bitte zuerst anmelden.');
    const {data}=await sb.from('catch_likes').select('catch_id').eq('catch_id',catchId).eq('user_id',aaUser.id).maybeSingle();
    const r=data?await sb.from('catch_likes').delete().eq('catch_id',catchId).eq('user_id',aaUser.id):await sb.from('catch_likes').insert({catch_id:catchId,user_id:aaUser.id});if(r.error)return toast(r.error.message);loadFeedRelease()
  }

  async function openComments(catchId){
    q('#aaCommentOverlay')?.remove();const c=feedRows.find(x=>x.id===catchId);if(!c)return;
    const o=document.createElement('div');o.id='aaCommentOverlay';o.className='aa-comment-overlay';o.innerHTML=`<div class="aa-comment-modal"><div class="aa-comment-head"><h2>Kommentare · ${safe(c.species||'Fang')}</h2><button class="aa-comment-close">×</button></div><div id="aaCommentList" class="aa-comment-list">Kommentare werden geladen …</div>${window.aaUser?'<div class="aa-comment-compose"><textarea id="aaCommentText" maxlength="2000" placeholder="Kommentar schreiben …"></textarea><button id="aaCommentSend">Senden</button></div>':'<div style="color:#999;padding:10px 0">Zum Kommentieren bitte anmelden.</div>'}</div>`;document.body.appendChild(o);o.querySelector('.aa-comment-close').onclick=()=>o.remove();o.onclick=e=>{if(e.target===o)o.remove()};if(q('#aaCommentSend'))q('#aaCommentSend').onclick=()=>sendComment(catchId);await renderComments(catchId)
  }

  async function renderComments(catchId){
    const el=q('#aaCommentList');if(!el)return;const {data,error}=await sb.from('catch_comments').select('id,catch_id,user_id,body,created_at').eq('catch_id',catchId).order('created_at',{ascending:true}).limit(300);if(error){el.textContent='Kommentare konnten nicht geladen werden.';return}
    const rows=(data||[]).filter(x=>!blocked(x.user_id)),pm=await profilesFor(rows.map(x=>x.user_id));
    el.innerHTML=rows.map(x=>{const p=pm.get(x.user_id),n=nameOf(p);return `<div class="aa-comment-row" data-comment="${safe(x.id)}"><b>${safe(n)}</b><small>${new Date(x.created_at).toLocaleString('de-DE')}</small><p>${safe(x.body)}</p>${window.aaUser&&x.user_id!==aaUser.id?`<div class="aa-safety-actions"><button data-report-comment="${safe(x.id)}">Kommentar melden</button><button class="danger" data-block-user="${safe(x.user_id)}">Nutzer blockieren</button></div>`:''}</div>`}).join('')||'<div style="color:#999">Noch keine Kommentare.</div>';el.querySelectorAll('[data-report-comment]').forEach(b=>b.onclick=()=>window.reportContent?.('comment',b.dataset.reportComment));el.querySelectorAll('[data-block-user]').forEach(b=>b.onclick=async()=>{await window.AngelLogSafety?.block?.(b.dataset.blockUser);renderComments(catchId)})
  }

  async function sendComment(catchId){
    if(!window.aaUser)return toast('Bitte zuerst anmelden.');if(window.ensureCommunityRulesAccepted&&!await window.ensureCommunityRulesAccepted())return;const ta=q('#aaCommentText'),body=ta?.value.trim()||'';if(!body)return toast('Kommentar fehlt.');const btn=q('#aaCommentSend');if(btn)btn.disabled=true;const {error}=await sb.from('catch_comments').insert({catch_id:catchId,user_id:aaUser.id,body});if(btn)btn.disabled=false;if(error)return toast(error.message);ta.value='';await renderComments(catchId);loadFeedRelease()
  }

  async function loadReviewsRelease(id){
    if(!id)return;try{await window.AngelLogSafety?.refresh?.()}catch{}const {data,error}=await sb.from('water_reviews').select('id,rating,body,user_id,created_at').eq('water_id',id).order('created_at',{ascending:false}).limit(30);const rating=q('#aaRating'),list=q('#aaReviewList');if(error){if(list)list.innerHTML='<div style="color:#aaa">Bewertungen konnten nicht geladen werden.</div>';return}
    const rows=(data||[]).filter(r=>!blocked(r.user_id)),avg=rows.length?(rows.reduce((a,b)=>a+Number(b.rating||0),0)/rows.length).toFixed(1):'–';if(rating)rating.textContent='★ '+avg;if(!list)return;
    const pm=await profilesFor(rows.map(x=>x.user_id));list.innerHTML=rows.map(r=>{const p=pm.get(r.user_id),n=nameOf(p);return `<div class="aa-review" data-review="${safe(r.id)}"><div><div class="aa-reviewpic">${avatar(p,n)}</div><small>${safe(n)}</small></div><div><div class="aa-review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div><div>${safe(r.body||'Bewertung ohne Text')}</div><small style="color:#999">${new Date(r.created_at).toLocaleDateString('de-DE')}</small>${window.aaUser&&r.user_id!==aaUser.id?`<div class="aa-safety-actions"><button data-report-review="${safe(r.id)}">Bewertung melden</button><button class="danger" data-block-user="${safe(r.user_id)}">Nutzer blockieren</button></div>`:''}</div></div>`}).join('')||'<div style="color:#aaa">Noch keine Bewertungen.</div>';list.querySelectorAll('[data-report-review]').forEach(b=>b.onclick=()=>window.reportContent?.('water_review',b.dataset.reportReview));list.querySelectorAll('[data-block-user]').forEach(b=>b.onclick=()=>window.AngelLogSafety?.block?.(b.dataset.blockUser))
  }

  async function rateWaterRelease(){
    if(!window.aaUser)return toast('Bitte zuerst anmelden.');if(!window.aaCurrentWater)return;if(window.ensureCommunityRulesAccepted&&!await window.ensureCommunityRulesAccepted())return;const rating=Number(q('#aaRate')?.value||5),body=q('#aaReviewText')?.value.trim()||'';const btn=q('#aaRateBtn');if(btn)btn.disabled=true;const {error}=await sb.from('water_reviews').upsert({water_id:aaCurrentWater.id,user_id:aaUser.id,rating,body},{onConflict:'water_id,user_id'});if(btn)btn.disabled=false;if(error)return toast(error.message);if(q('#aaReviewText'))q('#aaReviewText').value='';toast('Bewertung gespeichert.');loadReviewsRelease(aaCurrentWater.id)
  }

  function bind(){window.loadFeed=loadFeedRelease;window.loadReviews=loadReviewsRelease;window.rateWater=rateWaterRelease;const rate=q('#aaRateBtn');if(rate)rate.onclick=rateWaterRelease;document.addEventListener('click',e=>{const n=e.target.closest?.('[data-screen="aaFeedScreen"]');if(n)setTimeout(loadFeedRelease,50)},true);window.addEventListener('angelLog:blockChanged',()=>{loadFeedRelease();if(window.aaCurrentWater?.id)loadReviewsRelease(aaCurrentWater.id)})}
  function boot(){styles();bind();loadFeedRelease();if(window.aaCurrentWater?.id)loadReviewsRelease(aaCurrentWater.id);setTimeout(()=>{const rate=q('#aaRateBtn');if(rate)rate.onclick=rateWaterRelease},1200)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1500),{once:true});else setTimeout(boot,1500);
  window.AngelLogCommunity={loadFeed:loadFeedRelease,openComments,loadReviews:loadReviewsRelease}
})();