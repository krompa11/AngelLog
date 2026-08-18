const URL='https://ndownloader.figshare.com/files/28919850';
const CD_OFFSET=16530147995,CD_SIZE=197435168,CHUNK=10*1024*1024,OVERLAP=262144,PARTS=Math.ceil(CD_SIZE/CHUNK);
async function range(a,b){const r=await fetch(URL,{headers:{Range:`bytes=${a}-${b}`},redirect:'follow'});if(r.status!==206)throw new Error('Range '+r.status);return Buffer.from(await r.arrayBuffer())}
function folderOf(name){const i=name.lastIndexOf('/');return i<0?'':name.slice(0,i+1)}
async function scan(part){const start=CD_OFFSET+part*CHUNK,end=Math.min(CD_OFFSET+CD_SIZE-1,start+CHUNK+OVERLAP-1),buf=await range(start,end),limit=Math.min(CHUNK,CD_OFFSET+CD_SIZE-start),groups={};for(let i=0;i+46<=buf.length;){if(buf.readUInt32LE(i)!==0x02014b50){i++;continue}const nl=buf.readUInt16LE(i+28),xl=buf.readUInt16LE(i+30),cl=buf.readUInt16LE(i+32),len=46+nl+xl+cl;if(i+len>buf.length)break;const abs=start+i,name=buf.subarray(i+46,i+46+nl).toString('utf8'),folder=folderOf(name);if(i<limit&&/_bathymetry\.tif$/i.test(name)){const g=groups[folder]||(groups[folder]={folder,first:abs,last:abs+len-1,count:0});g.first=Math.min(g.first,abs);g.last=Math.max(g.last,abs+len-1);g.count++}i+=len}return Object.values(groups)}
export default async function handler(req,res){
 try{
  if(String(req.query.all||'')==='1'){
    const merged={};
    for(let base=0;base<PARTS;base+=3){const sets=await Promise.all(Array.from({length:Math.min(3,PARTS-base)},(_,j)=>scan(base+j)));for(const groups of sets)for(const g of groups){const x=merged[g.folder]||(merged[g.folder]={folder:g.folder,first:g.first,last:g.last,count:0});x.first=Math.min(x.first,g.first);x.last=Math.max(x.last,g.last);x.count+=g.count}}
    const groups=Object.values(merged).sort((a,b)=>a.folder.localeCompare(b.folder));res.setHeader('Cache-Control','public, s-maxage=86400');return res.status(200).json({parts:PARTS,count:groups.length,groups})
  }
  const part=Math.max(0,Math.min(PARTS-1,Number(req.query.part)||0)),groups=await scan(part);res.setHeader('Cache-Control','public, s-maxage=86400');return res.status(200).json({part,groups})
 }catch(e){return res.status(500).json({error:String(e?.message||e)})}
}
