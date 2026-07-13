'use client';

import {useMemo,useState} from 'react';

type Props={initial:any};

/**
 * Live HoD allotment board. Checkbox changes use optimistic UI and are saved
 * through /api/hod/strategy/toggle without refreshing the page.
 */
export default function StrategyWorkbench({initial}:Props){
 const [data,setData]=useState(initial);
 const [tab,setTab]=useState<'allotment'|'load'|'faculty'>('allotment');
 const [busy,setBusy]=useState('');
 const [error,setError]=useState('');
 const [filter,setFilter]=useState('');
 const visible=useMemo(()=>data.board.filter((c:any)=>`${c.institution} ${c.semester} ${c.course_code} ${c.course_name}`.toLowerCase().includes(filter.toLowerCase())),[data,filter]);
 async function toggle(course:any,candidate:any,checked:boolean){
   const key=`${course.course_key}|${candidate.faculty_id}`;
   setBusy(key);setError('');
   // Optimistic visual response; authoritative recalculation comes from API.
   setData((old:any)=>({...old,board:old.board.map((c:any)=>c.course_key!==course.course_key?c:{...c,candidates:c.candidates.map((f:any)=>f.faculty_id!==candidate.faculty_id?f:{...f,checked,current_load:Math.max(0,Number(f.current_load)+(checked?Number(course.hours_per_week):-Number(course.hours_per_week)))}),selected:Number(c.selected)+(checked?1:-1),remaining:Number(c.remaining)+(checked?-1:1)})}));
   try{
    const r=await fetch('/api/hod/strategy/toggle',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({run_id:data.run.run_id,course_key:course.course_key,faculty_id:candidate.faculty_id,checked})});
    const j=await r.json(); if(!r.ok)throw new Error(j.error||'Save failed'); setData(j);
   }catch(e:any){setError(e.message||'Save failed'); const r=await fetch('/api/hod/strategy/toggle',{method:'GET'});if(r.ok)setData(await r.json());}
   finally{setBusy('');}
 }
 return <section className="workbench">
   <div className="workbench-head"><div><h2>HoD Strategy Allotment Workbench</h2><p className="muted">Draft run: {data.run.run_name} · {data.assignmentCount} allotments saved</p></div><a className="btn" href={`/api/hod/strategy/export?run=${encodeURIComponent(data.run.run_id)}`}>Export Timetable-Friendly CSV</a></div>
   {error&&<div className="error">{error}</div>}
   <div className="tabs inner-tabs"><button className={tab==='allotment'?'active':''} onClick={()=>setTab('allotment')}>1. Allotment</button><button className={tab==='load'?'active':''} onClick={()=>setTab('load')}>2. Institute & Semester Load</button><button className={tab==='faculty'?'active':''} onClick={()=>setTab('faculty')}>3. Faculty Allotment</button></div>
   {tab==='allotment'&&<>
    <input className="workbench-search" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search institution, semester, course code or course name"/>
    <div className="wide-table"><table className="strategy-table"><thead><tr><th className="sticky-one">Institute</th><th className="sticky-two">Subject (Sem – Sections – Name and Code)</th>{[1,2,3,4,5,6].map(n=><th key={n}>P{n}</th>)}<th>Progress</th></tr></thead><tbody>{visible.map((c:any)=>{
      const full=Number(c.selected)>=Number(c.needed);
      return <tr key={c.course_key}><td className="sticky-one"><b>{c.institution}</b></td><td className="sticky-two"><b>Sem {c.semester} – {c.sections.length} Section{c.sections.length===1?'':'s'}</b><br/><span className="course-name">{c.course_name}</span><br/><code>{c.course_code}</code><br/><span className="muted small">{c.l}-{c.t}-{c.p} · {c.hours_per_week} hrs/week</span></td>{[1,2,3,4,5,6].map(rank=><td key={rank} className="candidate-cell">{c.candidates.filter((f:any)=>f.preference_rank===rank).map((f:any)=>{const disabled=full&&!f.checked;const key=`${c.course_key}|${f.faculty_id}`;return <label className={`candidate ${disabled?'disabled':''}`} key={f.faculty_id}><input type="checkbox" checked={!!f.checked} disabled={disabled||busy===key} onChange={e=>toggle(c,f,e.target.checked)}/><span>{f.faculty_name} <b>({f.current_load})</b></span></label>})}</td>)}<td><b>{c.selected} / {c.needed}</b><br/><span className={c.remaining?'status pending':'status submitted'}>{c.remaining?`${c.remaining} remaining`:'Filled'}</span></td></tr>})}</tbody></table></div>
   </>}
   {tab==='load'&&<><h3>Progressive Load Monitor</h3><table><thead><tr><th>Institute</th><th>Semester</th><th>Existing Load</th><th>Allotted Load</th><th>Remaining</th><th>Progress</th></tr></thead><tbody>{data.loadMonitor.map((r:any)=><tr key={`${r.institution}-${r.semester}`}><td><b>{r.institution}</b></td><td>Sem {r.semester}</td><td>{r.existing} hrs</td><td>{r.allotted} hrs</td><td>{r.remaining} hrs</td><td><div className="progress"><span style={{width:`${Math.min(100,r.percent)}%`}}></span></div>{r.percent}%</td></tr>)}</tbody></table></>}
   {tab==='faculty'&&<><h3>Faculty-wise Allotted Subjects</h3><div className="wide-table"><table><thead><tr><th>Faculty</th><th>Experience</th><th>Total Load</th><th>Subject 1</th><th>Subject 2</th><th>Subject 3</th><th>Additional Subjects</th></tr></thead><tbody>{data.facultyRows.map((f:any)=><tr key={f.faculty_id}><td><b>{f.faculty_name}</b><br/><span className="muted">{f.designation}</span></td><td>{f.years_experience||0} yrs</td><td><b>{f.total_load} / {f.max_theory_load||12}</b></td>{[0,1,2].map(i=><td key={i}>{f.subjects[i]?<SubjectCard s={f.subjects[i]}/>:<span className="muted">—</span>}</td>)}<td>{f.subjects.slice(3).map((s:any)=><SubjectCard key={s.assignment_id} s={s}/>)}</td></tr>)}</tbody></table></div></>}
 </section>
}
function SubjectCard({s}:{s:any}){return <div className="subject-card"><b>{s.course_code}</b><br/>{s.course_name}<br/><span>{s.institution} · Sem {s.semester} · P{s.preference_rank} · {s.hours_per_week} hrs</span></div>}
