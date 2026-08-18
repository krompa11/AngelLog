export default async function handler(req,res){
  try{
    const r=await fetch('https://gws.lavb.de/',{headers:{'user-agent':'AngelLog-data-import/1.0'}});
    const html=await r.text();
    const scripts=[...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>m[1]);
    const links=[...html.matchAll(/<link[^>]+href=["']([^"']+)["']/gi)].map(m=>m[1]);
    res.setHeader('Cache-Control','no-store');
    res.status(200).json({status:r.status,scripts,links,html:html.slice(0,30000)});
  }catch(e){res.status(500).json({error:String(e?.message||e)})}
}
