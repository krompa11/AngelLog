(()=>{
  const $=s=>document.querySelector(s);
  const safe=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const normalize=s=>String(s||'').trim().toLocaleLowerCase('de-DE');

  function sourceLabel(sources,count){
    const all=[...sources];
    if(all.some(x=>/official|amtlich|lfu/i.test(x)))return 'Amtliche Angabe';
    if(count>0||all.some(x=>/community|catch/i.test(x)))return 'In AngelLog gefangen';
    return 'Bestätigte Angabe';
  }

  async function loadFishEnhanced(id){
    const el=$('#aaFishList');
    if(!el)return;
    el.innerHTML='<span style="color:#aaa">Fischarten werden geladen …</span>';
    const [listedRes,catchesRes]=await Promise.all([
      sb.from('water_fish_species').select('species,source').eq('water_id',id),
      sb.from('catches').select('species').eq('water_id',id).eq('visibility','public').limit(1000)
    ]);
    if(listedRes.error||catchesRes.error){
      el.innerHTML='<span style="color:#aaa">Fischarten konnten gerade nicht geladen werden.</span>';
      return;
    }
    const map=new Map();
    for(const r of listedRes.data||[]){
      const name=String(r.species||'').trim();if(!name)continue;
      const k=normalize(name);if(!map.has(k))map.set(k,{name,count:0,sources:new Set()});
      if(r.source)map.get(k).sources.add(r.source);
    }
    for(const r of catchesRes.data||[]){
      const name=String(r.species||'').trim();if(!name)continue;
      const k=normalize(name);if(!map.has(k))map.set(k,{name,count:0,sources:new Set(['community_catch'])});
      map.get(k).count++;
      map.get(k).sources.add('community_catch');
    }
    const rows=[...map.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'de'));
    const tab=[...document.querySelectorAll('.aa-tabs button')].find(b=>b.dataset.tab==='fish');
    if(tab)tab.textContent=rows.length?`FISCHARTEN (${rows.length})`:'FISCHARTEN';
    if(!rows.length){
      el.innerHTML='<div class="fish-empty"><b>Noch keine bestätigten Fischarten</b><span>AngelLog ergänzt diese Liste aus öffentlichen Fangmeldungen und verfügbaren amtlichen Fischdaten. Sobald eine Art an diesem Gewässer bestätigt ist, erscheint sie hier.</span></div>';
      return;
    }
    el.innerHTML='<div class="fish-grid">'+rows.map(r=>`<div class="fish-card"><div class="fish-icon">🐟</div><div class="fish-copy"><b>${safe(r.name)}</b><small>${safe(sourceLabel(r.sources,r.count))}${r.count?` · ${r.count} ${r.count===1?'Fang':'Fänge'}`:''}</small></div></div>`).join('')+'</div>';
  }

  function paintFollowButton(following){
    const btn=$('#aaFollowBtn');if(!btn)return;
    btn.dataset.following=following?'true':'false';
    btn.textContent=following?'Folge ich ✓':'+ Folgen';
    btn.title=following?'Tippen, um dem Gewässer nicht mehr zu folgen':'Diesem Gewässer folgen';
    btn.style.background=following?'#58c900':'#393a3b';
    btn.style.color='#fff';
    btn.style.border=following?'1px solid #72e000':'1px solid #555';
    btn.style.minWidth='96px';
  }

  async function loadFollowersEnhanced(id){
    const [summaryRes,catchesRes]=await Promise.all([
      sb.rpc('get_water_follow_summary',{p_water_id:id}),
      sb.from('catches').select('*',{count:'exact',head:true}).eq('water_id',id).eq('visibility','public')
    ]);
    let summary=Array.isArray(summaryRes.data)?summaryRes.data[0]:summaryRes.data;
    if(summaryRes.error)summary={follower_count:0,is_following:false};
    const followers=Number(summary?.follower_count||0);
    $('#aaFollowers').textContent=`${followers} ${followers===1?'Follower':'Follower'}`;
    $('#aaCatchCount').textContent=`${catchesRes.count||0} Fänge`;
    paintFollowButton(Boolean(aaUser&&summary?.is_following));
  }

  async function toggleFollow(){
    if(!aaUser)return toast('Bitte zuerst anmelden.');
    if(!aaCurrentWater)return;
    const btn=$('#aaFollowBtn'),following=btn?.dataset.following==='true';
    if(btn){btn.disabled=true;btn.style.opacity='.65'}
    let error=null;
    if(following){
      ({error}=await sb.from('water_follows').delete().eq('water_id',aaCurrentWater.id).eq('user_id',aaUser.id));
      if(!error)toast('Gewässer entfolgt.');
    }else{
      ({error}=await sb.from('water_follows').insert({water_id:aaCurrentWater.id,user_id:aaUser.id}));
      if(!error)toast('Du folgst diesem Gewässer.');
    }
    if(error)toast(error.message);
    await loadFollowersEnhanced(aaCurrentWater.id);
    if(btn){btn.disabled=false;btn.style.opacity='1'}
  }

  function injectStyles(){
    if($('#fishFollowStyles'))return;
    const s=document.createElement('style');s.id='fishFollowStyles';s.textContent=`
      .fish-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%}.fish-card{display:flex;align-items:center;gap:10px;background:#292a2b;border:1px solid #454647;border-radius:8px;padding:12px;min-width:0}.fish-icon{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#1c1d1e;font-size:18px;flex:0 0 auto}.fish-copy{min-width:0;display:flex;flex-direction:column;gap:3px}.fish-copy b{color:#fff;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fish-copy small{color:#79cf32;font-size:11px;line-height:1.25}.fish-empty{display:flex;flex-direction:column;gap:7px;color:#aaa;line-height:1.45}.fish-empty b{color:#ddd}@media(max-width:430px){.fish-grid{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function hook(){
    injectStyles();
    window.loadFish=loadFishEnhanced;
    window.loadFollowers=loadFollowersEnhanced;
    window.followWater=toggleFollow;
    const btn=$('#aaFollowBtn');if(btn)btn.onclick=toggleFollow;
    if(window.aaCurrentWater?.id){loadFishEnhanced(aaCurrentWater.id);loadFollowersEnhanced(aaCurrentWater.id)}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(hook,20));else setTimeout(hook,20);
})();
