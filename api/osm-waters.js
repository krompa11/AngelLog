function centerOfGeometry(g){
  if(!g||!g.coordinates)return null;
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  const walk=v=>{if(!Array.isArray(v))return;if(v.length>=2&&typeof v[0]==='number'&&typeof v[1]==='number'){const x=v[0],y=v[1];if(Number.isFinite(x)&&Number.isFinite(y)){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}}else v.forEach(walk)};
  walk(g.coordinates);if(!Number.isFinite(minX))return null;
  let lon=(minX+maxX)/2,lat=(minY+maxY)/2;
  if(lon>50&&lon<55&&lat>10&&lat<16){const t=lat;lat=lon;lon=t}
  return {lon,lat};
}
function featureName(p={}){
  const preferred=['name','NAME','Name','gewaessername','GEWAESSERNAME','bezeichnung','BEZEICHNUNG','lw_name','LW_NAME','waterbody_name','WATERBODY_NAME'];
  for(const k of preferred)if(p[k]&&String(p[k]).trim())return String(p[k]).trim();
  for(const [k,v] of Object.entries(p))if(/(^|_)(name|bez|bezeich|gew.*name|see.*name|lw.*name)($|_)/i.test(k)&&typeof v==='string'&&v.trim())return v.trim();
  return null;
}
function normalizeName(v=''){return String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
async function fetchJsonWithTimeout(url,opts={},ms=6500){const c=new AbortController();const t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{...opts,signal:c.signal});if(!r.ok)return null;return await r.json()}catch{return null}finally{clearTimeout(t)}}
async function officialBrandenburgWaters(n,s,e,w){
  if(e<11.2||w>14.9||n<51.0||s>53.7)return [];
  const base='https://maps.brandenburg.de/services/wfs/wrrl3bwz_wfs';
  const variants=[`${w},${s},${e},${n},EPSG:4326`,`${s},${w},${n},${e},EPSG:4326`];
  for(const bbox of variants){
    const u=base+'?service=WFS&version=2.0.0&request=GetFeature&typeNames='+encodeURIComponent('wrrl_3_bwz_wfs:Seewasserkoerper')+'&outputFormat=GEOJSON&srsName=EPSG:4326&count=250&bbox='+encodeURIComponent(bbox);
    const d=await fetchJsonWithTimeout(u,{headers:{accept:'application/json','user-agent':'AngelLog/1.0'}},5000);
    if(!d?.features?.length)continue;
    const out=[];
    for(const f of d.features){const c=centerOfGeometry(f.geometry),name=featureName(f.properties||{});if(!c||!name)continue;const id=f.id||f.properties?.OBJECTID||f.properties?.FID||name;out.push({source_key:`bb-wfs:${id}`,name,water_type:'See',water_environment:'freshwater',latitude:c.lat,longitude:c.lon,website:null,operator:null,official:true,source_name:'Landesamt für Umwelt Brandenburg'});if(out.length>=180)break}
    if(out.length)return out;
  }
  return [];
}
function waterMeta(t={}){
  const natural=String(t.natural||'').toLowerCase(),water=String(t.water||'').toLowerCase(),waterway=String(t.waterway||'').toLowerCase(),place=String(t.place||'').toLowerCase();
  const salt=String(t.salt||'').toLowerCase(),tidal=String(t.tidal||'').toLowerCase();
  let environment='freshwater';
  if(salt==='yes'||['bay','strait'].includes(natural)||['sea','ocean'].includes(place))environment='saltwater';
  else if(water==='lagoon'||tidal==='yes')environment='brackish';
  let type=water||waterway||natural||place||'Gewässer';
  const labels={lake:'See',reservoir:'Stausee',pond:'Teich',basin:'Becken',river:'Fluss',canal:'Kanal',water:'Gewässer',bay:'Bucht',strait:'Meerenge',sea:'Meer',ocean:'Ozean',lagoon:'Lagune'};
  type=labels[type]||type;
  return {water_type:type,water_environment:environment}
}
function overpassQuery(box,zoom){
  if(zoom<=10){
    return `[out:json][timeout:9];(way["natural"="water"]["name"](${box});relation["natural"="water"]["name"](${box});way["water"~"lake|reservoir"]["name"](${box});relation["water"~"lake|reservoir"]["name"](${box});node["natural"~"bay|strait"]["name"](${box});node["place"~"sea|ocean"]["name"](${box}););out center tags qt 180;`;
  }
  return `[out:json][timeout:12];(way["natural"="water"]["name"](${box});relation["natural"="water"]["name"](${box});way["water"~"lake|reservoir|pond|basin|lagoon"]["name"](${box});relation["water"~"lake|reservoir|pond|basin|lagoon"]["name"](${box});way["waterway"~"river|canal"]["name"](${box});relation["waterway"~"river|canal"]["name"](${box});node["natural"~"bay|strait"]["name"](${box});way["natural"~"bay|strait"]["name"](${box});relation["natural"~"bay|strait"]["name"](${box});node["place"~"sea|ocean"]["name"](${box});node["salt"="yes"]["name"](${box});way["salt"="yes"]["name"](${box});relation["salt"="yes"]["name"](${box}););out center tags qt 300;`;
}
async function osmWaters(n,s,e,w,zoom){
  const box=`${s},${w},${n},${e}`,query=overpassQuery(box,zoom);
  const endpoints=['https://overpass.private.coffee/api/interpreter','https://overpass-api.de/api/interpreter'];
  let data=null;
  for(const endpoint of endpoints){data=await fetchJsonWithTimeout(endpoint,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8',accept:'application/json','user-agent':'AngelLog/1.0 (+https://angellogmobileready-3.vercel.app)'},body:'data='+encodeURIComponent(query)},zoom<=10?5200:6500);if(data)break}
  if(!data)return [];
  const seen=new Set(),waters=[],limit=zoom<=10?180:240;
  for(const x of data.elements||[]){
    const t=x.tags||{},lat=x.lat??x.center?.lat,lon=x.lon??x.center?.lon,name=t.name;
    if(!name||!Number.isFinite(lat)||!Number.isFinite(lon))continue;
    if(lat<s-0.05||lat>n+0.05||lon<w-0.05||lon>e+0.05)continue;
    const key=`osm:${x.type}:${x.id}`;if(seen.has(key))continue;seen.add(key);
    const meta=waterMeta(t);
    waters.push({source_key:key,name,...meta,latitude:lat,longitude:lon,website:t.website||t['contact:website']||null,operator:t.operator||null,osm_type:x.type,osm_id:x.id,official:false,source_name:'OpenStreetMap'});
    if(waters.length>=limit)break
  }
  return waters;
}
function mergeWaters(official,osm){
  const out=[],names=[];
  const add=w=>{const n=normalizeName(w.name);if(!n)return;const duplicate=names.some(x=>x.name===n&&Math.abs(x.lat-w.latitude)<0.015&&Math.abs(x.lon-w.longitude)<0.02);if(duplicate)return;names.push({name:n,lat:w.latitude,lon:w.longitude});out.push(w)};
  official.forEach(add);osm.forEach(add);return out.slice(0,260)
}
export default async function handler(req,res){
  const n=Number(req.query.n),s=Number(req.query.s),e=Number(req.query.e),w=Number(req.query.w),zoom=Math.max(8,Math.min(18,Number(req.query.z)||12));
  if(![n,s,e,w].every(Number.isFinite)||n<=s||e<=w||n>90||s<-90||e>180||w<-180)return res.status(400).json({error:'Ungültiger Kartenausschnitt'});
  if(n-s>2.4||e-w>3.4)return res.status(400).json({error:'Bitte näher heranzoomen'});
  const [official,osm]=await Promise.all([officialBrandenburgWaters(n,s,e,w),osmWaters(n,s,e,w,zoom)]);
  const waters=mergeWaters(official,osm);
  res.setHeader('Cache-Control','public, s-maxage=21600, stale-while-revalidate=604800');
  return res.status(200).json({source:official.length?'Amtliche Daten + OpenStreetMap':'OpenStreetMap / Overpass API',coverage:'worldwide',marine:true,detail:zoom<=10?'major':'full',count:waters.length,waters})
}
