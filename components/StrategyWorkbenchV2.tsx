'use client';

import {useMemo,useState} from 'react';

type Props={initial:any};

/**
 * Strategy Engine V2.
 * - Sticky light-blue header while vertically scrolling.
 * - Horizontal scrolling exposes all P1–P6 and progress columns.
 * - Checkbox gives one section; + and − change section quantity.
 * - Optimistic UI prevents a full page refresh.
 */
export default function StrategyWorkbenchV2({initial}:Props){
 const [data,setData]=useState(initial);
 const [tab,setTab]=useState<'allotment'|'load'|'faculty'>('allotment');
 const [busy,setBusy]=useState('');
 const [error,setError]=useState('');
 const [filter,setFilter]=useState('');
 const [institution,setInstitution]=useState('');
 const [semester,setSemester]=useState('');
 const visible=useMemo(()=>data.board.filter((c:any)=>{
   const text=`${c.institution} ${c.semester} ${c.course_code} ${c.course_name}`.toLowerCase();
   return text.includes(filter.toLowerCase()) && (!institution||c.institution===institution) && (!semester||String(c.semester)===semester);
 }),[data,filter,institution,semester]);
 const institutions=[...new Set(data.board.map((c:any)=>c.institution))] as string[];
 const semesters:string[]=[...new Set<string>(data.board.map((c:any)=>String(c.semester)))].sort();

 async function setQuantity(course:any,candidate:any,next:number){
   const allowed=Math.max(0,Number(course.needed)-Number(course.selected)+Number(candidate.quantity||0));
   next=Math.max(0,Math.min(Math.floor(next),allowed));
   const key=`${course.course_key}|${candidate.faculty_id}`;
   if(busy||next===Number(candidate.quantity||0))return;
   setBusy(key);setError('');
   const delta=next-Number(candidate.quantity||0);
   // Optimistic update for the touched course plus all visible faculty-load labels.
   setData((old:any)=>{
     const loadDelta=delta*Number(course.hours_per_week||0);
     const board=old.board.map((c:any)=>({
       ...c,
       candidates:c.candidates.map((f:any)=>{
         if(f.faculty_id!==candidate.faculty_id)return f;
         if(c.course_key===course.course_key)return {...f,quantity:next,checked:next>0,current_load:Math.max(0,Number(f.current_load)+loadDelta)};
         return {...f,current_load:Math.max(0,Number(f.current_load)+loadDelta)};
       }),
       ...(c.course_key===course.course_key?{selected:Number(c.selected)+delta,remaining:Math.max(0,Number(c.remaining)-delta)}:{})
     }));
     return {...old,board};
   });
   try{
    const r=await fetch('/api/hod/strategy-v2/quantity',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({run_id:data.run.run_id,course_key:course.course_key,faculty_id:candidate.faculty_id,quantity:next})});
    const j=await r.json();if(!r.ok)throw new Error(j.error||'Save failed');setData(j);
   }catch(e:any){
    setError(e.message||'Save failed');
    const r=await fetch('/api/hod/strategy-v2/quantity');if(r.ok)setData(await r.json());
   }finally{setBusy('');}
 }

 return <section className="workbench strategy-v2">
  <div className="workbench-head"><div><h2>HoD Strategy Allotment Workbench — V2</h2><p className="muted">Parallel testing route · Draft: {data.run.run_name} · {data.slotCount} section allotments saved</p></div><a className="btn" href={`/api/hod/strategy-v2/export?run=${encodeURIComponent(data.run.run_id)}`}>Export Timetable-Friendly CSV</a></div>
  {error&&<div className="error">{error}</div>}
  <div className="tabs inner-tabs"><button className={tab==='allotment'?'active':''} onClick={()=>setTab('allotment')}>1. Allotment</button><button className={tab==='load'?'active':''} onClick={()=>setTab('load')}>2. Institute & Semester Load</button><button className={tab==='faculty'?'active':''} onClick={()=>setTab('faculty')}>3. Faculty Allotment</button></div>
  {tab==='allotment'&&<>
   <div className="strategy-filters"><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search institution, semester, course code or course name"/><select value={institution} onChange={e=>setInstitution(e.target.value)}><option value="">All Institutions</option>{institutions.map(x=><option key={x}>{x}</option>)}</select><select value={semester} onChange={e=>setSemester(e.target.value)}><option value="">All Semesters</option>{semesters.map(x=><option key={x} value={x}>Semester {x}</option>)}</select></div>
   <div className="strategy-scroll-shell">
    <div className="strategy-scroll"><table className="strategy-table strategy-table-v2"><thead><tr><th className="sticky-one">Institute</th><th className="sticky-two">Subject (Sem – Sections – Name and Code)</th>{[1,2,3,4,5,6].map(n=><th key={n}>P{n}</th>)}<th className="progress-col">Progress</th></tr></thead><tbody>{visible.map((c:any)=>{
     const full=Number(c.selected)>=Number(c.needed);
     return <tr key={c.course_key}><td className="sticky-one"><b>{c.institution}</b></td><td className="sticky-two"><b>Sem {c.semester} – {c.sections.length} Section{c.sections.length===1?'':'s'}</b><br/><span className="course-name">{c.course_name}</span><br/><code>{c.course_code}</code><br/><span className="muted small">{c.l}-{c.t}-{c.p} · {c.hours_per_week} hrs/week</span></td>{[1,2,3,4,5,6].map(rank=><td key={rank} className="candidate-cell">{c.candidates.filter((f:any)=>f.preference_rank===rank).map((f:any)=>{
       const qty=Number(f.quantity||0);const key=`${c.course_key}|${f.faculty_id}`;const noCapacity=full&&qty===0;const maxForThis=Number(c.remaining)+qty;
       return <div className={`candidate candidate-v2 ${noCapacity?'disabled':''}`} key={f.faculty_id} title={`${f.designation||''} · ${f.years_experience||0} yrs experience · Current load ${f.current_load} hrs`}>
        <label><input type="checkbox" checked={qty>0} disabled={noCapacity||busy===key} onChange={e=>setQuantity(c,f,e.target.checked?1:0)}/><span>{f.faculty_name} <b>({f.current_load})</b></span></label>
        {qty>0&&<div className="qty-control"><button type="button" disabled={busy===key||qty<=1} onClick={()=>setQuantity(c,f,qty-1)}>−</button><span title="Sections allotted">{qty}</span><button type="button" disabled={busy===key||qty>=maxForThis} onClick={()=>setQuantity(c,f,qty+1)}>+</button></div>}
       </div>})}{!c.candidates.some((f:any)=>f.preference_rank===rank)&&<span className="muted">—</span>}</td>)}<td className="progress-col"><b>{c.selected} / {c.needed}</b><div className="progress compact"><span style={{width:`${Math.min(100,c.needed?c.selected*100/c.needed:0)}%`}}></span></div><span className={c.remaining?'status pending':'status submitted'}>{c.remaining?`${c.remaining} remaining`:'Filled'}</span></td></tr>})}</tbody></table></div>
   </div>
   <p className="muted small strategy-tip">Use the horizontal scrollbar to view every preference column. The light-blue header stays fixed while scrolling down.</p>
  </>}
  {tab==='load'&&<><h3>Progressive Load Monitor</h3><table><thead><tr><th>Institute</th><th>Semester</th><th>Existing Load</th><th>Allotted Load</th><th>Remaining</th><th>Progress</th></tr></thead><tbody>{data.loadMonitor.map((r:any)=><tr key={`${r.institution}-${r.semester}`}><td><b>{r.institution}</b></td><td>Sem {r.semester}</td><td>{r.existing} hrs</td><td>{r.allotted} hrs</td><td>{r.remaining} hrs</td><td><div className="progress"><span style={{width:`${Math.min(100,r.percent)}%`}}></span></div>{r.percent}%</td></tr>)}</tbody></table></>}
  {tab==='faculty'&&<><h3>Faculty-wise Allotted Subjects</h3><div className="wide-table"><table><thead><tr><th>Faculty</th><th>Experience</th><th>Total Load</th><th>Subject 1</th><th>Subject 2</th><th>Subject 3</th><th>Additional Subjects</th></tr></thead><tbody>{data.facultyRows.map((f:any)=><tr key={f.faculty_id}><td><b>{f.faculty_name}</b><br/><span className="muted">{f.designation}</span></td><td>{f.years_experience||0} yrs</td><td><b>{f.total_load} / {f.max_theory_load||12}</b></td>{[0,1,2].map(i=><td key={i}>{f.subjects[i]?<SubjectCard s={f.subjects[i]}/>:<span className="muted">—</span>}</td>)}<td>{f.subjects.slice(3).map((s:any)=><SubjectCard key={s.assignment_id} s={s}/>)}</td></tr>)}</tbody></table></div></>}
 </section>
}
function SubjectCard({s}:{s:any}){return <div className="subject-card"><b>{s.course_code}</b><br/>{s.course_name}<br/><span>{s.institution} · Sem {s.semester} · P{s.preference_rank} · {s.section_count} section{s.section_count===1?'':'s'} · {s.allotted_hours} hrs</span></div>}
