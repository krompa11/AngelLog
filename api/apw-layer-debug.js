const ROOT='https://apw.brandenburg.de/';
const PAGE=ROOT+'?th=seenverm&POS-XY=%20327000%7c%205808000%20&POS-OFFSET=8000&POS-MARK=false';
const decode=s=>String(s||'').replace(/&amp;/g,'&');
const abs=u=>{try{return new URL(decode(u),ROOT).href}catch{return null}};
const uniq=a=>[...new Set(a.filter(Boolean))];
async function get(url){const r=await fetch(url,{headers:{'user-agent':'AngelLog/1.0'}});return {status:r.status,text:await r.text()}}
function contexts(text,label){const re=/seenverm|seenvermess|isobath|tief|mapserver|wms|wmts|getmap|getcapabilit|tile(?:url|server|matrix)?|theme(?:id|name)?|layer(?:id|name)?/ig,out=[];let m;while((m=re.exec(text))&&out.length<18){const a=Math.max(0,m.index-220),b=Math.min(text.length,m.index+380);out.push({source:label,match:m[0],context:text.slice(a,b).replace(/\s+/g,' ').slice(0,650)});if(re.lastIndex===m.index)re.lastIndex++}return out}
export default async function handler(req,res){
  try{
    const page=await get(PAGE),html=page.text;
    const scripts=uniq([...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>abs(m[1]))).filter(u=>u?.startsWith(ROOT)).slice(0,24);
    if(req.query.stage!=='scan')return res.status(200).json({status:page.status,length:html.length,scripts});
    let hits=contexts(html,'PAGE').slice(0,12);
    for(const u of scripts){
      if(hits.length>=40)break;
      try{const x=await get(u);if(x.status!==200)continue;hits.push(...contexts(x.text,u).slice(0,10))}catch{}
    }
    res.status(200).json({scriptsScanned:scripts.length,hits:hits.slice(0,40)});
  }catch(e){res.status(500).json({error:String(e?.message||e)})}
}
