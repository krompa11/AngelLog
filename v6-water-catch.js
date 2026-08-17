(()=>{
  const q=s=>document.querySelector(s);
  function ensureWaterLabel(){
    const sheet=q('#aaSheet');if(!sheet)return null;
    let box=q('#aaCatchWaterBox');
    if(!box){
      box=document.createElement('div');box.id='aaCatchWaterBox';box.style.cssText='margin:8px 0 14px;padding:11px 12px;border-radius:8px;background:#252627;border:1px solid #48494a;color:#bbb;font-size:13px';
      const h=sheet.querySelector('h2');h?.insertAdjacentElement('afterend',box)
    }
    return box
  }
  function syncWaterLabel(){
    const box=ensureWaterLabel();if(!box)return;
    const w=window.aaCurrentWater;
    box.innerHTML=w?`<span style="color:#8c8c8c">Gewässer</span><br><b style="color:#fff;font-size:16px">≋ ${String(w.name||'Gewässer').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}</b>`:'<span style="color:#999">Kein Gewässer ausgewählt</span>'
  }
  async function postCatchHere(){
    if(!window.aaUser)return toast('Bitte zuerst anmelden.');
    const w=window.aaCurrentWater;if(!w)return toast('Bitte zuerst ein Gewässer auswählen.');
    const btn=q('#aaCheckinBtn');if(btn)btn.disabled=true;
    try{await sb.from('water_checkins').insert({water_id:w.id,user_id:aaUser.id})}catch{}
    syncWaterLabel();
    openAdd();
    if(btn)btn.disabled=false;
  }
  function hook(){
    const btn=q('#aaCheckinBtn');if(btn){btn.onclick=postCatchHere;btn.title='Check-in speichern und Fang an diesem Gewässer posten'}
    const plus=q('#aaPlus');plus?.addEventListener('click',()=>setTimeout(syncWaterLabel,20));
    syncWaterLabel()
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(hook,120));else setTimeout(hook,120)
})();