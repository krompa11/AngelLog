export default async function handler(req,res){
  try{
    const names=['SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SERVICE_KEY','SUPABASE_URL','NEXT_PUBLIC_SUPABASE_URL','VITE_SUPABASE_URL'];
    const env=Object.fromEntries(names.map(k=>[k,!!process.env[k]]));
    res.setHeader('Cache-Control','no-store');
    res.status(200).json({env});
  }catch(e){res.status(500).json({error:String(e?.message||e)})}
}
