function findEOCD(buf){
  for(let i=buf.length-22;i>=0;i--){
    if(buf[i]===0x50&&buf[i+1]===0x4b&&buf[i+2]===0x05&&buf[i+3]===0x06){
      return {pos:i,entries:buf.readUInt16LE(i+10),cdSize:buf.readUInt32LE(i+12),cdOffset:buf.readUInt32LE(i+16),commentLen:buf.readUInt16LE(i+20)}
    }
  }return null
}
export default async function handler(req,res){
  try{
    const url='https://ndownloader.figshare.com/files/28919850';
    const head=await fetch(url,{method:'HEAD',redirect:'follow'});
    const size=Number(head.headers.get('content-length')||16727583261);
    const start=Math.max(0,size-131072);
    const r=await fetch(url,{headers:{Range:`bytes=${start}-${size-1}`},redirect:'follow'});
    const ab=await r.arrayBuffer(),buf=Buffer.from(ab),eocd=findEOCD(buf);
    res.setHeader('Cache-Control','public, s-maxage=86400');
    return res.status(200).json({status:r.status,acceptRanges:r.headers.get('accept-ranges'),contentRange:r.headers.get('content-range'),contentLength:r.headers.get('content-length'),archiveSize:size,tailBytes:buf.length,eocd});
  }catch(e){return res.status(500).json({error:String(e?.message||e)})}
}
