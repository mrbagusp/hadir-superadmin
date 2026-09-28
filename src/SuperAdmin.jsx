import { useState, useEffect, useMemo } from "react";
import { auth, db, isConfigured } from "./firebase/config";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, doc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, limit, getCountFromServer } from "firebase/firestore";

// Authorized superadmin emails — change via env var or hardcode
const SA_EMAILS = (import.meta.env.VITE_SUPERADMIN_EMAILS || "admin@blessingmediaglobal.com").split(",").map(e => e.trim().toLowerCase());

const PLAN_PRICES = { free: 0, growth: 5000, pro: 10000, proplus: 12000 };
const PLAN_NAMES = { free: "Free", growth: "Growth", pro: "Pro", proplus: "Pro+" };
const PLAN_COLORS = { free: "#64748B", growth: "#3B82F6", pro: "#10B981", proplus: "#A855F7" };
const STATUS_NAMES = { active: "Aktif", trial: "Trial", trial_over: "Trial Habis", paused: "Dijeda", cancelled: "Dibatalkan", expired: "Expired" };
const STATUS_COLORS = { active: "#10B981", trial: "#3B82F6", trial_over: "#F59E0B", paused: "#F59E0B", cancelled: "#EF4444", expired: "#64748B" };

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
    mail:<><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 6 12 13 2 6"/></>,
    phone:<><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></>,
    copy:<><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
    dl:<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    refresh:<><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></>,
    bell:<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    wa:<><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></>,
  };
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d[n]}</svg>;
};

const fmtRp=n=>"Rp "+(n||0).toLocaleString("id-ID");
const initials=n=>(n||"").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
const MON=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const pad2=n=>String(n).padStart(2,"0");
const localDStr=d=>`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const toDate=v=>{ if(!v) return null; if(typeof v.toDate==="function") return v.toDate(); const d=new Date(v); return isNaN(d)?null:d; };
const fmtDate=v=>{ const d=toDate(v); return d?`${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`:"—"; };
const daysSince=v=>{ const d=toDate(v); return d?Math.floor((Date.now()-d.getTime())/86400000):null; };
const daysUntil=v=>{ const d=toDate(v); return d?Math.ceil((d.getTime()-Date.now())/86400000):null; };
const ago=v=>{ const n=daysSince(v); if(n==null) return "—"; if(n<=0) return "hari ini"; if(n===1) return "kemarin"; if(n<30) return `${n} hari lalu`; if(n<365) return `${Math.floor(n/30)} bln lalu`; return `${Math.floor(n/365)} thn lalu`; };
// org_1789630440615 → tanggal daftar (fallback kalau createdAt kosong)
const orgCreated=o=>toDate(o.createdAt)||(/^org_(\d{12,})$/.test(o.id)?new Date(+o.id.slice(4)):null);
// No. WA → 62xxxxxxxxxx
const normWa=v=>{ let d=String(v||"").replace(/[^0-9]/g,""); if(!d) return null; if(d.startsWith("0")) d="62"+d.slice(1); else if(d.startsWith("8")) d="62"+d; return /^62\d{8,13}$/.test(d)?d:null; };
const fmtWa=d=>d?"+"+d.replace(/^(\d{2})(\d{3})(\d{4})(\d+)$/,"$1 $2-$3-$4"):"";
// Jalankan fn untuk banyak item dengan batas paralel (supaya tidak membanjiri Firestore)
const pool=async(items,n,fn)=>{ const out=new Array(items.length); let i=0; await Promise.all(Array.from({length:Math.min(n,items.length)},async()=>{ while(i<items.length){ const k=i++; try{ out[k]=await fn(items[k]); }catch(e){ out[k]={error:e}; } } })); return out; };

const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
html,body,#root{height:100%;overflow:hidden}
body{font-family:'Plus Jakarta Sans',sans-serif;background:${T.bg};color:${T.text};-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:${T.border2};border-radius:3px}

.app{display:flex;height:100vh}
.sb{width:240px;background:${T.card};border-right:1px solid ${T.border};display:flex;flex-direction:column;flex-shrink:0}
.sb-head{padding:18px;border-bottom:1px solid ${T.border};display:flex;align-items:center;gap:10px}
.sb-logo{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,${T.primary},#5B21B6);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;color:#fff}
.sb-title{font-size:17px;font-weight:800}
.sb-sub{font-size:9.5px;color:${T.primary};font-weight:700;letter-spacing:.5px}
.sb-nav{flex:1;padding:8px;overflow-y:auto}
.sb-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;cursor:pointer;color:${T.text2};font-size:13px;font-weight:500;border:none;background:none;width:100%;text-align:left;transition:all .15s;margin-bottom:1px;font-family:inherit}
.sb-item:hover{background:${T.hover};color:${T.text}}
.sb-item.on{background:${T.primaryMuted};color:${T.primary};font-weight:600}
.sb-item .cnt{margin-left:auto;background:${T.warnMuted};color:${T.warn};font-size:10px;font-weight:700;padding:1px 7px;border-radius:10px}
.sb-foot{padding:12px 14px;border-top:1px solid ${T.border};display:flex;align-items:center;gap:8px}
.sb-av{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,${T.primary},${T.accent});display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0}

.main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
.topbar{min-height:56px;background:${T.card};border-bottom:1px solid ${T.border};display:flex;align-items:center;padding:0 20px;gap:12px;flex-wrap:wrap}
.topbar h1{font-size:16px;font-weight:700;flex:1}
.mnav{display:none;gap:4px}
.content{flex:1;overflow-y:auto;padding:20px}

.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}
.st{background:${T.card};border:1px solid ${T.border};border-radius:12px;padding:16px}
.st .lbl{font-size:11px;color:${T.text2};font-weight:500;margin-bottom:4px;display:flex;align-items:center;gap:5px}
.st .val{font-size:24px;font-weight:800;letter-spacing:-1px}
.st .sub{font-size:10.5px;color:${T.text3};margin-top:2px}

.card{background:${T.card};border:1px solid ${T.border};border-radius:12px;margin-bottom:16px;overflow:hidden}
.card-h{padding:12px 16px;border-bottom:1px solid ${T.border};display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.card-h h3{font-size:13.5px;font-weight:700}
.card-b{padding:0}
.tw{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:12px}
thead{background:${T.bg2}}
th{padding:9px 14px;text-align:left;font-weight:600;color:${T.text3};font-size:10px;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap}
td{padding:10px 14px;border-bottom:1px solid ${T.border};white-space:nowrap;vertical-align:middle}
tr:last-child td{border-bottom:none}
tbody tr:hover td{background:${T.hover}}
.clk{cursor:pointer}

.badge{display:inline-flex;padding:3px 8px;border-radius:5px;font-size:10px;font-weight:600;white-space:nowrap}
.btn{display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border-radius:7px;font-size:11.5px;font-weight:600;cursor:pointer;border:none;font-family:inherit;transition:all .15s;white-space:nowrap;text-decoration:none}
.btn-p{background:${T.primary};color:#fff}.btn-p:hover{background:#6D28D9}
.btn-g{background:${T.greenMuted};color:#34D399}.btn-r{background:${T.dangerMuted};color:#F87171}
.btn-w{background:${T.warnMuted};color:#FBBF24}
.btn-wa{background:#25D366;color:#06260f}.btn-wa:hover{background:#1ebe5b}
.btn-o{background:none;border:1px solid ${T.border};color:${T.text}}.btn-o:hover{border-color:${T.primary};color:${T.primary}}
.ib{width:26px;height:26px;padding:0;justify-content:center}
.lnk{color:${T.text};text-decoration:none}.lnk:hover{color:${T.primary}}
.chip{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:20px;font-size:11.5px;font-weight:600;cursor:pointer;border:1px solid ${T.border};background:none;color:${T.text2};font-family:inherit}
.chip.on{background:${T.primaryMuted};border-color:${T.primary};color:${T.primary}}
.chip b{background:${T.bg2};color:${T.text};padding:0 6px;border-radius:8px;font-size:10px}
.fu{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;padding:14px 16px}
.fu-i{background:${T.bg2};border:1px solid ${T.border};border-radius:10px;padding:12px;cursor:pointer;text-align:left;font-family:inherit;color:${T.text}}
.fu-i:hover{border-color:${T.primary}}
.fu-i .n{font-size:22px;font-weight:800}
.fu-i .l{font-size:11.5px;font-weight:600;margin-top:2px}
.fu-i .s{font-size:10.5px;color:${T.text3};margin-top:2px}

.mdl{position:fixed;inset:0;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;z-index:999;backdrop-filter:blur(4px);padding:16px}
.mdl-c{background:${T.card};border:1px solid ${T.border};border-radius:16px;width:100%;max-width:500px;max-height:88vh;overflow-y:auto}
.mdl-h{padding:16px;border-bottom:1px solid ${T.border};display:flex;align-items:center;justify-content:space-between;gap:10px}
.mdl-h h3{font-size:15px;font-weight:700}
.mdl-x{width:28px;height:28px;border-radius:7px;border:1px solid ${T.border};background:none;color:${T.text2};cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.mdl-b{padding:16px}
.mdl-f{padding:12px 16px;border-top:1px solid ${T.border};display:flex;gap:8px;justify-content:flex-end}
.sec-t{font-size:10.5px;font-weight:700;color:${T.text3};text-transform:uppercase;letter-spacing:.5px;margin:16px 0 8px}
.kv{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.kv div{background:${T.bg2};border-radius:8px;padding:9px 11px}
.kv span{display:block;font-size:10px;color:${T.text3};margin-bottom:2px}
.kv b{font-size:12.5px}

.fg{margin-bottom:12px}.fl{display:block;font-size:11px;font-weight:600;color:${T.text2};margin-bottom:4px}
.fi,.fs{width:100%;padding:8px 12px;background:${T.bg2};border:1px solid ${T.border};border-radius:7px;color:${T.text};font-size:12px;font-family:inherit}
.fi:focus,.fs:focus{outline:none;border-color:${T.primary}}
textarea.fi{resize:vertical;min-height:110px;line-height:1.5}
.fr{display:grid;grid-template-columns:1fr 1fr;gap:10px}

.lw{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.lf{background:${T.card};border:1px solid ${T.border};border-radius:14px;padding:20px;width:100%;max-width:360px}
.lb{width:100%;padding:10px;border-radius:8px;border:none;background:${T.primary};color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:4px}
.err{padding:8px 10px;background:${T.dangerMuted};border-radius:7px;margin-bottom:10px;font-size:11px;color:#F87171}
.note{padding:10px 14px;background:${T.warnMuted};border:1px solid rgba(245,158,11,.25);border-radius:10px;margin-bottom:14px;font-size:12px;color:#FBBF24;line-height:1.5}
.toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:${T.green};color:#04210f;font-size:12.5px;font-weight:700;padding:9px 16px;border-radius:9px;z-index:2000}
.fade{animation:fi .3s ease-out}@keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

@media(max-width:768px){.sb{display:none}.mnav{display:flex}.stats{grid-template-columns:repeat(2,1fr)}.fr,.kv{grid-template-columns:1fr}.content{padding:12px}}
`;

// Status efektif: trial yang sudah lewat tanggalnya → "trial_over"
const effStatus=o=>{ const s=o.planStatus||"active"; if(s==="trial"&&o.trialEndsAt&&daysUntil(o.trialEndsAt)<0) return "trial_over"; return s; };

// Segmen follow-up
const SEGMENTS=[
  {id:"all",label:"Semua"},
  {id:"new7",label:"Daftar ≤7 hari",sub:"Sapa & bantu setup",test:(o,m)=>{const d=daysSince(orgCreated(o));return d!=null&&d<=7;}},
  {id:"trialSoon",label:"Trial ≤7 hari lagi",sub:"Tawarkan upgrade",test:(o)=>effStatus(o)==="trial"&&daysUntil(o.trialEndsAt)<=7},
  {id:"trialOver",label:"Trial habis / expired",sub:"Ajak lanjut berbayar",test:(o)=>["trial_over","expired"].includes(effStatus(o))},
  {id:"noAtt",label:"Belum pernah absen",sub:"Belum dipakai sama sekali",test:(o,m)=>m&&m.loaded&&!m.lastAtt&&!m.attErr&&(daysSince(orgCreated(o))??99)>=1},
  {id:"dormant",label:"Tidak aktif 14+ hari",sub:"Pernah pakai, lalu berhenti",test:(o,m)=>m&&m.lastAtt&&daysSince(m.lastAtt)>=14},
  {id:"noStaff",label:"Belum tambah karyawan",sub:"Hanya akun admin",test:(o,m)=>m&&m.loaded&&m.empCount<=1},
  {id:"noWa",label:"Belum ada No. WA",sub:"Follow up via email",test:(o,m,c)=>!c.phone},
];

const waMessage=(o,c,m)=>{
  const first=(c.name||"").trim().split(" ")[0]; const name=first&&!/^admin$/i.test(first)?`Kak ${first}`:"Kak";
  const lines=[`Halo ${name}, saya dari tim HadirHR 👋`,`Terima kasih sudah mendaftarkan *${o.name||"perusahaan Anda"}* di HadirHR.`];
  const st=effStatus(o);
  if(st==="trial"&&o.trialEndsAt) lines.push(`Masa trial plan ${PLAN_NAMES[o.plan]||o.plan} berakhir ${fmtDate(o.trialEndsAt)}. Kalau mau lanjut, kami bisa bantu proses upgrade-nya.`);
  else if(st==="trial_over"||st==="expired") lines.push(`Masa trial sudah berakhir. Kalau ingin lanjut memakai fitur lengkap, kami bisa bantu aktifkan kembali.`);
  else if(m&&m.loaded&&!m.lastAtt) lines.push(`Kami lihat absensi belum mulai dipakai. Mau kami bantu setup lokasi kantor & undang karyawan? Cukup 10 menit.`);
  else if(m&&m.loaded&&m.empCount<=1) lines.push(`Sudah siap menambahkan karyawan? Kami bisa bantu kalau ada kendala.`);
  lines.push(`Ada yang bisa kami bantu?`);
  return lines.join("\n");
};

// ============================================================
// SUPER ADMIN APP
// ============================================================
export default function SuperAdmin() {
  const [authState, setAuthState] = useState("loading");
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [orgs, setOrgs] = useState([]);
  const [meta, setMeta] = useState({});        // { orgId: { loaded, empCount, emps, admin, lastAtt, att30, attErr } }
  const [usersById, setUsersById] = useState({});
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [attDenied, setAttDenied] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [search, setSearch] = useState("");
  const [seg, setSeg] = useState("all");
  const [planF, setPlanF] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [waDraft, setWaDraft] = useState(null); // {org, contact, text}
  const [toast, setToast] = useState("");
  const [showCount, setShowCount] = useState(15);

  const flash=(t)=>{ setToast(t); setTimeout(()=>setToast(""),1800); };
  const copy=async(t,label="Disalin")=>{ try{ await navigator.clipboard.writeText(t); flash(label+" ✓"); }catch{ window.prompt("Salin manual:",t); } };

  // Auth
  useEffect(() => {
    if (!isConfigured) { setAuthState("login"); return; }
    const unsub = onAuthStateChanged(auth, user => {
      if (user && SA_EMAILS.includes((user.email||"").toLowerCase())) {
        setUser(user); setAuthState("authed");
      } else if (user) {
        signOut(auth); setAuthState("login");
      } else { setAuthState("login"); setUser(null); }
    });
    return unsub;
  }, []);

  // Semua organisasi (realtime)
  useEffect(() => {
    if (authState !== "authed") return;
    const unsub = onSnapshot(collection(db, "organizations"), (snap) => {
      setOrgs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => { console.error("orgs listener:", err); setLoading(false); });
    return unsub;
  }, [authState]);

  // Data akun pendaftar (users/{uid}) — sumber email/nama/no. HP kalau di org kosong
  useEffect(() => {
    if (authState !== "authed") return;
    getDocs(collection(db, "users")).then(snap => {
      const m = {}; snap.docs.forEach(d => { m[d.id] = d.data(); }); setUsersById(m);
    }).catch(e => console.warn("users read:", e?.code || e));
  }, [authState, reloadKey]);

  // Detail per org: karyawan (+admin), absen terakhir, jumlah absen 30 hari
  const orgIdsKey = orgs.map(o => o.id).sort().join(",");
  useEffect(() => {
    if (authState !== "authed" || !orgs.length) return;
    let cancelled = false;
    setEnriching(true);
    const since = new Date(); since.setDate(since.getDate() - 30);
    const since30 = localDStr(since);
    pool(orgs.map(o => o.id), 8, async (id) => {
      const out = { loaded: true };
      const es = await getDocs(collection(db, "organizations", id, "employees"));
      out.emps = es.docs.map(d => ({ id: d.id, ...d.data() }));
      out.empCount = es.size;
      out.admin = out.emps.find(e => e.role === "admin") || null;
      try {
        const last = await getDocs(query(collection(db, "organizations", id, "attendances"), orderBy("date", "desc"), limit(1)));
        out.lastAtt = last.empty ? null : last.docs[0].data().date;
        const c = await getCountFromServer(query(collection(db, "organizations", id, "attendances"), where("date", ">=", since30)));
        out.att30 = c.data().count;
      } catch (e) { out.attErr = e?.code || String(e); }
      if (!cancelled) setMeta(prev => ({ ...prev, [id]: out }));
      return out;
    }).then(res => {
      if (cancelled) return;
      setAttDenied(res.some(r => r && r.attErr === "permission-denied"));
      setEnriching(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState, orgIdsKey, reloadKey]);

  // Kontak org: org → akun pendaftar → karyawan admin
  const contactOf = (o) => {
    const u = usersById[o.createdBy] || {};
    const a = meta[o.id]?.admin || {};
    const email = o.contactEmail || o.email || u.email || a.email || "";
    const name = o.contactName || u.name || a.name || "";
    const rawPhone = o.contactPhone || u.phone || a.phone || "";
    return { email, name, phone: normWa(rawPhone), phoneRaw: rawPhone };
  };

  const empCount = (id) => meta[id]?.empCount || 0;
  const calcRevenue = (org) => {
    const plan = org.plan || "free";
    const status = effStatus(org);
    if (plan === "free" || ["paused","cancelled","trial","trial_over","expired"].includes(status)) return 0;
    return (PLAN_PRICES[plan] || 0) * empCount(org.id);
  };

  const totalMRR = orgs.reduce((sum, o) => sum + calcRevenue(o), 0);
  const totalEmps = orgs.reduce((s, o) => s + empCount(o.id), 0);
  const paidOrgs = orgs.filter(o => calcRevenue(o) > 0).length;
  const trialOrgs = orgs.filter(o => effStatus(o) === "trial").length;
  const activeOrgs = orgs.filter(o => meta[o.id]?.lastAtt && daysSince(meta[o.id].lastAtt) <= 7).length;

  const segCount = useMemo(() => {
    const m = {}; SEGMENTS.forEach(s => { m[s.id] = s.test ? orgs.filter(o => s.test(o, meta[o.id], contactOf(o))).length : orgs.length; }); return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgs, meta, usersById]);
  const followUpTotal = (segCount.trialSoon||0) + (segCount.trialOver||0) + (segCount.noAtt||0);

  const sortedOrgs = useMemo(() => {
    const arr = [...orgs];
    const t = o => orgCreated(o)?.getTime() || 0;
    if (sortBy === "newest") arr.sort((a,b) => t(b) - t(a));
    else if (sortBy === "oldest") arr.sort((a,b) => t(a) - t(b));
    else if (sortBy === "emps") arr.sort((a,b) => empCount(b.id) - empCount(a.id));
    else if (sortBy === "activity") arr.sort((a,b) => String(meta[b.id]?.lastAtt||"").localeCompare(String(meta[a.id]?.lastAtt||"")));
    else if (sortBy === "name") arr.sort((a,b) => (a.name||"").localeCompare(b.name||""));
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgs, meta, sortBy]);

  const filteredOrgs = sortedOrgs.filter(o => {
    const c = contactOf(o);
    const sg = SEGMENTS.find(s => s.id === seg);
    if (sg && sg.test && !sg.test(o, meta[o.id], c)) return false;
    if (planF !== "all" && (o.plan || "free") !== planF) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [o.name, o.id, c.email, c.name, c.phone, c.phoneRaw].some(x => String(x || "").toLowerCase().includes(q));
  });

  // Actions
  const updateOrg = async (orgId, data) => {
    await updateDoc(doc(db, "organizations", orgId), data);
    setSelectedOrg(null); flash("Tersimpan");
  };

  const deleteOrg = async (orgId) => {
    const subcols = ["employees", "attendances", "leaves", "overtime", "selfies"];
    for (const sub of subcols) {
      const snap = await getDocs(collection(db, "organizations", orgId, sub));
      for (const d of snap.docs) await deleteDoc(d.ref);
    }
    await deleteDoc(doc(db, "organizations", orgId));
    setDeleteConfirm(null);
  };

  const openWa = (o) => { const c = contactOf(o); setWaDraft({ org: o, contact: c, text: waMessage(o, c, meta[o.id]) }); };

  const exportCsv = () => {
    const head = ["Nama Organisasi","Org ID","Nama Admin","Email","No. WhatsApp","Plan","Status","Karyawan","Absen Terakhir","Absen 30 Hari","Terdaftar","Trial Berakhir","Revenue/Bulan"];
    const rows = filteredOrgs.map(o => { const c = contactOf(o); const m = meta[o.id] || {};
      return [o.name||"", o.id, c.name, c.email, c.phone ? "+"+c.phone : (c.phoneRaw||""), PLAN_NAMES[o.plan||"free"], STATUS_NAMES[effStatus(o)]||effStatus(o), m.empCount ?? "", m.lastAtt || "", m.att30 ?? "", orgCreated(o) ? localDStr(orgCreated(o)) : "", o.trialEndsAt ? String(o.trialEndsAt).slice(0,10) : "", calcRevenue(o)]; });
    const esc = v => { const s = String(v ?? ""); return /[",\n;]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; };
    const csv = "﻿" + [head, ...rows].map(r => r.map(esc).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `hadirhr_organisasi_${localDStr(new Date())}.csv`; a.click();
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

  // ---------- Komponen kecil ----------
  const PlanBadge = ({ o }) => <span className="badge" style={{background:`${PLAN_COLORS[o.plan||"free"]}20`,color:PLAN_COLORS[o.plan||"free"]}}>{PLAN_NAMES[o.plan||"free"]}</span>;
  const StatusBadge = ({ o }) => { const s = effStatus(o); return <span className="badge" style={{background:`${STATUS_COLORS[s]||T.text3}20`,color:STATUS_COLORS[s]||T.text3}}>{STATUS_NAMES[s]||s}</span>; };
  const Contact = ({ o, compact }) => {
    const c = contactOf(o);
    return (
      <div style={{display:"flex",flexDirection:"column",gap:3,minWidth:compact?0:200}}>
        {c.name && <div style={{fontSize:11.5,fontWeight:600}}>{c.name}</div>}
        {c.email
          ? <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11}}><I n="mail" s={11} c={T.text3}/><a className="lnk" href={`mailto:${c.email}`} onClick={e=>e.stopPropagation()}>{c.email}</a><button className="btn btn-o ib" style={{width:20,height:20}} title="Salin email" onClick={e=>{e.stopPropagation();copy(c.email,"Email disalin");}}><I n="copy" s={10}/></button></div>
          : <div style={{fontSize:11,color:T.text3}}>Email tidak ada</div>}
        {c.phone
          ? <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11}}><I n="phone" s={11} c={T.text3}/><span style={{fontVariantNumeric:"tabular-nums"}}>{fmtWa(c.phone)}</span><button className="btn btn-o ib" style={{width:20,height:20}} title="Salin nomor" onClick={e=>{e.stopPropagation();copy("+"+c.phone,"Nomor disalin");}}><I n="copy" s={10}/></button></div>
          : <div style={{fontSize:11,color:T.warn}}>{c.phoneRaw ? `No. tidak valid: ${c.phoneRaw}` : "Belum ada No. WA"}</div>}
      </div>
    );
  };
  const Activity = ({ o }) => {
    const m = meta[o.id];
    if (!m) return <span style={{color:T.text3,fontSize:11}}>memuat…</span>;
    if (m.attErr) return <span style={{color:T.text3,fontSize:11}} title={m.attErr}>—</span>;
    if (!m.lastAtt) return <span className="badge" style={{background:T.dangerMuted,color:"#F87171"}}>Belum pernah</span>;
    const d = daysSince(m.lastAtt);
    return <div><div style={{fontSize:11.5,fontWeight:600,color:d<=3?T.green:d<=14?T.text:T.warn}}>{ago(m.lastAtt)}</div><div style={{fontSize:10,color:T.text3}}>{m.att30||0} absen / 30 hari</div></div>;
  };
  const OrgRow = ({ o, actions = true }) => (
    <tr className="clk" onClick={()=>setSelectedOrg(o)}>
      <td><div style={{fontWeight:600}}>{o.name || <i style={{color:T.text3}}>(tanpa nama)</i>}</div><div style={{fontSize:10,color:T.text3}}>{o.id}</div></td>
      <td><Contact o={o}/></td>
      <td><PlanBadge o={o}/></td>
      <td><StatusBadge o={o}/>{effStatus(o)==="trial"&&o.trialEndsAt&&<div style={{fontSize:10,color:T.text3,marginTop:3}}>s/d {fmtDate(o.trialEndsAt)}</div>}</td>
      <td style={{fontWeight:600}}>{meta[o.id] ? empCount(o.id) : "…"}</td>
      <td><Activity o={o}/></td>
      <td><div style={{fontSize:11.5}}>{fmtDate(orgCreated(o))}</div><div style={{fontSize:10,color:T.text3}}>{ago(orgCreated(o))}</div></td>
      {actions && <td onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",gap:4}}>
          {contactOf(o).phone ? <button className="btn btn-wa" onClick={()=>openWa(o)} title="Follow up via WhatsApp"><I n="wa" s={12}/> WA</button>
            : contactOf(o).email ? <a className="btn btn-o" href={`mailto:${contactOf(o).email}?subject=${encodeURIComponent("HadirHR — "+(o.name||""))}`} title="Kirim email"><I n="mail" s={12}/> Email</a> : null}
          <button className="btn btn-o ib" onClick={()=>setSelectedOrg(o)} title="Detail & edit"><I n="gear" s={12}/></button>
          {(o.planStatus||"active")==="active" ?
            <button className="btn btn-w ib" onClick={()=>updateOrg(o.id,{planStatus:"paused"})} title="Pause"><I n="pause" s={12}/></button> :
            <button className="btn btn-g ib" onClick={()=>updateOrg(o.id,{planStatus:"active"})} title="Aktifkan"><I n="play" s={12}/></button>}
          <button className="btn btn-r ib" onClick={()=>setDeleteConfirm(o)} title="Hapus"><I n="trash" s={12}/></button>
        </div>
      </td>}
    </tr>
  );
  const OrgHead = ({ actions = true }) => <thead><tr><th>Organisasi</th><th>Kontak Admin</th><th>Plan</th><th>Status</th><th>Karyawan</th><th>Aktivitas Absen</th><th>Terdaftar</th>{actions && <th>Aksi</th>}</tr></thead>;

  const goSeg = (id) => { setSeg(id); setPage("organizations"); };
  const nav = [
    {id:"dashboard",icon:"grid",label:"Dashboard"},
    {id:"organizations",icon:"users",label:"Organisasi",cnt:followUpTotal},
    {id:"revenue",icon:"dollar",label:"Revenue"},
  ];

  return (
    <><style>{CSS}</style>
    <div className="app">
      <aside className="sb">
        <div className="sb-head">
          <div className="sb-logo">H</div>
          <div><div className="sb-title">Hadir</div><div className="sb-sub">SUPER ADMIN</div></div>
        </div>
        <nav className="sb-nav">
          {nav.map(m=>(
            <button key={m.id} className={`sb-item ${page===m.id?"on":""}`} onClick={()=>setPage(m.id)}>
              <I n={m.icon} s={16}/>{m.label}{m.cnt>0 && <span className="cnt" title="Perlu follow-up">{m.cnt}</span>}
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
        <header className="topbar">
          <h1>{titles[page]}</h1>
          {enriching && <span style={{fontSize:11,color:T.text3}}>Memuat detail organisasi…</span>}
          <button className="btn btn-o" onClick={()=>setReloadKey(k=>k+1)} title="Muat ulang detail"><I n="refresh" s={12}/> Refresh</button>
          <div className="mnav">{nav.map(m=><button key={m.id} className={`btn ${page===m.id?"btn-p":"btn-o"}`} onClick={()=>setPage(m.id)}>{m.label}</button>)}</div>
        </header>
        <section className="content">
          {attDenied && <div className="note">Aktivitas absen belum bisa dibaca: Firestore rules belum mengizinkan superadmin membaca <code>attendances</code>. Publish <b>firestore.rules v5</b> terbaru, lalu klik Refresh.</div>}

          {/* =================== DASHBOARD =================== */}
          {page === "dashboard" && (
            <div className="fade">
              <div className="stats">
                <div className="st"><div className="lbl"><I n="dollar" s={13} c={T.green}/> Monthly Revenue</div><div className="val" style={{color:T.green}}>{fmtRp(totalMRR)}</div><div className="sub">{paidOrgs} org berbayar aktif</div></div>
                <div className="st"><div className="lbl"><I n="users" s={13} c={T.primary}/> Total Organisasi</div><div className="val">{orgs.length}</div><div className="sub">{trialOrgs} trial • {segCount.new7||0} baru minggu ini</div></div>
                <div className="st"><div className="lbl"><I n="trend" s={13} c={T.accent}/> Org Aktif Absen</div><div className="val">{activeOrgs}</div><div className="sub">ada absen dalam 7 hari terakhir</div></div>
                <div className="st"><div className="lbl"><I n="users" s={13} c={T.warn}/> Total Karyawan</div><div className="val">{totalEmps}</div><div className="sub">di semua organisasi</div></div>
              </div>

              {/* Follow-up */}
              <div className="card">
                <div className="card-h"><h3><span style={{marginRight:6}}>🔔</span>Perlu Follow-up</h3><span style={{fontSize:11,color:T.text3}}>Klik kartu untuk melihat daftarnya</span></div>
                <div className="fu">
                  {SEGMENTS.filter(s=>s.test).map(s=>(
                    <button key={s.id} className="fu-i" onClick={()=>goSeg(s.id)}>
                      <div className="n" style={{color:(segCount[s.id]||0)>0?T.text:T.text3}}>{segCount[s.id]||0}</div>
                      <div className="l">{s.label}</div>
                      <div className="s">{s.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Terbaru */}
              <div className="card">
                <div className="card-h"><h3>Organisasi Terbaru</h3><button className="btn btn-o" onClick={()=>{setSeg("all");setSortBy("newest");setPage("organizations");}}>Lihat semua ({orgs.length}) →</button></div>
                <div className="card-b tw"><table><OrgHead/><tbody>
                  {sortedOrgs.slice(0, showCount).map(o => <OrgRow key={o.id} o={o}/>)}
                </tbody></table></div>
                {orgs.length > showCount && <div style={{padding:12,textAlign:"center",borderTop:`1px solid ${T.border}`}}><button className="btn btn-o" onClick={()=>setShowCount(c=>c+15)}>Tampilkan 15 lagi ({orgs.length - showCount} tersisa)</button></div>}
              </div>

              {/* Revenue by plan */}
              <div className="card">
                <div className="card-h"><h3>Revenue per Plan</h3></div>
                <div className="card-b tw"><table><thead><tr><th>Plan</th><th>Jumlah Org</th><th>Total Karyawan</th><th>Revenue/bulan</th></tr></thead><tbody>
                  {["free","growth","pro","proplus"].map(plan => {
                    const planOrgs = orgs.filter(o => (o.plan||"free") === plan);
                    const planEmps = planOrgs.reduce((s,o) => s + empCount(o.id), 0);
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
            </div>
          )}

          {/* =================== ORGANIZATIONS =================== */}
          {page === "organizations" && (
            <div className="fade">
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
                {SEGMENTS.map(s=><button key={s.id} className={`chip ${seg===s.id?"on":""}`} onClick={()=>setSeg(s.id)}>{s.label} <b>{segCount[s.id]||0}</b></button>)}
              </div>
              <div className="card">
                <div className="card-h">
                  <h3>{SEGMENTS.find(s=>s.id===seg)?.label || "Semua"} ({filteredOrgs.length})</h3>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                    <div style={{position:"relative"}}><span style={{position:"absolute",left:9,top:8}}><I n="search" s={13} c={T.text3}/></span><input className="fi" placeholder="Cari nama, email, no. WA, ID…" value={search} onChange={e=>setSearch(e.target.value)} style={{paddingLeft:28,width:230}}/></div>
                    <select className="fs" style={{width:120}} value={planF} onChange={e=>setPlanF(e.target.value)}><option value="all">Semua plan</option>{Object.keys(PLAN_NAMES).map(p=><option key={p} value={p}>{PLAN_NAMES[p]}</option>)}</select>
                    <select className="fs" style={{width:150}} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
                      <option value="newest">Terbaru daftar</option><option value="oldest">Terlama daftar</option><option value="activity">Aktivitas terakhir</option><option value="emps">Karyawan terbanyak</option><option value="name">Nama A–Z</option>
                    </select>
                    <button className="btn btn-o" onClick={exportCsv} title="Export daftar yang sedang tampil"><I n="dl" s={12}/> Export CSV</button>
                  </div>
                </div>
                <div className="card-b tw">
                  {loading ? <div style={{padding:32,textAlign:"center",color:T.text3}}>Memuat…</div>
                  : filteredOrgs.length === 0 ? <div style={{padding:32,textAlign:"center",color:T.text3}}>Tidak ada organisasi yang cocok</div>
                  : <table><OrgHead/><tbody>{filteredOrgs.map(o => <OrgRow key={o.id} o={o}/>)}</tbody></table>}
                </div>
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
              <div className="card">
                <div className="card-h"><h3>Revenue Detail per Organisasi</h3><span style={{fontSize:11,color:T.text3}}>Trial & dijeda tidak dihitung sebagai revenue</span></div>
                <div className="card-b tw"><table><thead><tr><th>Organisasi</th><th>Plan</th><th>Status</th><th>Karyawan</th><th>Harga/Orang</th><th>Revenue/Bulan</th><th>Revenue/Tahun</th></tr></thead><tbody>
                  {orgs.filter(o=>(o.plan||"free")!=="free").sort((a,b)=>calcRevenue(b)-calcRevenue(a)).map(o => {
                    const rev = calcRevenue(o);
                    return (
                      <tr key={o.id} className="clk" onClick={()=>setSelectedOrg(o)}>
                        <td><div style={{fontWeight:600}}>{o.name}</div><div style={{fontSize:10,color:T.text3}}>{contactOf(o).email}</div></td>
                        <td><PlanBadge o={o}/></td>
                        <td><StatusBadge o={o}/></td>
                        <td style={{fontWeight:600}}>{empCount(o.id)}</td>
                        <td>{fmtRp(PLAN_PRICES[o.plan||"free"])}</td>
                        <td style={{fontWeight:700,color:rev>0?T.green:T.text3}}>{fmtRp(rev)}</td>
                        <td style={{color:T.text2}}>{fmtRp(rev * 12)}</td>
                      </tr>
                    );
                  })}
                  {orgs.filter(o=>(o.plan||"free")!=="free").length===0 && <tr><td colSpan={7} style={{textAlign:"center",padding:32,color:T.text3}}>Belum ada organisasi berbayar</td></tr>}
                </tbody></table></div>
              </div>
              <div className="card">
                <div className="card-h"><h3>Organisasi Free ({orgs.filter(o=>(o.plan||"free")==="free").length})</h3></div>
                <div className="card-b tw"><table><thead><tr><th>Organisasi</th><th>Karyawan</th><th>Terdaftar</th><th>Potensi Revenue</th></tr></thead><tbody>
                  {orgs.filter(o=>(o.plan||"free")==="free").sort((a,b)=>empCount(b.id)-empCount(a.id)).map(o => {
                    const count = empCount(o.id);
                    const potential = count > 50 ? count * 10000 : count > 15 ? count * 5000 : 0;
                    return (
                      <tr key={o.id} className="clk" onClick={()=>setSelectedOrg(o)}>
                        <td><div style={{fontWeight:600}}>{o.name}</div><div style={{fontSize:10,color:T.text3}}>{contactOf(o).email}</div></td>
                        <td>{count}</td>
                        <td style={{fontSize:11,color:T.text3}}>{fmtDate(orgCreated(o))}</td>
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

      {/* DETAIL & EDIT ORG MODAL */}
      {selectedOrg && (() => {
        const o = orgs.find(x => x.id === selectedOrg.id) || selectedOrg;
        const c = contactOf(o); const m = meta[o.id] || {};
        return (
        <div className="mdl" onClick={()=>setSelectedOrg(null)}><div className="mdl-c" style={{maxWidth:620}} onClick={e=>e.stopPropagation()}>
          <div className="mdl-h">
            <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
              <div className="sb-av" style={{width:40,height:40,fontSize:14}}>{initials(o.name)}</div>
              <div style={{minWidth:0}}><h3 style={{overflow:"hidden",textOverflow:"ellipsis"}}>{o.name}</h3><div style={{fontSize:11,color:T.text3}}>{o.id}</div></div>
            </div>
            <button className="mdl-x" onClick={()=>setSelectedOrg(null)}><I n="x" s={14}/></button>
          </div>
          <div className="mdl-b">
            <div className="sec-t" style={{marginTop:0}}>Kontak Admin</div>
            <div className="kv">
              <div><span>Nama</span><b>{c.name || "—"}</b></div>
              <div><span>Email login</span><b style={{wordBreak:"break-all"}}>{c.email || "—"}</b></div>
              <div><span>No. WhatsApp</span><b>{c.phone ? fmtWa(c.phone) : <span style={{color:T.warn,display:"inline"}}>{c.phoneRaw ? `Tidak valid: ${c.phoneRaw}` : "Belum diisi"}</span>}</b></div>
              <div><span>Terdaftar</span><b>{fmtDate(orgCreated(o))} <span style={{display:"inline",color:T.text3,fontWeight:400}}>({ago(orgCreated(o))})</span></b></div>
            </div>
            <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}}>
              {c.phone && <button className="btn btn-wa" onClick={()=>openWa(o)}><I n="wa" s={12}/> Follow up WhatsApp</button>}
              {c.email && <a className="btn btn-o" href={`mailto:${c.email}?subject=${encodeURIComponent("HadirHR — "+(o.name||""))}`}><I n="mail" s={12}/> Kirim Email</a>}
              {c.email && <button className="btn btn-o" onClick={()=>copy(c.email,"Email disalin")}><I n="copy" s={12}/> Salin email</button>}
              {c.phone && <button className="btn btn-o" onClick={()=>copy("+"+c.phone,"Nomor disalin")}><I n="copy" s={12}/> Salin nomor</button>}
            </div>

            <div className="sec-t">Pemakaian</div>
            <div className="kv">
              <div><span>Karyawan terdaftar</span><b>{m.loaded ? m.empCount : "…"}</b></div>
              <div><span>Absen terakhir</span><b>{m.attErr ? "—" : m.loaded ? (m.lastAtt ? `${fmtDate(m.lastAtt)} (${ago(m.lastAtt)})` : "Belum pernah") : "…"}</b></div>
              <div><span>Absen 30 hari terakhir</span><b>{m.attErr ? "—" : m.loaded ? (m.att30 ?? 0) : "…"}</b></div>
              <div><span>Lokasi kantor diset</span><b>{(o.settings?.locations||[]).length ? `${o.settings.locations.length} lokasi` : "Belum"}</b></div>
            </div>

            {m.emps && m.emps.length > 0 && <>
              <div className="sec-t">Karyawan ({m.emps.length})</div>
              <div className="tw" style={{border:`1px solid ${T.border}`,borderRadius:8,maxHeight:200,overflowY:"auto"}}><table><thead><tr><th>Nama</th><th>Email</th><th>No. HP</th><th>Role</th></tr></thead><tbody>
                {m.emps.slice(0,100).map(e=><tr key={e.id}><td style={{fontWeight:600}}>{e.name||"—"}</td><td style={{fontSize:11}}>{e.email||"—"}</td><td style={{fontSize:11}}>{e.phone||"—"}</td><td style={{fontSize:11,color:T.text2}}>{e.role||"employee"}</td></tr>)}
              </tbody></table></div>
            </>}

            <div className="sec-t">Plan & Status</div>
            <div className="fr">
              <div className="fg"><label className="fl">Plan</label>
                <select className="fs" value={selectedOrg.plan||"free"} onChange={e=>setSelectedOrg({...selectedOrg,plan:e.target.value})}>
                  <option value="free">Free</option><option value="growth">Growth</option><option value="pro">Pro</option><option value="proplus">Pro+</option>
                </select>
              </div>
              <div className="fg"><label className="fl">Status</label>
                <select className="fs" value={selectedOrg.planStatus||"active"} onChange={e=>setSelectedOrg({...selectedOrg,planStatus:e.target.value})}>
                  <option value="active">Aktif</option><option value="trial">Trial</option><option value="paused">Dijeda</option><option value="cancelled">Dibatalkan</option><option value="expired">Expired</option>
                </select>
              </div>
            </div>
            <div className="fg"><label className="fl">Trial Berakhir</label>
              <input className="fi" type="date" value={selectedOrg.trialEndsAt ? String(selectedOrg.trialEndsAt).slice(0,10) : ""} onChange={e=>setSelectedOrg({...selectedOrg,trialEndsAt:e.target.value})}/>
            </div>
            <div style={{padding:12,background:T.bg2,borderRadius:8,marginTop:8}}>
              <div style={{fontSize:11,color:T.text3,marginBottom:4}}>Estimasi Revenue (kalau aktif berbayar)</div>
              <div style={{fontSize:18,fontWeight:800,color:T.green}}>{fmtRp((PLAN_PRICES[selectedOrg.plan||"free"]||0) * empCount(o.id))}<span style={{fontSize:11,color:T.text3,fontWeight:400}}> /bulan</span></div>
            </div>
          </div>
          <div className="mdl-f">
            <button className="btn btn-r" onClick={()=>{setDeleteConfirm(o);setSelectedOrg(null);}}><I n="trash" s={12}/> Hapus</button>
            <div style={{flex:1}}/>
            <button className="btn btn-o" onClick={()=>setSelectedOrg(null)}>Tutup</button>
            <button className="btn btn-p" onClick={()=>updateOrg(o.id,{plan:selectedOrg.plan||"free",planStatus:selectedOrg.planStatus||"active",trialEndsAt:selectedOrg.trialEndsAt ? new Date(String(selectedOrg.trialEndsAt).slice(0,10)+"T23:59:59").toISOString() : null})}>Simpan Plan</button>
          </div>
        </div></div>
        );
      })()}

      {/* WHATSAPP FOLLOW-UP */}
      {waDraft && (
        <div className="mdl" onClick={()=>setWaDraft(null)}><div className="mdl-c" style={{maxWidth:460}} onClick={e=>e.stopPropagation()}>
          <div className="mdl-h"><div><h3>Follow up via WhatsApp</h3><div style={{fontSize:11,color:T.text3}}>{waDraft.contact.name || waDraft.org.name} • {fmtWa(waDraft.contact.phone)}</div></div><button className="mdl-x" onClick={()=>setWaDraft(null)}><I n="x" s={14}/></button></div>
          <div className="mdl-b">
            <label className="fl">Pesan (bisa diedit)</label>
            <textarea className="fi" value={waDraft.text} onChange={e=>setWaDraft({...waDraft,text:e.target.value})}/>
            <div style={{fontSize:10.5,color:T.text3,marginTop:6}}>Membuka WhatsApp (web/app) dengan pesan ini. Pesan baru terkirim setelah Anda klik kirim di WhatsApp.</div>
          </div>
          <div className="mdl-f">
            <button className="btn btn-o" onClick={()=>copy(waDraft.text,"Pesan disalin")}><I n="copy" s={12}/> Salin pesan</button>
            <a className="btn btn-wa" href={`https://wa.me/${waDraft.contact.phone}?text=${encodeURIComponent(waDraft.text)}`} target="_blank" rel="noreferrer" onClick={()=>setWaDraft(null)}><I n="wa" s={12}/> Buka WhatsApp</a>
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
            <p style={{fontSize:12,color:T.text3,marginTop:4}}>{empCount(deleteConfirm.id)} karyawan • {contactOf(deleteConfirm).email}</p>
            <p style={{fontSize:12,color:T.danger,marginTop:12,lineHeight:1.5}}>Semua data organisasi ini (karyawan, kehadiran, foto selfie, cuti, lembur) akan dihapus <strong>permanen</strong>. Tindakan ini tidak bisa dibatalkan.</p>
          </div>
          <div className="mdl-f" style={{justifyContent:"center"}}>
            <button className="btn btn-o" onClick={()=>setDeleteConfirm(null)}>Batal</button>
            <button className="btn btn-r" onClick={()=>deleteOrg(deleteConfirm.id)}><I n="trash" s={12}/> Hapus Permanen</button>
          </div>
        </div></div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
    </>
  );
}