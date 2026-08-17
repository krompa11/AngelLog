function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function mins(iso){const m=/T(\d{2}):(\d{2})/.exec(iso||'');return m?(+m[1])*60+(+m[2]):0}
function dateOf(iso){return String(iso||'').slice(0,10)}
function timeOf(iso){return String(iso||'').slice(11,16)}
function diffMin(a,b){let d=Math.abs(a-b);return Math.min(d,1440-d)}
function hourlyScore(i,h,sunByDate){
  let score=5;
  const wind=Number(h.wind_speed_10m?.[i]),pressure=Number(h.pressure_msl?.[i]),cloud=Number(h.cloud_cover?.[i]),rain=Number(h.precipitation?.[i]),pop=Number(h.precipitation_probability?.[i]),temp=Number(h.temperature_2m?.[i]);
  if(Number.isFinite(wind)){if(wind>=4&&wind<=18)score+=1;else if(wind<=28)score+=.3;else if(wind>35)score-=1;else if(wind<2)score-=.2}
  if(Number.isFinite(pressure)){if(pressure>=1002&&pressure<=1022)score+=.4;else if(pressure<992||pressure>1032)score-=.4;const prev=Number(h.pressure_msl?.[Math.max(0,i-3)]);if(Number.isFinite(prev)){const delta=pressure-prev;if(delta<=-.3&&delta>=-2.5)score+=.55;else if(delta>.2&&delta<1.8)score+=.15;else if(Math.abs(delta)>4)score-=.45}}
  if(Number.isFinite(cloud)){if(cloud>=30&&cloud<=85)score+=.5;else if(cloud>85)score+=.2;else if(cloud<10)score-=.3}
  if(Number.isFinite(rain)){if(rain>0&&rain<=1.5)score+=.35;else if(rain>4)score-=.8}
  if(Number.isFinite(pop)){if(pop>=15&&pop<=55)score+=.25;else if(pop>85)score-=.35}
  if(Number.isFinite(temp)&&temp>=8&&temp<=24)score+=.2;
  const t=h.time?.[i],d=dateOf(t),tm=mins(t),sun=sunByDate[d];
  if(sun){const near=Math.min(diffMin(tm,sun.rise),diffMin(tm,sun.set));if(near<=90)score+=1.1;else if(near<=150)score+=.5}
  return +clamp(score,1,9.7).toFixed(1)
}
function bestWindows(hours){
  if(!hours.length)return [];
  const spans=[];
  for(let i=0;i<hours.length;i++){
    const slice=hours.slice(i,i+3);if(!slice.length)continue;
    const avg=slice.reduce((a,x)=>a+x.score,0)/slice.length;
    spans.push({start:hours[i].time,end:slice[slice.length-1].time,score:+avg.toFixed(1)});
  }
  spans.sort((a,b)=>b.score-a.score);
  const out=[];
  for(const x of spans){if(out.every(y=>Math.abs(new Date(x.start)-new Date(y.start))>3*3600e3)){out.push(x);if(out.length===2)break}}
  return out.map(x=>({from:timeOf(x.start),to:timeOf(x.end),score:x.score}));
}
export default async function handler(req,res){
  const lat=Number(req.query.lat),lon=Number(req.query.lon);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<-90||lat>90||lon<-180||lon>180)return res.status(400).json({error:'Ungültige Koordinaten'});
  const params=new URLSearchParams({latitude:String(lat),longitude:String(lon),timezone:'auto',forecast_days:'3',hourly:'temperature_2m,precipitation_probability,precipitation,pressure_msl,cloud_cover,wind_speed_10m,weather_code',daily:'sunrise,sunset'});
  let r,d;
  try{r=await fetch('https://api.open-meteo.com/v1/forecast?'+params.toString(),{headers:{accept:'application/json','user-agent':'AngelLog/1.0'}});if(!r.ok)throw new Error('HTTP '+r.status);d=await r.json()}catch(e){return res.status(502).json({error:'Wetterdaten derzeit nicht erreichbar'})}
  const h=d.hourly||{},daily=d.daily||{},sunByDate={};
  (daily.time||[]).forEach((day,i)=>sunByDate[day]={rise:mins(daily.sunrise?.[i]),set:mins(daily.sunset?.[i])});
  const now=Date.now(),all=(h.time||[]).map((time,i)=>({time,score:hourlyScore(i,h,sunByDate),temperature:h.temperature_2m?.[i],pressure:h.pressure_msl?.[i],wind:h.wind_speed_10m?.[i],precipitation:h.precipitation?.[i],precipitation_probability:h.precipitation_probability?.[i],cloud_cover:h.cloud_cover?.[i],weather_code:h.weather_code?.[i]}));
  let nearest=all[0]||null,bestDiff=Infinity;for(const x of all){const ms=new Date(x.time).getTime(),df=Math.abs(ms-now);if(df<bestDiff){bestDiff=df;nearest=x}}
  const today=dateOf(nearest?.time||all[0]?.time),dates=[...new Set(all.map(x=>dateOf(x.time)))];
  const summaries=dates.slice(0,3).map(day=>{let hours=all.filter(x=>dateOf(x.time)===day);if(day===today)hours=hours.filter(x=>new Date(x.time).getTime()>=now-3600e3);const avg=hours.length?hours.reduce((a,x)=>a+x.score,0)/hours.length:0,best=hours.length?Math.max(...hours.map(x=>x.score)):0;return {date:day,average:+avg.toFixed(1),best:+best.toFixed(1),windows:bestWindows(hours)}});
  res.setHeader('Cache-Control','public, s-maxage=600, stale-while-revalidate=1800');
  return res.status(200).json({source:'Open-Meteo',model:'AngelLog heuristic v1',timezone:d.timezone,current:nearest,days:summaries,hours:all.slice(0,72),disclaimer:'Heuristische Fangprognose aus Wetter und Tageszeit; keine Fanggarantie.'});
}
