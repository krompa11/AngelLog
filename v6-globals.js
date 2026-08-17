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

  function loadFeature(src,delay){
    setTimeout(()=>{
      if(document.querySelector(`script[src="${src}"]`))return;
      const s=document.createElement('script');s.src=src;s.async=false;document.body.appendChild(s)
    },delay)
  }
  loadFeature('/v6-water-catch.js',250);
  loadFeature('/v6-user-moderation.js',450);
  loadFeature('/v6-notifications-appeals.js',650);
  loadFeature('/v6-settings.js',850)
})();