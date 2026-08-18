export default async function handler(req,res){
  try{
    const headers={'user-agent':'AngelLog-data-import/1.0'};
    const urls={
      regular:'https://gws.lavb.de/api/gewaesser?gebiete=a&verein=a',
      contracts:'https://gws.lavb.de/api/gewaesser?gebiete=10&verein=a'
    };
    const out={};
    for(const [key,url] of Object.entries(urls)){
      const r=await fetch(url,{headers});
      const text=await r.text();
      let data=null;try{data=JSON.parse(text)}catch{}
      out[key]={status:r.status,count:Array.isArray(data)?data.length:null,sample:Array.isArray(data)?data.slice(0,5):text.slice(0,1000)};
    }
    res.setHeader('Cache-Control','no-store');
    res.status(200).json(out);
  }catch(e){res.status(500).json({error:String(e?.message||e)})}
}
