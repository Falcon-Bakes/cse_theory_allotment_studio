import {requireUser} from '@/lib/auth';
import {redirect} from 'next/navigation';
import {strategyWorkbenchV2Data} from '@/lib/store';
import StrategyWorkbenchV2 from '@/components/StrategyWorkbenchV2';

/**
 * Parallel HoD Strategy V2 route. The existing /hod/strategy remains available
 * until this page is accepted and promoted.
 */
export default async function StrategyV2Page(){
 const user=await requireUser('HoD'); if(!user)redirect('/login');
 const data=await strategyWorkbenchV2Data(user.user_id);
 return <><nav><b>Faculty Allotment Workbench — Strategy V2</b><span></span><a href="/hod">HoD Dashboard</a><a href="/hod/strategy">Old Strategy</a><a href="/admin">Admin</a><a href="/api/logout">Logout</a></nav><main><StrategyWorkbenchV2 initial={data}/></main></>
}
