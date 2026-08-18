export default async function handler(req,res){
  try{
    const headers={'user-agent':'AngelLog-data-import/1.0'};
    const fetchJson=async url=>{const r=await fetch(url,{headers});const d=await r.json();return Array.isArray(d)?d:[]};
    const regular=await fetchJson('https://gws.lavb.de/api/gewaesser?gebiete=a&verein=a');
    const contracts=await fetchJson('https://gws.lavb.de/api/gewaesser?gebiete=10&verein=a');
    const prefix=id=>{const s=String(id||'').trim();if(/^Salmo-/i.test(s))return'Salmo';const m=s.match(/^([A-Za-z]+)/);return m?m[1]:'other'};
    const countBy=rows=>rows.reduce((m,x)=>{const k=prefix(x.id);m[k]=(m[k]||0)+1;return m},{});
    const unusual=regular.filter(x=>!/^((C|P|F)\s|Salmo-)/i.test(String(x.id||'').trim())).slice(0,50);
    res.setHeader('Cache-Control','no-store');
    res.status(200).json({regular_count:regular.length,regular_prefixes:countBy(regular),contracts_count:contracts.length,contract_prefixes:countBy(contracts),unusual});
  }catch(e){res.status(500).json({error:String(e?.message||e)})}
}
