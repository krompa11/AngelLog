export default async function handler(req,res){
  const n=Number(req.query.n),s=Number(req.query.s),e=Number(req.query.e),w=Number(req.query.w);
  if(![n,s,e,w].every(Number.isFinite)||n<=s||e<=w||n>90||s<-90||e>180||w<-180){
    return res.status(400).json({error:'Ungültiger Kartenausschnitt'});
  }
  const latSpan=n-s,lonSpan=e-w;
  if(latSpan>3||lonSpan>5)return res.status(400).json({error:'Bitte näher heranzoomen'});
  const box=`${s},${w},${n},${e}`;
  const query=`[out:json][timeout:20];(
    nwr["natural"="water"]["name"](${box});
    nwr["water"~"lake|reservoir|pond|basin"]["name"](${box});
    nwr["waterway"~"river|canal"]["name"](${box});
  );out center tags qt 350;`;
  try{
    const r=await fetch('https://overpass-api.de/api/interpreter',{
      method:'POST',
      headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8','accept':'application/json','accept-encoding':'gzip, deflate','user-agent':'AngelLog/1.0'},
      body:'data='+encodeURIComponent(query)
    });
    if(!r.ok)return res.status(502).json({error:'Gewässerdienst nicht erreichbar',status:r.status});
    const data=await r.json();
    const seen=new Set(),waters=[];
    for(const x of data.elements||[]){
      const t=x.tags||{},lat=x.lat??x.center?.lat,lon=x.lon??x.center?.lon,name=t.name;
      if(!name||!Number.isFinite(lat)||!Number.isFinite(lon))continue;
      const key=`osm:${x.type}:${x.id}`;
      if(seen.has(key))continue;seen.add(key);
      waters.push({source_key:key,name,water_type:t.water||t.waterway||t.natural||'Gewässer',latitude:lat,longitude:lon,website:t.website||null,operator:t.operator||null,osm_type:x.type,osm_id:x.id});
      if(waters.length>=220)break;
    }
    res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=1800');
    return res.status(200).json({source:'OpenStreetMap / Overpass API',count:waters.length,waters});
  }catch(err){
    return res.status(502).json({error:'Gewässer konnten nicht geladen werden',detail:String(err?.message||err)});
  }
}
