(()=>{
  const OFFICIAL_MAP='https://apw.brandenburg.de/?th=seenverm&POS-XY=%20327000%7c%205808000%20&POS-OFFSET=8000&POS-MARK=false';

  function toggleOfficialMap(){
    const wrap=document.getElementById('bbDepthFrameWrap');
    const frame=document.getElementById('bbDepthFrame');
    const btn=document.getElementById('bbDepthBtn');
    if(!wrap||!frame||!btn)return;
    const opening=wrap.classList.contains('hidden');
    wrap.classList.toggle('hidden',!opening);
    if(opening && !frame.src){
      frame.src=OFFICIAL_MAP;
      btn.textContent='Amtliche Karte schließen';
      setStatus('Amtliche Tiefenkarte wird separat geladen. Dadurch bleibt AngelLog beim Zoomen speicherschonend.');
    }else if(!opening){
      btn.textContent='Amtliche Tiefenkarte öffnen';
      setStatus('Die amtliche Tiefenkarte ist geschlossen. Deine eigenen Sonardaten bleiben auf der AngelLog-Karte verfügbar.');
    }
  }

  function setStatus(t){const el=document.getElementById('bbDepthStatus');if(el)el.textContent=t}

  function installUI(){
    const depth=document.getElementById('depth');
    if(!depth||document.getElementById('bbDepthBtn'))return;
    const firstCard=depth.querySelector('.premium-card');
    if(!firstCard)return;
    const box=document.createElement('div');
    box.className='official-depth-box';
    box.innerHTML=`
      <div class="card-kicker">ONLINE-TIEFEN · BRANDENBURG</div>
      <h3>Amtliche Seenvermessung</h3>
      <p class="muted">Die amtlichen Tiefendaten werden nicht mehr komplett in den Browser geladen. Das verhindert den bisherigen „Out of Memory“-Absturz beim Zoomen.</p>
      <div class="buttons">
        <button id="bbDepthBtn" class="primary" type="button">Amtliche Tiefenkarte öffnen</button>
        <a class="secondary-link" target="_blank" rel="noopener" href="${OFFICIAL_MAP}">In neuem Tab öffnen</a>
      </div>
      <div id="bbDepthStatus" class="small status-line">Quelle: Landesamt für Umwelt Brandenburg · Datenlizenz Deutschland – Namensnennung 2.0.</div>
      <div id="bbDepthFrameWrap" class="hidden" style="margin-top:14px;border:1px solid rgba(255,255,255,.12);border-radius:16px;overflow:hidden;background:#081319;min-height:520px">
        <iframe id="bbDepthFrame" title="Amtliche Tiefenkarte Brandenburg" loading="lazy" referrerpolicy="no-referrer" style="width:100%;height:520px;border:0;background:#081319"></iframe>
      </div>`;
    firstCard.prepend(box);
    document.getElementById('bbDepthBtn').addEventListener('click',toggleOfficialMap);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUI);else installUI();
})();