export default async function handler(req,res){
  const n=Number(req.query.n),s=Number(req.query.s),e=Number(req.query.e),w=Number(req.query.w);
  if(![n,s,e,w].every(Number.isFinite)||n<=s||e<=w||n>90||s<-90||e>180||w<-180){
    return res.status(400).json({error:'Ungültiger Kartenausschnitt'});
  }
  const latSpan=n-s,lonSpan=e-w;
  if(latSpan>2.2||lonSpan>3.2)return res.status(400).json({error:'Bitte näher heranzoomen'});
  const box=`${s},${w},${n},${e}`;
  const query=`[out:json][timeout:12];(
    way["natural"="water"]["name"](${box});
    relation["natural"="water"]["name"](${box});
    way["water"~"lake|reservoir|pond"]["name"](${box});
    relation["water"~"lake|reservoir|pond"]["name"](${box});
  );out center tags qt 260;`;
  const endpoints=['https://overpass.private.coffee/api/interpreter','https://overpass-api.de/api/interpreter'];
  let data=null,lastStatus=null;
  for(const endpoint of endpoints){
    try{
      const r=await fetch(endpoint,{
        method:'POST',
        headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8','accept':'application/json','accept-encoding':'gzip, deflate','user-agent':'AngelLog/1.0 (+https://angellogmobileready-3.vercel.app)'},
        body:'data='+encodeURIComponent(query)
      });
      lastStatus=r.status;
      if(!r.ok)continue;
      data=await r.json();
      break;
    }catch{}
  }
  if(!data)return res.status(502).json({error:'Gewässerdienst nicht erreichbar',status:lastStatus});
  const seen=new Set(),waters=[];
  for(const x of data.elements||[]){
    const t=x.tags||{},lat=x.lat??x.center?.lat,lon=x.lon??x.center?.lon,name=t.name;
    if(!name||!Number.isFinite(lat)||!Number.isFinite(lon))continue;
    const key=`osm:${x.type}:${x.id}`;
    if(seen.has(key))continue;seen.add(key);
    waters.push({source_key:key,name,water_type:t.water||t.natural||'Gewässer',latitude:lat,longitude:lon,website:t.website||null,operator:t.operator||null,osm_type:x.type,osm_id:x.id});
    if(waters.length>=180)break;
  }
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=1800');
  return res.status(200).json({source:'OpenStreetMap / Overpass API',count:waters.length,waters});
}
