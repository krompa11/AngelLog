import {inflateRawSync} from 'node:zlib';
const URL='https://ndownloader.figshare.com/files/28919850';
const RANGES=[
 [300001,400000,16530147995,16543559704],[1400001,1427688,16543559705,16547467143],[1200001,1300000,16547467144,16561378944],[1000001,1100000,16561378945,16575290745],[1300001,1400000,16575290746,16589202540],[800001,900000,16589202541,16602613941],[900001,1000000,16602613942,16616126441],[500001,600000,16616126442,16629537840],[400001,500000,16629537841,16642949239],[600001,700000,16642949240,16656360638],[700001,800000,16656360639,16669772029],[1,100000,16669772030,16683245169],[1100001,1200000,16683245170,16698358176],[100001,200000,16698358177,16712970787],[200001,300000,16712970788,16727583162]
];
async function range(a,b){const r=await fetch(URL,{headers:{Range:`bytes=${a}-${b}`},redirect:'follow'});if(r.status!==206)throw new Error('Figshare Range '+r.status);return Buffer.from(await r.arrayBuffer())}
function zip64(entry,extraStart,extraLen,comp32,uncomp32,off32){let comp=comp32,uncomp=uncomp32,off=off32;let p=extraStart,end=extraStart+extraLen;while(p+4<=end){const id=entry.readUInt16LE(p),len=entry.readUInt16LE(p+2),d=p+4,de=d+len;if(de>end)break;if(id===1){let q=d;if(uncomp32===0xffffffff&&q+8<=de){uncomp=Number(entry.readBigUInt64LE(q));q+=8}if(comp32===0xffffffff&&q+8<=de){comp=Number(entry.readBigUInt64LE(q));q+=8}if(off32===0xffffffff&&q+8<=de){off=Number(entry.readBigUInt64LE(q));q+=8}return {comp,uncomp,off}}p=de}return {comp,uncomp,off}}
function findEntry(buf,id){const target=`/${id}_bathymetry.tif`;for(let i=0;i+46<=buf.length;){if(buf.readUInt32LE(i)!==0x02014b50){i++;continue}const method=buf.readUInt16LE(i+10),comp32=buf.readUInt32LE(i+20),uncomp32=buf.readUInt32LE(i+24),nl=buf.readUInt16LE(i+28),xl=buf.readUInt16LE(i+30),cl=buf.readUInt16LE(i+32),off32=buf.readUInt32LE(i+42),len=46+nl+xl+cl;if(i+len>buf.length)break;const name=buf.subarray(i+46,i+46+nl).toString('utf8');if(name.endsWith(target)){const z=zip64(buf,i+46+nl,xl,comp32,uncomp32,off32);return {name,method,...z}}i+=len}return null}
export default async function handler(req,res){
 try{
  const id=Math.trunc(Number(req.query.id));if(!Number.isFinite(id)||id<1||id>1427688)return res.status(400).json({error:'Ungültige HydroLAKES-ID'});
  const block=RANGES.find(x=>id>=x[0]&&id<=x[1]);if(!block)return res.status(404).json({error:'GLOBathy-Block nicht gefunden'});
  const cd=await range(block[2],block[3]),entry=findEntry(cd,id);if(!entry)return res.status(404).json({error:'GLOBathy-Raster nicht gefunden'});
  if(!Number.isFinite(entry.off)||!Number.isFinite(entry.comp)||entry.comp<1||entry.comp>50*1024*1024)return res.status(502).json({error:'Ungültiger Rastereintrag'});
  const lh=await range(entry.off,entry.off+1023);if(lh.readUInt32LE(0)!==0x04034b50)throw new Error('Lokaler ZIP-Header fehlt');const nl=lh.readUInt16LE(26),xl=lh.readUInt16LE(28),dataStart=entry.off+30+nl+xl,packed=await range(dataStart,dataStart+entry.comp-1);
  let data;if(entry.method===0)data=packed;else if(entry.method===8)data=inflateRawSync(packed);else return res.status(415).json({error:'ZIP-Kompression nicht unterstützt',method:entry.method});
  if(entry.uncomp&&data.length!==entry.uncomp)res.setHeader('X-AngelLog-Size-Warning',`${data.length}/${entry.uncomp}`);
  res.setHeader('Content-Type','image/tiff');res.setHeader('Cache-Control','public, s-maxage=604800, stale-while-revalidate=2592000');res.setHeader('X-AngelLog-Depth-Source','GLOBathy');res.setHeader('X-HydroLAKES-ID',String(id));res.setHeader('Content-Disposition',`inline; filename="${id}_bathymetry.tif"`);return res.status(200).send(data)
 }catch(e){return res.status(500).json({error:String(e?.message||e)})}
}
