import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { QRCodeSVG } from "qrcode.react";

const T = {
  bg:"#D5D6B0",bgLight:"#E2E3C8",dark:"#4A5240",
  text:"#3D4435",textLight:"#6B7055",cream:"#F0EDE0",creamDark:"#E8E4D4",
  gold:"#B8A88A",goldLight:"#D4C9AD",red:"#C44040",
  green:"#6B8E5A",greenLight:"#8FAE7E",white:"#FAFAF2",
  glassDark:"rgba(74,82,64,0.75)",glassLight:"rgba(250,250,242,0.85)",
};

const PASS_TYPES = {
  BASIS:  {name:"Basis", he:3, bs:1, preis:299},
  PLUS:   {name:"Plus",  he:5, bs:3, preis:499},
  DELUXE: {name:"Deluxe",he:10,bs:5, preis:899},
};

const EINZELANGEBOTE = [
  {key:"QUICKIE",      name:"Psycho Quickie",        preis:70 },
  {key:"TDCS",         name:"tDCS",                  preis:55 },
  {key:"NEUROFEEDBACK",name:"Neurofeedback 5er Karte",preis:350},
];

const HE_ACTIONS = [{key:"HAUPTEINHEIT",label:"Haupteinheit"}];
const LOGIN_PASS = "Pinguinmary1";

const genId = () => Math.random().toString(36).substr(2,9);
const genRechnung = (n) => `KU-2026-${String(n).padStart(4,"0")}`;
const fmtDate = (d) => new Date(d).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});
const fmtDateTime = (d) => new Date(d).toLocaleString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});

const css = `
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideIn{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  .glass{backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
  .glass-dark{backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
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
  <div style={{fontSize:11,fontWeight:700,color:T.gold,marginBottom:14,textTransform:"uppercase",letterSpacing:2.5,fontFamily:"Georgia,serif"}}>{children}</div>
);

const Heading = ({children,style}) => (
  <h2 style={{fontFamily:"Georgia,serif",fontWeight:700,color:T.dark,margin:0,fontSize:26,letterSpacing:0.5,...style}}>{children}</h2>
);

const Avatar = ({name,size=48}) => (
  <div style={{width:size,height:size,borderRadius:14,background:T.dark+"12",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:T.dark,fontSize:size*0.32,fontFamily:"Georgia,serif",flexShrink:0}}>
    {name.split(" ").map(n=>n[0]).join("")}
  </div>
);

const QRCode = ({value,size=120}) => {
  const url = window.location.origin + "?token=" + value;
  return <QRCodeSVG value={url} size={size} bgColor={T.cream} fgColor={T.dark} style={{borderRadius:12}} />;
};

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
      <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${circ*pct} ${circ*(1-pct)}`} strokeDashoffset={circ*0.25}
        strokeLinecap="round" style={{transition:"stroke-dasharray 0.8s ease"}}/>
      <text x="24" y="26" textAnchor="middle" fontSize="12" fontWeight="700" fill={T.dark} fontFamily="Georgia,serif">{Math.round(pct*100)}%</text>
    </svg>
  );
};

const logBadge = (typ) => {
  const m={HAUPTEINHEIT:{label:"Haupteinheit",v:"green"},BS:{label:"Gruppenangebot",v:"gold"},KORREKTUR:{label:"Korrektur",v:"red"},NOTIZ:{label:"Notiz",v:"cream"},QUICKIE:{label:"Psycho Quickie",v:"purple"},TDCS:{label:"tDCS",v:"blue"},NEUROFEEDBACK:{label:"Neurofeedback",v:"blue"}};
  return m[typ]||{label:typ,v:"cream"};
};

const Spinner = () => (
  <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:60}}>
    <div style={{width:32,height:32,border:`3px solid ${T.gold}40`,borderTopColor:T.gold,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
  </div>
);

const LoginModal = ({onLogin,onClose}) => {
  const [pw,setPw]=useState("");
  const [err,setErr]=useState(false);
  const tryLogin = () => { if(pw===LOGIN_PASS){onLogin();}else{setErr(true);setPw("");} };
  return(
    <Modal onClose={onClose}>
      <div className="modal-box" style={{background:T.white,borderRadius:24,padding:40,width:320,textAlign:"center",boxShadow:"0 24px 64px rgba(44,48,38,0.2)"}}>
        <div style={{fontFamily:"Georgia,serif",fontWeight:700,fontSize:18,letterSpacing:2.5,textTransform:"uppercase",color:T.dark,marginBottom:4}}>Kaiserufer</div>
        <div style={{fontSize:11,color:T.gold,letterSpacing:1.5,textTransform:"uppercase",marginBottom:28}}>MitarbeiterIn Login</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <input type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr(false);}} onKeyDown={e=>e.key==="Enter"&&tryLogin()} placeholder="Passwort" autoFocus
            style={{width:"100%",padding:"12px 14px",borderRadius:12,border:`1.5px solid ${err?T.red:T.gold}60`,fontSize:14,background:T.cream,color:T.text,outline:"none",textAlign:"center",letterSpacing:3}}/>
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
  const aktive=paesse.filter(p=>p.aktiv).length;
  const tHE=paesse.filter(p=>p.aktiv).reduce((s,p)=>s+p.he_total,0),gHE=paesse.filter(p=>p.aktiv).reduce((s,p)=>s+p.he_genutzt,0);
  const tBS=paesse.filter(p=>p.aktiv).reduce((s,p)=>s+p.bs_total,0),gBS=paesse.filter(p=>p.aktiv).reduce((s,p)=>s+p.bs_genutzt,0);
  const umsatz=paesse.reduce((s,p)=>s+p.preis,0)+einzelArr.reduce((s,e)=>s+e.preis,0);
  const bezahlt=paesse.filter(p=>p.bezahlt).reduce((s,p)=>s+p.preis,0)+einzelArr.filter(e=>e.bezahlt).reduce((s,e)=>s+e.preis,0);
  return(
    <div className="fade-in" style={{display:"flex",flexDirection:"column",gap:16}}>
      <div className="stat-grid-4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        {[{val:patienten.length,label:"Kunden"},{val:aktive,label:"Aktive Pässe"},{val:offene,label:"Offen",color:offene>0?T.red:T.dark},{val:`${(umsatz/1000).toFixed(1)}k`,label:"Umsatz (€)"}].map((s,i)=>(
          <GlassCard key={i} style={{padding:16,textAlign:"center"}}>
            <div style={{fontSize:30,fontWeight:700,fontFamily:"Georgia,serif",color:s.color||T.dark}}>{s.val}</div>
            <div style={{color:T.textLight,fontSize:10,textTransform:"uppercase",letterSpacing:1.5,marginTop:4}}>{s.label}</div>
          </GlassCard>
        ))}
      </div>
      <div className="stat-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <GlassCard style={{display:"flex",alignItems:"center",gap:18,padding:18,flexWrap:"wrap"}}>
          <Donut value={kv} total={kl} color={T.green}/>
          <div style={{flex:1,minWidth:140}}>
            <div style={{fontSize:14,fontWeight:600,color:T.dark,marginBottom:6}}>Konversionsrate</div>
            <div style={{fontSize:13,color:T.textLight,lineHeight:1.8}}>
              <strong style={{color:T.dark}}>{kl}</strong> Kennenlerngespräche<br/>
              <strong style={{color:T.green}}>{kv}</strong> → Flossenpass<br/>
              <strong style={{color:T.red}}>{kl-kv}</strong> nicht konvertiert
            </div>
          </div>
        </GlassCard>
        <GlassCard style={{padding:18}}>
          <div style={{fontSize:14,fontWeight:600,color:T.dark,marginBottom:14}}>Einheiten-Auslastung</div>
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}><span style={{color:T.textLight}}>Haupteinheiten</span><span style={{fontWeight:700}}>{gHE}/{tHE}</span></div>
            <Bar used={gHE} total={tHE} color={T.dark}/>
          </div>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}><span style={{color:T.textLight}}>Gruppenangebote</span><span style={{fontWeight:700}}>{gBS}/{tBS}</span></div>
            <Bar used={gBS} total={tBS} color={T.gold}/>
          </div>
        </GlassCard>
      </div>
      <GlassCard style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:18,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:14,fontWeight:600,color:T.dark}}>Zahlungsübersicht</div>
          <div style={{fontSize:13,color:T.textLight,marginTop:4}}>
            Gesamt: <strong style={{color:T.dark}}>{umsatz.toLocaleString("de-DE")} €</strong> · Bezahlt: <strong style={{color:T.green}}>{bezahlt.toLocaleString("de-DE")} €</strong> · Offen: <strong style={{color:T.red}}>{(umsatz-bezahlt).toLocaleString("de-DE")} €</strong>
          </div>
        </div>
        <Donut value={bezahlt} total={umsatz} color={T.green} size={52}/>
      </GlassCard>
    </div>
  );
};

const PassAktionen = ({pass,onHE,onBS,onKorrektur}) => {
  const heL=pass.he_total-pass.he_genutzt,bsL=pass.bs_total-pass.bs_genutzt;
  const row=(dis,red)=>({display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 14px",borderRadius:12,border:`1px solid ${red?T.red+"20":T.gold+"25"}`,background:red?T.red+"08":T.white+"80",cursor:dis?"not-allowed":"pointer",opacity:dis?0.35:1,width:"100%",textAlign:"left"});
  return(
    <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:14,paddingTop:14,borderTop:`1px solid ${T.gold}18`}}>
      <div style={{fontSize:11,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:2,marginBottom:2}}>Einheit abziehen</div>
      {HE_ACTIONS.map(a=>(
        <button key={a.key} disabled={heL===0} onClick={()=>onHE(pass,a.key,a.label)} className="btn-anim" style={row(heL===0,false)}>
          <span style={{fontSize:13,fontWeight:600,color:T.dark}}>{a.label}</span>
          <span style={{fontSize:11,color:T.textLight}}>HE −1</span>
        </button>
      ))}
      <button disabled={bsL===0} onClick={()=>onBS(pass)} className="btn-anim" style={row(bsL===0,false)}>
        <span style={{fontSize:13,fontWeight:600,color:T.dark}}>Gruppenangebot</span>
        <span style={{fontSize:11,color:T.textLight}}>GA −1</span>
      </button>
      <button onClick={()=>onKorrektur(pass)} className="btn-anim" style={row(false,true)}>
        <span style={{fontSize:13,fontWeight:600,color:T.red}}>Korrektur / Einheit hinzufügen</span>
      </button>
    </div>
  );
};

const KaufModal = ({selPat,rechnungsNr,onKauf,onClose}) => {
  const [passPreise,setPassPreise]=useState(Object.fromEntries(Object.entries(PASS_TYPES).map(([k,v])=>[k,v.preis])));
  const [einzelPreise,setEinzelPreise]=useState(Object.fromEntries(EINZELANGEBOTE.map(e=>[e.key,e.preis])));
  const inp={width:80,padding:"4px 8px",borderRadius:8,border:`1px solid ${T.gold}40`,fontSize:13,fontWeight:700,background:T.cream,color:T.dark,outline:"none",textAlign:"right"};
  return(
    <Modal onClose={onClose}>
      <div className="modal-box" style={{background:T.white,borderRadius:24,padding:32,width:520,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(44,48,38,0.2)"}}>
        <Heading style={{marginBottom:4,fontSize:20}}>Angebot hinzufügen</Heading>
        <p style={{color:T.textLight,fontSize:14,marginBottom:selPat?.stammkunde?8:24}}>für {selPat?.vorname} {selPat?.nachname}{selPat?.stammkunde?" · Stammkunde":""}</p>
        {selPat?.stammkunde&&selPat?.stammpreis&&<p style={{fontSize:13,color:T.gold,marginBottom:24}}>Stammpreis: <strong>{selPat.stammpreis} €</strong></p>}
        <div style={{fontSize:11,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>Flossenpässe</div>
        {Object.entries(PASS_TYPES).map(([k,v])=>(
          <div key={k} className="kauf-row" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderRadius:14,border:`1px solid ${T.gold}30`,marginBottom:8,background:T.cream+"40"}}>
            <div>
              <div style={{fontFamily:"Georgia,serif",fontSize:15,fontWeight:600}}>Flossenpass {v.name}</div>
              <div style={{fontSize:12,color:T.textLight,marginTop:2}}>{v.he} Haupteinheiten · {v.bs} Gruppenangebot{v.bs!==1?"e":""}</div>
            </div>
            <div className="kauf-right" style={{display:"flex",alignItems:"center",gap:8}}>
              <input type="number" min={0} value={passPreise[k]} onChange={e=>setPassPreise(p=>({...p,[k]:Number(e.target.value)}))} style={inp}/>
              <span style={{fontSize:12,color:T.textLight}}>€</span>
              <Btn small primary onClick={()=>onKauf("pass",k,passPreise[k])}>Hinzufügen</Btn>
            </div>
          </div>
        ))}
        <div style={{fontSize:11,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:2,margin:"20px 0 10px"}}>Einzelangebote</div>
        {EINZELANGEBOTE.map(e=>(
          <div key={e.key} className="kauf-row" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderRadius:14,border:`1px solid ${T.gold}30`,marginBottom:8,background:T.cream+"40"}}>
            <div style={{fontFamily:"Georgia,serif",fontSize:15,fontWeight:600}}>{e.name}</div>
            <div className="kauf-right" style={{display:"flex",alignItems:"center",gap:8}}>
              <input type="number" min={0} value={einzelPreise[e.key]} onChange={ev=>setEinzelPreise(p=>({...p,[e.key]:Number(ev.target.value)}))} style={inp}/>
              <span style={{fontSize:12,color:T.textLight}}>€</span>
              <Btn small primary onClick={()=>onKauf("einzel",e,einzelPreise[e.key])}>Hinzufügen</Btn>
            </div>
          </div>
        ))}
        <div style={{marginTop:20,textAlign:"right"}}><Btn onClick={onClose}>Abbrechen</Btn></div>
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

  const filtered=patienten.filter(p=>{
    const q=search.toLowerCase();
    return `${p.vorname} ${p.nachname} ${p.email}`.toLowerCase().includes(q)
      ||paesse.some(pk=>pk.pat_id===p.id&&pk.rechnung.toLowerCase().includes(q))
      ||einzel.some(e=>e.pat_id===p.id&&e.rechnung.toLowerCase().includes(q));
  });

  const patPaesse =selPat?paesse.filter(pk=>pk.pat_id===selPat.id):[];
  const patEinzel =selPat?einzel.filter(e=>e.pat_id===selPat.id).sort((a,b)=>b.datum.localeCompare(a.datum)):[];
  const patLog    =selPat?log.filter(l=>l.pat_id===selPat.id).sort((a,b)=>b.datum.localeCompare(a.datum)):[];
  const aktiverPass=patPaesse.find(p=>p.aktiv);

  const handleScan=()=>{
    const pat=patienten.find(p=>p.qr===scanInput.trim().toUpperCase());
    if(pat){setSelPat(pat);setView("akte");setScanMode(false);setScanInput("");}
    else alert("QR-Code nicht gefunden: "+scanInput);
  };

  const getRechnungsNr = async () => {
    const {data} = await supabase.from("einstellungen").select("value").eq("key","rechnungs_nr").single();
    const nr = parseInt(data?.value||"0") + 1;
    await supabase.from("einstellungen").update({value:String(nr)}).eq("key","rechnungs_nr");
    setRechnungsNr(nr);
    return nr;
  };

  const handleKauf = async (typ, info, preis) => {
    setSaving(true);
    const nr = await getRechnungsNr();
    if(typ==="pass") {
      const pt = PASS_TYPES[info];
      const neuerPass = {id:genId(),pat_id:selPat.id,typ:info,he_total:pt.he,he_genutzt:0,bs_total:pt.bs,bs_genutzt:0,preis,rechnung:genRechnung(nr),bezahlt:false,datum:new Date().toISOString().split("T")[0],aktiv:true};
      await supabase.from("paesse").insert(neuerPass);
      setPaesse(prev=>[...prev,neuerPass]);
    } else {
      const neuerEinzel = {id:genId(),pat_id:selPat.id,key:info.key,name:info.name,preis,rechnung:genRechnung(nr),bezahlt:false,datum:new Date().toISOString().split("T")[0]};
      const neuerLog = {id:genId(),pat_id:selPat.id,pass_id:null,typ:info.key,quelle:"INTERN",datum:new Date().toISOString(),notiz:info.name};
      await supabase.from("einzel").insert(neuerEinzel);
      await supabase.from("log").insert(neuerLog);
      setEinzel(prev=>[...prev,neuerEinzel]);
      setLog(prev=>[...prev,neuerLog]);
    }
    setSaving(false);
    setKaufModal(false);
  };

  const heAbziehen=async(pass,aktionTyp,aktionLabel)=>{
    if(pass.he_genutzt>=pass.he_total) return;
    const updated={...pass,he_genutzt:pass.he_genutzt+1};
    const neuerLog={id:genId(),pat_id:selPat.id,pass_id:pass.id,typ:aktionTyp,quelle:"SHORE",datum:new Date().toISOString(),notiz:aktionLabel};
    await supabase.from("paesse").update({he_genutzt:updated.he_genutzt}).eq("id",pass.id);
    await supabase.from("log").insert(neuerLog);
    setPaesse(prev=>prev.map(p=>p.id===pass.id?updated:p));
    setLog(prev=>[...prev,neuerLog]);
  };

  const bsAbziehen=async(pass)=>{
    if(pass.bs_genutzt>=pass.bs_total||!bsNotiz.trim()) return;
    const updated={...pass,bs_genutzt:pass.bs_genutzt+1};
    const neuerLog={id:genId(),pat_id:selPat.id,pass_id:pass.id,typ:"BS",quelle:"INTERN",datum:new Date().toISOString(),notiz:bsNotiz.trim()};
    await supabase.from("paesse").update({bs_genutzt:updated.bs_genutzt}).eq("id",pass.id);
    await supabase.from("log").insert(neuerLog);
    setPaesse(prev=>prev.map(p=>p.id===pass.id?updated:p));
    setLog(prev=>[...prev,neuerLog]);
    setBsNotiz(""); setBsModal(null);
  };

  const korrekturSpeichern=async()=>{
    if(!korrekturModal||korrekturAnzahl<1) return;
    const n=Number(korrekturAnzahl);
    const pass=korrekturModal;
    const updates=korrekturTyp==="HE"?{he_genutzt:Math.max(0,pass.he_genutzt-n)}:{bs_genutzt:Math.max(0,pass.bs_genutzt-n)};
    const neuerLog={id:genId(),pat_id:selPat.id,pass_id:pass.id,typ:"KORREKTUR",quelle:"MANUELL",datum:new Date().toISOString(),notiz:`${korrekturTyp} +${n} zurück${korrekturGrund?` – ${korrekturGrund}`:""}`};
    await supabase.from("paesse").update(updates).eq("id",pass.id);
    await supabase.from("log").insert(neuerLog);
    setPaesse(prev=>prev.map(p=>p.id===pass.id?{...p,...updates}:p));
    setLog(prev=>[...prev,neuerLog]);
    setKorrekturModal(null); setKorrekturAnzahl(1); setKorrekturGrund("");
  };

  const notizSpeichern=async()=>{
    if(!notizText.trim()) return;
    const neuerLog={id:genId(),pat_id:selPat.id,pass_id:null,typ:"NOTIZ",quelle:"INTERN",datum:new Date().toISOString(),notiz:notizText.trim()};
    await supabase.from("log").insert(neuerLog);
    setLog(prev=>[...prev,neuerLog]);
    setNotizText("");
  };

  const toggleBezahlt=async(pid)=>{
    const p=paesse.find(x=>x.id===pid);
    await supabase.from("paesse").update({bezahlt:!p.bezahlt}).eq("id",pid);
    setPaesse(prev=>prev.map(x=>x.id===pid?{...x,bezahlt:!x.bezahlt}:x));
  };

  const toggleEinzelBez=async(eid)=>{
    const e=einzel.find(x=>x.id===eid);
    await supabase.from("einzel").update({bezahlt:!e.bezahlt}).eq("id",eid);
    setEinzel(prev=>prev.map(x=>x.id===eid?{...x,bezahlt:!x.bezahlt}:x));
  };

  const updatePassPreis=async(pid,preis)=>{
    await supabase.from("paesse").update({preis}).eq("id",pid);
    setPaesse(prev=>prev.map(p=>p.id===pid?{...p,preis}:p));
  };

  const updatePatient=async(id,fields)=>{
    await supabase.from("patienten").update(fields).eq("id",id);
    setPatienten(prev=>prev.map(p=>p.id===id?{...p,...fields}:p));
    if(selPat?.id===id) setSelPat(prev=>({...prev,...fields}));
  };

  const getUnits=(patId)=>{ const ap=paesse.find(pk=>pk.pat_id===patId&&pk.aktiv); if(!ap) return null; return{he:ap.he_total-ap.he_genutzt,bs:ap.bs_total-ap.bs_genutzt,typ:ap.typ}; };

  if(scanMode) return(
    <div className="fade-in resp-pad" style={{padding:28}}>
      <div className="header-row" style={{display:"flex",alignItems:"center",gap:14,marginBottom:28}}>
        <Btn onClick={()=>setScanMode(false)}>← Zurück</Btn>
        <Heading style={{fontSize:22}}>QR-Code Scanner</Heading>
      </div>
      <GlassCard>
        <div style={{textAlign:"center",padding:"24px 8px"}}>
          <div style={{fontSize:40,marginBottom:16}}>📷</div>
          <p style={{color:T.textLight,marginBottom:20,lineHeight:1.7,fontSize:15}}>Kamera-Scanner wird in der Produktion aktiviert.<br/>Zum Testen QR-Token eingeben:</p>
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
      {kaufModal&&<KaufModal selPat={selPat} rechnungsNr={rechnungsNr} onKauf={handleKauf} onClose={()=>setKaufModal(false)}/>}

      {bsModal&&(
        <Modal onClose={()=>{setBsModal(null);setBsNotiz("");}}>
          <GlassCard className="modal-box" style={{width:400,background:T.white}}>
            <Heading style={{fontSize:20,marginBottom:4}}>Gruppenangebot abhaken</Heading>
            <p style={{color:T.textLight,fontSize:14,marginBottom:16}}>Noch {bsModal.bs_total-bsModal.bs_genutzt} von {bsModal.bs_total} übrig</p>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <input value={bsNotiz} onChange={e=>setBsNotiz(e.target.value)} placeholder="z.B. Yoga, Sound Bath..." style={inp} autoFocus/>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end",flexWrap:"wrap"}}>
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
                <label style={{fontSize:12,fontWeight:600,color:T.textLight,textTransform:"uppercase",letterSpacing:1}}>Einheitentyp</label>
                <select value={korrekturTyp} onChange={e=>setKorrekturTyp(e.target.value)} style={inp}>
                  <option value="HE">Haupteinheit (HE)</option>
                  <option value="BS">Gruppenangebot (GA)</option>
                </select>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <label style={{fontSize:12,fontWeight:600,color:T.textLight,textTransform:"uppercase",letterSpacing:1}}>Anzahl zurückbuchen</label>
                <input type="number" min={1} max={10} value={korrekturAnzahl} onChange={e=>setKorrekturAnzahl(e.target.value)} style={inp}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <label style={{fontSize:12,fontWeight:600,color:T.textLight,textTransform:"uppercase",letterSpacing:1}}>Grund (optional)</label>
                <input value={korrekturGrund} onChange={e=>setKorrekturGrund(e.target.value)} placeholder="z.B. Buchungsfehler..." style={inp}/>
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end",flexWrap:"wrap",marginTop:4}}>
                <Btn onClick={()=>setKorrekturModal(null)}>Abbrechen</Btn>
                <Btn danger onClick={korrekturSpeichern}>Speichern</Btn>
              </div>
            </div>
          </GlassCard>
        </Modal>
      )}

      {view==="liste"&&(
        <div className="fade-in">
          <div className="toolbar" style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, E-Mail oder Rechnungsnummer..." style={{...inp,flex:1,minWidth:200}}/>
            <div className="toolbar-btns" style={{display:"flex",gap:8}}>
              <Btn primary onClick={()=>setScanMode(true)}>📷 QR</Btn>
              <Btn outline onClick={()=>setShowStats(!showStats)}>{showStats?"✕":"📊"} Statistik</Btn>
              <Btn outline disabled={shoreSync} onClick={async()=>{
                setShoreSync(true); setShoreSyncMsg("");
                try {
                  const r = await fetch("/api/shore-sync", {method:"POST"});
                  const data = await r.json();
                  if(data.error) throw new Error(data.error);
const {data:neuePat} = await supabase.from("patienten").select("*");
                  if(neuePat) setPatienten(neuePat);
                  setShoreSyncMsg(`✓ ${data.neu||0} neue Kunden · ${data.gesamt||0} gesamt`);
                } catch(e) {
                  setShoreSyncMsg("Fehler: "+e.message);
                }
                setShoreSync(false);
              }}>{shoreSync?"Sync...":"🔄 Shore Sync"}</Btn>
            </div>
          </div>
          {shoreSyncMsg&&<div style={{padding:"10px 16px",borderRadius:12,background:shoreSyncMsg.startsWith("Fehler")?T.red+"12":T.green+"12",color:shoreSyncMsg.startsWith("Fehler")?T.red:T.green,fontSize:13,fontWeight:600,marginBottom:12}}>{shoreSyncMsg}</div>}
          {showStats&&<div style={{marginBottom:22}}><StatistikPanel patienten={patienten} paesse={paesse} einzelArr={einzel}/></div>}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {filtered.map((p,i)=>{
              const u=getUnits(p.id);
              const ub=paesse.filter(pk=>pk.pat_id===p.id).some(pk=>!pk.bezahlt)||einzel.filter(e=>e.pat_id===p.id).some(e=>!e.bezahlt);
              return(
                <GlassCard key={p.id} onClick={()=>{setSelPat(p);setView("akte");}} className="card-hover slide-in" style={{animationDelay:`${i*0.05}s`,padding:"14px 22px"}}>
                  <div className="liste-row" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:14,minWidth:0}}>
                      <Avatar name={`${p.vorname} ${p.nachname}`} size={44}/>
                      <div style={{minWidth:0}}>
                        <div style={{fontWeight:600,color:T.dark,fontSize:15}}>{p.vorname} {p.nachname}</div>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2,flexWrap:"wrap"}}>
                          <span style={{fontSize:13,color:T.textLight}}>{p.email}</span>
                          {p.stammkunde&&<Badge variant="green" small>Stammkunde</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="liste-right" style={{display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
                      <div style={{display:"flex",border:`1px solid ${T.gold}30`,borderRadius:10,overflow:"hidden"}}>
                        {[{label:"HE",val:u?u.he:null,red:u&&u.he===0},{label:"GA",val:u?u.bs:null,red:u&&u.bs===0}].map((col,ci)=>(
                          <div key={col.label} style={{width:44,padding:"5px 0",textAlign:"center",borderLeft:ci>0?`1px solid ${T.gold}30`:"none",background:T.white+"60"}}>
                            <div style={{fontSize:10,color:T.textLight,textTransform:"uppercase",letterSpacing:0.8,marginBottom:2}}>{col.label}</div>
                            <div style={{fontSize:16,fontWeight:700,fontFamily:"Georgia,serif",color:col.red?T.red:col.val===null?T.textLight+"60":T.dark,lineHeight:1}}>{col.val!==null?col.val:"–"}</div>
                          </div>
                        ))}
                      </div>
                      <div className="badge-w" style={{width:58,textAlign:"center"}}>
                        {u?<Badge variant="green">{PASS_TYPES[u.typ].name}</Badge>:<span style={{fontSize:12,color:T.textLight+"60"}}>–</span>}
                      </div>
                      <div className="badge-w" style={{width:44,textAlign:"center"}}>
                        {ub?<Badge variant="red">Offen</Badge>:null}
                      </div>
                      <span className="chevron" style={{color:T.gold,fontSize:20,fontWeight:300}}>›</span>
                    </div>
                  </div>
                </GlassCard>
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
            <Avatar name={`${selPat.vorname} ${selPat.nachname}`} size={40}/>
            <Heading style={{fontSize:22}}>{selPat.vorname} {selPat.nachname}</Heading>
            {saving&&<span style={{fontSize:12,color:T.gold}}>Speichern...</span>}
          </div>
          <div className="akte-grid" style={{display:"grid",gridTemplateColumns:"1fr 220px",gap:20,alignItems:"start"}}>
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <GlassCard>
                <SectionLabel>Stammdaten</SectionLabel>
                <div style={{display:"flex",flexDirection:"column",gap:8,fontSize:14}}>
                  {[["E-Mail",selPat.email],["Telefon",selPat.telefon],["Adresse",selPat.adresse],
                    ["QR-Code",<code style={{background:T.bgLight,padding:"2px 8px",borderRadius:8,fontSize:12,wordBreak:"break-all"}}>{selPat.qr}</code>],
                    ["Kunde seit",fmtDate(selPat.erstellt)]].map(([label,val])=>(
                    <div key={label} style={{display:"flex",gap:12,alignItems:"flex-start",flexWrap:"wrap"}}>
                      <span style={{color:T.textLight,minWidth:90,flexShrink:0}}>{label}:</span>
                      <span style={{wordBreak:"break-word"}}>{val}</span>
                    </div>
                  ))}
                  <div className="stammk-row" style={{display:"flex",gap:12,alignItems:"center",paddingTop:10,marginTop:4,borderTop:`1px solid ${T.gold}18`}}>
                    <span style={{color:T.textLight,minWidth:90,flexShrink:0}}>Stammkunde:</span>
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
                          <span style={{fontSize:13,color:T.textLight}}>Preis:</span>
                          <input type="number" min={0} value={selPat.stammpreis} onChange={e=>updatePatient(selPat.id,{stammpreis:e.target.value})} placeholder="z.B. 420" style={{width:90,padding:"5px 10px",borderRadius:10,border:`1px solid ${T.gold}40`,fontSize:13,background:T.cream,color:T.text,outline:"none"}}/>
                          <span style={{fontSize:13,color:T.textLight}}>€</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>

              <GlassCard>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
                  <SectionLabel>Angebote & Pässe</SectionLabel>
                  <Btn small primary onClick={()=>setKaufModal(true)}>+ Hinzufügen</Btn>
                </div>
                {patPaesse.filter(pk=>pk.aktiv).length===0&&patEinzel.length===0&&<p style={{color:T.textLight,textAlign:"center",padding:"8px 0",fontSize:14}}>Noch keine Angebote</p>}
                {patPaesse.filter(pk=>pk.aktiv).map(pk=>{
                  const info=PASS_TYPES[pk.typ];const heL=pk.he_total-pk.he_genutzt,bsL=pk.bs_total-pk.bs_genutzt;
                  return(
                    <div key={pk.id} style={{borderRadius:16,border:`1px solid ${T.gold}25`,background:T.white+"80",overflow:"hidden",marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 18px",borderBottom:`1px solid ${T.gold}18`,background:T.cream+"60",flexWrap:"wrap",gap:8}}>
                        <strong style={{fontFamily:"Georgia,serif",fontSize:15,color:T.dark}}>Flossenpass {info.name}</strong>
                        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                          <span style={{fontSize:12,color:T.textLight}}>{pk.datum}</span>
                          <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",fontSize:11,fontWeight:700,textTransform:"uppercase",color:pk.bezahlt?T.green:T.red,background:pk.bezahlt?T.green+"15":T.red+"10",padding:"5px 12px",borderRadius:10}}>
                            <input type="checkbox" checked={pk.bezahlt} onChange={()=>toggleBezahlt(pk.id)} style={{accentColor:T.green,width:14,height:14}}/>
                            {pk.bezahlt?"Bezahlt":"Offen"}
                          </label>
                        </div>
                      </div>
                      <div className="pass-2col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:`1px solid ${T.gold}18`}}>
                        {[{label:"Haupteinheiten",used:pk.he_genutzt,total:pk.he_total,left:heL,color:T.dark},{label:"Gruppenangebote",used:pk.bs_genutzt,total:pk.bs_total,left:bsL,color:T.gold}].map((e,ei)=>(
                          <div key={e.label} style={{padding:"12px 18px",borderLeft:ei>0?`1px solid ${T.gold}18`:"none"}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:7}}>
                              <span style={{fontSize:11,color:T.textLight,textTransform:"uppercase",letterSpacing:1}}>{e.label}</span>
                              <span style={{fontFamily:"Georgia,serif",fontSize:18,fontWeight:700,color:e.left===0?T.red:T.dark}}>{e.left}<span style={{fontSize:11,fontWeight:400,color:T.textLight}}>/{e.total}</span></span>
                            </div>
                            <Bar used={e.used} total={e.total} color={e.color} h={6}/>
                          </div>
                        ))}
                      </div>
                      <div className="pass-2col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:`1px solid ${T.gold}18`}}>
                        <div style={{padding:"10px 18px"}}>
                          <div style={{fontSize:10,color:T.textLight,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Rechnungs-Nr.</div>
                          <code style={{fontSize:13,fontWeight:700,color:T.dark}}>{pk.rechnung}</code>
                        </div>
                        <div style={{padding:"10px 18px"}}>
                          <div style={{fontSize:10,color:T.textLight,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Preis</div>
                          <div style={{display:"flex",alignItems:"center",gap:4}}>
                            <input type="number" min={0} value={pk.preis} onChange={e=>updatePassPreis(pk.id,Number(e.target.value))} style={{width:78,padding:"3px 8px",borderRadius:8,border:`1px solid ${T.gold}40`,fontSize:14,fontWeight:700,background:"transparent",color:T.dark,outline:"none",textAlign:"right"}}/>
                            <span style={{fontSize:12,color:T.textLight}}>€</span>
                          </div>
                        </div>
                      </div>
                      <div style={{padding:"10px 18px"}}>
                        <PassAktionen pass={pk} onHE={heAbziehen} onBS={(p)=>setBsModal(p)} onKorrektur={(p)=>{setKorrekturModal(p);setKorrekturTyp("HE");setKorrekturAnzahl(1);setKorrekturGrund("");}}/>
                      </div>
                    </div>
                  );
                })}
                {patEinzel.length>0&&(
                  <div style={{marginTop:patPaesse.filter(p=>p.aktiv).length>0?12:0}}>
                    <div style={{fontSize:11,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>Einzelangebote</div>
                    {patEinzel.map(e=>(
                      <div key={e.id} className="einzel-row" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",borderRadius:12,border:`1px solid ${T.gold}25`,background:T.white+"80",marginBottom:6}}>
                        <div style={{display:"flex",flexDirection:"column",gap:3}}>
                          <span style={{fontSize:14,fontWeight:600,color:T.dark}}>{e.name}</span>
                          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                            <code style={{background:T.bgLight,padding:"2px 8px",borderRadius:8,fontSize:11,color:T.textLight}}>{e.rechnung}</code>
                            <span style={{fontSize:12,color:T.textLight}}>{fmtDate(e.datum)}</span>
                            <strong style={{fontSize:13,color:T.dark}}>{e.preis} €</strong>
                          </div>
                        </div>
                        <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",fontSize:11,fontWeight:700,textTransform:"uppercase",color:e.bezahlt?T.green:T.red,background:e.bezahlt?T.green+"15":T.red+"10",padding:"5px 12px",borderRadius:10,flexShrink:0}}>
                          <input type="checkbox" checked={e.bezahlt} onChange={()=>toggleEinzelBez(e.id)} style={{accentColor:T.green,width:14,height:14}}/>
                          {e.bezahlt?"Bezahlt":"Offen"}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
                {patPaesse.filter(pk=>!pk.aktiv).length>0&&(
                  <div style={{marginTop:16,paddingTop:14,borderTop:`1px solid ${T.gold}18`}}>
                    <div style={{fontSize:11,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>Ältere Pässe</div>
                    {patPaesse.filter(pk=>!pk.aktiv).map(pk=>(
                      <div key={pk.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderRadius:12,background:T.cream+"60",marginBottom:6,opacity:0.7,flexWrap:"wrap",gap:8}}>
                        <div>
                          <span style={{fontSize:14,fontWeight:600,color:T.dark,fontFamily:"Georgia,serif"}}>Flossenpass {PASS_TYPES[pk.typ].name}</span>
                          <span style={{fontSize:12,color:T.textLight,marginLeft:8}}>{fmtDate(pk.datum)}</span>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                          <code style={{background:T.bgLight,padding:"2px 8px",borderRadius:8,fontSize:11,color:T.textLight}}>{pk.rechnung}</code>
                          <span style={{fontSize:13,color:T.textLight}}>{pk.preis} €</span>
                          <Badge variant={pk.bezahlt?"cream":"red"} small>{pk.bezahlt?"Bezahlt":"Offen"}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>

              <GlassCard>
                <SectionLabel>Einheiten-Verlauf</SectionLabel>
                {patLog.filter(l=>l.typ!=="NOTIZ").length===0&&<p style={{color:T.textLight,textAlign:"center",fontSize:14}}>Noch kein Verlauf</p>}
                {patLog.filter(l=>l.typ!=="NOTIZ").map((l,i)=>{
                  const b=logBadge(l.typ);
                  return(
                    <div key={l.id} className="slide-in log-row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:T.cream+"80",borderRadius:12,fontSize:14,marginBottom:4,animationDelay:`${i*0.03}s`}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                        <Badge variant={b.v} small>{b.label}</Badge>
                        <span>{l.notiz}</span>
                      </div>
                      <span style={{fontSize:11,color:T.textLight,flexShrink:0,marginLeft:8}}>{fmtDateTime(l.datum)}</span>
                    </div>
                  );
                })}
              </GlassCard>

              <GlassCard>
                <SectionLabel>Notizen</SectionLabel>
                <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
                  <textarea value={notizText} onChange={e=>setNotizText(e.target.value)} placeholder="Notiz eingeben..." rows={3} style={{...inp,resize:"vertical",lineHeight:1.5}}/>
                  <div style={{display:"flex",justifyContent:"flex-end"}}>
                    <Btn small primary disabled={!notizText.trim()} onClick={notizSpeichern}>Notiz speichern</Btn>
                  </div>
                </div>
                {patLog.filter(l=>l.typ==="NOTIZ").length===0&&<p style={{color:T.textLight,textAlign:"center",fontSize:14}}>Noch keine Notizen</p>}
                {patLog.filter(l=>l.typ==="NOTIZ").map((l,i)=>(
                  <div key={l.id} style={{padding:"10px 14px",background:T.gold+"12",borderRadius:12,fontSize:14,marginBottom:4,borderLeft:`3px solid ${T.gold}`}}>
                    <div style={{fontSize:11,color:T.textLight,marginBottom:4}}>{fmtDateTime(l.datum)}</div>
                    <div style={{color:T.text,lineHeight:1.6,wordBreak:"break-word"}}>{l.notiz}</div>
                  </div>
                ))}
              </GlassCard>
            </div>

            <div className="qr-sidebar" style={{position:"sticky",top:78}}>
              <GlassCard style={{textAlign:"center"}}>
                <SectionLabel>QR-Code</SectionLabel>
                <div style={{background:T.cream,borderRadius:16,padding:18,display:"inline-block",marginBottom:12}}>
                  <QRCode value={selPat.qr} size={140}/>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6,textAlign:"left"}}>
                  {[["Token",<code style={{fontFamily:"monospace",fontSize:11,color:T.textLight,wordBreak:"break-all"}}>{selPat.qr}</code>],
                    ["Name",`${selPat.vorname} ${selPat.nachname}`],
                    ["Seit",fmtDate(selPat.erstellt)],
                    ["Pass",aktiverPass?`Flossenpass ${PASS_TYPES[aktiverPass.typ].name}`:"–"]].map(([label,val])=>(
                    <div key={label} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                      <span style={{fontSize:11,color:T.textLight,minWidth:36,flexShrink:0}}>{label}</span>
                      <span style={{fontSize:12,color:T.dark,fontWeight:500}}>{val}</span>
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
  const ml=log.filter(l=>l.pat_id===kunde.id&&l.typ!=="NOTIZ").sort((a,b)=>b.datum.localeCompare(a.datum));
  const me=einzel.filter(e=>e.pat_id===kunde.id);
  const ap=mp.find(p=>p.aktiv);
  return(
    <div className="fade-in resp-pad" style={{padding:28,maxWidth:580,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <Avatar name={`${kunde.vorname} ${kunde.nachname}`} size={64}/>
        <Heading style={{marginTop:12,fontSize:24}}>Hallo {kunde.vorname}!</Heading>
        <p style={{color:T.textLight,margin:"6px 0 0",fontSize:15}}>Willkommen bei Kaiserufer Home</p>
        <a href="https://kaiserufer.de" target="_blank" rel="noopener noreferrer"
          style={{display:"inline-block",marginTop:10,fontSize:11,color:T.gold,textDecoration:"none",letterSpacing:1,textTransform:"uppercase",borderBottom:`1px solid ${T.gold}40`,paddingBottom:1,opacity:0.8}}>
          kaiserufer.de ↗
        </a>
      </div>
      {ap&&(()=>{
        const info=PASS_TYPES[ap.typ],heL=ap.he_total-ap.he_genutzt,bsL=ap.bs_total-ap.bs_genutzt;
        return(
          <GlassCard style={{marginBottom:16}}>
            <div style={{marginBottom:18}}>
              <strong style={{fontSize:18,fontFamily:"Georgia,serif"}}>Flossenpass {info.name}</strong>
              <span style={{fontSize:13,color:T.textLight,marginLeft:10}}>seit {fmtDate(ap.datum)}</span>
            </div>
            <div className="kunden-units" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
              <GlassCard dark style={{textAlign:"center",padding:20,borderRadius:16}}>
                <div style={{fontSize:44,fontWeight:700,color:T.cream,fontFamily:"Georgia,serif"}}>{heL}</div>
                <div style={{fontSize:10,color:T.gold,textTransform:"uppercase",letterSpacing:2,marginTop:4}}>von {ap.he_total} Haupteinheiten</div>
                <div style={{marginTop:10}}><Bar used={ap.he_genutzt} total={ap.he_total} color={T.greenLight}/></div>
              </GlassCard>
              <GlassCard dark style={{textAlign:"center",padding:20,borderRadius:16}}>
                <div style={{fontSize:44,fontWeight:700,color:T.cream,fontFamily:"Georgia,serif"}}>{bsL}</div>
                <div style={{fontSize:10,color:T.gold,textTransform:"uppercase",letterSpacing:2,marginTop:4}}>von {ap.bs_total} Gruppenangeboten</div>
                <div style={{marginTop:10}}><Bar used={ap.bs_genutzt} total={ap.bs_total} color={T.gold}/></div>
              </GlassCard>
            </div>
            <div className="kunden-btns" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <a href="https://connect.shore.com/bookings/kaiserufer/services?locale=de" target="_blank" rel="noopener noreferrer"
                style={{padding:"11px 16px",borderRadius:12,border:`1px solid ${T.dark}30`,background:"transparent",color:heL===0?T.textLight:T.dark,fontWeight:600,fontSize:13,textDecoration:"none",textAlign:"center",pointerEvents:heL===0?"none":"auto",opacity:heL===0?0.35:1}}>
                Therapie buchen →
              </a>
              <a href="https://www.eversports.de/widget/w/5tMWoO" target="_blank" rel="noopener noreferrer"
                style={{padding:"11px 16px",borderRadius:12,border:`1px solid ${T.dark}30`,background:"transparent",color:bsL===0?T.textLight:T.dark,fontWeight:600,fontSize:13,textDecoration:"none",textAlign:"center",pointerEvents:bsL===0?"none":"auto",opacity:bsL===0?0.35:1}}>
                Gruppenangebot buchen →
              </a>
            </div>
            {heL===0&&bsL===0&&<div style={{textAlign:"center",marginTop:14,padding:"12px 16px",background:T.red+"10",borderRadius:12,fontSize:14,color:T.red,fontWeight:600}}>Alle Einheiten aufgebraucht – sprich uns gerne an!</div>}
          </GlassCard>
        );
      })()}
      {mp.filter(p=>!p.aktiv).map(pk=>(
        <GlassCard key={pk.id} style={{marginBottom:12,opacity:0.5,padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
            <div>
              <strong style={{fontSize:15,fontFamily:"Georgia,serif"}}>Flossenpass {PASS_TYPES[pk.typ].name}</strong>
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
                <code style={{background:T.bgLight,padding:"3px 10px",borderRadius:8,fontSize:12}}>{pk.rechnung}</code>
                <span style={{color:T.textLight}}>Flossenpass {PASS_TYPES[pk.typ].name}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{color:T.textLight,fontSize:12}}>{fmtDate(pk.datum)}</span>
                <strong style={{fontFamily:"Georgia,serif"}}>{pk.preis} €</strong>
              </div>
            </div>
          ))}
          {me.map(e=>(
            <div key={e.id} className="rechnung-row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${T.gold}12`,fontSize:14}}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <code style={{background:T.bgLight,padding:"3px 10px",borderRadius:8,fontSize:12}}>{e.rechnung}</code>
                <span style={{color:T.textLight}}>{e.name}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{color:T.textLight,fontSize:12}}>{fmtDate(e.datum)}</span>
                <strong style={{fontFamily:"Georgia,serif"}}>{e.preis} €</strong>
              </div>
            </div>
          ))}
        </GlassCard>
      )}
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

  const urlToken = new URLSearchParams(window.location.search).get("token");

  useEffect(()=>{
    const loadData = async () => {
      setLoading(true);
      try {
        const [p,pk,l,e,cfg] = await Promise.all([
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
      } catch(err) {
        console.error("Ladefehler:",err);
      }
      setLoading(false);
    };
    loadData();
  },[]);

  const loginPat = urlToken ? patienten.find(p=>p.qr===urlToken.toUpperCase()) : null;

  if(loading) return(
    <div style={{fontFamily:"'Inter','Segoe UI',-apple-system,sans-serif",minHeight:"100vh",background:`linear-gradient(180deg,${T.bg} 0%,${T.bgLight} 50%,${T.bg} 100%)`}}>
      <style>{css}</style>
      <Spinner/>
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
            :<button onClick={()=>setShowLogin(true)} style={{padding:"6px 14px",borderRadius:10,border:"1px solid rgba(255,255,255,0.12)",background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.3)",fontWeight:500,fontSize:11,cursor:"pointer",letterSpacing:0.5,fontFamily:"inherit"}}>MitarbeiterIn</button>
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
