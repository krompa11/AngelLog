const BASE='https://services7.arcgis.com/poOcx60xJtGtoR7g/ArcGIS/rest/services/Lakes/FeatureServer/0/query';
async function query(params){
  const u=BASE+'?'+new URLSearchParams({...params,f:'json',outFields:'Hylak_id,Lake_name,Country,Continent,Lake_type,Lake_area,Shore_len,Depth_avg,Vol_total,Elevation',returnGeometry:'false'});
  const r=await fetch(u,{headers:{accept:'application/json','user-agent':'AngelLog/1.0'}});if(!r.ok)return null;return r.json()
}
export default async function handler(req,res){
  const lat=Number(req.query.lat),lng=Number(req.query.lng);if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<-90||lat>90||lng<-180||lng>180)return res.status(400).json({error:'Ungültige Koordinaten'});
  try{
    let d=await query({geometry:`${lng},${lat}`,geometryType:'esriGeometryPoint',inSR:'4326',spatialRel:'esriSpatialRelIntersects'});
    let features=d?.features||[];
    if(!features.length){const dx=.025,dy=.025;d=await query({geometry:`${lng-dx},${lat-dy},${lng+dx},${lat+dy}`,geometryType:'esriGeometryEnvelope',inSR:'4326',spatialRel:'esriSpatialRelIntersects'});features=d?.features||[]}
    const rows=features.map(x=>x.attributes||{}).filter(x=>Number.isFinite(Number(x.Hylak_id)));
    if(!rows.length)return res.status(404).json({error:'Kein HydroLAKES-Gewässer gefunden'});
    const best=rows.sort((a,b)=>(Number(b.Lake_area)||0)-(Number(a.Lake_area)||0))[0];
    res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');return res.status(200).json({source:'HydroLAKES v1.0',...best})
  }catch(e){return res.status(500).json({error:String(e?.message||e)})}
}
