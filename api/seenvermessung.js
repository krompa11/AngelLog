export default async function handler(req,res){
  const upstream='https://data.geobasis-bb.de/geofachdaten/Wasser/Hydrologie/seenvermessung.zip';
  try{
    const r=await fetch(upstream,{headers:{'user-agent':'AngelLog/1.0'}});
    if(!r.ok){res.status(r.status).json({error:'Brandenburg-Datensatz nicht erreichbar',status:r.status});return;}
    const buf=Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type','application/zip');
    res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');
    res.setHeader('Content-Disposition','inline; filename="seenvermessung.zip"');
    res.status(200).send(buf);
  }catch(e){res.status(502).json({error:'Tiefendaten konnten nicht geladen werden',detail:String(e?.message||e)});}
}
