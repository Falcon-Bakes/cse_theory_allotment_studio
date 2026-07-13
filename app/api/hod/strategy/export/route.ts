import {requireUser} from '@/lib/auth';
import {timetableFriendlyCSV} from '@/lib/store';
export async function GET(req:Request){const u=await requireUser('HoD');if(!u)return new Response('Unauthorized',{status:401});const run=new URL(req.url).searchParams.get('run')||'';const csv=await timetableFriendlyCSV(run);return new Response(csv,{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="timetable_friendly_allotment.csv"'}})}
