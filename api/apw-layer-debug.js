const ROOT='https://apw.brandenburg.de/';
const PAGE=ROOT+'?th=seenverm&POS-XY=%20327000%7c%205808000%20&POS-OFFSET=8000&POS-MARK=false';
const abs=u=>{try{return new URL(u,ROOT).href}catch{return null}};
const uniq=a=>[...new Set(a.filter(Boolean))];
async function get(url){const r=await fetch(url,{headers:{'user-agent':'AngelLog/1.0'}});return {status:r.status,text:await r.text()}}
export default async function handler(req,res){
  try{
    const page=await get(PAGE),html=page.text;
    const scripts=uniq([...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>abs(m[1]))).filter(u=>u?.startsWith(ROOT)).slice(0,20);
    if(req.query.stage!=='scan')return res.status(200).json({status:page.status,length:html.length,scripts});
    const needles=/seenverm|seenvermess|tief|isobath|wms|wmts|getmap|getcapabilit|mapserver|tile|layer/i;
    const hits=[];
    for(const u of scripts.slice(0,12)){
      try{
        const x=await get(u);if(x.status!==200)continue;
        const lines=x.text.split(/\r?\n/);
        for(let i=0;i<lines.length&&hits.length<25;i++)if(needles.test(lines[i]))hits.push({url:u,line:i+1,text:lines[i].slice(0,500)});
        const urls=[...x.text.matchAll(/https?:\\?\/\\?\/[^"'\s)]+/g)].map(m=>m[0].replace(/\\\//g,'/')).filter(v=>/brandenburg|wms|map|tile/i.test(v));
        for(const v of uniq(urls).slice(0,10))if(hits.length<25)hits.push({url:u,found:v.slice(0,500)});
      }catch{}
    }
    res.status(200).json({scriptsScanned:scripts.length,hits});
  }catch(e){res.status(500).json({error:String(e?.message||e)})}
}
