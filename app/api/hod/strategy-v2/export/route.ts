import {NextResponse} from 'next/server';
import {requireUser} from '@/lib/auth';
import {timetableFriendlyV2CSV} from '@/lib/store';
export async function GET(req:Request){
 const u=await requireUser('HoD');if(!u)return NextResponse.json({error:'Unauthorized'},{status:401});
 const run=new URL(req.url).searchParams.get('run')||'';
 const csv=await timetableFriendlyV2CSV(run);
 return new NextResponse(csv,{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="timetable_friendly_allotment_v2.csv"'}});
}
