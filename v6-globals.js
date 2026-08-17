(()=>{
  try{Object.defineProperty(window,'aaUser',{configurable:true,get:()=>aaUser,set:v=>{aaUser=v}})}catch{}
  try{Object.defineProperty(window,'aaCurrentWater',{configurable:true,get:()=>aaCurrentWater,set:v=>{aaCurrentWater=v}})}catch{}
  try{Object.defineProperty(window,'aaMap',{configurable:true,get:()=>aaMap})}catch{}
  window.setAngelLogMapStyle=style=>{try{aaLayer=style==='satellite'?'sat':'osm';setBaseLayer()}catch{}};
  window.getAngelLogMapStyle=()=>{try{return aaLayer==='sat'?'satellite':'osm'}catch{return'osm'}};

  function tidyNavigation(){
    try{
      const conditionMenu=[...document.querySelectorAll('.aa-menu button')].find(b=>b.dataset.screen==='aaConditionsScreen'||/Angelbedingungen/i.test(b.textContent));
      conditionMenu?.remove();
      const conditionBottom=document.querySelector('.aa-bottomnav button[data-screen="aaConditionsScreen"]');
      if(conditionBottom){conditionBottom.dataset.screen='aaForumScreen';conditionBottom.innerHTML='<span>◌</span>Forum'}
      document.querySelector('#aaConditionsScreen')?.remove();
    }catch{}
  }
  tidyNavigation();
  document.addEventListener('DOMContentLoaded',tidyNavigation,{once:true});

  function syncCatchWaterLabel(){
    try{
      const sheet=document.querySelector('#aaSheet');if(!sheet)return;
      let box=document.querySelector('#aaCatchWaterBox');
      if(!box){
        box=document.createElement('div');box.id='aaCatchWaterBox';
        box.style.cssText='margin:8px 0 14px;padding:11px 12px;border-radius:8px;background:#252627;border:1px solid #48494a;color:#bbb;font-size:13px';
        sheet.querySelector('h2')?.insertAdjacentElement('afterend',box)
      }
      const w=window.aaCurrentWater;
      box.innerHTML=w?`<span style="color:#8c8c8c">Gewässer</span><br><b style="color:#fff;font-size:16px">≋ ${esc(w.name||'Gewässer')}</b>`:'<span style="color:#999">Kein Gewässer ausgewählt</span>'
    }catch{}
  }

  const baseOpenAdd=window.openAdd;
  window.openAdd=function(){
    if(!window.aaUser)return toast('Bitte zuerst anmelden.');
    syncCatchWaterLabel();
    return baseOpenAdd?.()
  };

  window.checkin=async function(){
    if(!window.aaUser)return toast('Bitte zuerst anmelden.');
    const w=window.aaCurrentWater;if(!w)return toast('Bitte zuerst ein Gewässer auswählen.');
    const btn=document.querySelector('#aaCheckinBtn');if(btn)btn.disabled=true;
    try{
      const {error}=await sb.from('water_checkins').insert({water_id:w.id,user_id:aaUser.id});
      if(error)toast('Check-in konnte nicht gespeichert werden. Fangformular wird geöffnet.');
      else toast('Check-in gespeichert. Fang eintragen …');
    }catch{toast('Fangformular wird geöffnet.')}
    syncCatchWaterLabel();
    window.openAdd();
    if(btn)btn.disabled=false
  };

  document.addEventListener('DOMContentLoaded',()=>{
    const btn=document.querySelector('#aaCheckinBtn');
    if(btn){btn.onclick=window.checkin;btn.title='Check-in speichern und Fang an diesem Gewässer posten'}
    document.querySelector('#aaPlus')?.addEventListener('click',()=>setTimeout(syncCatchWaterLabel,20))
  },{once:true});

  function loadFeature(src,delay){
    setTimeout(()=>{
      if(document.querySelector(`script[src="${src}"]`))return;
      const s=document.createElement('script');s.src=src;s.async=false;document.body.appendChild(s)
    },delay)
  }
  loadFeature('/v6-user-moderation.js',450);
  loadFeature('/v6-notifications-appeals.js',650);
  loadFeature('/v6-settings.js',850)
})();