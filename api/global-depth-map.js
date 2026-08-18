const GEBCO='https://wms.gebco.net/2026/mapserv';

export default async function handler(req,res){
  const n=Number(req.query.n),s=Number(req.query.s),e=Number(req.query.e),w=Number(req.query.w);
  const width=Math.max(256,Math.min(1200,Number(req.query.width)||768));
  const height=Math.max(256,Math.min(1200,Number(req.query.height)||768));
  if(![n,s,e,w].every(Number.isFinite)||n<=s||e<=w||n>90||s<-90||e>360||w<-180){
    return res.status(400).json({error:'Ungültiger Kartenausschnitt'});
  }
  try{
    const p=new URLSearchParams({
      service:'WMS',request:'GetMap',version:'1.3.0',layers:'gebco_2026_2',styles:'',
      crs:'EPSG:4326',bbox:`${s},${w},${n},${e}`,width:String(width),height:String(height),
      format:'image/png',transparent:'true'
    });
    const r=await fetch(`${GEBCO}?${p.toString()}`,{headers:{'user-agent':'AngelLog/1.0 (+https://angellogmobileready-3.vercel.app)'}});
    if(!r.ok)return res.status(502).json({error:'Globale Tiefenkarte nicht erreichbar',status:r.status});
    const type=r.headers.get('content-type')||'image/png';
    const buf=Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type',type);
    res.setHeader('Cache-Control','public, s-maxage=21600, stale-while-revalidate=604800');
    res.setHeader('X-AngelLog-Depth-Source','GEBCO 2026');
    return res.status(200).send(buf);
  }catch(e){
    return res.status(502).json({error:'Globale Tiefenkarte konnte nicht geladen werden',detail:String(e?.message||e)});
  }
}
