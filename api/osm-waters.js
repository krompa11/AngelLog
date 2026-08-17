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
    const d=await fetchJsonWithTimeout(u,{headers:{accept:'application/json','user-agent':'AngelLog/1.0'}},6000);
    if(!d?.features?.length)continue;
    const out=[];
    for(const f of d.features){const c=centerOfGeometry(f.geometry),name=featureName(f.properties||{});if(!c||!name)continue;const id=f.id||f.properties?.OBJECTID||f.properties?.FID||name;out.push({source_key:`bb-wfs:${id}`,name,water_type:'See',latitude:c.lat,longitude:c.lon,website:null,operator:null,official:true,source_name:'Landesamt für Umwelt Brandenburg'});if(out.length>=180)break}
    if(out.length)return out;
  }
  return [];
}
async function osmWaters(n,s,e,w){
  const box=`${s},${w},${n},${e}`;
  const query=`[out:json][timeout:10];(way["natural"="water"]["name"](${box});relation["natural"="water"]["name"](${box});way["water"~"lake|reservoir|pond|basin"]["name"](${box});relation["water"~"lake|reservoir|pond|basin"]["name"](${box});way["waterway"~"river|canal"]["name"](${box});relation["waterway"~"river|canal"]["name"](${box}););out center tags qt 260;`;
  const endpoints=['https://overpass.private.coffee/api/interpreter','https://overpass-api.de/api/interpreter'];
  let data=null;
  for(const endpoint of endpoints){data=await fetchJsonWithTimeout(endpoint,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8',accept:'application/json','user-agent':'AngelLog/1.0 (+https://angellogmobileready-3.vercel.app)'},body:'data='+encodeURIComponent(query)},6000);if(data)break}
  if(!data)return [];
  const seen=new Set(),waters=[];
  for(const x of data.elements||[]){
    const t=x.tags||{},lat=x.lat??x.center?.lat,lon=x.lon??x.center?.lon,name=t.name;
    if(!name||!Number.isFinite(lat)||!Number.isFinite(lon))continue;
    const key=`osm:${x.type}:${x.id}`;if(seen.has(key))continue;seen.add(key);
    let type=t.water||t.waterway||t.natural||'Gewässer';
    const labels={lake:'See',reservoir:'Stausee',pond:'Teich',basin:'Becken',river:'Fluss',canal:'Kanal',water:'Gewässer'};type=labels[type]||type;
    waters.push({source_key:key,name,water_type:type,latitude:lat,longitude:lon,website:t.website||t['contact:website']||null,operator:t.operator||null,osm_type:x.type,osm_id:x.id,official:false,source_name:'OpenStreetMap'});
    if(waters.length>=220)break
  }
  return waters;
}
function mergeWaters(official,osm){
  const out=[],names=[];
  const add=w=>{const n=normalizeName(w.name);if(!n)return;const duplicate=names.some(x=>x.name===n&&Math.abs(x.lat-w.latitude)<0.015&&Math.abs(x.lon-w.longitude)<0.02);if(duplicate)return;names.push({name:n,lat:w.latitude,lon:w.longitude});out.push(w)};
  official.forEach(add);osm.forEach(add);return out.slice(0,240)
}
export default async function handler(req,res){
  const n=Number(req.query.n),s=Number(req.query.s),e=Number(req.query.e),w=Number(req.query.w);
  if(![n,s,e,w].every(Number.isFinite)||n<=s||e<=w||n>90||s<-90||e>180||w<-180)return res.status(400).json({error:'Ungültiger Kartenausschnitt'});
  if(n-s>2.2||e-w>3.2)return res.status(400).json({error:'Bitte näher heranzoomen'});
  const [official,osm]=await Promise.all([officialBrandenburgWaters(n,s,e,w),osmWaters(n,s,e,w)]);
  const waters=mergeWaters(official,osm);
  res.setHeader('Cache-Control','public, s-maxage=600, stale-while-revalidate=3600');
  return res.status(200).json({source:official.length?'Amtliche Daten + OpenStreetMap':'OpenStreetMap / Overpass API',coverage:'worldwide',count:waters.length,waters})
}
