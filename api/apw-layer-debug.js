const ROOT='https://apw.brandenburg.de/';
const PAGE=ROOT+'?th=seenverm&POS-XY=%20327000%7c%205808000%20&POS-OFFSET=8000&POS-MARK=false';
const decode=s=>String(s||'').replace(/&amp;/g,'&');
const abs=u=>{try{return new URL(decode(u),ROOT).href}catch{return null}};
const uniq=a=>[...new Set(a.filter(Boolean))];
async function get(url){const r=await fetch(url,{headers:{'user-agent':'AngelLog/1.0'}});return {status:r.status,text:await r.text()}}
const escRe=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function contexts(text,label,q){const re=new RegExp(escRe(q),'ig'),out=[];let m;while((m=re.exec(text))&&out.length<15){const a=Math.max(0,m.index-320),b=Math.min(text.length,m.index+520);out.push({source:label,context:text.slice(a,b).replace(/\s+/g,' ').slice(0,900)});if(re.lastIndex===m.index)re.lastIndex++}return out}
export default async function handler(req,res){
  try{
    const page=await get(PAGE),html=page.text;
    const scripts=uniq([...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>abs(m[1]))).filter(u=>u?.startsWith(ROOT)).slice(0,28);
    const q=String(req.query.q||'seenverm').slice(0,60);
    let hits=contexts(html,'PAGE',q);
    for(const u of scripts){if(hits.length>=35)break;try{const x=await get(u);if(x.status===200)hits.push(...contexts(x.text,u,q))}catch{}}
    res.status(200).json({q,scriptsScanned:scripts.length,hits:hits.slice(0,35)});
  }catch(e){res.status(500).json({error:String(e?.message||e)})}
}
