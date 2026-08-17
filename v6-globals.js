(()=>{
  try{Object.defineProperty(window,'aaUser',{configurable:true,get:()=>aaUser,set:v=>{aaUser=v}})}catch{}
  try{Object.defineProperty(window,'aaCurrentWater',{configurable:true,get:()=>aaCurrentWater,set:v=>{aaCurrentWater=v}})}catch{}
  try{Object.defineProperty(window,'aaMap',{configurable:true,get:()=>aaMap})}catch{}

  function loadFeature(src,delay){
    setTimeout(()=>{
      if(document.querySelector(`script[src="${src}"]`))return;
      const s=document.createElement('script');s.src=src;s.async=false;document.body.appendChild(s)
    },delay)
  }
  loadFeature('/v6-user-moderation.js',450);
  loadFeature('/v6-notifications-appeals.js',650)
})();