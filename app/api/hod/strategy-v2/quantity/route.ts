import {NextResponse} from 'next/server';
import {requireUser} from '@/lib/auth';
import {setStrategyAssignmentQuantity,strategyWorkbenchV2Data} from '@/lib/store';

export async function GET(){
 const u=await requireUser('HoD');
 if(!u)return NextResponse.json({error:'Unauthorized'},{status:401});
 return NextResponse.json(await strategyWorkbenchV2Data(u.user_id));
}
export async function POST(req:Request){
 const u=await requireUser('HoD');
 if(!u)return NextResponse.json({error:'Unauthorized'},{status:401});
 try{
  const b=await req.json();
  return NextResponse.json(await setStrategyAssignmentQuantity({...b,performed_by:u.user_id}));
 }catch(e:any){
  const msg=e.message||'Unable to update allotment';
  return NextResponse.json({error:msg},{status:msg.includes('available')?409:400});
 }
}
