export default async function handler(req,res){
  try{
    const articleId=13404635;
    const r=await fetch(`https://api.figshare.com/v2/articles/${articleId}`,{headers:{accept:'application/json','user-agent':'AngelLog/1.0'}});
    if(!r.ok)return res.status(502).json({error:'Figshare nicht erreichbar',status:r.status});
    const d=await r.json();
    const files=(d.files||[]).map(f=>({id:f.id,name:f.name,size:f.size,download_url:f.download_url,supplied_md5:f.supplied_md5||null,computed_md5:f.computed_md5||null,is_link_only:!!f.is_link_only}));
    res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({source:'GLOBathy Bathymetry Rasters',article_id:articleId,title:d.title||null,license:d.license?.name||d.license||null,files});
  }catch(e){return res.status(500).json({error:String(e?.message||e)})}
}
