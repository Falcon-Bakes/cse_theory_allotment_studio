import {requireUser} from '@/lib/auth';
import {redirect} from 'next/navigation';
import {strategyWorkbenchData} from '@/lib/store';
import StrategyWorkbench from '@/components/StrategyWorkbench';

/** HoD-only V1.4 workbench. Existing preference pages remain unchanged. */
export default async function StrategyPage(){
 const user=await requireUser('HoD'); if(!user)redirect('/login');
 const data=await strategyWorkbenchData(user.user_id);
 return <><nav><b>Faculty Allotment Workbench</b><span></span><a href="/hod">HoD Dashboard</a><a href="/admin">Admin</a><a href="/api/logout">Logout</a></nav><main><StrategyWorkbench initial={data}/></main></>
}
