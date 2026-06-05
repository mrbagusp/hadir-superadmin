import { useState, useEffect } from "react";
import { auth, db, isConfigured } from "./firebase/config";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, onSnapshot, query } from "firebase/firestore";

// Authorized superadmin emails — change via env var or hardcode
const SA_EMAILS = (import.meta.env.VITE_SUPERADMIN_EMAILS || "admin@blessingmediaglobal.com").split(",").map(e => e.trim().toLowerCase());

const PLAN_PRICES = { free: 0, growth: 5000, pro: 10000, proplus: 12000 };
const PLAN_NAMES = { free: "Free", growth: "Growth", pro: "Pro", proplus: "Pro+" };
const PLAN_COLORS = { free: "#64748B", growth: "#3B82F6", pro: "#10B981", proplus: "#A855F7" };
const STATUS_NAMES = { active: "Aktif", trial: "Trial", paused: "Dijeda", cancelled: "Dibatalkan", expired: "Expired" };
const STATUS_COLORS = { active: "#10B981", trial: "#3B82F6", paused: "#F59E0B", cancelled: "#EF4444", expired: "#64748B" };

const T = {
  bg:"#06080C",bg2:"#0C1017",card:"#111620",hover:"#161C28",
  border:"#1E2536",border2:"#2A3348",
  primary:"#7C3AED",primaryMuted:"rgba(124,58,237,.12)",
  green:"#10B981",greenMuted:"rgba(16,185,129,.12)",
  accent:"#3B82F6",accentMuted:"rgba(59,130,246,.12)",
  warn:"#F59E0B",warnMuted:"rgba(245,158,11,.12)",
  danger:"#EF4444",dangerMuted:"rgba(239,68,68,.12)",
  text:"#E8ECF4",text2:"#8896AE",text3:"#586580",
};

const I=({n,s=18,c="currentColor"})=>{
  const d={
    grid:<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    users:<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    chart:<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    gear:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    out:<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    x:<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    check:<><polyline points="20 6 9 17 4 12"/></>,
    eye:<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    pause:<><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></>,
    play:<><polygon points="5 3 19 12 5 21 5 3"/></>,
    trash:<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
    dollar:<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
    trend:<><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
    search:<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
  };
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d[n]}</svg>;
};

const fmtRp=n=>"Rp "+n.toLocaleString("id-ID");
const initials=n=>(n||"").split(" ").map(w=>w[0]).join("").slice(0,2);

const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
html,body,#root{height:100%;overflow:hidden}
body{font-family:'Plus Jakarta Sans',sans-serif;background:${T.bg};color:${T.text};-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:${T.border2};border-radius:3px}

.app{display:flex;height:100vh}
.sb{width:240px;background:${T.card};border-right:1px solid ${T.border};display:flex;flex-direction:column;flex-shrink:0}
.sb-head{padding:18px;border-bottom:1px solid ${T.border};display:flex;align-items:center;gap:10px}
.sb-logo{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,${T.primary},#5B21B6);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;color:#fff}
.sb-title{font-size:17px;font-weight:800}
.sb-sub{font-size:9.5px;color:${T.primary};font-weight:700;letter-spacing:.5px}
.sb-nav{flex:1;padding:8px;overflow-y:auto}
.sb-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;cursor:pointer;color:${T.text2};font-size:13px;font-weight:500;border:none;background:none;width:100%;text-align:left;transition:all .15s;margin-bottom:1px}
.sb-item:hover{background:${T.hover};color:${T.text}}
.sb-item.on{background:${T.primaryMuted};color:${T.primary};font-weight:600}
.sb-foot{padding:12px 14px;border-top:1px solid ${T.border};display:flex;align-items:center;gap:8px}
.sb-av{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,${T.primary},${T.accent});display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff}

.main{flex:1;display:flex;flex-direction:column;overflow:hidden}
.topbar{height:56px;background:${T.card};border-bottom:1px solid ${T.border};display:flex;align-items:center;padding:0 20px;gap:12px}
.topbar h1{font-size:16px;font-weight:700;flex:1}
.content{flex:1;overflow-y:auto;padding:20px}

.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}
.st{background:${T.card};border:1px solid ${T.border};border-radius:12px;padding:16px}
.st .lbl{font-size:11px;color:${T.text2};font-weight:500;margin-bottom:4px;display:flex;align-items:center;gap:5px}
.st .val{font-size:24px;font-weight:800;letter-spacing:-1px}
.st .sub{font-size:10.5px;color:${T.text3};margin-top:2px}

.card{background:${T.card};border:1px solid ${T.border};border-radius:12px;margin-bottom:16px;overflow:hidden}
.card-h{padding:12px 16px;border-bottom:1px solid ${T.border};display:flex;align-items:center;justify-content:space-between}
.card-h h3{font-size:13.5px;font-weight:700}
.card-b{padding:0}
.tw{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:12px}
thead{background:${T.bg2}}
th{padding:9px 14px;text-align:left;font-weight:600;color:${T.text3};font-size:10px;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap}
td{padding:10px 14px;border-bottom:1px solid ${T.border};white-space:nowrap;vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:${T.hover}}

.badge{display:inline-flex;padding:3px 8px;border-radius:5px;font-size:10px;font-weight:600}
.btn{display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border-radius:7px;font-size:11.5px;font-weight:600;cursor:pointer;border:none;font-family:inherit;transition:all .15s}
.btn-p{background:${T.primary};color:#fff}.btn-p:hover{background:#6D28D9}
.btn-g{background:${T.greenMuted};color:#34D399}.btn-r{background:${T.dangerMuted};color:#F87171}
.btn-w{background:${T.warnMuted};color:#FBBF24}
.btn-o{background:none;border:1px solid ${T.border};color:${T.text}}.btn-o:hover{border-color:${T.primary};color:${T.primary}}

.mdl{position:fixed;inset:0;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;z-index:999;backdrop-filter:blur(4px)}
.mdl-c{background:${T.card};border:1px solid ${T.border};border-radius:16px;width:100%;max-width:500px;max-height:80vh;overflow-y:auto}
.mdl-h{padding:16px;border-bottom:1px solid ${T.border};display:flex;align-items:center;justify-content:space-between}
.mdl-h h3{font-size:15px;font-weight:700}
.mdl-x{width:28px;height:28px;border-radius:7px;border:1px solid ${T.border};background:none;color:${T.text2};cursor:pointer;display:flex;align-items:center;justify-content:center}
.mdl-b{padding:16px}
.mdl-f{padding:12px 16px;border-top:1px solid ${T.border};display:flex;gap:8px;justify-content:flex-end}

.fg{margin-bottom:12px}.fl{display:block;font-size:11px;font-weight:600;color:${T.text2};margin-bottom:4px}
.fi,.fs{width:100%;padding:8px 12px;background:${T.bg2};border:1px solid ${T.border};border-radius:7px;color:${T.text};font-size:12px;font-family:inherit}
.fi:focus,.fs:focus{outline:none;border-color:${T.primary}}
.fr{display:grid;grid-template-columns:1fr 1fr;gap:10px}

.lw{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.lf{background:${T.card};border:1px solid ${T.border};border-radius:14px;padding:20px;width:100%;max-width:360px}
.lb{width:100%;padding:10px;border-radius:8px;border:none;background:${T.primary};color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:4px}
.err{padding:8px 10px;background:${T.dangerMuted};border-radius:7px;margin-bottom:10px;font-size:11px;color:#F87171}
.fade{animation:fi .3s ease-out}@keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

@media(max-width:768px){.sb{display:none}.stats{grid-template-columns:repeat(2,1fr)}}
`;

// ============================================================
// SUPER ADMIN APP
// ============================================================
export default function SuperAdmin() {
  const [authState, setAuthState] = useState("loading");
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [orgs, setOrgs] = useState([]);
  const [orgEmployees, setOrgEmployees] = useState({}); // { orgId: count }
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [search, setSearch] = useState("");

  // Auth
  useEffect(() => {
    if (!isConfigured) { setAuthState("login"); return; }
    const unsub = onAuthStateChanged(auth, user => {
      if (user && SA_EMAILS.includes(user.email.toLowerCase())) {
        setUser(user); setAuthState("authed");
      } else if (user) {
        signOut(auth); setAuthState("login");
      } else { setAuthState("login"); setUser(null); }
    });
    return unsub;
  }, []);

  // Load all orgs
  useEffect(() => {
    if (authState !== "authed") return;
    const unsub = onSnapshot(collection(db, "organizations"), async (snap) => {
      const orgList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrgs(orgList);

      // Count employees per org
      const counts = {};
      for (const org of orgList) {
        try {
          const empSnap = await getDocs(collection(db, "organizations", org.id, "employees"));
          counts[org.id] = empSnap.size;
        } catch { counts[org.id] = 0; }
      }
      setOrgEmployees(counts);
      setLoading(false);
    });
    return unsub;
  }, [authState]);

  // Revenue calculation
  const calcRevenue = (org) => {
    const count = orgEmployees[org.id] || 0;
    const plan = org.plan || "free";
    const status = org.planStatus || "active";
    if (plan === "free" || status === "paused" || status === "cancelled") return 0;
    return (PLAN_PRICES[plan] || 0) * count;
  };

  const totalMRR = orgs.reduce((sum, o) => sum + calcRevenue(o), 0);
  const totalEmps = Object.values(orgEmployees).reduce((s, c) => s + c, 0);
  const paidOrgs = orgs.filter(o => o.plan && o.plan !== "free").length;
  const trialOrgs = orgs.filter(o => (o.planStatus || "") === "trial").length;

  // Actions
  const updateOrg = async (orgId, data) => {
    await updateDoc(doc(db, "organizations", orgId), data);
    setSelectedOrg(null);
  };

  const deleteOrg = async (orgId) => {
    // Delete all subcollections first
    const subcols = ["employees", "attendances", "leaves", "overtime"];
    for (const sub of subcols) {
      const snap = await getDocs(collection(db, "organizations", orgId, sub));
      for (const d of snap.docs) await deleteDoc(d.ref);
    }
    await deleteDoc(doc(db, "organizations", orgId));
    setDeleteConfirm(null);
  };

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLogin = async () => {
    if (!loginEmail || !loginPass) { setLoginErr("Isi semua field."); return; }
    if (!SA_EMAILS.includes(loginEmail.toLowerCase())) { setLoginErr("Akun ini bukan Super Admin."); return; }
    setLoginErr(""); setLoginLoading(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPass);
    } catch (e) { setLoginErr("Login gagal: " + e.message); setLoginLoading(false); }
  };

  const titles = { dashboard: "Dashboard", organizations: "Organisasi", revenue: "Revenue" };

  if (authState === "loading") return <><style>{CSS}</style><div className="lw"><div className="sb-logo" style={{width:48,height:48,fontSize:20}}>H</div></div></>;

  if (authState === "login") return (
    <><style>{CSS}</style>
    <div className="lw">
      <div>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div className="sb-logo" style={{width:48,height:48,fontSize:20,margin:"0 auto 12px"}}>H</div>
          <div style={{fontSize:20,fontWeight:800}}>Super Admin</div>
          <div style={{fontSize:12,color:T.text3}}>Hanya untuk administrator sistem</div>
        </div>
        <div className="lf">
          <div className="fg"><label className="fl">Email</label><input className="fi" type="email" value={loginEmail} onChange={e=>{setLoginEmail(e.target.value);setLoginErr("");}}/></div>
          <div className="fg"><label className="fl">Password</label><input className="fi" type="password" value={loginPass} onChange={e=>{setLoginPass(e.target.value);setLoginErr("");}} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/></div>
          {loginErr && <div className="err">{loginErr}</div>}
          <button className="lb" onClick={handleLogin} disabled={loginLoading}>{loginLoading?"Memproses...":"Masuk"}</button>
        </div>
      </div>
    </div>
    </>
  );

  const filteredOrgs = orgs.filter(o => (o.name||"").toLowerCase().includes(search.toLowerCase()) || (o.email||"").toLowerCase().includes(search.toLowerCase()));

  return (
    <><style>{CSS}</style>
    <div className="app">
      <aside className="sb">
        <div className="sb-head">
          <div className="sb-logo">H</div>
          <div><div className="sb-title">Hadir</div><div className="sb-sub">SUPER ADMIN</div></div>
        </div>
        <nav className="sb-nav">
          {[
            {id:"dashboard",icon:"grid",label:"Dashboard"},
            {id:"organizations",icon:"users",label:"Organisasi"},
            {id:"revenue",icon:"dollar",label:"Revenue"},
          ].map(m=>(
            <button key={m.id} className={`sb-item ${page===m.id?"on":""}`} onClick={()=>setPage(m.id)}>
              <I n={m.icon} s={16}/>{m.label}
            </button>
          ))}
          <div style={{marginTop:12}}/>
          <button className="sb-item" onClick={()=>signOut(auth)}><I n="out" s={16}/> Keluar</button>
        </nav>
        <div className="sb-foot">
          <div className="sb-av">{initials(user?.email?.split("@")[0]||"SA")}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11.5,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.email}</div>
            <div style={{fontSize:10,color:T.primary,fontWeight:600}}>Super Admin</div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar"><h1>{titles[page]}</h1></header>
        <section className="content">
          {/* =================== DASHBOARD =================== */}
          {page === "dashboard" && (
            <div className="fade">
              <div className="stats">
                <div className="st"><div className="lbl"><I n="dollar" s={13} c={T.green}/> Monthly Revenue</div><div className="val" style={{color:T.green}}>{fmtRp(totalMRR)}</div><div className="sub">per bulan</div></div>
                <div className="st"><div className="lbl"><I n="users" s={13} c={T.primary}/> Total Organisasi</div><div className="val">{orgs.length}</div><div className="sub">{paidOrgs} berbayar • {trialOrgs} trial</div></div>
                <div className="st"><div className="lbl"><I n="users" s={13} c={T.accent}/> Total Karyawan</div><div className="val">{totalEmps}</div><div className="sub">di semua organisasi</div></div>
                <div className="st"><div className="lbl"><I n="trend" s={13} c={T.warn}/> Avg Revenue/Org</div><div className="val">{fmtRp(paidOrgs > 0 ? Math.round(totalMRR / paidOrgs) : 0)}</div><div className="sub">dari org berbayar</div></div>
              </div>

              {/* Revenue by plan */}
              <div className="card">
                <div className="card-h"><h3>Revenue per Plan</h3></div>
                <div className="card-b tw"><table><thead><tr><th>Plan</th><th>Jumlah Org</th><th>Total Karyawan</th><th>Revenue/bulan</th></tr></thead><tbody>
                  {["free","growth","pro","proplus"].map(plan => {
                    const planOrgs = orgs.filter(o => (o.plan||"free") === plan);
                    const planEmps = planOrgs.reduce((s,o) => s + (orgEmployees[o.id]||0), 0);
                    const planRev = planOrgs.reduce((s,o) => s + calcRevenue(o), 0);
                    return (
                      <tr key={plan}>
                        <td><span className="badge" style={{background:`${PLAN_COLORS[plan]}20`,color:PLAN_COLORS[plan]}}>{PLAN_NAMES[plan]}</span></td>
                        <td style={{fontWeight:600}}>{planOrgs.length}</td>
                        <td>{planEmps}</td>
                        <td style={{fontWeight:700,color:planRev>0?T.green:T.text3}}>{fmtRp(planRev)}</td>
                      </tr>
                    );
                  })}
                </tbody></table></div>
              </div>

              {/* Recent orgs */}
              <div className="card">
                <div className="card-h"><h3>Organisasi Terbaru</h3></div>
                <div className="card-b tw"><table><thead><tr><th>Organisasi</th><th>Plan</th><th>Karyawan</th><th>Revenue</th><th>Status</th></tr></thead><tbody>
                  {orgs.slice(0, 10).map(o => (
                    <tr key={o.id} style={{cursor:"pointer"}} onClick={()=>{setSelectedOrg(o);setPage("organizations");}}>
                      <td><div style={{fontWeight:600}}>{o.name}</div><div style={{fontSize:10,color:T.text3}}>{o.email}</div></td>
                      <td><span className="badge" style={{background:`${PLAN_COLORS[o.plan||"free"]}20`,color:PLAN_COLORS[o.plan||"free"]}}>{PLAN_NAMES[o.plan||"free"]}</span></td>
                      <td>{orgEmployees[o.id]||0}</td>
                      <td style={{fontWeight:600}}>{fmtRp(calcRevenue(o))}</td>
                      <td><span className="badge" style={{background:`${STATUS_COLORS[o.planStatus||"active"]}20`,color:STATUS_COLORS[o.planStatus||"active"]}}>{STATUS_NAMES[o.planStatus||"active"]}</span></td>
                    </tr>
                  ))}
                </tbody></table></div>
              </div>
            </div>
          )}

          {/* =================== ORGANIZATIONS =================== */}
          {page === "organizations" && (
            <div className="fade">
              <div className="card">
                <div className="card-h">
                  <h3>Semua Organisasi ({orgs.length})</h3>
                  <div style={{position:"relative"}}><I n="search" s={13} c={T.text3} style={{position:"absolute",left:8,top:7}}/><input className="fi" placeholder="Cari organisasi..." value={search} onChange={e=>setSearch(e.target.value)} style={{paddingLeft:28,width:200}}/></div>
                </div>
                <div className="card-b tw"><table><thead><tr><th>Organisasi</th><th>Plan</th><th>Status</th><th>Karyawan</th><th>Revenue</th><th>Terdaftar</th><th style={{width:120}}>Aksi</th></tr></thead><tbody>
                  {filteredOrgs.map(o => (
                    <tr key={o.id}>
                      <td><div style={{fontWeight:600}}>{o.name}</div><div style={{fontSize:10,color:T.text3}}>{o.email} • {o.id}</div></td>
                      <td><span className="badge" style={{background:`${PLAN_COLORS[o.plan||"free"]}20`,color:PLAN_COLORS[o.plan||"free"]}}>{PLAN_NAMES[o.plan||"free"]}</span></td>
                      <td><span className="badge" style={{background:`${STATUS_COLORS[o.planStatus||"active"]}20`,color:STATUS_COLORS[o.planStatus||"active"]}}>{STATUS_NAMES[o.planStatus||"active"]}</span></td>
                      <td style={{fontWeight:600}}>{orgEmployees[o.id]||0}</td>
                      <td style={{fontWeight:600,color:calcRevenue(o)>0?T.green:T.text3}}>{fmtRp(calcRevenue(o))}</td>
                      <td style={{fontSize:11,color:T.text3}}>{o.createdAt ? new Date(o.createdAt).toLocaleDateString("id-ID") : "—"}</td>
                      <td>
                        <div style={{display:"flex",gap:4}}>
                          <button className="btn btn-o" onClick={()=>setSelectedOrg(o)} title="Edit"><I n="gear" s={12}/></button>
                          {(o.planStatus||"active")==="active" ?
                            <button className="btn btn-w" onClick={()=>updateOrg(o.id,{planStatus:"paused"})} title="Pause"><I n="pause" s={12}/></button> :
                            <button className="btn btn-g" onClick={()=>updateOrg(o.id,{planStatus:"active"})} title="Activate"><I n="play" s={12}/></button>
                          }
                          <button className="btn btn-r" onClick={()=>setDeleteConfirm(o)} title="Delete"><I n="trash" s={12}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody></table></div>
              </div>
            </div>
          )}

          {/* =================== REVENUE =================== */}
          {page === "revenue" && (
            <div className="fade">
              <div className="stats">
                <div className="st"><div className="lbl"><I n="dollar" s={13} c={T.green}/> MRR</div><div className="val" style={{color:T.green}}>{fmtRp(totalMRR)}</div><div className="sub">Monthly Recurring Revenue</div></div>
                <div className="st"><div className="lbl"><I n="trend" s={13} c={T.accent}/> ARR (Proyeksi)</div><div className="val" style={{color:T.accent}}>{fmtRp(totalMRR * 12)}</div><div className="sub">Annual Recurring Revenue</div></div>
                <div className="st"><div className="lbl"><I n="users" s={13} c={T.primary}/> Paying Customers</div><div className="val">{paidOrgs}</div><div className="sub">dari {orgs.length} total org</div></div>
                <div className="st"><div className="lbl"><I n="dollar" s={13} c={T.warn}/> ARPU</div><div className="val">{fmtRp(paidOrgs > 0 ? Math.round(totalMRR / paidOrgs) : 0)}</div><div className="sub">Avg Revenue Per User</div></div>
              </div>

              {/* Revenue per org */}
              <div className="card">
                <div className="card-h"><h3>Revenue Detail per Organisasi</h3></div>
                <div className="card-b tw"><table><thead><tr><th>Organisasi</th><th>Plan</th><th>Status</th><th>Karyawan</th><th>Harga/Orang</th><th>Revenue/Bulan</th><th>Revenue/Tahun</th></tr></thead><tbody>
                  {orgs.filter(o=>(o.plan||"free")!=="free").sort((a,b)=>calcRevenue(b)-calcRevenue(a)).map(o => {
                    const rev = calcRevenue(o);
                    const count = orgEmployees[o.id]||0;
                    const price = PLAN_PRICES[o.plan||"free"];
                    return (
                      <tr key={o.id}>
                        <td><div style={{fontWeight:600}}>{o.name}</div><div style={{fontSize:10,color:T.text3}}>{o.email}</div></td>
                        <td><span className="badge" style={{background:`${PLAN_COLORS[o.plan||"free"]}20`,color:PLAN_COLORS[o.plan||"free"]}}>{PLAN_NAMES[o.plan||"free"]}</span></td>
                        <td><span className="badge" style={{background:`${STATUS_COLORS[o.planStatus||"active"]}20`,color:STATUS_COLORS[o.planStatus||"active"]}}>{STATUS_NAMES[o.planStatus||"active"]}</span></td>
                        <td style={{fontWeight:600}}>{count}</td>
                        <td>{fmtRp(price)}</td>
                        <td style={{fontWeight:700,color:T.green}}>{fmtRp(rev)}</td>
                        <td style={{color:T.text2}}>{fmtRp(rev * 12)}</td>
                      </tr>
                    );
                  })}
                  {orgs.filter(o=>(o.plan||"free")!=="free").length===0 && <tr><td colSpan={7} style={{textAlign:"center",padding:32,color:T.text3}}>Belum ada organisasi berbayar</td></tr>}
                </tbody></table></div>
              </div>

              {/* Free orgs */}
              <div className="card">
                <div className="card-h"><h3>Organisasi Free ({orgs.filter(o=>(o.plan||"free")==="free").length})</h3></div>
                <div className="card-b tw"><table><thead><tr><th>Organisasi</th><th>Karyawan</th><th>Terdaftar</th><th>Potensi Revenue</th></tr></thead><tbody>
                  {orgs.filter(o=>(o.plan||"free")==="free").map(o => {
                    const count = orgEmployees[o.id]||0;
                    const potential = count > 50 ? count * 10000 : count > 10 ? count * 5000 : 0;
                    return (
                      <tr key={o.id}>
                        <td><div style={{fontWeight:600}}>{o.name}</div><div style={{fontSize:10,color:T.text3}}>{o.email}</div></td>
                        <td>{count}</td>
                        <td style={{fontSize:11,color:T.text3}}>{o.createdAt ? new Date(o.createdAt).toLocaleDateString("id-ID") : "—"}</td>
                        <td style={{color:potential>0?T.warn:T.text3}}>{potential > 0 ? fmtRp(potential)+"/bln" : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody></table></div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* EDIT ORG MODAL */}
      {selectedOrg && (
        <div className="mdl" onClick={()=>setSelectedOrg(null)}><div className="mdl-c" onClick={e=>e.stopPropagation()}>
          <div className="mdl-h"><h3>Edit Organisasi</h3><button className="mdl-x" onClick={()=>setSelectedOrg(null)}><I n="x" s={14}/></button></div>
          <div className="mdl-b">
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:12,background:T.bg2,borderRadius:10}}>
              <div className="sb-av" style={{width:40,height:40,fontSize:14}}>{initials(selectedOrg.name)}</div>
              <div><div style={{fontWeight:700}}>{selectedOrg.name}</div><div style={{fontSize:11,color:T.text3}}>{selectedOrg.email} • {orgEmployees[selectedOrg.id]||0} karyawan</div></div>
            </div>

            <div className="fr">
              <div className="fg"><label className="fl">Plan</label>
                <select className="fs" value={selectedOrg.plan||"free"} onChange={e=>setSelectedOrg({...selectedOrg,plan:e.target.value})}>
                  <option value="free">Free</option><option value="growth">Growth</option><option value="pro">Pro</option><option value="proplus">Pro+</option>
                </select>
              </div>
              <div className="fg"><label className="fl">Status</label>
                <select className="fs" value={selectedOrg.planStatus||"active"} onChange={e=>setSelectedOrg({...selectedOrg,planStatus:e.target.value})}>
                  <option value="active">Aktif</option><option value="trial">Trial</option><option value="paused">Dijeda</option><option value="cancelled">Dibatalkan</option>
                </select>
              </div>
            </div>

            <div className="fg"><label className="fl">Trial Berakhir</label>
              <input className="fi" type="date" value={selectedOrg.trialEndsAt||""} onChange={e=>setSelectedOrg({...selectedOrg,trialEndsAt:e.target.value})}/>
            </div>

            <div style={{padding:12,background:T.bg2,borderRadius:8,marginTop:8}}>
              <div style={{fontSize:11,color:T.text3,marginBottom:4}}>Estimasi Revenue</div>
              <div style={{fontSize:18,fontWeight:800,color:T.green}}>{fmtRp((PLAN_PRICES[selectedOrg.plan||"free"]||0) * (orgEmployees[selectedOrg.id]||0))}<span style={{fontSize:11,color:T.text3,fontWeight:400}}> /bulan</span></div>
            </div>
          </div>
          <div className="mdl-f">
            <button className="btn btn-r" onClick={()=>{setDeleteConfirm(selectedOrg);setSelectedOrg(null);}}><I n="trash" s={12}/> Hapus</button>
            <div style={{flex:1}}/>
            <button className="btn btn-o" onClick={()=>setSelectedOrg(null)}>Batal</button>
            <button className="btn btn-p" onClick={()=>updateOrg(selectedOrg.id,{plan:selectedOrg.plan||"free",planStatus:selectedOrg.planStatus||"active",trialEndsAt:selectedOrg.trialEndsAt||null})}>Simpan</button>
          </div>
        </div></div>
      )}

      {/* DELETE CONFIRM */}
      {deleteConfirm && (
        <div className="mdl" onClick={()=>setDeleteConfirm(null)}><div className="mdl-c" onClick={e=>e.stopPropagation()} style={{maxWidth:380}}>
          <div className="mdl-h"><h3>Hapus Organisasi?</h3><button className="mdl-x" onClick={()=>setDeleteConfirm(null)}><I n="x" s={14}/></button></div>
          <div className="mdl-b" style={{textAlign:"center"}}>
            <div style={{fontSize:36,marginBottom:8}}>⚠️</div>
            <p style={{fontSize:14,fontWeight:700}}>{deleteConfirm.name}</p>
            <p style={{fontSize:12,color:T.text3,marginTop:4}}>{orgEmployees[deleteConfirm.id]||0} karyawan • {deleteConfirm.email}</p>
            <p style={{fontSize:12,color:T.danger,marginTop:12,lineHeight:1.5}}>Semua data organisasi ini (karyawan, kehadiran, cuti, lembur) akan dihapus <strong>permanen</strong>. Tindakan ini tidak bisa dibatalkan.</p>
          </div>
          <div className="mdl-f" style={{justifyContent:"center"}}>
            <button className="btn btn-o" onClick={()=>setDeleteConfirm(null)}>Batal</button>
            <button className="btn btn-r" onClick={()=>deleteOrg(deleteConfirm.id)}><I n="trash" s={12}/> Hapus Permanen</button>
          </div>
        </div></div>
      )}
    </div>
    </>
  );
}
