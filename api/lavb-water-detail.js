const ID_RE=/^(?:[CPF]\s*\d{1,2}\s*-\s*\d{1,3}|Salmo-[CPF]\s*\d{1,2}\s*-\s*\d{1,3})$/i;

export default async function handler(req,res){
  try{
    const id=String(req.query?.id||'').trim();
    if(!ID_RE.test(id))return res.status(400).json({error:'Ungültige Gewässernummer'});
    const url='https://gws.lavb.de/api/detail?gewaesser_id='+encodeURIComponent(id);
    const r=await fetch(url,{headers:{'user-agent':'AngelLog/1.0 (+official LAVB water lookup)','accept':'application/json'}});
    const text=await r.text();
    let d=null;try{d=JSON.parse(text)}catch{}
    if(!r.ok||!d||typeof d!=='object')return res.status(502).json({error:'LAVB-Daten konnten nicht geladen werden'});
    const lat=Number(d.lat),lng=Number(d.lng);
    res.setHeader('Cache-Control','public, s-maxage=21600, stale-while-revalidate=86400');
    res.status(200).json({
      id:String(d.id||id),
      name:String(d.bezeichnung_k||d.bezeichnung||'Gewässer'),
      description:d.bezeichnung&&d.bezeichnung!==d.bezeichnung_k?String(d.bezeichnung):null,
      note:d.bemerkung&&d.bemerkung!=='NULL'?String(d.bemerkung):null,
      association:d.verein?String(d.verein):null,
      area_ha:Number.isFinite(Number(d.groesse))?Number(d.groesse):null,
      latitude:Number.isFinite(lat)&&lat!==0?lat:null,
      longitude:Number.isFinite(lng)&&lng!==0?lng:null,
      source:'LAVB Gewässerverzeichnis'
    });
  }catch(e){res.status(500).json({error:'LAVB-Abfrage fehlgeschlagen'})}
}
