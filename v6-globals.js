(()=>{
  try{Object.defineProperty(window,'aaUser',{configurable:true,get:()=>aaUser,set:v=>{aaUser=v}})}catch{}
  try{Object.defineProperty(window,'aaCurrentWater',{configurable:true,get:()=>aaCurrentWater,set:v=>{aaCurrentWater=v}})}catch{}
  try{Object.defineProperty(window,'aaMap',{configurable:true,get:()=>aaMap})}catch{}
  setTimeout(()=>{
    if(!document.querySelector('script[src="/v6-user-moderation.js"]')){
      const s=document.createElement('script');s.src='/v6-user-moderation.js';document.body.appendChild(s)
    }
  },450)
})();