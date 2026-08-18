const APW='https://apw.brandenburg.de/';
const APW_PAGE=APW+'?th=seenverm&POS-MARK=false';
function utm33(lat,lon){
  const a=6378137,f=1/298.257223563,k0=.9996,e2=f*(2-f),ep2=e2/(1-e2),r=Math.PI/180;
  const p=lat*r,l=lon*r,l0=15*r,N=a/Math.sqrt(1-e2*Math.sin(p)**2),T=Math.tan(p)**2,C=ep2*Math.cos(p)**2,A=Math.cos(p)*(l-l0);
  const M=a*((1-e2/4-3*e2**2/64-5*e2**3/256)*p-(3*e2/8+3*e2**2/32+45*e2**3/1024)*Math.sin(2*p)+(15*e2**2/256+45*e2**3/1024)*Math.sin(4*p)-(35*e2**3/3072)*Math.sin(6*p));
  const x=500000+k0*N*(A+(1-T+C)*A**3/6+(5-18*T+T*T+72*C-58*ep2)*A**5/120);
  const y=k0*(M+N*Math.tan(p)*(A*A/2+(5-T+9*C+4*C*C)*A**4/24+(61-58*T+T*T+600*C-330*ep2)*A**6/720));
  return{x,y};
}
function command(command,args){return {command,args:JSON.stringify(args)}}
export default async function handler(req,res){
  const n=Number(req.query.n),s=Number(req.query.s),e=Number(req.query.e),w=Number(req.query.w),width=Math.max(256,Math.min(1200,Number(req.query.width)||768)),height=Math.max(256,Math.min(1200,Number(req.query.height)||768));
  if(![n,s,e,w].every(Number.isFinite)||n<=s||e<=w)return res.status(400).json({error:'Ungültiger Kartenausschnitt'});
  if(n>53.75||s<51.15||e>15.2||w<11.0)return res.status(400).json({error:'Tiefenkarte derzeit nur in Brandenburg verfügbar'});
  try{
    const page=await fetch(APW_PAGE,{headers:{'user-agent':'AngelLog/1.0'}});const html=await page.text();
    if(!page.ok)return res.status(502).json({error:'Amtliche Tiefenkarte nicht erreichbar'});
    const m=html.match(/mapActionHandlerUrl\\?\":\\?\"([^\"]*webmap\.ashx[^\"]+)/i)||html.match(/mapActionHandlerUrl[^h]+(https:\/\/apw\.brandenburg\.de\/webmap\.ashx\?[^"<]+)/i);
    let action=m?.[1]?.replace(/\\u0026/g,'&').replace(/&amp;/g,'&').replace(/\\\//g,'/');
    if(action&&action.startsWith('/'))action=APW.replace(/\/$/,'')+action;
    if(!action||!action.includes('webmap.ashx'))return res.status(502).json({error:'Tiefenkarten-Sitzung konnte nicht gestartet werden'});
    const cookie=page.headers.get('set-cookie')||'';
    const corners=[utm33(s,w),utm33(s,e),utm33(n,w),utm33(n,e)],xs=corners.map(p=>p.x),ys=corners.map(p=>p.y);
    const layer={layerName:'L557',isVisible:true,sortHint:'G5',filter:null,supportsLegendBasedFilter:false,i7TypeName:'PostgresLayer'};
    const prepare={extent:{xMin:Math.min(...xs),yMin:Math.min(...ys),xMax:Math.max(...xs),yMax:Math.max(...ys),epsg:25833},mapSize:{width,height},layerList:[layer],imageType:2,minScale:-1,maxScale:-1,virtualMapSize:null};
    const prep=await fetch(action,{method:'POST',headers:{'content-type':'text/plain','user-agent':'AngelLog/1.0',...(cookie?{cookie}:{})},body:JSON.stringify([command(1,prepare)])});
    const txt=await prep.text();let data;try{data=JSON.parse(txt)}catch{return res.status(502).json({error:'Ungültige Antwort der Tiefenkarte',detail:txt.slice(0,400)})}
    const out=Array.isArray(data)?data[data.length-1]:data,info=out?.value??out;
    const guid=info?.imageGuid||info?.ImageGuid||info?.imageGUID;
    if(!guid)return res.status(502).json({error:'Tiefenkarte konnte nicht vorbereitet werden',detail:info||data});
    const commands=encodeURIComponent(JSON.stringify([command(2,guid)]));
    const img=await fetch(action+'commands='+commands,{headers:{'user-agent':'AngelLog/1.0',...(cookie?{cookie}:{})}});
    if(!img.ok)return res.status(502).json({error:'Tiefenkartenbild konnte nicht geladen werden',status:img.status});
    const type=img.headers.get('content-type')||'image/png';const buf=Buffer.from(await img.arrayBuffer());
    res.setHeader('Content-Type',type);res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=1800');return res.status(200).send(buf)
  }catch(e){return res.status(502).json({error:'Tiefenkarte konnte nicht geladen werden',detail:String(e?.message||e)})}
}
