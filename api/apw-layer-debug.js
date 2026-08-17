export default async function handler(req,res){
  try{
    const url='https://apw.brandenburg.de/?th=seenverm&POS-XY=%20327000%7c%205808000%20&POS-OFFSET=8000&POS-MARK=false';
    const r=await fetch(url,{headers:{'user-agent':'AngelLog/1.0'}});
    const html=await r.text();
    const scripts=[...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>m[1]);
    const links=[...html.matchAll(/<link[^>]+href=["']([^"']+)["']/gi)].map(m=>m[1]);
    const hits=html.split(/\r?\n/).filter(x=>/seenverm|wms|mapserver|tile|cardo/i.test(x)).slice(0,120);
    res.status(200).json({status:r.status,length:html.length,scripts,links,hits});
  }catch(e){res.status(500).json({error:String(e?.message||e)})}
}
