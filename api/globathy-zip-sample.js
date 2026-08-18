const URL='https://ndownloader.figshare.com/files/28919850';
async function range(a,b){const r=await fetch(URL,{headers:{Range:`bytes=${a}-${b}`},redirect:'follow'});if(r.status!==206)throw new Error('Range '+r.status);return Buffer.from(await r.arrayBuffer())}
function u64(b,o){return Number(b.readBigUInt64LE(o))}
function namesFromCD(buf){const out=[];for(let i=0;i+46<=buf.length;){if(buf.readUInt32LE(i)!==0x02014b50){i++;continue}const nl=buf.readUInt16LE(i+28),xl=buf.readUInt16LE(i+30),cl=buf.readUInt16LE(i+32),name=buf.subarray(i+46,i+46+nl).toString('utf8');out.push(name);i+=46+nl+xl+cl}return out}
export default async function handler(req,res){
 try{
  const size=16727583261,tailStart=size-131072,tail=await range(tailStart,size-1);let loc=-1;for(let i=tail.length-20;i>=0;i--)if(tail.readUInt32LE(i)===0x07064b50){loc=i;break}if(loc<0)throw new Error('ZIP64 locator fehlt');
  const zip64Off=u64(tail,loc+8),z=await range(zip64Off,zip64Off+79);if(z.readUInt32LE(0)!==0x06064b50)throw new Error('ZIP64 EOCD fehlt');
  const entries=u64(z,32),cdSize=u64(z,40),cdOffset=u64(z,48),chunk=262143;
  const first=await range(cdOffset,cdOffset+chunk),midStart=cdOffset+Math.floor(cdSize/2),mid=await range(midStart,midStart+chunk),lastStart=cdOffset+cdSize-chunk,last=await range(lastStart,cdOffset+cdSize-1);
  const fn=namesFromCD(first),mn=namesFromCD(mid),ln=namesFromCD(last);
  res.setHeader('Cache-Control','public, s-maxage=86400');return res.status(200).json({entries,cdSize,cdOffset,first:fn.slice(0,8),middle:mn.slice(0,8),last:ln.slice(-8)})
 }catch(e){return res.status(500).json({error:String(e?.message||e)})}
}
