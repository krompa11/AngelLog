(()=>{
  const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
  const safe=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const cats=['Alle','Allgemein','Gewässer & Gastkarten','Raubfisch','Friedfisch','Karpfen','Wels','Technik & Ausrüstung'];
  let category='Alle',search='',currentThread=null;
  const fmt=d=>{try{return new Date(d).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})}catch{return ''}};
  function avatarHtml(p,name){return p?.avatar_url?`<img src="${safe(p.avatar_url)}" alt="">`:safe((name||'A').slice(0,1).toUpperCase())}
  function nameOf(p){return p?.display_name||p?.username||'Angler'}
  function inject(){
    if(q('#aaForumScreen'))return;
    const css=document.createElement('link');css.rel='stylesheet';css.href='/v6-forum.css';document.head.appendChild(css);
    const screen=document.createElement('section');screen.id='aaForumScreen';screen.className='aa-screen forum-screen hidden';screen.innerHTML=`<header class="aa-topbar"><button class="aa-iconbtn" onclick="openDrawer()">☰</button><h1>Forum</h1><div id="forumTopCount" class="forum-badge">0 Themen</div></header><div id="forumListView" class="forum-wrap"><div class="forum-hero"><h2>AngelLog Community</h2><p>Fragen stellen, Erfahrungen teilen und mit anderen Anglern diskutieren.</p></div><div class="forum-toolbar"><input id="forumSearch" class="forum-search" placeholder="Forum durchsuchen"><button id="forumNew" class="forum-new">+ Thema</button></div><div id="forumCats" class="forum-cats"></div><div id="forumList" class="forum-list"><div class="forum-empty">Themen werden geladen …</div></div></div><div id="forumThreadView" class="forum-thread-view hidden"></div>`;
    const app=q('.aa-app');const plus=q('#aaPlus');app.insertBefore(screen,plus);
    const forumBtn=qa('.aa-menu button').find(b=>/Forum/i.test(b.textContent));
    if(forumBtn){forumBtn.classList.remove('disabled');forumBtn.dataset.screen='aaForumScreen';forumBtn.innerHTML='<span>◌</span>Forum <b id="forumDrawerCount" class="forum-badge">0</b>';forumBtn.addEventListener('click',()=>setTimeout(loadThreads,30))}
    renderCats();
    q('#forumNew').onclick=openNewThread;
    q('#forumSearch').addEventListener('input',e=>{search=e.target.value.trim().toLowerCase();renderThreadCards(window.__forumCache||[])});
    const plusHandler=q('#aaPlus');if(plusHandler)plusHandler.onclick=()=>{if(!q('#aaForumScreen').classList.contains('hidden'))openNewThread();else openAdd()};
  }
  function renderCats(){const el=q('#forumCats');if(!el)return;el.innerHTML=cats.map(c=>`<button class="forum-cat ${c===category?'active':''}" data-cat="${safe(c)}">${safe(c)}</button>`).join('');el.querySelectorAll('.forum-cat').forEach(b=>b.onclick=()=>{category=b.dataset.cat;renderCats();renderThreadCards(window.__forumCache||[])})}
  async function getProfiles(ids){if(!ids.length)return new Map();const {data}=await sb.from('profiles').select('id,username,display_name,avatar_url').in('id',ids);return new Map((data||[]).map(p=>[p.id,p]))}
  async function getWaters(ids){if(!ids.length)return new Map();const {data}=await sb.from('waters').select('id,name').in('id',ids);return new Map((data||[]).map(w=>[w.id,w.name]))}
  async function loadThreads(){
    const list=q('#forumList');if(!list)return;list.innerHTML='<div class="forum-empty">Themen werden geladen …</div>';
    const {data,error}=await sb.from('forum_threads').select('id,user_id,category,title,body,water_id,is_locked,created_at,last_activity_at').order('last_activity_at',{ascending:false}).limit(100);
    if(error){list.innerHTML='<div class="forum-empty">Forum konnte gerade nicht geladen werden.</div>';return}
    const threads=data||[],ids=threads.map(t=>t.id),userIds=[...new Set(threads.map(t=>t.user_id))],waterIds=[...new Set(threads.map(t=>t.water_id).filter(Boolean))];
    let posts=[];if(ids.length){const r=await sb.from('forum_posts').select('thread_id,user_id,created_at').in('thread_id',ids);posts=r.data||[]}
    const [pm,wm]=await Promise.all([getProfiles([...new Set([...userIds,...posts.map(p=>p.user_id)])]),getWaters(waterIds)]);
    const counts=new Map();for(const p of posts)counts.set(p.thread_id,(counts.get(p.thread_id)||0)+1);
    window.__forumCache=threads.map(t=>({...t,profile:pm.get(t.user_id),water_name:wm.get(t.water_id)||null,replies:counts.get(t.id)||0}));
    q('#forumTopCount').textContent=`${threads.length} Themen`;const d=q('#forumDrawerCount');if(d)d.textContent=threads.length;
    renderThreadCards(window.__forumCache)
  }
  function renderThreadCards(rows){
    const list=q('#forumList');if(!list)return;
    let filtered=rows;if(category!=='Alle')filtered=filtered.filter(t=>t.category===category);if(search)filtered=filtered.filter(t=>(t.title+' '+t.body+' '+(t.water_name||'')).toLowerCase().includes(search));
    if(!filtered.length){list.innerHTML='<div class="forum-empty">Noch keine passenden Themen. Starte die erste Diskussion.</div>';return}
    list.innerHTML=filtered.map(t=>{const p=t.profile,name=nameOf(p);return `<article class="forum-thread-card" data-thread="${t.id}"><div class="forum-avatar">${avatarHtml(p,name)}</div><div class="forum-thread-main"><h3>${t.is_locked?'🔒 ':''}${safe(t.title)}</h3><p>${safe(t.body)}</p><div class="forum-thread-meta"><span class="forum-chip">${safe(t.category)}</span><span>${safe(name)}</span><span>${fmt(t.last_activity_at)}</span>${t.is_locked?'<span style="color:#ffd640">gesperrt</span>':''}</div>${t.water_name?`<div class="forum-water-link">≋ ${safe(t.water_name)}</div>`:''}</div><div class="forum-count"><b>${t.replies}</b>Antworten</div></article>`}).join('');
    list.querySelectorAll('[data-thread]').forEach(x=>x.onclick=()=>openThread(x.dataset.thread))
  }
  async function openThread(id){
    const thread=(window.__forumCache||[]).find(t=>t.id===id);if(!thread)return;
    currentThread=thread;q('#forumListView').classList.add('hidden');const view=q('#forumThreadView');view.classList.remove('hidden');view.innerHTML='<div class="forum-empty">Thread wird geladen …</div>';
    const {data:posts,error}=await sb.from('forum_posts').select('id,thread_id,user_id,body,created_at').eq('thread_id',id).order('created_at',{ascending:true}).limit(300);
    if(error){view.innerHTML='<div class="forum-empty">Antworten konnten nicht geladen werden.</div>';return}
    const ids=[...new Set([thread.user_id,...(posts||[]).map(p=>p.user_id)])],pm=await getProfiles(ids),author=pm.get(thread.user_id),authorName=nameOf(author);
    view.innerHTML=`<header class="aa-topbar"><button id="forumBack" class="forum-back">‹</button><h1>Forum</h1><div></div></header><div class="forum-thread-head"><span class="forum-chip">${safe(thread.category)}</span><h2>${thread.is_locked?'🔒 ':''}${safe(thread.title)}</h2><div class="forum-thread-meta"><span>${safe(authorName)}</span><span>${fmt(thread.created_at)}</span>${thread.is_locked?'<span style="color:#ffd640">Thema gesperrt</span>':''}</div>${thread.water_name?`<div class="forum-water-link">≋ ${safe(thread.water_name)}</div>`:''}<p class="forum-thread-body">${safe(thread.body)}</p></div><div id="forumPosts">${(posts||[]).map(p=>postHtml(p,pm.get(p.user_id))).join('')||'<div class="forum-empty">Noch keine Antworten. Schreib die erste.</div>'}</div><div class="forum-reply"><textarea id="forumReplyText" maxlength="10000" placeholder="Deine Antwort …"></textarea><button id="forumReplyBtn" class="forum-primary">Antwort veröffentlichen</button></div>`;
    q('#forumBack').onclick=closeThread;q('#forumReplyBtn').onclick=sendReply;
    window.__currentForumPosts=posts||[];
    setTimeout(()=>window.enhanceForumModeration?.(thread,posts||[]),20)
  }
  function postHtml(p,profile){const name=nameOf(profile);return `<article class="forum-post" data-post-id="${p.id}"><div class="forum-avatar">${avatarHtml(profile,name)}</div><div class="forum-post-copy"><b>${safe(name)}</b><small>${fmt(p.created_at)}</small><p>${safe(p.body)}</p></div></article>`}
  function closeThread(){currentThread=null;q('#forumThreadView').classList.add('hidden');q('#forumListView').classList.remove('hidden');loadThreads()}
  function modalHtml(){const water=window.aaCurrentWater;return `<div id="forumOverlay" class="forum-overlay"><div class="forum-modal"><div class="forum-modal-head"><h3>Neues Thema</h3><button id="forumModalClose" class="forum-close">×</button></div><div class="forum-field"><label>Kategorie</label><select id="forumCategory">${cats.filter(c=>c!=='Alle').map(c=>`<option>${safe(c)}</option>`).join('')}</select></div><div class="forum-field"><label>Titel</label><input id="forumTitle" maxlength="160" placeholder="Worum geht es?"></div><div class="forum-field"><label>Beitrag</label><textarea id="forumBody" maxlength="10000" placeholder="Beschreibe deine Frage oder Erfahrung …"></textarea></div>${water?`<div class="forum-field"><label><input id="forumLinkWater" type="checkbox"> Mit aktuellem Gewässer „${safe(water.name)}“ verknüpfen</label></div>`:''}<div style="font-size:12px;color:#999;line-height:1.4">Mit dem Veröffentlichen gelten die AngelLog Community-Regeln.</div><button id="forumCreate" class="forum-primary">Thema veröffentlichen</button></div></div>`}
  async function openNewThread(){if(!aaUser)return toast('Bitte zuerst anmelden.');if(window.ensureCommunityRulesAccepted&&!await window.ensureCommunityRulesAccepted())return;q('#forumOverlay')?.remove();document.body.insertAdjacentHTML('beforeend',modalHtml());q('#forumModalClose').onclick=()=>q('#forumOverlay').remove();q('#forumOverlay').onclick=e=>{if(e.target.id==='forumOverlay')e.currentTarget.remove()};q('#forumCreate').onclick=createThread}
  async function createThread(){const title=q('#forumTitle').value.trim(),body=q('#forumBody').value.trim(),cat=q('#forumCategory').value;if(title.length<3)return toast('Titel ist zu kurz.');if(body.length<3)return toast('Beitrag ist zu kurz.');const waterId=q('#forumLinkWater')?.checked?window.aaCurrentWater?.id:null;const btn=q('#forumCreate');btn.disabled=true;const {data,error}=await sb.from('forum_threads').insert({user_id:aaUser.id,category:cat,title,body,water_id:waterId||null}).select('id').single();btn.disabled=false;if(error)return toast(error.message);q('#forumOverlay').remove();toast('Thema veröffentlicht.');await loadThreads();if(data?.id)openThread(data.id)}
  async function sendReply(){if(!aaUser)return toast('Bitte zuerst anmelden.');if(!currentThread)return;if(currentThread.is_locked&&!window.__angelLogAdmin)return toast('Dieses Thema ist gesperrt.');if(window.ensureCommunityRulesAccepted&&!await window.ensureCommunityRulesAccepted())return;const text=q('#forumReplyText').value.trim();if(!text)return toast('Antwort fehlt.');const btn=q('#forumReplyBtn');btn.disabled=true;const {error}=await sb.from('forum_posts').insert({thread_id:currentThread.id,user_id:aaUser.id,body:text});btn.disabled=false;if(error)return toast(error.message);q('#forumReplyText').value='';toast('Antwort veröffentlicht.');await loadThreads();await openThread(currentThread.id)}
  function hook(){inject();loadThreads()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(hook,80));else setTimeout(hook,80)
})();