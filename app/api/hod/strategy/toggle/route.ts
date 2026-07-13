import {NextResponse} from 'next/server';
import {requireUser} from '@/lib/auth';
import {strategyWorkbenchData,toggleStrategyAssignment} from '@/lib/store';

export async function GET(){const u=await requireUser('HoD');if(!u)return NextResponse.json({error:'Unauthorized'},{status:401});return NextResponse.json(await strategyWorkbenchData(u.user_id));}
export async function POST(req:Request){
 const u=await requireUser('HoD');if(!u)return NextResponse.json({error:'Unauthorized'},{status:401});
 try{const b=await req.json();return NextResponse.json(await toggleStrategyAssignment({...b,performed_by:u.user_id}));}
 catch(e:any){return NextResponse.json({error:e.message||'Unable to update allotment'},{status:400});}
}
