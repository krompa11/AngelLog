(()=>{
  try{Object.defineProperty(window,'aaUser',{configurable:true,get:()=>aaUser,set:v=>{aaUser=v}})}catch{}
  try{Object.defineProperty(window,'aaCurrentWater',{configurable:true,get:()=>aaCurrentWater,set:v=>{aaCurrentWater=v}})}catch{}
  try{Object.defineProperty(window,'aaMap',{configurable:true,get:()=>aaMap})}catch{}
})();