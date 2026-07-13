/* V1.3 Web Deploy Edition store: PostgreSQL-backed for Vercel/Neon. */
const { Pool } = require("pg");

export type Faculty = {
  faculty_id: string;
  department: string;
  faculty_name: string;
  user_id: string;
  password_hash: string;
  designation: string;
  role: string;
  seniority_level: string;
  expertise_area: string;
  home_institution: string;
  max_theory_load: number;
  must_reset_password: boolean;
  is_active: boolean;
  updated_at?: string;
  years_experience?: number;
};
export type Course = {
  course_id: string;
  department: string;
  institution: string;
  semester: number;
  short_code: string;
  section: string;
  course_code: string;
  course_name: string;
  course_group: string;
  l: number;
  t: number;
  p: number;
  hours_per_week: number;
  faculty_needed: number;
  is_theory_course: boolean;
  remarks: string;
  credits?: number;
};
export type Preference = {
  preference_id: string;
  faculty_id: string;
  course_key: string;
  preference_rank: number;
  teaching_intent: string;
  created_at: string;
  updated_at: string;
};
export type DB = {
  faculty_master: Faculty[];
  course_master: Course[];
  preferences: Preference[];
  app_settings: Record<string, string>;
};

let pool: any = null;
function getPool() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url)
    throw new Error(
      "DATABASE_URL or POSTGRES_URL is required for Web Deploy Edition.",
    );
  if (!pool)
    pool = new Pool({
      connectionString: url,
      ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
    });
  return pool;
}
async function q(text: string, params: any[] = []) {
  const r = await getPool().query(text, params);
  return r.rows;
}
function now() {
  return new Date().toISOString();
}
export function courseKeyOf(
  c: Pick<Course, "department" | "institution" | "semester" | "course_code">,
) {
  return [c.department, c.institution, c.semester, c.course_code].join("|");
}
function isFaculty(f: Faculty) {
  return String(f.role || "").includes("Faculty") && f.is_active;
}
function groupGuess(name: string, code: string, short: string) {
  const s = (name + " " + code + " " + short).toLowerCase();
  if (
    s.includes("deep learning") ||
    s.includes("artificial intelligence") ||
    s.includes(" ai")
  )
    return "AI";
  if (s.includes("operating")) return "Systems";
  if (s.includes("network")) return "Networks";
  if (s.includes("security") || s.includes("crypto")) return "Security";
  if (
    s.includes("data structures") ||
    s.includes("programming") ||
    s.includes("java") ||
    s.includes("c with")
  )
    return "Programming";
  if (s.includes("math") || s.includes("probability")) return "Mathematics";
  if (s.includes("ar/vr") || s.includes("metaverse")) return "AR/VR";
  if (s.includes("iot") || s.includes("internet of things")) return "IoT";
  if (s.includes("cloud") || s.includes("serverless")) return "Cloud";
  if (s.includes("elective")) return "Open Elective";
  return "General";
}

function rowsToSettings(rows: any[]) {
  const o: Record<string, string> = {};
  for (const r of rows) o[r.setting_key] = r.setting_value;
  return o;
}
export async function loadDB(): Promise<DB> {
  return {
    faculty_master: await facultyList(true),
    course_master: await q(
      "select * from course_master order by institution,semester,section,course_code",
    ),
    preferences: await q(
      "select * from preferences order by faculty_id,preference_rank",
    ),
    app_settings: await settings(),
  };
}
export async function saveDB(_db: DB) {
  throw new Error(
    "saveDB is not used in Web Deploy Edition. Use import/update APIs.",
  );
}
export async function getUser(userId: string) {
  const rows = await q(
    "select * from faculty_master where user_id=$1 and is_active=true limit 1",
    [userId],
  );
  return rows[0];
}
export async function updatePassword(
  faculty_id: string,
  password_hash: string,
) {
  await q(
    "update faculty_master set password_hash=$1,must_reset_password=false,updated_at=now() where faculty_id=$2",
    [password_hash, faculty_id],
  );
}
export async function facultyList(includeAdmin = false) {
  const rows = await q("select * from faculty_master order by faculty_name");
  return includeAdmin
    ? rows
    : rows.filter((f: any) => !String(f.role || "").includes("Admin"));
}
export async function settings() {
  return rowsToSettings(
    await q("select setting_key,setting_value from app_settings"),
  );
}
export async function updateSettings(s: Record<string, string>) {
  for (const [k, v] of Object.entries(s)) {
    await q(
      "insert into app_settings(setting_key,setting_value) values($1,$2) on conflict(setting_key) do update set setting_value=excluded.setting_value",
      [k, String(v ?? "")],
    );
  }
}

function rankCounts(prefs: any[], keys: string[]) {
  const out: any = { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0, total: 0 };
  for (const p of prefs) {
    if (keys.includes(p.course_key)) {
      out["p" + p.preference_rank] = (out["p" + p.preference_rank] || 0) + 1;
      out.total++;
    }
  }
  return out;
}
export async function groupedTheoryCourses() {
  const db = await loadDB();
  const m = new Map<string, any>();
  for (const c of db.course_master.filter((c) => c.is_theory_course)) {
    const k = courseKeyOf(c);
    if (!m.has(k))
      m.set(k, {
        course_key: k,
        department: c.department,
        institution: c.institution,
        semester: c.semester,
        course_code: c.course_code,
        course_name: c.course_name,
        course_group: c.course_group,
        l: c.l,
        t: c.t,
        p: c.p,
        hours_per_week: c.hours_per_week,
        credits: c.credits,
        sections: [],
        needed: 0,
      });
    const g = m.get(k);
    if (!g.sections.includes(c.section)) g.sections.push(c.section);
    g.needed += Number(c.faculty_needed || 1);
  }
  const arr = [...m.values()].sort(
    (a, b) =>
      a.institution.localeCompare(b.institution) ||
      a.semester - b.semester ||
      a.course_code.localeCompare(b.course_code),
  );
  for (const g of arr) {
    g.rankCounts = rankCounts(db.preferences, [g.course_key]);
    const groupKeys = arr
      .filter((x) => x.course_group === g.course_group)
      .map((x) => x.course_key);
    g.groupRankCounts = rankCounts(db.preferences, groupKeys);
  }
  return arr;
}
export async function myPreferences(faculty_id: string) {
  const grouped = await groupedTheoryCourses();
  const ps = await q(
    "select * from preferences where faculty_id=$1 order by preference_rank",
    [faculty_id],
  );
  return ps.map((p: any) => ({
    ...p,
    ...grouped.find((c: any) => c.course_key === p.course_key),
  }));
}
export async function savePreference(
  faculty_id: string,
  course_key: string,
  rank: number,
  intent: string,
) {
  const existing = await q(
    "select preference_id from preferences where faculty_id=$1 and (preference_rank=$2 or course_key=$3)",
    [faculty_id, rank, course_key],
  );
  for (const e of existing)
    await q("delete from preferences where preference_id=$1", [
      e.preference_id,
    ]);
  await q(
    "insert into preferences(preference_id,faculty_id,course_key,preference_rank,teaching_intent,created_at,updated_at) values($1,$2,$3,$4,$5,now(),now())",
    [
      `P${Date.now()}${Math.floor(Math.random() * 10000)}`,
      faculty_id,
      course_key,
      rank,
      intent,
    ],
  );
}
export async function deletePreference(
  faculty_id: string,
  preference_id: string,
) {
  await q("delete from preferences where faculty_id=$1 and preference_id=$2", [
    faculty_id,
    preference_id,
  ]);
}
export async function hodStats() {
  const db = await loadDB();
  const fac = db.faculty_master.filter(isFaculty);
  const submitted = new Set(
    db.preferences
      .filter((p) => fac.some((f) => f.faculty_id === p.faculty_id))
      .map((p) => p.faculty_id),
  ).size;
  const units = await groupedTheoryCourses();
  return {
    offerings: db.course_master.length,
    theory: db.course_master.filter((c) => c.is_theory_course).length,
    courseUnits: units.length,
    faculty: fac.length,
    submitted,
    prefs: db.preferences.length,
  };
}
export async function hodDemand() {
  return groupedTheoryCourses();
}
export async function facultySubmission() {
  const db = await loadDB();
  const grouped = await groupedTheoryCourses();
  return db.faculty_master
    .filter(isFaculty)
    .map((f: any) => {
      const ps = db.preferences
        .filter((p) => p.faculty_id === f.faculty_id)
        .sort((a, b) => a.preference_rank - b.preference_rank);
      const rows = ps.map((p) => {
        const c = grouped.find((x: any) => x.course_key === p.course_key);
        return { ...p, ...c };
      });
      return {
        ...f,
        cnt: ps.length,
        status: ps.length ? "Submitted" : "Not submitted",
        load: rows.reduce(
          (s: any, r: any) => s + Number(r.hours_per_week || 0),
          0,
        ),
        last_updated:
          ps
            .map((p) => p.updated_at)
            .sort()
            .pop() || "",
        prefs: rows
          .map((r: any) => `P${r.preference_rank}: ${r.course_code || ""}`)
          .join(", "),
        prefRows: rows,
      };
    })
    .sort((a, b) => a.faculty_name.localeCompare(b.faculty_name));
}
export async function courseGroupDemand() {
  const grouped = await groupedTheoryCourses();
  const db = await loadDB();
  const gs = new Map<string, any>();
  for (const c of grouped) {
    if (!gs.has(c.course_group))
      gs.set(c.course_group, {
        group: c.course_group,
        gmu: [],
        gmit: [],
        needed: 0,
        keys: [],
      });
    const g = gs.get(c.course_group);
    const label = `${c.course_code} - ${c.course_name}`;
    if (c.institution === "GMU" && !g.gmu.includes(label)) g.gmu.push(label);
    if (c.institution === "GMIT" && !g.gmit.includes(label)) g.gmit.push(label);
    g.needed += c.needed;
    g.keys.push(c.course_key);
  }
  return [...gs.values()]
    .map((g) => ({ ...g, rankCounts: rankCounts(db.preferences, g.keys) }))
    .sort((a, b) => a.group.localeCompare(b.group));
}

export async function generateSampleAllotments() {
  const grouped = await groupedTheoryCourses();
  const db = await loadDB();
  const faculty = db.faculty_master.filter(isFaculty);
  const byFaculty = new Map(faculty.map((f: any) => [f.faculty_id, f]));
  const prefs = db.preferences;
  const coursePrefs = (key: string) =>
    prefs.filter((p) => p.course_key === key);
  const slots: any[] = [];
  for (const c of grouped) {
    for (let i = 0; i < Math.max(1, Number(c.needed || 1)); i++) slots.push(c);
  }
  const semAvg = (assigned: any[]) => {
    const m: any = {};
    for (const a of assigned) {
      const e = Number(byFaculty.get(a.faculty_id)?.years_experience || 0);
      if (!m[a.semester]) m[a.semester] = [];
      m[a.semester].push(e);
    }
    return Object.entries(m).map(([sem, arr]: any) => ({
      sem,
      avg: arr.length
        ? (arr.reduce((x: any, y: any) => x + y, 0) / arr.length).toFixed(1)
        : "0",
      count: arr.length,
    }));
  };
  function assign(strategy: string) {
    const assigned: any[] = [];
    const load: any = {};
    const used: any = {};
    const courseOrder = [...slots];
    if (strategy === "coverage")
      courseOrder.sort(
        (a, b) =>
          coursePrefs(a.course_key).length - coursePrefs(b.course_key).length,
      );
    for (const c of courseOrder) {
      let candidates = coursePrefs(c.course_key).filter(
        (p: any) => !used[p.faculty_id] && byFaculty.has(p.faculty_id),
      );
      candidates.sort((a: any, b: any) => {
        const fa: any = byFaculty.get(a.faculty_id),
          fb: any = byFaculty.get(b.faculty_id);
        const ea = Number(fa?.years_experience || 0),
          eb = Number(fb?.years_experience || 0);
        if (strategy === "preference")
          return (
            a.preference_rank - b.preference_rank ||
            (load[a.faculty_id] || 0) - (load[b.faculty_id] || 0)
          );
        if (strategy === "workload")
          return (
            (load[a.faculty_id] || 0) - (load[b.faculty_id] || 0) ||
            a.preference_rank - b.preference_rank
          );
        if (strategy === "coverage")
          return (
            a.preference_rank - b.preference_rank ||
            (load[a.faculty_id] || 0) - (load[b.faculty_id] || 0)
          );
        if (strategy === "experience")
          return (
            a.preference_rank - b.preference_rank ||
            Math.abs(10 - eb) - Math.abs(10 - ea) ||
            (load[a.faculty_id] || 0) - (load[b.faculty_id] || 0)
          );
        return (
          a.preference_rank - b.preference_rank ||
          Math.abs(10 - eb) - Math.abs(10 - ea) ||
          (load[a.faculty_id] || 0) - (load[b.faculty_id] || 0)
        );
      });
      const chosen = candidates[0];
      if (chosen) {
        const f: any = byFaculty.get(chosen.faculty_id);
        assigned.push({
          faculty_id: f.faculty_id,
          faculty_name: f.faculty_name,
          designation: f.designation,
          years_experience: Number(f.years_experience || 0),
          course_key: c.course_key,
          course_code: c.course_code,
          course_name: c.course_name,
          institution: c.institution,
          semester: c.semester,
          sections: c.sections,
          preference_rank: chosen.preference_rank,
          hours: Number(c.hours_per_week || 0),
          remarks:
            chosen.preference_rank === 1
              ? "First preference"
              : "Preference " + chosen.preference_rank,
        });
        load[f.faculty_id] =
          (load[f.faculty_id] || 0) + Number(c.hours_per_week || 0);
        used[f.faculty_id] = true;
      }
    }
    const covered = assigned.length;
    const p1 = assigned.filter((a: any) => a.preference_rank === 1).length;
    const p23 = assigned.filter(
      (a: any) => a.preference_rank === 2 || a.preference_rank === 3,
    ).length;
    const loads = Object.values(load).map(Number);
    const avg = loads.length
      ? (loads.reduce((a: any, b: any) => a + b, 0) / loads.length).toFixed(1)
      : "0";
    const max = loads.length ? Math.max(...loads) : 0;
    return {
      strategy,
      assigned,
      semExperience: semAvg(assigned),
      summary: {
        covered,
        uncovered: Math.max(0, slots.length - covered),
        p1,
        p23,
        avg,
        max,
      },
    };
  }
  return [
    assign("preference"),
    assign("workload"),
    assign("coverage"),
    assign("experience"),
    assign("strategic"),
  ];
}

function parseCSV(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let qu = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i],
      nx = text[i + 1];
    if (qu) {
      if (ch === '"' && nx === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') qu = false;
      else cell += ch;
    } else {
      if (ch === '"') qu = true;
      else if (ch === ",") {
        row.push(cell);
        cell = "";
      } else if (ch === "\n") {
        row.push(cell);
        rows.push(row.map((x) => x.trim()));
        row = [];
        cell = "";
      } else if (ch === "\r") {
      } else cell += ch;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row.map((x) => x.trim()));
  }
  return rows.filter((r) => r.some((c) => c));
}
export async function importFacultyCSV(text: string, replace: boolean) {
  const rows = parseCSV(text);
  const head = rows.shift()?.map((h) => h.toLowerCase()) || [];
  const idx = (n: string) => head.indexOf(n);
  if (replace) {
    await q("delete from preferences");
    await q("delete from faculty_master where user_id<>'hod'");
  }
  for (const r of rows) {
    const user_id = r[idx("user_id")] || "";
    if (!user_id) continue;
    await q(
      `insert into faculty_master(faculty_id,department,faculty_name,user_id,password_hash,designation,role,seniority_level,expertise_area,home_institution,max_theory_load,years_experience,must_reset_password,is_active,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,$13,now()) on conflict(user_id) do update set department=excluded.department,faculty_name=excluded.faculty_name,designation=excluded.designation,role=excluded.role,seniority_level=excluded.seniority_level,expertise_area=excluded.expertise_area,home_institution=excluded.home_institution,max_theory_load=excluded.max_theory_load,years_experience=excluded.years_experience,is_active=excluded.is_active,updated_at=now()`,
      [
        `F${Date.now()}${Math.floor(Math.random() * 10000)}`,
        r[idx("department")] || "",
        r[idx("faculty_name")] || user_id,
        user_id,
        user_id,
        r[idx("designation")] || "",
        r[idx("role")] || "Faculty",
        r[idx("seniority_level")] || "",
        r[idx("expertise_area")] || "",
        r[idx("home_institution")] || "",
        Number(r[idx("max_theory_load")] || 12),
        Number(r[idx("years_experience")] || 0),
        (r[idx("is_active")] || "Yes").toLowerCase() !== "no",
      ],
    );
  }
}
export async function importCourseCSV(text: string, replace: boolean) {
  const rows = parseCSV(text);
  const head = rows.shift()?.map((h) => h.toLowerCase()) || [];
  const idx = (n: string) => head.indexOf(n);
  if (replace) {
    await q("delete from preferences");
    await q("delete from course_master");
  }
  for (const r of rows) {
    const code = r[idx("course_code")] || "";
    if (!code) continue;
    const l = Number(r[idx("l")] || 0),
      t = Number(r[idx("t")] || 0),
      p = Number(r[idx("p")] || 0);
    await q(
      `insert into course_master(course_id,department,institution,semester,section,short_code,course_code,course_name,course_group,l,t,p,hours_per_week,credits,faculty_needed,is_theory_course,remarks) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        `C${Date.now()}${Math.floor(Math.random() * 10000)}`,
        r[idx("department")] || "",
        r[idx("institution")] || "",
        Number(r[idx("semester")] || 0),
        r[idx("section")] || "",
        r[idx("short_code")] || "",
        code,
        r[idx("course_name")] || code,
        r[idx("course_group")] ||
          groupGuess(
            r[idx("course_name")] || "",
            code,
            r[idx("short_code")] || "",
          ),
        l,
        t,
        p,
        Number(r[idx("hours_per_week")] || l + t + p),
        Number(r[idx("credits")] || r[idx("hours_per_week")] || l + t + p),
        Number(r[idx("faculty_needed")] || 1),
        (r[idx("is_theory_course")] || "Yes").toLowerCase() !== "no",
        r[idx("remarks")] || "",
      ],
    );
  }
}
export async function updateFacultyFromForm(v: any) {
  await q(
    `update faculty_master set faculty_name=$1,user_id=$2,designation=$3,role=$4,years_experience=$5,seniority_level=$6,expertise_area=$7,home_institution=$8,max_theory_load=$9,is_active=$10,updated_at=now() where faculty_id=$11`,
    [
      String(v.faculty_name || ""),
      String(v.user_id || ""),
      String(v.designation || ""),
      String(v.role || "Faculty"),
      Number(v.years_experience || 0),
      String(v.seniority_level || ""),
      String(v.expertise_area || ""),
      String(v.home_institution || ""),
      Number(v.max_theory_load || 12),
      String(v.is_active || "Yes") === "Yes",
      String(v.faculty_id || ""),
    ],
  );
}
export async function updateCourseFromForm(v: any) {
  const l = Number(v.l || 0),
    t = Number(v.t || 0),
    p = Number(v.p || 0);
  await q(
    `update course_master set department=$1,institution=$2,semester=$3,section=$4,short_code=$5,course_code=$6,course_name=$7,course_group=$8,l=$9,t=$10,p=$11,hours_per_week=$12,credits=$13,faculty_needed=$14,is_theory_course=$15,remarks=$16 where course_id=$17`,
    [
      String(v.department || ""),
      String(v.institution || ""),
      Number(v.semester || 0),
      String(v.section || ""),
      String(v.short_code || ""),
      String(v.course_code || ""),
      String(v.course_name || ""),
      String(v.course_group || "General"),
      l,
      t,
      p,
      Number(v.hours_per_week || l + t + p),
      Number(v.credits || v.hours_per_week || l + t + p),
      Number(v.faculty_needed || 1),
      String(v.is_theory_course || "Yes") === "Yes",
      String(v.remarks || ""),
      String(v.course_id || ""),
    ],
  );
}
export async function facultyPreferencesCSV() {
  const rows = await facultySubmission();
  const esc = (x: any) => '"' + String(x ?? "").replaceAll('"', '""') + '"';
  const head = [
    "Faculty",
    "User ID",
    "Designation",
    "Years Experience",
    "Submitted",
    "No Preferences",
    "Preferred Load",
    "Preferences Ordered",
    "Last Updated",
  ];
  return [
    head.join(","),
    ...rows.map((f: any) =>
      [
        f.faculty_name,
        f.user_id,
        f.designation,
        f.years_experience || 0,
        f.status,
        f.cnt,
        f.load,
        f.prefRows
          ?.map(
            (p: any) =>
              `P${p.preference_rank}: ${p.course_code} ${p.course_name}`,
          )
          .join("; "),
        f.last_updated,
      ]
        .map(esc)
        .join(","),
    ),
  ].join("\n");
}

export async function resetDB() {
  const seed = require("../data/seed.json");
  await q("delete from preferences");
  await q("delete from course_master");
  await q("delete from faculty_master");
  await q("delete from app_settings");
  for (const f of seed.faculty_master) {
    await q(
      `insert into faculty_master(faculty_id,department,faculty_name,user_id,password_hash,designation,role,seniority_level,expertise_area,home_institution,max_theory_load,years_experience,must_reset_password,is_active) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        f.faculty_id,
        f.department,
        f.faculty_name,
        f.user_id,
        f.password_hash,
        f.designation,
        f.role,
        f.seniority_level,
        f.expertise_area,
        f.home_institution,
        f.max_theory_load,
        f.years_experience,
        f.must_reset_password,
        f.is_active,
      ],
    );
  }
  for (const c of seed.course_master) {
    await q(
      `insert into course_master(course_id,department,institution,semester,section,short_code,course_code,course_name,course_group,l,t,p,hours_per_week,credits,faculty_needed,is_theory_course,remarks) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        c.course_id,
        c.department,
        c.institution,
        c.semester,
        c.section,
        c.short_code,
        c.course_code,
        c.course_name,
        c.course_group,
        c.l,
        c.t,
        c.p,
        c.hours_per_week,
        c.credits,
        c.faculty_needed,
        c.is_theory_course,
        c.remarks,
      ],
    );
  }
  for (const [k, v] of Object.entries(seed.app_settings)) {
    await q(
      "insert into app_settings(setting_key,setting_value) values($1,$2)",
      [k, String(v)],
    );
  }
  return seed;
}

export const facultyTemplate =
  'department,faculty_name,user_id,designation,years_experience,seniority_level,expertise_area,home_institution,max_theory_load,role,is_active\nCSE,Dr. Example Faculty,example.faculty,Assistant Professor,3,Junior,"AI, Programming",GMU,12,Faculty,Yes\n';
export const courseTemplate =
  "department,institution,semester,section,short_code,course_code,course_name,course_group,credits,L,T,P,hours_per_week,faculty_needed,is_theory_course,remarks\nCSE,GMU,5,CS3A,DL,UE24CS3501,Deep Learning,AI,3,3,0,0,3,1,Yes,Theory only\n";

// -----------------------------------------------------------------------------
// V1.4 HoD Strategy Workbench
// -----------------------------------------------------------------------------
/**
 * Ensures that the additive V1.4 tables exist. This function never changes
 * faculty, course or preference records and is safe to call repeatedly.
 */
export async function ensureV14Schema() {
  await q(`create table if not exists preference_snapshots (
    snapshot_id text primary key, snapshot_name text not null, created_by text not null,
    created_at timestamptz default now(), faculty_count integer default 0,
    preference_count integer default 0, snapshot_json jsonb not null)`);
  await q(`create table if not exists allotment_runs (
    run_id text primary key, run_name text not null,
    snapshot_id text references preference_snapshots(snapshot_id),
    status text not null default 'Draft', created_by text not null,
    created_at timestamptz default now(), updated_at timestamptz default now())`);
  await q(`create table if not exists allotment_assignments (
    assignment_id text primary key, run_id text not null references allotment_runs(run_id) on delete cascade,
    course_key text not null, faculty_id text not null references faculty_master(faculty_id),
    preference_rank integer, hours_per_week numeric not null default 0, section_name text,
    created_by text not null, created_at timestamptz default now(), updated_at timestamptz default now(),
    section_count integer not null default 1,
    unique(run_id,course_key,faculty_id))`);
  await q(`alter table allotment_assignments add column if not exists section_count integer not null default 1`);
  await q(`create table if not exists allotment_audit_log (
    audit_id text primary key, run_id text, action text not null, faculty_id text, course_key text,
    details_json jsonb, performed_by text not null, performed_at timestamptz default now())`);
}

async function activeDraftRun(createdBy: string) {
  await ensureV14Schema();
  let rows = await q("select * from allotment_runs where status='Draft' order by created_at desc limit 1");
  if (rows[0]) return rows[0];
  const id = `RUN-${Date.now()}`;
  await q("insert into allotment_runs(run_id,run_name,status,created_by) values($1,$2,'Draft',$3)", [id, '2026 Odd HoD Strategy', createdBy]);
  rows = await q('select * from allotment_runs where run_id=$1', [id]);
  return rows[0];
}

/** Returns all data required by the three live HoD Strategy tabs. */
export async function strategyWorkbenchData(createdBy = 'hod') {
  const run = await activeDraftRun(createdBy);
  const db = await loadDB();
  const courses = await groupedTheoryCourses();
  const faculty = db.faculty_master.filter(isFaculty);
  const assignments = await q('select * from allotment_assignments where run_id=$1 order by created_at', [run.run_id]);
  const loads: Record<string, number> = {};
  for (const a of assignments) loads[a.faculty_id] = (loads[a.faculty_id] || 0) + Number(a.hours_per_week || 0);
  const facultyById = new Map(faculty.map((f:any)=>[f.faculty_id,f]));

  const board = courses.map((c:any) => {
    const candidates = db.preferences
      .filter((p:any)=>p.course_key===c.course_key)
      .map((p:any)=>({
        faculty_id:p.faculty_id,
        preference_rank:Number(p.preference_rank),
        teaching_intent:p.teaching_intent,
        faculty_name:(facultyById.get(p.faculty_id) as any)?.faculty_name || p.faculty_id,
        years_experience:Number((facultyById.get(p.faculty_id) as any)?.years_experience || 0),
        current_load:Number(loads[p.faculty_id] || 0),
        max_load:Number((facultyById.get(p.faculty_id) as any)?.max_theory_load || 12),
        checked:assignments.some((a:any)=>a.course_key===c.course_key && a.faculty_id===p.faculty_id),
      }))
      .sort((a:any,b:any)=>a.preference_rank-b.preference_rank || a.faculty_name.localeCompare(b.faculty_name));
    const selected = assignments.filter((a:any)=>a.course_key===c.course_key).length;
    return {...c,candidates,selected,remaining:Math.max(0,Number(c.needed)-selected)};
  });

  const institutions = ['GMU','GMIT'];
  const loadMonitor:any[]=[];
  for(const institution of institutions){
    for(const semester of [1,3,5,7]){
      const related=courses.filter((c:any)=>c.institution===institution && Number(c.semester)===semester);
      const existing=related.reduce((s:number,c:any)=>s+Number(c.hours_per_week||0)*Number(c.needed||0),0);
      const keys=new Set(related.map((c:any)=>c.course_key));
      const allotted=assignments.filter((a:any)=>keys.has(a.course_key)).reduce((s:number,a:any)=>s+Number(a.hours_per_week||0),0);
      loadMonitor.push({institution,semester,existing,allotted,remaining:Math.max(0,existing-allotted),percent:existing?Math.round(allotted*100/existing):0});
    }
  }

  const facultyRows=faculty.map((f:any)=>{
    const mine=assignments.filter((a:any)=>a.faculty_id===f.faculty_id).map((a:any)=>{
      const c=courses.find((x:any)=>x.course_key===a.course_key);
      return {...a,...c};
    });
    return {...f,total_load:Number(loads[f.faculty_id]||0),subjects:mine};
  }).sort((a:any,b:any)=>a.faculty_name.localeCompare(b.faculty_name));

  return {run,board,loadMonitor,facultyRows,assignmentCount:assignments.length};
}

/**
 * Adds/removes one draft assignment atomically and enforces the section count.
 * Existing faculty preferences are read-only and never modified here.
 */
export async function toggleStrategyAssignment(input:{run_id:string;course_key:string;faculty_id:string;checked:boolean;performed_by:string}) {
  await ensureV14Schema();
  const client=await getPool().connect();
  try{
    await client.query('begin');
    const run=(await client.query('select * from allotment_runs where run_id=$1 for update',[input.run_id])).rows[0];
    if(!run || run.status!=='Draft') throw new Error('The allotment run is not editable.');
    const courseRows=(await client.query('select * from course_master where concat(department,\'|\',institution,\'|\',semester,\'|\',course_code)=$1',[input.course_key])).rows;
    if(!courseRows.length) throw new Error('Course not found.');
    const needed=courseRows.reduce((s:number,c:any)=>s+Number(c.faculty_needed||1),0);
    const hours=Number(courseRows[0].hours_per_week||0);
    const pref=(await client.query('select preference_rank from preferences where faculty_id=$1 and course_key=$2',[input.faculty_id,input.course_key])).rows[0];
    if(!pref) throw new Error('Faculty has not selected this course.');
    if(input.checked){
      const n=Number((await client.query('select count(*)::int n from allotment_assignments where run_id=$1 and course_key=$2',[input.run_id,input.course_key])).rows[0].n);
      if(n>=needed) throw new Error(`All ${needed} available section slots are already filled.`);
      await client.query(`insert into allotment_assignments(assignment_id,run_id,course_key,faculty_id,preference_rank,hours_per_week,created_by)
        values($1,$2,$3,$4,$5,$6,$7) on conflict(run_id,course_key,faculty_id) do nothing`,
        [`A-${Date.now()}-${Math.floor(Math.random()*10000)}`,input.run_id,input.course_key,input.faculty_id,pref.preference_rank,hours,input.performed_by]);
    }else{
      await client.query('delete from allotment_assignments where run_id=$1 and course_key=$2 and faculty_id=$3',[input.run_id,input.course_key,input.faculty_id]);
    }
    await client.query('insert into allotment_audit_log(audit_id,run_id,action,faculty_id,course_key,details_json,performed_by) values($1,$2,$3,$4,$5,$6,$7)',
      [`AUD-${Date.now()}-${Math.floor(Math.random()*10000)}`,input.run_id,input.checked?'ASSIGN':'UNASSIGN',input.faculty_id,input.course_key,JSON.stringify({hours}),input.performed_by]);
    await client.query('update allotment_runs set updated_at=now() where run_id=$1',[input.run_id]);
    await client.query('commit');
  }catch(e){await client.query('rollback');throw e;}finally{client.release();}
  return strategyWorkbenchData(input.performed_by);
}

/** One row per section/course/faculty for timetable preparation. */
export async function timetableFriendlyCSV(runId:string){
  const data=await strategyWorkbenchData('hod');
  const rows:any[]=[];
  for(const course of data.board){
    const selected=course.candidates.filter((x:any)=>x.checked);
    selected.forEach((f:any,index:number)=>{
      const section=course.sections[index] || `Section ${index+1}`;
      rows.push({institution:course.institution,semester:course.semester,section,course_code:course.course_code,course_name:course.course_name,short_code:course.short_code||'',course_group:course.course_group,credits:course.credits||'',l:course.l,t:course.t,p:course.p,hours_per_week:course.hours_per_week,faculty_id:f.faculty_id,faculty_name:f.faculty_name,preference_received:`P${f.preference_rank}`,total_faculty_load:f.current_load});
    });
  }
  const head=['Institution','Semester','Section','Course Code','Course Name','Short Code','Course Group','Credits','L','T','P','Hours/Week','Faculty ID','Faculty Name','Preference Received','Total Faculty Load'];
  const esc=(v:any)=>`"${String(v??'').replaceAll('"','""')}"`;
  return [head.join(','),...rows.map(r=>[r.institution,r.semester,r.section,r.course_code,r.course_name,r.short_code,r.course_group,r.credits,r.l,r.t,r.p,r.hours_per_week,r.faculty_id,r.faculty_name,r.preference_received,r.total_faculty_load].map(esc).join(','))].join('\n');
}


// -----------------------------------------------------------------------------
// V1.4.1 Strategy Engine V2 — multi-section quantity controls
// -----------------------------------------------------------------------------
/**
 * Returns the Strategy V2 view model. It uses the existing allotment tables and
 * adds section_count as an additive, backward-compatible field. Old assignments
 * automatically behave as section_count = 1.
 */
export async function strategyWorkbenchV2Data(createdBy = 'hod') {
  await ensureV14Schema();
  await q(`alter table allotment_assignments add column if not exists section_count integer not null default 1`);
  const run = await activeDraftRun(createdBy);
  const db = await loadDB();
  const courses = await groupedTheoryCourses();
  const faculty = db.faculty_master.filter(isFaculty);
  const assignments = await q('select * from allotment_assignments where run_id=$1 order by created_at', [run.run_id]);
  const loads: Record<string, number> = {};
  for (const a of assignments) {
    const qty = Math.max(1, Number(a.section_count || 1));
    loads[a.faculty_id] = (loads[a.faculty_id] || 0) + Number(a.hours_per_week || 0) * qty;
  }
  const facultyById = new Map(faculty.map((f:any)=>[f.faculty_id,f]));
  const board = courses.map((c:any) => {
    const courseAssignments = assignments.filter((a:any)=>a.course_key===c.course_key);
    const candidates = db.preferences.filter((p:any)=>p.course_key===c.course_key).map((p:any)=>{
      const a = courseAssignments.find((x:any)=>x.faculty_id===p.faculty_id);
      return {
        faculty_id:p.faculty_id,
        preference_rank:Number(p.preference_rank),
        teaching_intent:p.teaching_intent,
        faculty_name:(facultyById.get(p.faculty_id) as any)?.faculty_name || p.faculty_id,
        designation:(facultyById.get(p.faculty_id) as any)?.designation || '',
        years_experience:Number((facultyById.get(p.faculty_id) as any)?.years_experience || 0),
        current_load:Number(loads[p.faculty_id] || 0),
        max_load:Number((facultyById.get(p.faculty_id) as any)?.max_theory_load || 12),
        quantity:a ? Math.max(1, Number(a.section_count || 1)) : 0,
        checked:!!a,
      };
    }).sort((a:any,b:any)=>a.preference_rank-b.preference_rank || a.faculty_name.localeCompare(b.faculty_name));
    const selected = courseAssignments.reduce((sum:number,a:any)=>sum+Math.max(1,Number(a.section_count||1)),0);
    return {...c,candidates,selected,remaining:Math.max(0,Number(c.needed)-selected)};
  });

  const institutions=[...new Set(courses.map((c:any)=>c.institution))];
  const semesters=[...new Set(courses.map((c:any)=>Number(c.semester)))].sort((a:any,b:any)=>a-b);
  const loadMonitor:any[]=[];
  for(const institution of institutions){
    for(const semester of semesters){
      const related=courses.filter((c:any)=>c.institution===institution && Number(c.semester)===semester);
      if(!related.length) continue;
      const existing=related.reduce((sum:number,c:any)=>sum+Number(c.hours_per_week||0)*Number(c.needed||0),0);
      const keys=new Set(related.map((c:any)=>c.course_key));
      const allotted=assignments.filter((a:any)=>keys.has(a.course_key)).reduce((sum:number,a:any)=>sum+Number(a.hours_per_week||0)*Math.max(1,Number(a.section_count||1)),0);
      loadMonitor.push({institution,semester,existing,allotted,remaining:Math.max(0,existing-allotted),percent:existing?Math.round(allotted*100/existing):0});
    }
  }

  const facultyRows=faculty.map((f:any)=>{
    const mine=assignments.filter((a:any)=>a.faculty_id===f.faculty_id).map((a:any)=>{
      const c=courses.find((x:any)=>x.course_key===a.course_key);
      const qty=Math.max(1,Number(a.section_count||1));
      return {...a,...c,section_count:qty,allotted_hours:Number(a.hours_per_week||0)*qty};
    });
    return {...f,total_load:Number(loads[f.faculty_id]||0),subjects:mine};
  }).sort((a:any,b:any)=>a.faculty_name.localeCompare(b.faculty_name));

  return {run,board,loadMonitor,facultyRows,assignmentCount:assignments.length,slotCount:assignments.reduce((s:number,a:any)=>s+Math.max(1,Number(a.section_count||1)),0)};
}

/**
 * Sets a faculty's section quantity for one grouped course. Quantity 0 removes
 * the assignment. The total quantity across the course cannot exceed capacity.
 */
export async function setStrategyAssignmentQuantity(input:{run_id:string;course_key:string;faculty_id:string;quantity:number;performed_by:string}){
  await ensureV14Schema();
  await q(`alter table allotment_assignments add column if not exists section_count integer not null default 1`);
  const requested=Math.max(0,Math.floor(Number(input.quantity||0)));
  const client=await getPool().connect();
  try{
    await client.query('begin');
    const run=(await client.query('select * from allotment_runs where run_id=$1 for update',[input.run_id])).rows[0];
    if(!run || run.status!=='Draft') throw new Error('The allotment run is not editable.');
    const courseRows=(await client.query("select * from course_master where concat(department,'|',institution,'|',semester,'|',course_code)=$1",[input.course_key])).rows;
    if(!courseRows.length) throw new Error('Course not found.');
    const needed=courseRows.reduce((sum:number,c:any)=>sum+Number(c.faculty_needed||1),0);
    const hours=Number(courseRows[0].hours_per_week||0);
    const pref=(await client.query('select preference_rank from preferences where faculty_id=$1 and course_key=$2',[input.faculty_id,input.course_key])).rows[0];
    if(!pref) throw new Error('Faculty has not selected this course.');
    const other=Number((await client.query('select coalesce(sum(section_count),0)::int n from allotment_assignments where run_id=$1 and course_key=$2 and faculty_id<>$3',[input.run_id,input.course_key,input.faculty_id])).rows[0].n);
    if(requested+other>needed) throw new Error(`Only ${Math.max(0,needed-other)} section slot(s) are available for this faculty.`);
    const existing=(await client.query('select * from allotment_assignments where run_id=$1 and course_key=$2 and faculty_id=$3',[input.run_id,input.course_key,input.faculty_id])).rows[0];
    if(requested===0){
      await client.query('delete from allotment_assignments where run_id=$1 and course_key=$2 and faculty_id=$3',[input.run_id,input.course_key,input.faculty_id]);
    }else if(existing){
      await client.query('update allotment_assignments set section_count=$1,updated_at=now() where assignment_id=$2',[requested,existing.assignment_id]);
    }else{
      await client.query(`insert into allotment_assignments(assignment_id,run_id,course_key,faculty_id,preference_rank,hours_per_week,section_count,created_by)
        values($1,$2,$3,$4,$5,$6,$7,$8)`,[`A-${Date.now()}-${Math.floor(Math.random()*10000)}`,input.run_id,input.course_key,input.faculty_id,pref.preference_rank,hours,requested,input.performed_by]);
    }
    await client.query('insert into allotment_audit_log(audit_id,run_id,action,faculty_id,course_key,details_json,performed_by) values($1,$2,$3,$4,$5,$6,$7)',
      [`AUD-${Date.now()}-${Math.floor(Math.random()*10000)}`,input.run_id,requested===0?'UNASSIGN':'SET_QUANTITY',input.faculty_id,input.course_key,JSON.stringify({quantity:requested,hours_per_section:hours,total_hours:requested*hours}),input.performed_by]);
    await client.query('update allotment_runs set updated_at=now() where run_id=$1',[input.run_id]);
    await client.query('commit');
  }catch(e){await client.query('rollback');throw e;}finally{client.release();}
  return strategyWorkbenchV2Data(input.performed_by);
}

/** Timetable export for V2. Quantity is expanded into one row per section. */
export async function timetableFriendlyV2CSV(runId:string){
  const data=await strategyWorkbenchV2Data('hod');
  const rows:any[]=[];
  for(const course of data.board){
    let sectionIndex=0;
    for(const f of course.candidates.filter((x:any)=>x.quantity>0)){
      for(let i=0;i<Number(f.quantity);i++){
        const section=course.sections[sectionIndex] || `Section ${sectionIndex+1}`;
        sectionIndex++;
        rows.push({institution:course.institution,semester:course.semester,section,course_code:course.course_code,course_name:course.course_name,short_code:course.short_code||'',course_group:course.course_group,credits:course.credits||'',l:course.l,t:course.t,p:course.p,hours_per_week:course.hours_per_week,faculty_id:f.faculty_id,faculty_name:f.faculty_name,preference_received:`P${f.preference_rank}`,sections_assigned:f.quantity,total_faculty_load:f.current_load});
      }
    }
  }
  const head=['Institution','Semester','Section','Course Code','Course Name','Short Code','Course Group','Credits','L','T','P','Hours/Week','Faculty ID','Faculty Name','Preference Received','Sections Assigned','Total Faculty Load'];
  const esc=(v:any)=>`"${String(v??'').replaceAll('"','""')}"`;
  return [head.join(','),...rows.map(r=>[r.institution,r.semester,r.section,r.course_code,r.course_name,r.short_code,r.course_group,r.credits,r.l,r.t,r.p,r.hours_per_week,r.faculty_id,r.faculty_name,r.preference_received,r.sections_assigned,r.total_faculty_load].map(esc).join(','))].join('\n');
}
