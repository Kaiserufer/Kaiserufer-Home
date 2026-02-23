import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const T = {
  bg:"#D5D6B0",bgLight:"#E2E3C8",dark:"#4A5240",
  text:"#3D4435",textLight:"#6B7055",cream:"#F0EDE0",creamDark:"#E8E4D4",
  gold:"#B8A88A",goldLight:"#D4C9AD",red:"#C44040",
  green:"#6B8E5A",greenLight:"#8FAE7E",white:"#FAFAF2",
  glassDark:"rgba(74,82,64,0.75)",glassLight:"rgba(250,250,242,0.85)",
};

const PASS_TYPES = {
  BASIS:  {name:"Basis",  he:3,  bs:1, preis:299},
  PLUS:   {name:"Plus",   he:5,  bs:3, preis:499},
  DELUXE: {name:"Deluxe", he:10, bs:5, preis:899},
};

const EINZELANGEBOTE = [
  {key:"QUICKIE",      name:"Psycho Quickie",         preis:70 },
  {key:"TDCS",         name:"tDCS",                   preis:55 },
  {key:"NEUROFEEDBACK",name:"Neurofeedback 5er Karte", preis:350},
];

const PASS_OPTIONS = [
  {key:"BASIS",       label:"Basis  – 3 HE · 1 GA",  he:3,  bs:1, preis:299},
  {key:"PLUS",        label:"Plus   – 5 HE · 3 GA",  he:5,  bs:3, preis:499},
  {key:"DELUXE",      label:"Deluxe – 10 HE · 5 GA", he:10, bs:5, preis:899},
  {key:"INDIVIDUELL", label:"Individuell",             he:0,  bs:0, preis:0},
];
const EINZEL_OPTIONS = EINZELANGEBOTE.map(e=>e.name);

const getPassName = (typ) => PASS_TYPES[typ]?.name ?? "Individuell";
const getPassLabel = (pk) => {
  if(!pk) return "–";
  if(pk.typ==="INDIVIDUELL"||!PASS_TYPES[pk.typ]) return pk.custom_name||"Individuell";
  return PASS_TYPES[pk.typ].name;
};

const LOGIN_PASS = import.meta.env.VITE_LOGIN_PASS;
const genId = () => Math.random().toString(36).substr(2,9);
const genQR = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*+-?";
  return "KU-" + Array.from({length:12}, ()=>chars[Math.floor(Math.random()*chars.length)]).join("");
};
const genRechnung = (n) => `KU-2026-${String(n).padStart(4,"0")}`;
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"}); } catch{ return "–"; }};
const fmtDateTime = (d) => { try { return new Date(d).toLocaleString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}); } catch{ return "–"; }};
const todayISO = () => new Date().toISOString().split("T")[0];
const isPassAlt = (pk) => !pk ? false : (pk.he_genutzt??0) >= (pk.he_total??1) && (pk.bs_genutzt??0) >= (pk.bs_total??1);

const css = `
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideIn{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  .glass{backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
  .glass-dark{backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
  .card-hover{transition:all 0.3s cubic-bezier(0.4,0,0.2,1)}
  .card-hover:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(74,82,64,0.12)}
  .btn-anim{transition:all 0.2s cubic-bezier(0.4,0,0.2,1)}
  .btn-anim:hover:not(:disabled){transform:translateY(-1px)}
  .fade-in{animation:fadeIn 0.35s ease-out}
  .slide-in{animation:slideIn 0.3s ease-out both}
  *{box-sizing:border-box}
  input,textarea,select,button{font-family:inherit}
  @media(max-width:640px){
    .resp-pad{padding:14px!important}
    .stat-grid-4{grid-template-columns:repeat(2,1fr)!important}
    .stat-grid-2{grid-template-columns:1fr!important}
    .akte-grid{grid-template-columns:1fr!important}
    .pass-2col{grid-template-columns:1fr!important}
    .pass-3col{grid-template-columns:1fr!important}
    .kunden-units{grid-template-columns:1fr!important}
    .kunden-btns{grid-template-columns:1fr!important}
    .liste-row{flex-direction:column!important;align-items:flex-start!important;gap:10px!important}
    .liste-right{flex-wrap:wrap!important;gap:8px!important;justify-content:flex-start!important}
    .liste-right .badge-w{width:auto!important;text-align:left!important}
    .liste-right .chevron{display:none!important}
    .kauf-row{flex-direction:column!important;align-items:stretch!important;gap:10px!important}
    .kauf-right{justify-content:flex-start!important;flex-wrap:wrap!important}
    .toolbar{flex-direction:column!important}
    .toolbar>input{min-width:0!important;width:100%!important}
    .toolbar-btns{display:flex!important;gap:8px!important;width:100%!important;flex-wrap:wrap!important}
    .toolbar-btns>button{flex:1!important;min-width:0!important}
    .stammk-row{flex-direction:column!important;align-items:flex-start!important;gap:8px!important}
    .stammk-inner{flex-wrap:wrap!important}
    .log-row{flex-direction:column!important;align-items:flex-start!important;gap:4px!important}
    .einzel-row{flex-direction:column!important;align-items:flex-start!important;gap:8px!important}
    .rechnung-row{flex-direction:column!important;align-items:flex-start!important;gap:4px!important}
    .vk-row{flex-direction:column!important;align-items:flex-start!important;gap:6px!important}
    .qr-sidebar{position:static!important}
    .modal-box{width:calc(100vw - 32px)!important;max-width:none!important;margin:16px!important}
    .nav-bar{padding:0 14px!important}
    .header-row{flex-wrap:wrap!important;gap:8px!important}
  }
`;

const Badge = ({children,variant="default",small}) => {
  const s={default:{bg:T.dark+"15",color:T.dark},gold:{bg:T.gold+"30",color:"#7A6B50"},green:{bg:T.green+"22",color:T.green},red:{bg:T.red+"15",color:T.red},cream:{bg:T.cream,color:T.textLight},blue:{bg:"#4A7AB520",color:"#3A6A9A"},purple:{bg:"#7A5AB520",color:"#5A3A9A"}};
  const st=s[variant]||s.default;
  return <span style={{background:st.bg,color:st.color,fontWeight:600,fontSize:small?10:11,padding:small?"2px 8px":"4px 12px",borderRadius:20,whiteSpace:"nowrap",letterSpacing:0.4,textTransform:"uppercase"}}>{children}</span>;
};

const Bar = ({used,total,color=T.dark,h=8}) => (
  <div style={{background:T.bg+"80",borderRadius:20,height:h,width:"100%",overflow:"hidden"}}>
    <div style={{background:color,height:"100%",width:`${total>0?(used/total)*100:0}%`,borderRadius:20,transition:"width 0.6s ease"}}/>
  </div>
);

const GlassCard = ({children,style,onClick,dark,className=""}) => (
  <div onClick={onClick} className={`glass ${onClick?"card-hover":""} ${className}`} style={{
    background:dark?T.glassDark:T.glassLight,color:dark?T.creamDark:T.text,
    borderRadius:20,border:`1px solid ${dark?"rgba(255,255,255,0.08)":T.gold+"30"}`,
    padding:22,cursor:onClick?"pointer":"default",
    boxShadow:dark?"0 8px 32px rgba(0,0,0,0.12)":"0 2px 16px rgba(74,82,64,0.05)",...style
  }}>{children}</div>
);

const Btn = ({children,onClick,primary,small,disabled,outline,danger,style:s,className=""}) => (
  <button disabled={disabled} onClick={onClick} className={`btn-anim ${className}`} style={{
    padding:small?"7px 16px":"11px 24px",borderRadius:14,fontWeight:600,
    fontSize:small?12:14,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.35:1,
    letterSpacing:0.3,textTransform:"uppercase",
    background:danger?T.red+"15":primary?T.dark:outline?"transparent":T.cream,
    color:danger?T.red:primary?T.cream:T.dark,
    border:danger?`1px solid ${T.red}30`:outline?`2px solid ${T.dark}40`:primary?"none":`1px solid ${T.gold}40`,
    boxShadow:primary?`0 4px 16px ${T.dark}20`:"none",...s
  }}>{children}</button>
);

const SectionLabel = ({children}) => (
  <div style={{fontSize:12,fontWeight:700,color:T.gold,marginBottom:14,textTransform:"uppercase",letterSpacing:2,fontFamily:"Georgia,serif"}}>{children}</div>
);

const Heading = ({children,style}) => (
  <h2 style={{fontFamily:"Georgia,serif",fontWeight:700,color:T.dark,margin:0,fontSize:26,letterSpacing:0.5,...style}}>{children}</h2>
);

const QRCode = ({value,size=120}) => (
  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=https://kaiserufer-home.vercel.app?token=${value}`} width={size} height={size} style={{borderRadius:12}} alt="QR Code"/>
);

const Modal = ({children,onClose}) => (
  <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(44,48,38,0.5)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16}}>
    <div onClick={e=>e.stopPropagation()} style={{maxWidth:"100%",maxHeight:"90vh",overflowY:"auto"}}>{children}</div>
  </div>
);

const Donut = ({value,total,size=56,color=T.green}) => {
  const r=20,circ=2*Math.PI*r,pct=total>0?value/total:0;
  return(
    <svg width={size} height={size} viewBox="0 0 48 48">
      <circle cx="24" cy="24" r={r} fill="none" stroke={T.bg} strokeWidth="5"/>
      <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="5" strokeDasharray={`${circ*pct} ${circ*(1-pct)}`} strokeDashoffset={circ*0.25} strokeLinecap="round" style={{transition:"stroke-dasharray 0.8s ease"}}/>
      <text x="24" y="26" textAnchor="middle" fontSize="12" fontWeight="700" fill={T.dark} fontFamily="Georgia,serif">{Math.round(pct*100)}%</text>
    </svg>
  );
};

const logBadge = (typ) => {
  const m={HAUPTEINHEIT:{label:"Haupteinheit",v:"green"},BS:{label:"Gruppenangebot",v:"gold"},KORREKTUR:{label:"Korrektur",v:"red"},NOTIZ:{label:"Notiz",v:"cream"},QUICKIE:{label:"Psycho Quickie",v:"purple"},TDCS:{label:"tDCS",v:"blue"},NEUROFEEDBACK:{label:"Neurofeedback",v:"blue"}};
  return m[typ]||{label:typ||"–",v:"cream"};
};

const Spinner = () => (
  <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:60}}>
    <div style={{width:32,height:32,border:`3px solid ${T.gold}40`,borderTopColor:T.gold,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
  </div>
);

const LoginModal = ({onLogin,onClose}) => {
  const [pw,setPw]=useState("");const [err,setErr]=useState(false);
  const tryLogin=()=>{if(pw===LOGIN_PASS){onLogin();}else{setErr(true);setPw("");}};
  return(
    <Modal onClose={onClose}>
      <div className="modal-box" style={{background:T.white,borderRadius:24,padding:40,width:320,textAlign:"center",boxShadow:"0 24px 64px rgba(44,48,38,0.2)"}}>
        <div style={{fontFamily:"Georgia,serif",fontWeight:700,fontSize:18,letterSpacing:2.5,textTransform:"uppercase",color:T.dark,marginBottom:4}}>Kaiserufer</div>
        <div style={{fontSize:11,color:T.gold,letterSpacing:1.5,textTransform:"uppercase",marginBottom:28}}>MitarbeiterIn Login</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <input type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr(false);}} onKeyDown={e=>e.key==="Enter"&&tryLogin()} placeholder="Passwort" autoFocus style={{width:"100%",padding:"12px 14px",borderRadius:12,border:`1.5px solid ${err?T.red:T.gold}60`,fontSize:14,background:T.cream,color:T.text,outline:"none",textAlign:"center",letterSpacing:3}}/>
          {err&&<div style={{fontSize:12,color:T.red,fontWeight:600}}>Falsches Passwort</div>}
          <button onClick={tryLogin} style={{padding:"12px 24px",borderRadius:14,fontWeight:700,fontSize:14,cursor:"pointer",background:T.dark,color:T.cream,border:"none",letterSpacing:0.5,textTransform:"uppercase"}}>Einloggen</button>
          <button onClick={onClose} style={{padding:"8px",borderRadius:10,fontSize:12,cursor:"pointer",background:"transparent",color:T.textLight,border:"none"}}>Abbrechen</button>
        </div>
      </div>
    </Modal>
  );
};

const StatistikPanel = ({patienten,paesse,einzelArr}) => {
  const kl=patienten.filter(p=>p.kennenlern).length,kv=patienten.filter(p=>p.konvertiert).length;
  const offene=paesse.filter(p=>!p.bezahlt).length+einzelArr.filter(e=>!e.bezahlt).length;
  const aktive=paesse.filter(p=>!isPassAlt(p)).length;
  const tHE=paesse.filter(p=>!isPassAlt(p)).reduce((s,p)=>s+(p.he_total||0),0);
  const gHE=paesse.filter(p=>!isPassAlt(p)).reduce((s,p)=>s+(p.he_genutzt||0),0);
  const tBS=paesse.filter(p=>!isPassAlt(p)).reduce((s,p)=>s+(p.bs_total||0),0);
  const gBS=paesse.filter(p=>!isPassAlt(p)).reduce((s,p)=>s+(p.bs_genutzt||0),0);
  const umsatz=paesse.reduce((s,p)=>s+(p.preis||0),0)+einzelArr.reduce((s,e)=>s+(e.preis||0),0);
  const bezahlt=paesse.filter(p=>p.bezahlt).reduce((s,p)=>s+(p.preis||0),0)+einzelArr.filter(e=>e.bezahlt).reduce((s,e)=>s+(e.preis||0),0);
  return(
    <div className="fade-in" style={{display:"flex",flexDirection:"column",gap:16}}>
      <div className="stat-grid-4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        {[{val:patienten.length,label:"Kunden"},{val:aktive,label:"Aktive Pässe"},{val:offene,label:"Offen",color:offene>0?T.red:T.dark},{val:`${(umsatz/1000).toFixed(1)}k`,label:"Umsatz (€)"}].map((s,i)=>(
          <GlassCard key={i} style={{padding:16,textAlign:"center"}}>
            <div style={{fontSize:30,fontWeight:700,fontFamily:"Georgia,serif",color:s.color||T.dark}}>{s.val}</div>
            <div style={{color:T.textLight,fontSize:11,textTransform:"uppercase",letterSpacing:1.5,marginTop:4}}>{s.label}</div>
          </GlassCard>
        ))}
      </div>
      <div className="stat-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <GlassCard style={{display:"flex",alignItems:"center",gap:18,padding:18,flexWrap:"wrap"}}>
          <Donut value={kv} total={kl} color={T.green}/>
          <div style={{flex:1,minWidth:140}}>
            <div style={{fontSize:14,fontWeight:600,color:T.dark,marginBottom:6}}>Konversionsrate</div>
            <div style={{fontSize:13,color:T.text,lineHeight:1.8}}>
              <strong>{kl}</strong> Kennenlerngespräche<br/>
              <strong style={{color:T.green}}>{kv}</strong> → Flossenpass<br/>
              <strong style={{color:T.red}}>{kl-kv}</strong> nicht konvertiert
            </div>
          </div>
        </GlassCard>
        <GlassCard style={{padding:18}}>
          <div style={{fontSize:14,fontWeight:600,color:T.dark,marginBottom:14}}>Einheiten-Auslastung</div>
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}><span>Haupteinheiten</span><span style={{fontWeight:600}}>{gHE}/{tHE}</span></div>
            <Bar used={gHE} total={tHE} color={T.dark}/>
          </div>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}><span>Gruppenangebote</span><span style={{fontWeight:600}}>{gBS}/{tBS}</span></div>
            <Bar used={gBS} total={tBS} color={T.gold}/>
          </div>
        </GlassCard>
      </div>
      <GlassCard style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:18,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:14,fontWeight:600,color:T.dark}}>Zahlungsübersicht</div>
          <div style={{fontSize:13,color:T.text,marginTop:4}}>
            Gesamt: <strong style={{color:T.dark}}>{umsatz.toLocaleString("de-DE")} €</strong> · Bezahlt: <strong style={{color:T.green}}>{bezahlt.toLocaleString("de-DE")} €</strong> · Offen: <strong style={{color:T.red}}>{(umsatz-bezahlt).toLocaleString("de-DE")} €</strong>
          </div>
        </div>
        <Donut value={bezahlt} total={umsatz} color={T.green} size={52}/>
      </GlassCard>
    </div>
  );
};

const KaufModal = ({selPat,onKauf,onClose}) => {
  const [passTyp,setPassTyp]=useState("BASIS");
  const [passHE,setPassHE]=useState(3);
  const [passBS,setPassBS]=useState(1);
  const [passPreis,setPassPreis]=useState(299);
  const [passRechnung,setPassRechnung]=useState("");
  const [passDatum,setPassDatum]=useState(todayISO());
  const [passName,setPassName]=useState("");
  const [einzelSel,setEinzelSel]=useState(EINZELANGEBOTE[0].name);
  const [einzelCustom,setEinzelCustom]=useState("");
  const [einzelPreis,setEinzelPreis]=useState(EINZELANGEBOTE[0].preis);
  const [einzelRechnung,setEinzelRechnung]=useState("");
  const [einzelDatum,setEinzelDatum]=useState(todayISO());

  const inp={width:"100%",padding:"9px 12px",borderRadius:10,border:`1px solid ${T.gold}40`,fontSize:14,background:T.cream,color:T.dark,outline:"none"};
  const lbl={fontSize:11,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:1.5,marginBottom:5,display:"block"};
  const row2={display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12};
  const row3={display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12};

  const onPassTypChange=(key)=>{
    const opt=PASS_OPTIONS.find(p=>p.key===key);
    setPassTyp(key);
    if(key!=="INDIVIDUELL"){setPassHE(opt.he);setPassBS(opt.bs);setPassPreis(opt.preis);}
    else{setPassHE(0);setPassBS(0);setPassPreis(0);}
  };

  const onEinzelSelChange=(name)=>{
    setEinzelSel(name);
    const found=EINZELANGEBOTE.find(e=>e.name===name);
    if(found) setEinzelPreis(found.preis); else setEinzelPreis(0);
  };

  const submitPass=()=>{
    if(passTyp==="INDIVIDUELL"){
      onKauf("individuell",{name:passName||"Individuell",he:passHE,bs:passBS,datum:passDatum,rechnung:passRechnung.trim()},passPreis,"");
    } else {
      onKauf("pass",passTyp,passPreis,passRechnung.trim(),passDatum);
    }
  };

  const submitEinzel=()=>{
    const name=einzelCustom.trim()||einzelSel;
    const found=EINZELANGEBOTE.find(e=>e.name===einzelSel);
    const key=einzelCustom.trim()?("CUSTOM_"+einzelCustom.trim().toUpperCase().replace(/\s+/g,"_")):found?.key||"CUSTOM";
    onKauf("einzel",{key,name},einzelPreis,einzelRechnung.trim(),einzelDatum);
  };

  return(
    <Modal onClose={onClose}>
      <div className="modal-box" style={{background:T.white,borderRadius:24,padding:28,width:500,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(44,48,38,0.2)"}}>
        <Heading style={{marginBottom:4,fontSize:20}}>Angebot hinzufügen</Heading>
        <p style={{color:T.text,fontSize:14,marginBottom:20}}>für <strong>{selPat?.vorname} {selPat?.nachname}</strong>{selPat?.stammkunde?" · Stammkunde":""}{selPat?.stammkunde&&selPat?.stammpreis?` · Stammpreis: ${selPat.stammpreis} €`:""}</p>

        <div style={{background:T.cream+"60",borderRadius:16,padding:18,border:`1px solid ${T.gold}30`,marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:2,marginBottom:14}}>Flossenpass</div>
          <div style={{marginBottom:12}}>
            <label style={lbl}>Typ auswählen</label>
            <select value={passTyp} onChange={e=>onPassTypChange(e.target.value)} style={inp}>
              {PASS_OPTIONS.map(o=><option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
          {passTyp==="INDIVIDUELL"&&(
            <div style={{marginBottom:12}}>
              <label style={lbl}>Bezeichnung</label>
              <input value={passName} onChange={e=>setPassName(e.target.value)} placeholder="z.B. Flossenpass Special" style={inp}/>
            </div>
          )}
          <div style={row3}>
            <div><label style={lbl}>HE gesamt</label><input type="number" min={0} value={passHE} onChange={e=>setPassHE(Number(e.target.value))} style={inp}/></div>
            <div><label style={lbl}>GA gesamt</label><input type="number" min={0} value={passBS} onChange={e=>setPassBS(Number(e.target.value))} style={inp}/></div>
            <div><label style={lbl}>Preis (€)</label><input type="number" min={0} value={passPreis} onChange={e=>setPassPreis(Number(e.target.value))} style={inp}/></div>
          </div>
          <div style={row2}>
            <div><label style={lbl}>Rechnungs-Nr. (optional)</label><input value={passRechnung} onChange={e=>setPassRechnung(e.target.value)} placeholder="leer = automatisch" style={inp}/></div>
            <div><label style={lbl}>Datum</label><input type="date" value={passDatum} onChange={e=>setPassDatum(e.target.value)} style={inp}/></div>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end"}}><Btn primary onClick={submitPass}>Flossenpass hinzufügen</Btn></div>
        </div>

        <div style={{background:T.cream+"60",borderRadius:16,padding:18,border:`1px solid ${T.gold}30`}}>
          <div style={{fontSize:12,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:2,marginBottom:14}}>Einzelangebot</div>
          <div style={row2}>
            <div>
              <label style={lbl}>Auswählen</label>
              <select value={einzelSel} onChange={e=>onEinzelSelChange(e.target.value)} style={inp}>
                {EINZEL_OPTIONS.map(n=><option key={n}>{n}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Oder eigener Name</label><input value={einzelCustom} onChange={e=>setEinzelCustom(e.target.value)} placeholder="z.B. Sondersitzung" style={inp}/></div>
          </div>
          <div style={row3}>
            <div><label style={lbl}>Preis (€)</label><input type="number" min={0} value={einzelPreis} onChange={e=>setEinzelPreis(Number(e.target.value))} style={inp}/></div>
            <div><label style={lbl}>Rechnungs-Nr.</label><input value={einzelRechnung} onChange={e=>setEinzelRechnung(e.target.value)} placeholder="optional" style={inp}/></div>
            <div><label style={lbl}>Datum</label><input type="date" value={einzelDatum} onChange={e=>setEinzelDatum(e.target.value)} style={inp}/></div>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end"}}><Btn primary onClick={submitEinzel}>Einzelangebot hinzufügen</Btn></div>
        </div>

        <div style={{marginTop:16,textAlign:"right"}}><Btn onClick={onClose}>Abbrechen</Btn></div>
      </div>
    </Modal>
  );
};

const KIEingabeModal = ({patienten,paesse,einzel,onKauf,onClose,getRechnungsNr}) => {
  const [recording,setRecording]=useState(false);
  const [transcript,setTranscript]=useState("");
  const [loading,setLoading]=useState(false);
  const [eintraege,setEintraege]=useState([]); // Array von erkannten Einträgen
  const [saving,setSaving]=useState(false);
  const [savedCount,setSavedCount]=useState(0);
  const [error,setError]=useState("");
  const mediaRef=useRef(null);
  const chunksRef=useRef([]);

  const matchPat=(name)=>patienten.find(p=>{
    if(!name) return false;
    const full=`${p.vorname||""} ${p.nachname||""}`.toLowerCase();
    const parts=name.toLowerCase().split(" ");
    return parts.some(part=>part.length>2&&full.includes(part));
  })||null;

  const promptText=(patNames)=>`Du bist ein Assistent für ein Kundenverwaltungssystem.
Extrahiere ALLE genannten Einträge und antworte NUR mit einem JSON-Array ohne Markdown-Backticks.
Jedes Element hat folgende Struktur:
{
  "kundenname": "Vorname Nachname oder null",
  "typ": "pass oder einzel",
  "pass_typ": "BASIS, PLUS, DELUXE oder INDIVIDUELL oder null",
  "einzel_name": "Name des Einzelangebots oder null",
  "he_total": Zahl oder null,
  "bs_total": Zahl oder null,
  "preis": Zahl oder null,
  "rechnung": "Rechnungsnummer oder null",
  "datum": "YYYY-MM-DD oder null",
  "custom_name": "Bezeichnung bei individuellem Pass oder null"
}

Bekannte Kunden: ${patNames}
Bekannte Pass-Typen: BASIS (3 HE, 1 GA, 299€), PLUS (5 HE, 3 GA, 499€), DELUXE (10 HE, 5 GA, 899€)
Bekannte Einzelangebote: Psycho Quickie (70€), tDCS (55€), Neurofeedback 5er Karte (350€)
Heutiges Datum: ${todayISO()}
Wichtig: Gib immer ein Array zurück, auch bei nur einem Eintrag.`;

  const processResult=(raw)=>{
    const clean=raw.replace(/```json|```/g,"").trim();
    const arr=JSON.parse(clean);
    return (Array.isArray(arr)?arr:[arr]).map((item,i)=>({
      ...item,
      _id:i,
      _skip:false,
      matched_pat:matchPat(item.kundenname)
    }));
  };

  const startRec=async()=>{
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const mr=new MediaRecorder(stream);
      chunksRef.current=[];
      mr.ondataavailable=e=>chunksRef.current.push(e.data);
      mr.onstop=async()=>{
        stream.getTracks().forEach(t=>t.stop());
        setLoading(true);
        try{
          const blob=new Blob(chunksRef.current,{type:"audio/webm"});
          const base64=await new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.readAsDataURL(blob);});
          const patNames=patienten.map(p=>`${p.vorname} ${p.nachname}`).join(", ");
          const resp=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:2000,messages:[{role:"user",content:[{type:"text",text:promptText(patNames)},{type:"document",source:{type:"base64",media_type:"audio/webm",data:base64}}]}]})});
          const data=await resp.json();
          const text=data.content?.map(c=>c.text||"").join("")||"";
          setEintraege(processResult(text));
          setError("");
        }catch(e){setError("Fehler beim Verarbeiten. Bitte nochmal versuchen.");console.error(e);}
        setLoading(false);
      };
      mr.start();
      mediaRef.current=mr;
      setRecording(true);
      setError("");
      setEintraege([]);
    }catch(e){setError("Mikrofon konnte nicht gestartet werden.");}
  };

  const stopRec=()=>{
    if(mediaRef.current&&mediaRef.current.state!=="inactive"){
      mediaRef.current.stop();
      setRecording(false);
    }
  };

  const handleManualText=async()=>{
    if(!transcript.trim()) return;
    setLoading(true);setError("");setEintraege([]);
    try{
      const patNames=patienten.map(p=>`${p.vorname} ${p.nachname}`).join(", ");
      const resp=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:2000,messages:[{role:"user",content:`${promptText(patNames)}\n\nText: "${transcript}"`}]})});
      const d=await resp.json();
      const txt=d.content?.map(c=>c.text||"").join("")||"";
      setEintraege(processResult(txt));
    }catch(e){setError("Fehler beim Verarbeiten.");console.error(e);}
    setLoading(false);
  };

  const alleBestaetigen=async()=>{
    setSaving(true);setSavedCount(0);
    const aktive=eintraege.filter(e=>!e._skip&&e.matched_pat);
    for(let i=0;i<aktive.length;i++){
      const v=aktive[i];
      const pat=v.matched_pat;
      const datum=v.datum||todayISO();
      const rechnung=v.rechnung||genRechnung(await getRechnungsNr());
      if(v.typ==="pass"){
        const typ=v.pass_typ||"INDIVIDUELL";
        if(typ==="INDIVIDUELL"){
          await onKauf(pat,"individuell",{name:v.custom_name||"Individuell",he:v.he_total||0,bs:v.bs_total||0,datum,rechnung},v.preis||0,"");
        } else {
          await onKauf(pat,"pass",typ,v.preis||PASS_TYPES[typ]?.preis||0,rechnung,datum);
        }
      } else {
        const name=v.einzel_name||"Einzelangebot";
        const found=EINZELANGEBOTE.find(ea=>ea.name.toLowerCase().includes(name.toLowerCase()));
        await onKauf(pat,"einzel",{key:found?.key||"CUSTOM",name},v.preis||found?.preis||0,rechnung,datum);
      }
      setSavedCount(i+1);
    }
    setSaving(false);
    onClose();
  };

  const toggleSkip=(id)=>setEintraege(prev=>prev.map(e=>e._id===id?{...e,_skip:!e._skip}:e));

  const aktiveCount=eintraege.filter(e=>!e._skip&&e.matched_pat).length;
  const inp2={width:"100%",padding:"10px 14px",borderRadius:12,border:`1px solid ${T.gold}40`,fontSize:14,background:T.cream,color:T.text,outline:"none"};
  const lbl={fontSize:11,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:1.5,marginBottom:5,display:"block"};

  return(
    <Modal onClose={onClose}>
      <div className="modal-box" style={{background:T.white,borderRadius:24,padding:28,width:540,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(44,48,38,0.2)"}}>
        <Heading style={{fontSize:20,marginBottom:4}}>🎤 KI-Masseneingabe</Heading>
        <p style={{color:T.text,fontSize:14,marginBottom:20}}>Sprich <strong>mehrere Einträge</strong> auf einmal, z.B.:<br/><em style={{fontSize:13,color:T.textLight}}>"Anna Müller, Plus Pass, 499 Euro, Rechnung KU-0042... Maria Schmidt, Basis Pass, 299 Euro... Thomas Bauer, tDCS, 55 Euro"</em></p>

        <div style={{display:"flex",gap:10,marginBottom:16,alignItems:"center",flexWrap:"wrap"}}>
          {!recording
            ?<button onClick={startRec} style={{padding:"14px 24px",borderRadius:16,background:T.red,color:"#fff",border:"none",fontWeight:700,fontSize:15,cursor:"pointer",boxShadow:`0 4px 16px ${T.red}40`}}>🎤 Aufnahme starten</button>
            :<button onClick={stopRec} style={{padding:"14px 24px",borderRadius:16,background:T.dark,color:T.cream,border:"none",fontWeight:700,fontSize:15,cursor:"pointer"}}>⏹ Aufnahme stoppen</button>
          }
          {recording&&<span style={{fontSize:13,color:T.red,fontWeight:600}}>● Aufnahme läuft... einfach alle Einträge durchsprechen</span>}
        </div>

        <div style={{marginBottom:16}}>
          <label style={lbl}>Oder direkt eintippen (mehrere durch Komma/Zeilenumbruch)</label>
          <div style={{display:"flex",gap:8}}>
            <textarea value={transcript} onChange={e=>setTranscript(e.target.value)} rows={3} placeholder="z.B. Anna Müller Plus Pass 499€, Maria Schmidt Basis Pass 299€..." style={{...inp2,flex:1,resize:"vertical"}}/>
            <Btn primary small onClick={handleManualText} disabled={!transcript.trim()||loading}>KI →</Btn>
          </div>
        </div>

        {loading&&<div style={{textAlign:"center",padding:20}}><Spinner/><p style={{color:T.gold,fontSize:13}}>KI analysiert alle Einträge...</p></div>}
        {saving&&<div style={{textAlign:"center",padding:12,background:T.green+"12",borderRadius:12,color:T.green,fontWeight:600,fontSize:13,marginBottom:12}}>Speichere {savedCount}/{aktiveCount}...</div>}
        {error&&<div style={{padding:"10px 14px",borderRadius:10,background:T.red+"12",color:T.red,fontSize:13,marginBottom:12}}>{error}</div>}

        {eintraege.length>0&&!loading&&(
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:2,marginBottom:12}}>
              {eintraege.length} Einträge erkannt – prüfen & bestätigen
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {eintraege.map((v,i)=>(
                <div key={v._id} style={{borderRadius:14,border:`1px solid ${v._skip?T.gold+"20":v.matched_pat?T.green+"40":T.red+"40"}`,background:v._skip?T.cream+"30":v.matched_pat?T.green+"08":T.red+"08",padding:"12px 16px",opacity:v._skip?0.45:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:14,color:T.dark,marginBottom:4}}>
                        {v.matched_pat
                          ?`${v.matched_pat.vorname} ${v.matched_pat.nachname}`
                          :<span style={{color:T.red}}>⚠ "{v.kundenname}" – nicht gefunden</span>
                        }
                      </div>
                      <div style={{fontSize:12,color:T.text,display:"flex",gap:12,flexWrap:"wrap"}}>
                        <span>{v.typ==="pass"?`Flossenpass ${v.pass_typ||"Individuell"}${v.custom_name?` – ${v.custom_name}`:""}`:v.einzel_name||"Einzelangebot"}</span>
                        {v.typ==="pass"&&<span style={{color:T.textLight}}>{v.he_total||"–"} HE · {v.bs_total||"–"} GA</span>}
                        {v.preis&&<span style={{fontWeight:600,color:T.dark}}>{v.preis} €</span>}
                        {v.rechnung&&<code style={{background:T.bgLight,padding:"1px 6px",borderRadius:6,fontSize:11}}>{v.rechnung}</code>}
                        {v.datum&&<span style={{color:T.textLight}}>{fmtDate(v.datum)}</span>}
                      </div>
                    </div>
                    <button onClick={()=>toggleSkip(v._id)} style={{padding:"4px 12px",borderRadius:8,border:`1px solid ${v._skip?T.green+"60":T.red+"40"}`,background:"transparent",color:v._skip?T.green:T.red,fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0,textTransform:"uppercase"}}>
                      {v._skip?"↩ Zurück":"✕ Überspringen"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:16,flexWrap:"wrap",gap:8}}>
              <span style={{fontSize:13,color:T.textLight}}>{aktiveCount} von {eintraege.length} werden gespeichert</span>
              <div style={{display:"flex",gap:8}}>
                <Btn small onClick={()=>setEintraege([])}>Nochmal</Btn>
                <Btn small primary disabled={aktiveCount===0||saving} onClick={alleBestaetigen}>
                  {saving?`Speichere...`:`✓ Alle ${aktiveCount} speichern`}
                </Btn>
              </div>
            </div>
          </div>
        )}

        <div style={{textAlign:"right"}}><Btn small onClick={onClose}>Abbrechen</Btn></div>
      </div>
    </Modal>
  );
};

const MitarbeiterApp = ({patienten,setPatienten,paesse,setPaesse,log,setLog,rechnungsNr,setRechnungsNr,einzel,setEinzel}) => {
  const [view,setView]=useState("liste");
  const [selPat,setSelPat]=useState(null);
  const [search,setSearch]=useState("");
  const [scanMode,setScanMode]=useState(false);
  const [scanInput,setScanInput]=useState("");
  const [showStats,setShowStats]=useState(false);
  const [kaufModal,setKaufModal]=useState(false);
  const [kiModal,setKiModal]=useState(false);
  const [bsModal,setBsModal]=useState(null);
  const [bsNotiz,setBsNotiz]=useState("");
  const [korrekturModal,setKorrekturModal]=useState(null);
  const [korrekturTyp,setKorrekturTyp]=useState("HE");
  const [korrekturAnzahl,setKorrekturAnzahl]=useState(1);
  const [korrekturGrund,setKorrekturGrund]=useState("");
  const [notizText,setNotizText]=useState("");
  const [saving,setSaving]=useState(false);
  const [shoreSync,setShoreSync]=useState(false);
  const [shoreSyncMsg,setShoreSyncMsg]=useState("");

  const inp={width:"100%",padding:"10px 14px",borderRadius:12,border:`1px solid ${T.gold}40`,fontSize:14,background:T.cream,color:T.text,outline:"none"};

  const filtered=patienten
    .slice()
    .sort((a,b)=>{
      const na=`${a.vorname||""} ${a.nachname||""}`.trim().toLowerCase();
      const nb=`${b.vorname||""} ${b.nachname||""}`.trim().toLowerCase();
      if(!a.vorname&&b.vorname) return 1;
      if(a.vorname&&!b.vorname) return -1;
      return na.localeCompare(nb,"de");
    })
    .filter(p=>{
      const q=search.toLowerCase();
      return `${p.vorname||""} ${p.nachname||""} ${p.email||""}`.toLowerCase().includes(q)
        ||paesse.some(pk=>pk.pat_id===p.id&&(pk.rechnung||"").toLowerCase().includes(q))
        ||einzel.some(e=>e.pat_id===p.id&&(e.rechnung||"").toLowerCase().includes(q));
    });

  const patPaesse=selPat?paesse.filter(pk=>pk.pat_id===selPat.id):[];
  const patEinzel=selPat?einzel.filter(e=>e.pat_id===selPat.id).sort((a,b)=>(b.datum||"").localeCompare(a.datum||"")):[];
  const patLog=selPat?log.filter(l=>l.pat_id===selPat.id).sort((a,b)=>(b.datum||"").localeCompare(a.datum||"")):[];
  const aktPaesse=patPaesse.filter(pk=>!isPassAlt(pk));
  const altPaesse=patPaesse.filter(pk=>isPassAlt(pk));
  const aktiverPass=aktPaesse[0]||null;
  const heUebrig=aktPaesse.reduce((s,p)=>s+((p.he_total||0)-(p.he_genutzt||0)),0);
  const bsUebrig=aktPaesse.reduce((s,p)=>s+((p.bs_total||0)-(p.bs_genutzt||0)),0);

  // Alle Verkäufe dieses Kunden sortiert nach Datum (neueste zuerst)
  const alleVerkaufe=[
    ...patPaesse.map(pk=>({
      id:pk.id, art:"pass", name:`Flossenpass ${getPassLabel(pk)}`,
      rechnung:pk.rechnung, datum:pk.datum, preis:pk.preis||0,
      bezahlt:pk.bezahlt, status:isPassAlt(pk)?"Aufgebraucht":"Aktiv"
    })),
    ...patEinzel.map(e=>({
      id:e.id, art:"einzel", name:e.name,
      rechnung:e.rechnung, datum:e.datum, preis:e.preis||0,
      bezahlt:e.bezahlt, status:"Einzeln"
    }))
  ].sort((a,b)=>(b.datum||"").localeCompare(a.datum||""));

  const downloadCSV=()=>{
    const header=["Vorname","Nachname","E-Mail","Telefon","QR-Code","Stammkunde","Stammpreis (€)","Kunde seit","Aktiver Pass","HE übrig","GA übrig"];
    const rows=filtered.map(p=>{
      const ap=paesse.find(pk=>pk.pat_id===p.id&&!isPassAlt(pk));
      const he=ap?(ap.he_total||0)-(ap.he_genutzt||0):"";
      const bs=ap?(ap.bs_total||0)-(ap.bs_genutzt||0):"";
      return [
        p.vorname||"", p.nachname||"", p.email||"", p.telefon||"",
        p.qr||"", p.stammkunde?"Ja":"Nein", p.stammpreis||"",
        fmtDate(p.erstellt), ap?`Flossenpass ${getPassLabel(ap)}`:"–", he, bs
      ].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(";");
    });
    const csv=[header.map(h=>`"${h}"`).join(";"),...rows].join("\n");
    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="gaesteliste-kaiserufer.csv";a.click();
    URL.revokeObjectURL(url);
  };

  const handleScan=()=>{
    const pat=patienten.find(p=>p.qr===scanInput.trim().toUpperCase());
    if(pat){setSelPat(pat);setView("akte");setScanMode(false);setScanInput("");}
    else alert("QR-Code nicht gefunden: "+scanInput);
  };

  const handleKaufFuerPat=async(pat,typ,info,preis,eigeneRechnung,datum)=>{
    setSaving(true);
    const datumStr=datum||todayISO();
    let rechnungStr;
    if(typ==="individuell"){
      rechnungStr=info.rechnung||genRechnung(await getRechnungsNrInner());
      const np={id:genId(),pat_id:pat.id,typ:"INDIVIDUELL",he_total:info.he||0,he_genutzt:0,bs_total:info.bs||0,bs_genutzt:0,preis:preis||0,rechnung:rechnungStr,bezahlt:false,datum:info.datum||datumStr,aktiv:true,custom_name:info.name||"Individuell"};
      await supabase.from("paesse").insert(np);
      setPaesse(prev=>[...prev,np]);
    } else if(typ==="pass"){
      rechnungStr=eigeneRechnung||genRechnung(await getRechnungsNrInner());
      const pt=PASS_TYPES[info];
      const np={id:genId(),pat_id:pat.id,typ:info,he_total:pt.he,he_genutzt:0,bs_total:pt.bs,bs_genutzt:0,preis:preis||0,rechnung:rechnungStr,bezahlt:false,datum:datumStr,aktiv:true};
      await supabase.from("paesse").insert(np);
      setPaesse(prev=>[...prev,np]);
    } else {
      rechnungStr=eigeneRechnung||genRechnung(await getRechnungsNrInner());
      const ne={id:genId(),pat_id:pat.id,key:info.key,name:info.name,preis:preis||0,rechnung:rechnungStr,bezahlt:false,datum:datumStr};
      const nl={id:genId(),pat_id:pat.id,pass_id:null,typ:info.key,quelle:"INTERN",datum:new Date().toISOString(),notiz:info.name};
      await supabase.from("einzel").insert(ne);
      await supabase.from("log").insert(nl);
      setEinzel(prev=>[...prev,ne]);
      setLog(prev=>[...prev,nl]);
    }
    setSaving(false);
  };

  const getRechnungsNrInner=async()=>{
    const {data}=await supabase.from("einstellungen").select("value").eq("key","rechnungs_nr").single();
    const nr=parseInt(data?.value||"0")+1;
    await supabase.from("einstellungen").update({value:String(nr)}).eq("key","rechnungs_nr");
    setRechnungsNr(nr); return nr;
  };

  const handleKauf=async(typ,info,preis,eigeneRechnung,datum)=>{
    setSaving(true);
    const datumStr=datum||todayISO();
    let rechnungStr;
    if(typ==="individuell"){
      rechnungStr=info.rechnung||genRechnung(await getRechnungsNr());
      const np={id:genId(),pat_id:selPat.id,typ:"INDIVIDUELL",he_total:info.he||0,he_genutzt:0,bs_total:info.bs||0,bs_genutzt:0,preis:preis||0,rechnung:rechnungStr,bezahlt:false,datum:info.datum||datumStr,aktiv:true,custom_name:info.name||"Individuell"};
      await supabase.from("paesse").insert(np);
      setPaesse(prev=>[...prev,np]);
    } else if(typ==="pass"){
      rechnungStr=eigeneRechnung||genRechnung(await getRechnungsNr());
      const pt=PASS_TYPES[info];
      const np={id:genId(),pat_id:selPat.id,typ:info,he_total:pt.he,he_genutzt:0,bs_total:pt.bs,bs_genutzt:0,preis:preis||0,rechnung:rechnungStr,bezahlt:false,datum:datumStr,aktiv:true};
      await supabase.from("paesse").insert(np);
      setPaesse(prev=>[...prev,np]);
    } else {
      rechnungStr=eigeneRechnung||genRechnung(await getRechnungsNr());
      const ne={id:genId(),pat_id:selPat.id,key:info.key,name:info.name,preis:preis||0,rechnung:rechnungStr,bezahlt:false,datum:datumStr};
      const nl={id:genId(),pat_id:selPat.id,pass_id:null,typ:info.key,quelle:"INTERN",datum:new Date().toISOString(),notiz:info.name};
      await supabase.from("einzel").insert(ne);
      await supabase.from("log").insert(nl);
      setEinzel(prev=>[...prev,ne]);
      setLog(prev=>[...prev,nl]);
    }
    setSaving(false); setKaufModal(false);
  };

  const heAbziehen=async(pass,aktionTyp,aktionLabel)=>{
    if(!pass||pass.he_genutzt>=pass.he_total) return;
    const updated={...pass,he_genutzt:pass.he_genutzt+1};
    const nl={id:genId(),pat_id:selPat.id,pass_id:pass.id,typ:aktionTyp,quelle:"SHORE",datum:new Date().toISOString(),notiz:aktionLabel};
    await supabase.from("paesse").update({he_genutzt:updated.he_genutzt}).eq("id",pass.id);
    await supabase.from("log").insert(nl);
    setPaesse(prev=>prev.map(p=>p.id===pass.id?updated:p));
    setLog(prev=>[...prev,nl]);
  };

  const bsAbziehen=async(pass)=>{
    if(!pass||pass.bs_genutzt>=pass.bs_total||!bsNotiz.trim()) return;
    const updated={...pass,bs_genutzt:pass.bs_genutzt+1};
    const nl={id:genId(),pat_id:selPat.id,pass_id:pass.id,typ:"BS",quelle:"INTERN",datum:new Date().toISOString(),notiz:bsNotiz.trim()};
    await supabase.from("paesse").update({bs_genutzt:updated.bs_genutzt}).eq("id",pass.id);
    await supabase.from("log").insert(nl);
    setPaesse(prev=>prev.map(p=>p.id===pass.id?updated:p));
    setLog(prev=>[...prev,nl]);
    setBsNotiz(""); setBsModal(null);
  };

  const korrekturSpeichern=async()=>{
    if(!korrekturModal||korrekturAnzahl<1) return;
    const n=Number(korrekturAnzahl);
    const pass=korrekturModal;
    const updates=korrekturTyp==="HE"?{he_genutzt:Math.max(0,(pass.he_genutzt||0)-n)}:{bs_genutzt:Math.max(0,(pass.bs_genutzt||0)-n)};
    const nl={id:genId(),pat_id:selPat.id,pass_id:pass.id,typ:"KORREKTUR",quelle:"MANUELL",datum:new Date().toISOString(),notiz:`${korrekturTyp} +${n} zurück${korrekturGrund?` – ${korrekturGrund}`:""}`};
    await supabase.from("paesse").update(updates).eq("id",pass.id);
    await supabase.from("log").insert(nl);
    setPaesse(prev=>prev.map(p=>p.id===pass.id?{...p,...updates}:p));
    setLog(prev=>[...prev,nl]);
    setKorrekturModal(null); setKorrekturAnzahl(1); setKorrekturGrund("");
  };

  const notizSpeichern=async()=>{
    if(!notizText.trim()) return;
    const nl={id:genId(),pat_id:selPat.id,pass_id:null,typ:"NOTIZ",quelle:"INTERN",datum:new Date().toISOString(),notiz:notizText.trim()};
    await supabase.from("log").insert(nl);
    setLog(prev=>[...prev,nl]);
    setNotizText("");
  };

  const toggleBezahlt=async(pid)=>{
    const p=paesse.find(x=>x.id===pid); if(!p) return;
    await supabase.from("paesse").update({bezahlt:!p.bezahlt}).eq("id",pid);
    setPaesse(prev=>prev.map(x=>x.id===pid?{...x,bezahlt:!x.bezahlt}:x));
  };

  const toggleEinzelBez=async(eid)=>{
    const e=einzel.find(x=>x.id===eid); if(!e) return;
    await supabase.from("einzel").update({bezahlt:!e.bezahlt}).eq("id",eid);
    setEinzel(prev=>prev.map(x=>x.id===eid?{...x,bezahlt:!x.bezahlt}:x));
  };

  const updatePassField=async(pid,field,val)=>{
    await supabase.from("paesse").update({[field]:val}).eq("id",pid);
    setPaesse(prev=>prev.map(p=>p.id===pid?{...p,[field]:val}:p));
  };

  const updatePassEinheiten=async(pid,field,val)=>{
    const n=Math.max(0,parseInt(val)||0);
    await supabase.from("paesse").update({[field]:n}).eq("id",pid);
    setPaesse(prev=>prev.map(p=>p.id===pid?{...p,[field]:n}:p));
  };

  const updatePatient=async(id,fields)=>{
    await supabase.from("patienten").update(fields).eq("id",id);
    setPatienten(prev=>prev.map(p=>p.id===id?{...p,...fields}:p));
    if(selPat?.id===id) setSelPat(prev=>({...prev,...fields}));
  };

  const getUnits=(patId)=>{
    const ap=paesse.find(pk=>pk.pat_id===patId&&!isPassAlt(pk));
    if(!ap) return null;
    return{he:(ap.he_total||0)-(ap.he_genutzt||0),bs:(ap.bs_total||0)-(ap.bs_genutzt||0),typ:ap.typ};
  };

  const editInp=(w)=>({fontSize:13,fontWeight:600,background:"transparent",border:`1px solid ${T.gold}40`,borderRadius:8,padding:"3px 8px",color:T.dark,outline:"none",width:w});

  if(scanMode) return(
    <div className="fade-in resp-pad" style={{padding:28}}>
      <div className="header-row" style={{display:"flex",alignItems:"center",gap:14,marginBottom:28}}>
        <Btn onClick={()=>setScanMode(false)}>← Zurück</Btn>
        <Heading style={{fontSize:22}}>QR-Code Scanner</Heading>
      </div>
      <GlassCard>
        <div style={{textAlign:"center",padding:"24px 8px"}}>
          <div style={{fontSize:40,marginBottom:16}}>📷</div>
          <p style={{color:T.text,marginBottom:20,lineHeight:1.7,fontSize:15}}>QR-Token eingeben:</p>
          <div style={{display:"flex",gap:8,justifyContent:"center",maxWidth:420,margin:"0 auto",flexWrap:"wrap"}}>
            <input value={scanInput} onChange={e=>setScanInput(e.target.value)} placeholder="z.B. KU-A7F3B2C9" onKeyDown={e=>e.key==="Enter"&&handleScan()} style={{...inp,flex:1,fontFamily:"monospace",minWidth:180}}/>
            <Btn primary onClick={handleScan}>Scannen</Btn>
          </div>
        </div>
      </GlassCard>
    </div>
  );

  return(
    <div className="resp-pad" style={{padding:28}}>
      {kaufModal&&<KaufModal selPat={selPat} onKauf={handleKauf} onClose={()=>setKaufModal(false)}/>}
      {kiModal&&<KIEingabeModal patienten={patienten} paesse={paesse} einzel={einzel} onKauf={handleKaufFuerPat} onClose={()=>setKiModal(false)} getRechnungsNr={getRechnungsNrInner}/>}

      {bsModal&&(
        <Modal onClose={()=>{setBsModal(null);setBsNotiz("");}}>
          <GlassCard className="modal-box" style={{width:400,background:T.white}}>
            <Heading style={{fontSize:20,marginBottom:4}}>Gruppenangebot abhaken</Heading>
            <p style={{color:T.text,fontSize:14,marginBottom:16}}>Noch {(bsModal.bs_total||0)-(bsModal.bs_genutzt||0)} von {bsModal.bs_total||0} übrig</p>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <input value={bsNotiz} onChange={e=>setBsNotiz(e.target.value)} placeholder="z.B. Yoga, Sound Bath..." style={inp} autoFocus/>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <Btn onClick={()=>{setBsModal(null);setBsNotiz("");}}>Abbrechen</Btn>
                <Btn primary disabled={!bsNotiz.trim()} onClick={()=>bsAbziehen(bsModal)}>Abhaken</Btn>
              </div>
            </div>
          </GlassCard>
        </Modal>
      )}

      {korrekturModal&&(
        <Modal onClose={()=>setKorrekturModal(null)}>
          <GlassCard className="modal-box" style={{width:400,background:T.white}}>
            <Heading style={{fontSize:20,marginBottom:16}}>Korrektur</Heading>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <label style={{fontSize:13,fontWeight:600,color:T.text,textTransform:"uppercase",letterSpacing:1}}>Einheitentyp</label>
                <select value={korrekturTyp} onChange={e=>setKorrekturTyp(e.target.value)} style={inp}>
                  <option value="HE">Haupteinheit (HE)</option>
                  <option value="BS">Gruppenangebot (GA)</option>
                </select>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <label style={{fontSize:13,fontWeight:600,color:T.text,textTransform:"uppercase",letterSpacing:1}}>Anzahl zurückbuchen</label>
                <input type="number" min={1} max={10} value={korrekturAnzahl} onChange={e=>setKorrekturAnzahl(e.target.value)} style={inp}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <label style={{fontSize:13,fontWeight:600,color:T.text,textTransform:"uppercase",letterSpacing:1}}>Grund (optional)</label>
                <input value={korrekturGrund} onChange={e=>setKorrekturGrund(e.target.value)} placeholder="z.B. Buchungsfehler..." style={inp}/>
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
                <Btn onClick={()=>setKorrekturModal(null)}>Abbrechen</Btn>
                <Btn danger onClick={korrekturSpeichern}>Speichern</Btn>
              </div>
            </div>
          </GlassCard>
        </Modal>
      )}

      {view==="liste"&&(
        <div className="fade-in">
          {/* Toolbar zuerst */}
          <div className="toolbar" style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, E-Mail oder Rechnungsnummer..." style={{...inp,flex:1,minWidth:200}}/>
            <div className="toolbar-btns" style={{display:"flex",gap:8}}>
              <Btn primary onClick={()=>setScanMode(true)}>📷 QR</Btn>
              <Btn outline onClick={()=>setShowStats(!showStats)}>{showStats?"✕":"📊"} Statistik</Btn>
              <Btn outline onClick={downloadCSV}>⬇ CSV</Btn>
              <Btn primary onClick={()=>setKiModal(true)}>🎤 KI-Eingabe</Btn>
              <Btn outline disabled={shoreSync} onClick={async()=>{
                setShoreSync(true);setShoreSyncMsg("");
                try{
                  const r=await fetch("/api/shore-sync",{method:"POST"});
                  const data=await r.json();
                  if(data.error) throw new Error(data.error);
                  const {data:np}=await supabase.from("patienten").select("*");
                  if(np) setPatienten(np);
                  setShoreSyncMsg(`✓ ${data.neu||0} neue Kunden · ${data.gesamt||0} gesamt`);
                }catch(e){setShoreSyncMsg("Fehler: "+e.message);}
                setShoreSync(false);
              }}>{shoreSync?"Sync...":"🔄 Shore Sync"}</Btn>
            </div>
          </div>
          {shoreSyncMsg&&<div style={{padding:"10px 16px",borderRadius:12,background:shoreSyncMsg.startsWith("Fehler")?T.red+"12":T.green+"12",color:shoreSyncMsg.startsWith("Fehler")?T.red:T.green,fontSize:13,fontWeight:600,marginBottom:12}}>{shoreSyncMsg}</div>}
          {showStats&&<div style={{marginBottom:22}}><StatistikPanel patienten={patienten} paesse={paesse} einzelArr={einzel}/></div>}

          {/* Überschrift unter Suchleiste, über der Liste */}
          <div style={{marginBottom:16}}>
            <Heading style={{fontSize:28}}>Gästeliste Kaiserufer</Heading>
            <p style={{color:T.textLight,fontSize:13,marginTop:4}}>{filtered.length} Kunden</p>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {filtered.map((p,i)=>{
              const u=getUnits(p.id);
              const ub=paesse.filter(pk=>pk.pat_id===p.id).some(pk=>!pk.bezahlt)||einzel.filter(e=>e.pat_id===p.id).some(e=>!e.bezahlt);
              return(
                <div key={p.id} onClick={()=>{setSelPat(p);setView("akte");}} className="card-hover slide-in" style={{animationDelay:`${i<20?i*0.05:0}s`,padding:"14px 22px",background:T.glassLight,borderRadius:20,border:`1px solid ${T.gold}30`,cursor:"pointer",boxShadow:"0 2px 8px rgba(74,82,64,0.05)"}}>
                  <div className="liste-row" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{minWidth:0}}>
                      <div style={{fontWeight:600,color:T.dark,fontSize:16}}>{p.vorname} {p.nachname}</div>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2,flexWrap:"wrap"}}>
                        <span style={{fontSize:13,color:T.text}}>{p.email}</span>
                        {p.stammkunde&&<Badge variant="green" small>Stammkunde</Badge>}
                      </div>
                    </div>
                    <div className="liste-right" style={{display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
                      <div style={{display:"flex",border:`1px solid ${T.gold}30`,borderRadius:10,overflow:"hidden"}}>
                        {[{label:"HE",val:u?u.he:null},{label:"GA",val:u?u.bs:null}].map((col,ci)=>(
                          <div key={col.label} style={{width:44,padding:"5px 0",textAlign:"center",borderLeft:ci>0?`1px solid ${T.gold}30`:"none",background:T.white+"60"}}>
                            <div style={{fontSize:10,color:T.textLight,textTransform:"uppercase",letterSpacing:0.8,marginBottom:2}}>{col.label}</div>
                            <div style={{fontSize:16,fontWeight:700,fontFamily:"Georgia,serif",color:col.val===null?T.textLight+"60":T.red,lineHeight:1}}>{col.val!==null?col.val:"–"}</div>
                          </div>
                        ))}
                      </div>
                      <div className="badge-w" style={{width:64,textAlign:"center"}}>
                        {u?<Badge variant="green">{getPassName(u.typ)}</Badge>:<span style={{fontSize:12,color:T.textLight+"60"}}>–</span>}
                      </div>
                      <div className="badge-w" style={{width:44,textAlign:"center"}}>
                        {ub?<Badge variant="red">Offen</Badge>:null}
                      </div>
                      <span className="chevron" style={{color:T.gold,fontSize:20,fontWeight:300}}>›</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length===0&&<p style={{textAlign:"center",color:T.textLight,padding:40,fontSize:15}}>Keine Kunden gefunden</p>}
          </div>
        </div>
      )}

      {view==="akte"&&selPat&&(
        <div className="fade-in">
          <div className="header-row" style={{display:"flex",alignItems:"center",gap:14,marginBottom:28}}>
            <Btn onClick={()=>setView("liste")}>← Zurück</Btn>
            <Heading style={{fontSize:22}}>{selPat.vorname} {selPat.nachname}</Heading>
            {saving&&<span style={{fontSize:12,color:T.gold}}>Speichern...</span>}
          </div>
          <div className="akte-grid" style={{display:"grid",gridTemplateColumns:"1fr 220px",gap:20,alignItems:"start"}}>
            <div style={{display:"flex",flexDirection:"column",gap:16}}>

              {/* Stammdaten */}
              <GlassCard>
                <SectionLabel>Stammdaten</SectionLabel>
                <div style={{display:"flex",flexDirection:"column",gap:8,fontSize:14}}>
                  {[["E-Mail",selPat.email||"–"],["Telefon",selPat.telefon||"–"],["Adresse",selPat.adresse||"–"],
                    ["QR-Code",<code style={{background:T.bgLight,padding:"2px 8px",borderRadius:8,fontSize:12,wordBreak:"break-all"}}>{selPat.qr}</code>],
                    ["Kunde seit",fmtDate(selPat.erstellt)]].map(([label,val])=>(
                    <div key={label} style={{display:"flex",gap:12,alignItems:"flex-start",flexWrap:"wrap"}}>
                      <span style={{color:T.textLight,minWidth:90,flexShrink:0,fontSize:13}}>{label}:</span>
                      <span style={{wordBreak:"break-word",color:T.dark,fontSize:14}}>{val}</span>
                    </div>
                  ))}

                  {/* Einheiten + Termin-Buttons */}
                  <div style={{marginTop:8,paddingTop:10,borderTop:`1px solid ${T.gold}18`}}>
                    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:12}}>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",background:T.red+"10",borderRadius:12,padding:"8px 18px",border:`1px solid ${T.red}20`}}>
                        <span style={{fontSize:26,fontWeight:700,color:T.red,fontFamily:"Georgia,serif"}}>{heUebrig}</span>
                        <span style={{fontSize:11,color:T.red,textTransform:"uppercase",letterSpacing:1,marginTop:2}}>HE übrig</span>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",background:T.red+"10",borderRadius:12,padding:"8px 18px",border:`1px solid ${T.red}20`}}>
                        <span style={{fontSize:26,fontWeight:700,color:T.red,fontFamily:"Georgia,serif"}}>{bsUebrig}</span>
                        <span style={{fontSize:11,color:T.red,textTransform:"uppercase",letterSpacing:1,marginTop:2}}>GA übrig</span>
                      </div>
                    </div>
                    {aktiverPass&&(
                      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                        <button disabled={heUebrig===0} onClick={()=>heAbziehen(aktiverPass,"HAUPTEINHEIT","Haupteinheit")} className="btn-anim"
                          style={{flex:1,minWidth:160,padding:"14px 16px",borderRadius:18,border:"none",background:heUebrig===0?T.dark+"20":T.dark,color:heUebrig===0?T.textLight:T.cream,cursor:heUebrig===0?"not-allowed":"pointer",opacity:heUebrig===0?0.4:1,fontWeight:700,fontSize:14,boxShadow:heUebrig===0?"none":`0 4px 16px ${T.dark}25`,lineHeight:1.4}}>
                          ✓ Termin war heute<br/><span style={{fontSize:11,fontWeight:400,opacity:0.75}}>Haupteinheit −1</span>
                        </button>
                        <button disabled={bsUebrig===0} onClick={()=>setBsModal(aktiverPass)} className="btn-anim"
                          style={{flex:1,minWidth:160,padding:"14px 16px",borderRadius:18,border:`2px solid ${T.gold}`,background:"transparent",color:bsUebrig===0?T.textLight:T.dark,cursor:bsUebrig===0?"not-allowed":"pointer",opacity:bsUebrig===0?0.4:1,fontWeight:700,fontSize:14,lineHeight:1.4}}>
                          ✓ Termin war heute<br/><span style={{fontSize:11,fontWeight:400,opacity:0.75}}>Gruppenangebot −1</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Stammkunde */}
                  <div className="stammk-row" style={{display:"flex",gap:12,alignItems:"center",paddingTop:10,marginTop:4,borderTop:`1px solid ${T.gold}18`}}>
                    <span style={{color:T.textLight,minWidth:90,flexShrink:0,fontSize:13}}>Stammkunde:</span>
                    <div className="stammk-inner" style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                      {["Ja","Nein"].map(opt=>{
                        const aktiv=opt==="Ja"?!!selPat.stammkunde:!selPat.stammkunde;
                        return(
                          <button key={opt} onClick={()=>updatePatient(selPat.id,{stammkunde:opt==="Ja"})}
                            style={{padding:"5px 18px",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer",border:`1px solid ${aktiv?(opt==="Ja"?T.green:T.dark)+"60":T.gold+"30"}`,background:aktiv?(opt==="Ja"?T.green+"18":T.dark+"10"):"transparent",color:aktiv?(opt==="Ja"?T.green:T.dark):T.textLight,transition:"all 0.15s"}}>
                            {opt}
                          </button>
                        );
                      })}
                      {selPat.stammkunde&&(
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <span style={{fontSize:13,color:T.text}}>Preis:</span>
                          <input type="number" min={0} value={selPat.stammpreis||""} onChange={e=>updatePatient(selPat.id,{stammpreis:e.target.value})} placeholder="z.B. 420" style={{width:90,padding:"5px 10px",borderRadius:10,border:`1px solid ${T.gold}40`,fontSize:13,background:T.cream,color:T.text,outline:"none"}}/>
                          <span style={{fontSize:13,color:T.text}}>€</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* Angebote & Pässe */}
              <GlassCard>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
                  <SectionLabel>Angebote & Pässe</SectionLabel>
                  <Btn small primary onClick={()=>setKaufModal(true)}>+ Hinzufügen</Btn>
                </div>
                {aktPaesse.length===0&&patEinzel.length===0&&<p style={{color:T.textLight,textAlign:"center",padding:"8px 0",fontSize:14}}>Noch keine Angebote</p>}

                {aktPaesse.map(pk=>{
                  const heL=(pk.he_total||0)-(pk.he_genutzt||0);
                  const bsL=(pk.bs_total||0)-(pk.bs_genutzt||0);
                  const ni={width:46,padding:"3px 6px",borderRadius:8,border:`1px solid ${T.gold}40`,fontSize:14,fontWeight:700,background:"transparent",color:T.dark,outline:"none",textAlign:"center"};
                  return(
                    <div key={pk.id} style={{borderRadius:16,border:`1px solid ${T.gold}25`,background:T.white+"80",overflow:"hidden",marginBottom:12}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 18px",borderBottom:`1px solid ${T.gold}18`,background:T.cream+"60",flexWrap:"wrap",gap:8}}>
                        <strong style={{fontFamily:"Georgia,serif",fontSize:16,color:T.dark}}>Flossenpass {getPassLabel(pk)}</strong>
                        <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",fontSize:12,fontWeight:700,textTransform:"uppercase",color:pk.bezahlt?T.green:T.red,background:pk.bezahlt?T.green+"15":T.red+"10",padding:"5px 12px",borderRadius:10}}>
                          <input type="checkbox" checked={!!pk.bezahlt} onChange={()=>toggleBezahlt(pk.id)} style={{accentColor:T.green,width:14,height:14}}/>
                          {pk.bezahlt?"Bezahlt":"Offen"}
                        </label>
                      </div>
                      <div className="pass-3col" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderBottom:`1px solid ${T.gold}18`}}>
                        {[
                          {label:"Rechnungs-Nr.", content:<input value={pk.rechnung||""} onChange={e=>updatePassField(pk.id,"rechnung",e.target.value)} style={{...editInp(140),width:"100%"}}/>},
                          {label:"Datum", content:<input type="date" value={pk.datum||""} onChange={e=>updatePassField(pk.id,"datum",e.target.value)} style={{...editInp(140),width:"100%"}}/>},
                          {label:"Preis", content:<div style={{display:"flex",alignItems:"center",gap:4}}><input type="number" min={0} value={pk.preis||0} onChange={e=>updatePassField(pk.id,"preis",Number(e.target.value))} style={{...editInp(80),textAlign:"right"}}/><span style={{fontSize:13,color:T.text}}>€</span></div>},
                        ].map((f,fi)=>(
                          <div key={f.label} style={{padding:"10px 14px",borderLeft:fi>0?`1px solid ${T.gold}18`:"none"}}>
                            <div style={{fontSize:10,color:T.textLight,textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>{f.label}</div>
                            {f.content}
                          </div>
                        ))}
                      </div>
                      <div className="pass-2col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:`1px solid ${T.gold}18`}}>
                        {[
                          {label:"Haupteinheiten",genutzt:"he_genutzt",total:"he_total",used:pk.he_genutzt||0,tot:pk.he_total||0,left:heL,color:T.dark},
                          {label:"Gruppenangebote",genutzt:"bs_genutzt",total:"bs_total",used:pk.bs_genutzt||0,tot:pk.bs_total||0,left:bsL,color:T.gold}
                        ].map((e,ei)=>(
                          <div key={e.label} style={{padding:"12px 14px",borderLeft:ei>0?`1px solid ${T.gold}18`:"none"}}>
                            <div style={{fontSize:11,color:T.textLight,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>{e.label}</div>
                            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,flexWrap:"wrap"}}>
                              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                                <span style={{fontSize:10,color:T.textLight}}>Genutzt</span>
                                <input type="number" min={0} max={e.tot} value={e.used} onChange={ev=>updatePassEinheiten(pk.id,e.genutzt,ev.target.value)} style={ni}/>
                              </div>
                              <span style={{fontSize:16,color:T.textLight,marginTop:14}}>/</span>
                              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                                <span style={{fontSize:10,color:T.textLight}}>Gesamt</span>
                                <input type="number" min={0} value={e.tot} onChange={ev=>updatePassEinheiten(pk.id,e.total,ev.target.value)} style={ni}/>
                              </div>
                              <span style={{fontFamily:"Georgia,serif",fontSize:20,fontWeight:700,color:T.red,marginTop:14,marginLeft:4}}>{e.left}<span style={{fontSize:11,fontWeight:400,color:T.textLight}}> übrig</span></span>
                            </div>
                            <Bar used={e.used} total={e.tot} color={e.color} h={6}/>
                          </div>
                        ))}
                      </div>
                      <div style={{padding:"8px 18px"}}>
                        <button onClick={()=>{setKorrekturModal(pk);setKorrekturTyp("HE");setKorrekturAnzahl(1);setKorrekturGrund("");}} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:T.red+"80",padding:"4px 0",letterSpacing:0.3}}>
                          ✎ Korrektur / Einheit zurückbuchen
                        </button>
                      </div>
                    </div>
                  );
                })}

                {patEinzel.length>0&&(
                  <div style={{marginTop:aktPaesse.length>0?12:0}}>
                    <div style={{fontSize:11,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>Einzelangebote</div>
                    {patEinzel.map(e=>(
                      <div key={e.id} className="einzel-row" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",borderRadius:12,border:`1px solid ${T.gold}25`,background:T.white+"80",marginBottom:6}}>
                        <div style={{display:"flex",flexDirection:"column",gap:3}}>
                          <span style={{fontSize:14,fontWeight:600,color:T.dark}}>{e.name}</span>
                          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                            <code style={{background:T.bgLight,padding:"2px 8px",borderRadius:8,fontSize:11,color:T.text}}>{e.rechnung||"–"}</code>
                            <span style={{fontSize:13,color:T.text}}>{fmtDate(e.datum)}</span>
                            <strong style={{fontSize:13,color:T.dark}}>{e.preis||0} €</strong>
                          </div>
                        </div>
                        <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",fontSize:11,fontWeight:700,textTransform:"uppercase",color:e.bezahlt?T.green:T.red,background:e.bezahlt?T.green+"15":T.red+"10",padding:"5px 12px",borderRadius:10,flexShrink:0}}>
                          <input type="checkbox" checked={!!e.bezahlt} onChange={()=>toggleEinzelBez(e.id)} style={{accentColor:T.green,width:14,height:14}}/>
                          {e.bezahlt?"Bezahlt":"Offen"}
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {altPaesse.length>0&&(
                  <div style={{marginTop:16,paddingTop:14,borderTop:`1px solid ${T.gold}18`}}>
                    <div style={{fontSize:11,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>Alte Pässe</div>
                    {altPaesse.map(pk=>(
                      <div key={pk.id} style={{borderRadius:14,border:`1px solid ${T.gold}20`,background:T.cream+"50",marginBottom:8,overflow:"hidden",opacity:0.8}}>
                        <div style={{padding:"10px 16px",borderBottom:`1px solid ${T.gold}15`,background:T.cream+"80",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                          <span style={{fontSize:14,fontWeight:600,color:T.dark,fontFamily:"Georgia,serif"}}>Flossenpass {getPassLabel(pk)}</span>
                          <div style={{display:"flex",gap:8,alignItems:"center"}}>
                            <Badge variant={pk.bezahlt?"cream":"red"} small>{pk.bezahlt?"Bezahlt":"Offen"}</Badge>
                            <Badge variant="default" small>Aufgebraucht</Badge>
                          </div>
                        </div>
                        <div className="pass-3col" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr"}}>
                          {[
                            {label:"Rechnungs-Nr.", val:<code style={{fontSize:12,color:T.text}}>{pk.rechnung||"–"}</code>},
                            {label:"Datum", val:<span style={{fontSize:13,color:T.dark}}>{fmtDate(pk.datum)}</span>},
                            {label:"Preis", val:<strong style={{fontSize:13,fontFamily:"Georgia,serif"}}>{pk.preis||0} €</strong>},
                          ].map((f,fi)=>(
                            <div key={f.label} style={{padding:"8px 14px",borderLeft:fi>0?`1px solid ${T.gold}15`:"none"}}>
                              <div style={{fontSize:10,color:T.textLight,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{f.label}</div>
                              {f.val}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>

              {/* Verkaufshistorie */}
              <GlassCard>
                <SectionLabel>Verkaufshistorie</SectionLabel>
                {alleVerkaufe.length===0&&<p style={{color:T.textLight,textAlign:"center",fontSize:14}}>Noch keine Verkäufe</p>}
                {alleVerkaufe.map(item=>(
                  <div key={item.id} className="vk-row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:T.cream+"80",borderRadius:12,fontSize:14,marginBottom:4,flexWrap:"wrap",gap:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                      <Badge variant={item.art==="pass"?"green":"gold"} small>{item.art==="pass"?"Flossenpass":"Einzelangebot"}</Badge>
                      <span style={{fontWeight:600,color:T.dark}}>{item.name}</span>
                      <code style={{background:T.bgLight,padding:"2px 8px",borderRadius:8,fontSize:11,color:T.text}}>{item.rechnung||"–"}</code>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:12,flexShrink:0,flexWrap:"wrap"}}>
                      <span style={{fontSize:12,color:T.textLight}}>{fmtDate(item.datum)}</span>
                      <strong style={{fontFamily:"Georgia,serif",fontSize:14}}>{item.preis} €</strong>
                      <Badge variant={item.bezahlt?"green":"red"} small>{item.bezahlt?"Bezahlt":"Offen"}</Badge>
                    </div>
                  </div>
                ))}
                {alleVerkaufe.length>0&&(
                  <div style={{marginTop:12,paddingTop:10,borderTop:`1px solid ${T.gold}18`,display:"flex",justifyContent:"flex-end",gap:16,fontSize:13,flexWrap:"wrap"}}>
                    <span style={{color:T.textLight}}>Gesamt: <strong style={{color:T.dark}}>{alleVerkaufe.reduce((s,i)=>s+i.preis,0).toLocaleString("de-DE")} €</strong></span>
                    <span style={{color:T.textLight}}>Bezahlt: <strong style={{color:T.green}}>{alleVerkaufe.filter(i=>i.bezahlt).reduce((s,i)=>s+i.preis,0).toLocaleString("de-DE")} €</strong></span>
                    <span style={{color:T.textLight}}>Offen: <strong style={{color:T.red}}>{alleVerkaufe.filter(i=>!i.bezahlt).reduce((s,i)=>s+i.preis,0).toLocaleString("de-DE")} €</strong></span>
                  </div>
                )}
              </GlassCard>

              {/* Verlauf */}
              <GlassCard>
                <SectionLabel>Einheiten-Verlauf</SectionLabel>
                {patLog.filter(l=>l.typ!=="NOTIZ").length===0&&<p style={{color:T.textLight,textAlign:"center",fontSize:14}}>Noch kein Verlauf</p>}
                {patLog.filter(l=>l.typ!=="NOTIZ").map((l,i)=>{
                  const b=logBadge(l.typ);
                  return(
                    <div key={l.id} className="slide-in log-row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:T.cream+"80",borderRadius:12,fontSize:14,marginBottom:4,animationDelay:`${i*0.03}s`}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                        <Badge variant={b.v} small>{b.label}</Badge>
                        <span style={{color:T.dark}}>{l.notiz}</span>
                      </div>
                      <span style={{fontSize:12,color:T.textLight,flexShrink:0,marginLeft:8}}>{fmtDateTime(l.datum)}</span>
                    </div>
                  );
                })}
              </GlassCard>

              {/* Notizen */}
              <GlassCard>
                <SectionLabel>Notizen</SectionLabel>
                <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
                  <textarea value={notizText} onChange={e=>setNotizText(e.target.value)} placeholder="Notiz eingeben..." rows={3} style={{...inp,resize:"vertical",lineHeight:1.5}}/>
                  <div style={{display:"flex",justifyContent:"flex-end"}}>
                    <Btn small primary disabled={!notizText.trim()} onClick={notizSpeichern}>Notiz speichern</Btn>
                  </div>
                </div>
                {patLog.filter(l=>l.typ==="NOTIZ").length===0&&<p style={{color:T.textLight,textAlign:"center",fontSize:14}}>Noch keine Notizen</p>}
                {patLog.filter(l=>l.typ==="NOTIZ").map(l=>(
                  <div key={l.id} style={{padding:"10px 14px",background:T.gold+"12",borderRadius:12,fontSize:14,marginBottom:4,borderLeft:`3px solid ${T.gold}`}}>
                    <div style={{fontSize:12,color:T.textLight,marginBottom:4}}>{fmtDateTime(l.datum)}</div>
                    <div style={{color:T.dark,lineHeight:1.6,wordBreak:"break-word"}}>{l.notiz}</div>
                  </div>
                ))}
              </GlassCard>
            </div>

            {/* QR Sidebar */}
            <div className="qr-sidebar" style={{position:"sticky",top:78}}>
              <GlassCard style={{textAlign:"center"}}>
                <SectionLabel>QR-Code</SectionLabel>
                <div style={{background:T.cream,borderRadius:16,padding:18,display:"inline-block",marginBottom:12}}>
                  <QRCode value={selPat.qr} size={140}/>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6,textAlign:"left"}}>
                  {[["Token",<code style={{fontFamily:"monospace",fontSize:11,color:T.textLight,wordBreak:"break-all"}}>{selPat.qr}</code>],
                    ["Name",`${selPat.vorname||""} ${selPat.nachname||""}`],
                    ["Seit",fmtDate(selPat.erstellt)],
                    ["Pass",aktiverPass?`Flossenpass ${getPassLabel(aktiverPass)}`:"–"]].map(([label,val])=>(
                    <div key={label} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                      <span style={{fontSize:11,color:T.textLight,minWidth:36,flexShrink:0}}>{label}</span>
                      <span style={{fontSize:13,color:T.dark,fontWeight:500}}>{val}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const KundenApp = ({kunde,paesse,log,einzel}) => {
  const mp=paesse.filter(p=>p.pat_id===kunde.id);
  const ml=log.filter(l=>l.pat_id===kunde.id&&l.typ!=="NOTIZ"&&l.typ!=="KORREKTUR").sort((a,b)=>(b.datum||"").localeCompare(a.datum||""));
  const me=einzel.filter(e=>e.pat_id===kunde.id);
  const ap=mp.find(p=>!isPassAlt(p));
  return(
    <div className="fade-in resp-pad" style={{padding:28,maxWidth:580,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <Heading style={{marginTop:12,fontSize:24}}>Hallo {kunde.vorname}!</Heading>
        <p style={{color:T.textLight,margin:"6px 0 0",fontSize:15}}>Willkommen bei Kaiserufer Home</p>
        <a href="https://kaiserufer.de" target="_blank" rel="noopener noreferrer" style={{display:"inline-block",marginTop:10,fontSize:11,color:T.gold,textDecoration:"none",letterSpacing:1,textTransform:"uppercase",borderBottom:`1px solid ${T.gold}40`,paddingBottom:1,opacity:0.8}}>kaiserufer.de ↗</a>
      </div>
      {ap&&(()=>{
        const heL=(ap.he_total||0)-(ap.he_genutzt||0),bsL=(ap.bs_total||0)-(ap.bs_genutzt||0);
        return(
          <GlassCard style={{marginBottom:16}}>
            <div style={{marginBottom:18}}>
              <strong style={{fontSize:18,fontFamily:"Georgia,serif"}}>Flossenpass {getPassLabel(ap)}</strong>
              <span style={{fontSize:13,color:T.textLight,marginLeft:10}}>seit {fmtDate(ap.datum)}</span>
            </div>
            <div className="kunden-units" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
              <GlassCard dark style={{textAlign:"center",padding:20,borderRadius:16}}>
                <div style={{fontSize:44,fontWeight:700,color:T.cream,fontFamily:"Georgia,serif"}}>{heL}</div>
                <div style={{fontSize:10,color:T.gold,textTransform:"uppercase",letterSpacing:2,marginTop:4}}>von {ap.he_total||0} Haupteinheiten</div>
                <div style={{marginTop:10}}><Bar used={ap.he_genutzt||0} total={ap.he_total||0} color={T.greenLight}/></div>
              </GlassCard>
              <GlassCard dark style={{textAlign:"center",padding:20,borderRadius:16}}>
                <div style={{fontSize:44,fontWeight:700,color:T.cream,fontFamily:"Georgia,serif"}}>{bsL}</div>
                <div style={{fontSize:10,color:T.gold,textTransform:"uppercase",letterSpacing:2,marginTop:4}}>von {ap.bs_total||0} Gruppenangeboten</div>
                <div style={{marginTop:10}}><Bar used={ap.bs_genutzt||0} total={ap.bs_total||0} color={T.gold}/></div>
              </GlassCard>
            </div>
            <div className="kunden-btns" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <a href="https://connect.shore.com/bookings/kaiserufer/services?locale=de" target="_blank" rel="noopener noreferrer" style={{padding:"11px 16px",borderRadius:12,border:`1px solid ${T.dark}30`,background:"transparent",color:heL===0?T.textLight:T.dark,fontWeight:600,fontSize:13,textDecoration:"none",textAlign:"center",pointerEvents:heL===0?"none":"auto",opacity:heL===0?0.35:1}}>Therapie buchen →</a>
              <a href="https://www.eversports.de/widget/w/5tMWoO" target="_blank" rel="noopener noreferrer" style={{padding:"11px 16px",borderRadius:12,border:`1px solid ${T.dark}30`,background:"transparent",color:bsL===0?T.textLight:T.dark,fontWeight:600,fontSize:13,textDecoration:"none",textAlign:"center",pointerEvents:bsL===0?"none":"auto",opacity:bsL===0?0.35:1}}>Gruppenangebot buchen →</a>
            </div>
            {heL===0&&bsL===0&&<div style={{textAlign:"center",marginTop:14,padding:"12px 16px",background:T.red+"10",borderRadius:12,fontSize:14,color:T.red,fontWeight:600}}>Alle Einheiten aufgebraucht – sprich uns gerne an!</div>}
          </GlassCard>
        );
      })()}
      {mp.filter(p=>isPassAlt(p)).map(pk=>(
        <GlassCard key={pk.id} style={{marginBottom:12,opacity:0.5,padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
            <div>
              <strong style={{fontSize:15,fontFamily:"Georgia,serif"}}>Flossenpass {getPassLabel(pk)}</strong>
              <span style={{fontSize:12,color:T.textLight,marginLeft:8}}>{fmtDate(pk.datum)}</span>
            </div>
            <Badge variant="cream">Aufgebraucht</Badge>
          </div>
        </GlassCard>
      ))}
      {mp.length===0&&me.length===0&&<GlassCard style={{textAlign:"center",padding:48}}><p style={{color:T.textLight,lineHeight:1.7,fontSize:15}}>Du hast noch keine Angebote.<br/>Sprich uns gerne an!</p></GlassCard>}
      {ml.length>0&&(
        <GlassCard style={{marginTop:16}}>
          <SectionLabel>Mein Verlauf</SectionLabel>
          {ml.map((l,i)=>{const b=logBadge(l.typ);return(
            <div key={l.id} className="slide-in log-row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${T.gold}12`,fontSize:14,animationDelay:`${i*0.04}s`}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <Badge variant={b.v} small>{b.label}</Badge>
                <span>{l.notiz}</span>
              </div>
              <span style={{color:T.textLight,fontSize:12,flexShrink:0,marginLeft:8}}>{fmtDate(l.datum)}</span>
            </div>
          );})}
        </GlassCard>
      )}
      {(mp.length>0||me.length>0)&&(
        <GlassCard style={{marginTop:16}}>
          <SectionLabel>Meine Rechnungen</SectionLabel>
          {mp.map(pk=>(
            <div key={pk.id} className="rechnung-row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${T.gold}12`,fontSize:14}}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <code style={{background:T.bgLight,padding:"3px 10px",borderRadius:8,fontSize:12}}>{pk.rechnung||"–"}</code>
                <span style={{color:T.textLight}}>Flossenpass {getPassLabel(pk)}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{color:T.textLight,fontSize:12}}>{fmtDate(pk.datum)}</span>
                <strong style={{fontFamily:"Georgia,serif"}}>{pk.preis||0} €</strong>
              </div>
            </div>
          ))}
          {me.map(e=>(
            <div key={e.id} className="rechnung-row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${T.gold}12`,fontSize:14}}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <code style={{background:T.bgLight,padding:"3px 10px",borderRadius:8,fontSize:12}}>{e.rechnung||"–"}</code>
                <span style={{color:T.textLight}}>{e.name}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{color:T.textLight,fontSize:12}}>{fmtDate(e.datum)}</span>
                <strong style={{fontFamily:"Georgia,serif"}}>{e.preis||0} €</strong>
              </div>
            </div>
          ))}
        </GlassCard>
      )}
      <div style={{textAlign:"center",padding:"32px 0 8px"}}>
        <a href="https://kaiserufer.com/datenschutz/" target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:T.textLight,textDecoration:"none",letterSpacing:1,textTransform:"uppercase",borderBottom:`1px solid ${T.gold}20`,paddingBottom:1,opacity:0.6}}>Datenschutz ↗</a>
      </div>
    </div>
  );
};

export default function App() {
  const [mode,setMode]=useState("kunde");
  const [showLogin,setShowLogin]=useState(false);
  const [patienten,setPatienten]=useState([]);
  const [paesse,setPaesse]=useState([]);
  const [log,setLog]=useState([]);
  const [einzel,setEinzel]=useState([]);
  const [rechnungsNr,setRechnungsNr]=useState(0);
  const [loading,setLoading]=useState(true);

  const urlToken=new URLSearchParams(window.location.search).get("token");

  useEffect(()=>{
    const loadData=async()=>{
      setLoading(true);
      try{
        const [p,pk,l,e,cfg]=await Promise.all([
          supabase.from("patienten").select("*"),
          supabase.from("paesse").select("*"),
          supabase.from("log").select("*"),
          supabase.from("einzel").select("*"),
          supabase.from("einstellungen").select("*").eq("key","rechnungs_nr").single(),
        ]);
        if(p.data) setPatienten(p.data);
        if(pk.data) setPaesse(pk.data);
        if(l.data) setLog(l.data);
        if(e.data) setEinzel(e.data);
        if(cfg.data) setRechnungsNr(parseInt(cfg.data.value)||0);
      }catch(err){console.error("Ladefehler:",err);}
      setLoading(false);
    };
    loadData();
  },[]);

  const loginPat=urlToken?patienten.find(p=>p.qr===urlToken.toUpperCase()):null;

  if(loading) return(
    <div style={{fontFamily:"'Inter','Segoe UI',-apple-system,sans-serif",minHeight:"100vh",background:`linear-gradient(180deg,${T.bg} 0%,${T.bgLight} 50%,${T.bg} 100%)`}}>
      <style>{css}</style><Spinner/>
    </div>
  );

  return(
    <div style={{fontFamily:"'Inter','Segoe UI',-apple-system,sans-serif",minHeight:"100vh",background:`linear-gradient(180deg,${T.bg} 0%,${T.bgLight} 50%,${T.bg} 100%)`}}>
      <style>{css}</style>
      {showLogin&&<LoginModal onLogin={()=>{setShowLogin(false);setMode("staff");}} onClose={()=>setShowLogin(false)}/>}
      <div className="glass-dark nav-bar" style={{background:T.glassDark,color:T.cream,padding:"0 28px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid rgba(255,255,255,0.06)",position:"sticky",top:0,zIndex:100,height:58}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontFamily:"Georgia,serif",fontWeight:700,fontSize:17,letterSpacing:2.5,textTransform:"uppercase"}}>Kaiserufer</span>
          <div style={{width:1,height:22,background:T.gold+"40",borderRadius:1}}/>
          <span style={{fontSize:13,color:T.gold,fontWeight:500,letterSpacing:1.5,textTransform:"uppercase"}}>Home</span>
        </div>
        <div>
          {mode==="staff"
            ?<button onClick={()=>setMode("kunde")} style={{padding:"7px 18px",borderRadius:12,border:"1px solid rgba(255,255,255,0.15)",background:"transparent",color:"rgba(255,255,255,0.6)",fontWeight:600,fontSize:11,cursor:"pointer",textTransform:"uppercase",letterSpacing:0.8,fontFamily:"inherit"}}>Abmelden</button>
            :!loginPat&&<button onClick={()=>setShowLogin(true)} style={{padding:"6px 14px",borderRadius:10,border:"1px solid rgba(255,255,255,0.12)",background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.3)",fontWeight:500,fontSize:11,cursor:"pointer",letterSpacing:0.5,fontFamily:"inherit"}}>MitarbeiterIn</button>
          }
        </div>
      </div>
      {mode==="staff"
        ?<MitarbeiterApp patienten={patienten} setPatienten={setPatienten} paesse={paesse} setPaesse={setPaesse} log={log} setLog={setLog} rechnungsNr={rechnungsNr} setRechnungsNr={setRechnungsNr} einzel={einzel} setEinzel={setEinzel}/>
        :loginPat
          ?<KundenApp kunde={loginPat} paesse={paesse} log={log} einzel={einzel}/>
          :<div className="fade-in resp-pad" style={{padding:28,maxWidth:480,margin:"0 auto",textAlign:"center",paddingTop:80}}>
            <div style={{fontSize:64,marginBottom:20}}>🐧</div>
            <Heading style={{marginBottom:12}}>Kaiserufer Home</Heading>
            <p style={{color:T.textLight,fontSize:15,lineHeight:1.7,marginBottom:24}}>Bitte scanne deinen persönlichen QR-Code,<br/>um deine Kundenseite zu öffnen.</p>
            <GlassCard style={{padding:24}}>
              <p style={{color:T.textLight,fontSize:13,margin:0}}>Noch keinen QR-Code? Sprich uns gerne an!</p>
              <a href="https://kaiserufer.de" target="_blank" rel="noopener noreferrer" style={{display:"inline-block",marginTop:12,fontSize:12,color:T.gold,textDecoration:"none",letterSpacing:1,textTransform:"uppercase",borderBottom:`1px solid ${T.gold}40`,paddingBottom:1}}>kaiserufer.de ↗</a>
            </GlassCard>
          </div>}
    </div>
  );
}
