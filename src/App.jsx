import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

const T = {
  bg:"#c7d1ac",bgLight:"#d2dabb",bgLighter:"#dce3c9",bgPale:"#e8edda",
  olive:"#747a5b",oliveDark:"#5c6148",oliveLight:"#8a9070",
  gold:"#B8A88A",goldLight:"#D4C9AD",goldDim:"rgba(184,168,138,0.5)",goldFaint:"rgba(184,168,138,0.12)",
  text:"#3C4030",textMid:"#5C6148",textLight:"#747a5b",
  cream:"#FAFAF2",white:"#fff",
  red:"#e46d73",redSoft:"rgba(228,109,115,0.12)",
  green:"#5A9E4A",greenSoft:"rgba(90,158,74,0.12)",
  blue:"#5A94B8",blueSoft:"rgba(90,148,184,0.12)",
  purple:"#9070B0",purpleSoft:"rgba(144,112,176,0.12)",
  card:"rgba(250,250,242,0.75)",cardSolid:"#F5F5EC",cardBorder:"rgba(116,122,91,0.18)",
  inp:"#f0f3e8",
  land0:"#0A0E06",land1:"#141A10",land2:"#1E2618",land3:"#2A3424",
  landCard:"rgba(184,168,138,0.1)",landBorder:"rgba(184,168,138,0.12)",
};

const PASS_TYPES={BASIS:{name:"Basis",he:3,bs:1,preis:299},PLUS:{name:"Plus",he:5,bs:3,preis:499},DELUXE:{name:"Deluxe",he:10,bs:5,preis:899}};
const EINZELANGEBOTE=[{key:"QUICKIE",name:"Psycho Quickie",preis:70},{key:"TDCS",name:"tDCS",preis:55},{key:"NEUROFEEDBACK",name:"Neurofeedback 5er Karte",preis:350}];
const PASS_OPTIONS=[{key:"BASIS",label:"Basis – 3 HE · 1 GA",he:3,bs:1,preis:299},{key:"PLUS",label:"Plus – 5 HE · 3 GA",he:5,bs:3,preis:499},{key:"DELUXE",label:"Deluxe – 10 HE · 5 GA",he:10,bs:5,preis:899},{key:"INDIVIDUELL",label:"Individuell",he:0,bs:0,preis:0}];
const EINZEL_OPTIONS=EINZELANGEBOTE.map(e=>e.name);
const getPassName=(t)=>PASS_TYPES[t]?.name??"Individuell";
const getPassLabel=(pk)=>{if(!pk)return"–";if(pk.typ==="INDIVIDUELL"||!PASS_TYPES[pk.typ])return pk.custom_name||"Individuell";return PASS_TYPES[pk.typ].name;};

const LOGIN_PASS=import.meta.env.VITE_LOGIN_PASS;
const LOGIN_EMAIL=import.meta.env.VITE_LOGIN_EMAIL;
const ANTHROPIC_KEY=import.meta.env.VITE_ANTHROPIC_KEY;
const genId=()=>Math.random().toString(36).substr(2,9);
const genRechnung=(n)=>`KU-2026-${String(n).padStart(4,"0")}`;
const fmtDate=(d)=>{try{return new Date(d).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});}catch{return"–";}};
const fmtDateTime=(d)=>{try{return new Date(d).toLocaleString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});}catch{return"–";}};
const todayISO=()=>new Date().toISOString().split("T")[0];
const isPassAlt=(pk)=>!pk?false:(pk.he_genutzt??0)>=(pk.he_total??1)&&(pk.bs_genutzt??0)>=(pk.bs_total??1);

const css=`
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideIn{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes goldGlow{0%,100%{text-shadow:0 0 20px rgba(184,168,138,0.3),0 0 60px rgba(184,168,138,0.1)}50%{text-shadow:0 0 30px rgba(184,168,138,0.5),0 0 80px rgba(184,168,138,0.2)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeUp2{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
  @keyframes pulseGlow{0%,100%{box-shadow:0 4px 24px rgba(184,168,138,0.15)}50%{box-shadow:0 4px 32px rgba(184,168,138,0.3)}}
  @keyframes splashOut{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-100%)}}
  @keyframes contentIn{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
  .splash-out{animation:splashOut 0.8s cubic-bezier(0.4,0,0.2,1) forwards}
  .content-in{animation:contentIn 0.7s ease-out 0.3s both}
  .landing-title{animation:fadeUp 1s ease-out,goldGlow 4s ease-in-out infinite}
  .landing-sub{animation:fadeUp2 1s ease-out 0.3s both}
  .landing-btn{animation:fadeUp2 1s ease-out 0.6s both}
  .landing-footer{animation:fadeUp2 1s ease-out 0.9s both}
  .card-h{transition:all 0.3s cubic-bezier(0.4,0,0.2,1)}
  .card-h:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(74,82,64,0.1)}
  .btn-a{transition:all 0.2s cubic-bezier(0.4,0,0.2,1)}
  .btn-a:hover:not(:disabled){transform:translateY(-1px)}
  .fade-in{animation:fadeIn 0.35s ease-out}
  .slide-in{animation:slideIn 0.3s ease-out both}
  .kunde-hero{animation:fadeUp 0.8s ease-out}
  .kunde-card{animation:fadeUp2 0.6s ease-out both}
  .kunde-card-1{animation-delay:0.1s}
  .kunde-card-2{animation-delay:0.2s}
  .kunde-card-3{animation-delay:0.3s}
  .kunde-card-4{animation-delay:0.4s}
  .kunde-book-btn{transition:all 0.25s cubic-bezier(0.4,0,0.2,1)}
  .kunde-book-btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(74,82,64,0.12)!important}
  *{box-sizing:border-box}
  input,textarea,select,button{font-family:inherit}
  ::selection{background:rgba(184,168,138,0.3)}
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
    .toolbar{flex-direction:column!important}
    .toolbar>input{min-width:0!important;width:100%!important}
    .toolbar-btns{display:flex!important;gap:8px!important;width:100%!important;flex-wrap:wrap!important}
    .toolbar-btns>button{flex:1!important;min-width:0!important}
    .btn-text{display:none!important}
    .btn-emoji{display:inline!important}
    .stammk-row{flex-direction:column!important;align-items:flex-start!important;gap:8px!important}
    .stammk-inner{flex-wrap:wrap!important}
    .log-row,.einzel-row,.rechnung-row,.vk-row{flex-direction:column!important;align-items:flex-start!important;gap:6px!important}
    .qr-sidebar{position:static!important}
    .modal-box{width:calc(100vw - 32px)!important;max-width:none!important;margin:16px!important}
    .nav-bar{padding:0 14px!important}
    .header-row{flex-wrap:wrap!important;gap:8px!important}
    .k-resp-pad{padding:0 16px 40px!important}
  }
`;

const Badge=({children,variant="default",small})=>{
  const s={default:{bg:T.olive+"15",c:T.olive},gold:{bg:T.gold+"25",c:"#7A6B50"},green:{bg:T.greenSoft,c:T.green},red:{bg:T.redSoft,c:T.red},cream:{bg:T.bgPale,c:T.textLight},blue:{bg:T.blueSoft,c:T.blue},purple:{bg:T.purpleSoft,c:T.purple}};
  const st=s[variant]||s.default;
  return<span style={{background:st.bg,color:st.c,fontWeight:600,fontSize:small?10:12,padding:small?"3px 10px":"5px 14px",borderRadius:20,whiteSpace:"nowrap",letterSpacing:0.4,textTransform:"uppercase"}}>{children}</span>;
};

const Bar=({used,total,color=T.olive,h=6})=>(
  <div style={{background:T.olive+"18",borderRadius:20,height:h,width:"100%",overflow:"hidden"}}>
    <div style={{background:color,height:"100%",width:`${total>0?(used/total)*100:0}%`,borderRadius:20,transition:"width 0.6s ease"}}/>
  </div>
);

const Card=({children,style,onClick,className=""})=>(
  <div onClick={onClick} className={`${onClick?"card-h":""} ${className}`} style={{
    background:T.card,color:T.text,borderRadius:20,border:`1px solid ${T.cardBorder}`,
    padding:24,cursor:onClick?"pointer":"default",backdropFilter:"blur(8px)",
    boxShadow:"0 2px 16px rgba(74,82,64,0.06)",...style
  }}>{children}</div>
);

const Btn=({children,onClick,gold,small,disabled,danger,ghost,style:s,className=""})=>(
  <button disabled={disabled} onClick={onClick} className={`btn-a ${className}`} style={{
    padding:small?"8px 18px":"12px 26px",borderRadius:14,fontWeight:600,
    fontSize:small?13:15,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.35:1,
    letterSpacing:0.5,textTransform:"uppercase",lineHeight:1.5,
    background:danger?T.red:ghost?"transparent":gold?`linear-gradient(135deg,${T.gold},#9A8A6A)`:T.olive,
    color:danger?"#fff":gold?"#2A2A1A":ghost?T.textLight:"#fff",
    border:ghost?`1px solid ${T.cardBorder}`:"none",
    boxShadow:gold?`0 4px 20px rgba(184,168,138,0.25)`:danger?`0 4px 16px ${T.red}30`:"none",...s
  }}>{children}</button>
);

const SectionLabel=({children})=>(<div style={{fontSize:13,fontWeight:700,color:T.gold,marginBottom:16,textTransform:"uppercase",letterSpacing:2.5,fontFamily:"Georgia,serif"}}>{children}</div>);
const Heading=({children,style})=>(<h2 style={{fontFamily:"Georgia,serif",fontWeight:700,color:T.oliveDark,margin:0,fontSize:26,letterSpacing:0.5,...style}}>{children}</h2>);
const QRCode=({value,size=120})=>(<img src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=https://home.kaiserufer.com?token=${value}`} width={size} height={size} style={{borderRadius:12}} alt="QR"/>);

const Modal=({children,onClose})=>(
  <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(44,48,38,0.4)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16}}>
    <div onClick={e=>e.stopPropagation()} style={{maxWidth:"100%",maxHeight:"90vh",overflowY:"auto"}}>{children}</div>
  </div>
);

const Donut=({value,total,size=56,color=T.green})=>{
  const r=20,circ=2*Math.PI*r,pct=total>0?value/total:0;
  return(<svg width={size} height={size} viewBox="0 0 48 48"><circle cx="24" cy="24" r={r} fill="none" stroke={T.olive+"18"} strokeWidth="5"/><circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="5" strokeDasharray={`${circ*pct} ${circ*(1-pct)}`} strokeDashoffset={circ*0.25} strokeLinecap="round" style={{transition:"stroke-dasharray 0.8s ease"}}/><text x="24" y="26" textAnchor="middle" fontSize="12" fontWeight="700" fill={T.text} fontFamily="Georgia,serif">{Math.round(pct*100)}%</text></svg>);
};

const logBadge=(typ)=>{const m={HAUPTEINHEIT:{label:"Haupteinheit",v:"green"},BS:{label:"Gruppenangebot",v:"gold"},KORREKTUR:{label:"Korrektur",v:"red"},NOTIZ:{label:"Notiz",v:"cream"},QUICKIE:{label:"Psycho Quickie",v:"purple"},TDCS:{label:"tDCS",v:"blue"},NEUROFEEDBACK:{label:"Neurofeedback",v:"blue"}};return m[typ]||{label:typ||"–",v:"cream"};};

const Spinner=()=>(<div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:60}}><div style={{width:32,height:32,border:`3px solid ${T.gold}40`,borderTopColor:T.gold,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/></div>);

const LoginModal=({onLogin,onClose})=>{
  const [email,setEmail]=useState("");const[pw,setPw]=useState("");const[err,setErr]=useState("");
  const tryLogin=()=>{if(!email.trim()||!pw.trim()){setErr("Bitte alle Felder ausfüllen");return;}if(LOGIN_EMAIL&&email.toLowerCase().trim()!==LOGIN_EMAIL.toLowerCase()){setErr("Ungültige Anmeldedaten");setPw("");return;}if(pw===LOGIN_PASS){onLogin();}else{setErr("Ungültige Anmeldedaten");setPw("");}};
  const inpS={width:"100%",padding:"13px 16px",borderRadius:14,border:`1.5px solid ${err?T.red+"60":T.landBorder}`,fontSize:15,background:T.land2,color:"#F0EDE0",outline:"none"};
  return(<Modal onClose={onClose}><div className="modal-box" style={{background:`linear-gradient(180deg,${T.land1},${T.land2})`,borderRadius:28,padding:44,width:360,textAlign:"center",boxShadow:"0 32px 80px rgba(0,0,0,0.5)",border:`1px solid ${T.landBorder}`}}>
    <div style={{fontFamily:"Georgia,serif",fontWeight:700,fontSize:22,letterSpacing:3,textTransform:"uppercase",color:T.gold,marginBottom:4}}>Kaiserufer</div>
    <div style={{fontSize:12,color:T.goldDim,letterSpacing:2,textTransform:"uppercase",marginBottom:32}}>Log in</div>
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} placeholder="E-Mail Adresse" autoFocus style={{...inpS,letterSpacing:0.3}}/>
      <input type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&tryLogin()} placeholder="Passwort" style={{...inpS,letterSpacing:3}}/>
      {err&&<div style={{fontSize:13,color:T.red,fontWeight:600}}>{err}</div>}
      <button onClick={tryLogin} style={{padding:"14px 24px",borderRadius:16,fontWeight:700,fontSize:15,cursor:"pointer",background:`linear-gradient(135deg,${T.gold},#9A8A6A)`,color:"#1A1E14",border:"none",letterSpacing:1,textTransform:"uppercase",marginTop:4,boxShadow:"0 4px 20px rgba(184,168,138,0.3)"}}>Einloggen</button>
      <button onClick={onClose} style={{padding:"8px",borderRadius:10,fontSize:13,cursor:"pointer",background:"transparent",color:T.goldDim,border:"none",marginTop:4}}>Abbrechen</button>
    </div>
  </div></Modal>);
};

const StatistikPanel=({patienten,paesse,einzelArr})=>{
  const kl=patienten.filter(p=>p.kennenlern).length,kv=patienten.filter(p=>p.konvertiert).length;
  const offene=paesse.filter(p=>!p.bezahlt).length+einzelArr.filter(e=>!e.bezahlt).length;
  const aktive=paesse.filter(p=>!isPassAlt(p)).length;
  const tHE=paesse.filter(p=>!isPassAlt(p)).reduce((s,p)=>s+(p.he_total||0),0),gHE=paesse.filter(p=>!isPassAlt(p)).reduce((s,p)=>s+(p.he_genutzt||0),0);
  const tBS=paesse.filter(p=>!isPassAlt(p)).reduce((s,p)=>s+(p.bs_total||0),0),gBS=paesse.filter(p=>!isPassAlt(p)).reduce((s,p)=>s+(p.bs_genutzt||0),0);
  const umsatz=paesse.reduce((s,p)=>s+(p.preis||0),0)+einzelArr.reduce((s,e)=>s+(e.preis||0),0);
  const bezahlt=paesse.filter(p=>p.bezahlt).reduce((s,p)=>s+(p.preis||0),0)+einzelArr.filter(e=>e.bezahlt).reduce((s,e)=>s+(e.preis||0),0);
  return(
    <div className="fade-in" style={{display:"flex",flexDirection:"column",gap:16}}>
      <div className="stat-grid-4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        {[{val:patienten.length,label:"Kunden"},{val:aktive,label:"Aktive Pässe"},{val:offene,label:"Offen",color:offene>0?T.red:T.text},{val:`${(umsatz/1000).toFixed(1)}k`,label:"Umsatz (€)"}].map((s,i)=>(
          <Card key={i} style={{padding:18,textAlign:"center"}}><div style={{fontSize:30,fontWeight:700,fontFamily:"Georgia,serif",color:s.color||T.oliveDark}}>{s.val}</div><div style={{color:T.textLight,fontSize:12,textTransform:"uppercase",letterSpacing:1.5,marginTop:6}}>{s.label}</div></Card>
        ))}
      </div>
      <div className="stat-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Card style={{display:"flex",alignItems:"center",gap:18,padding:20,flexWrap:"wrap"}}>
          <Donut value={kv} total={kl} color={T.green}/>
          <div style={{flex:1,minWidth:140}}><div style={{fontSize:15,fontWeight:600,color:T.text,marginBottom:8}}>Konversionsrate</div><div style={{fontSize:14,color:T.textMid,lineHeight:2}}><strong style={{color:T.text}}>{kl}</strong> Kennenlerngespräche<br/><strong style={{color:T.green}}>{kv}</strong> → Flossenpass<br/><strong style={{color:T.red}}>{kl-kv}</strong> nicht konvertiert</div></div>
        </Card>
        <Card style={{padding:20}}>
          <div style={{fontSize:15,fontWeight:600,color:T.text,marginBottom:16}}>Einheiten-Auslastung</div>
          <div style={{marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",fontSize:14,marginBottom:6,color:T.textMid}}><span>Haupteinheiten</span><span style={{fontWeight:600,color:T.text}}>{gHE}/{tHE}</span></div><Bar used={gHE} total={tHE} color={T.olive}/></div>
          <div><div style={{display:"flex",justifyContent:"space-between",fontSize:14,marginBottom:6,color:T.textMid}}><span>Gruppenangebote</span><span style={{fontWeight:600,color:T.text}}>{gBS}/{tBS}</span></div><Bar used={gBS} total={tBS} color={T.gold}/></div>
        </Card>
      </div>
      <Card style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:20,flexWrap:"wrap",gap:12}}>
        <div><div style={{fontSize:15,fontWeight:600,color:T.text}}>Zahlungsübersicht</div><div style={{fontSize:14,color:T.textMid,marginTop:6,lineHeight:1.8}}>Gesamt: <strong style={{color:T.text}}>{umsatz.toLocaleString("de-DE")} €</strong> · Bezahlt: <strong style={{color:T.green}}>{bezahlt.toLocaleString("de-DE")} €</strong> · Offen: <strong style={{color:T.red}}>{(umsatz-bezahlt).toLocaleString("de-DE")} €</strong></div></div>
        <Donut value={bezahlt} total={umsatz} color={T.green} size={52}/>
      </Card>
    </div>
  );
};

const KaufModal=({selPat,onKauf,onClose})=>{
  const [passTyp,setPassTyp]=useState("BASIS");const[passHE,setPassHE]=useState(3);const[passBS,setPassBS]=useState(1);const[passPreis,setPassPreis]=useState(299);
  const [passRechnung,setPassRechnung]=useState("");const[passDatum,setPassDatum]=useState(todayISO());const[passName,setPassName]=useState("");
  const [einzelSel,setEinzelSel]=useState(EINZELANGEBOTE[0].name);const[einzelCustom,setEinzelCustom]=useState("");
  const [einzelPreis,setEinzelPreis]=useState(EINZELANGEBOTE[0].preis);const[einzelRechnung,setEinzelRechnung]=useState("");const[einzelDatum,setEinzelDatum]=useState(todayISO());
  const inp={width:"100%",padding:"10px 14px",borderRadius:12,border:`1px solid ${T.cardBorder}`,fontSize:15,background:T.inp,color:T.text,outline:"none"};
  const lbl={fontSize:12,fontWeight:700,color:T.textLight,textTransform:"uppercase",letterSpacing:1.5,marginBottom:6,display:"block"};
  const r2={display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14};
  const r3={display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14};
  const onPTC=(k)=>{const o=PASS_OPTIONS.find(p=>p.key===k);setPassTyp(k);if(k!=="INDIVIDUELL"){setPassHE(o.he);setPassBS(o.bs);setPassPreis(o.preis);}else{setPassHE(0);setPassBS(0);setPassPreis(0);}};
  const onESC=(n)=>{setEinzelSel(n);const f=EINZELANGEBOTE.find(e=>e.name===n);if(f)setEinzelPreis(f.preis);else setEinzelPreis(0);};
  const sP=()=>{if(passTyp==="INDIVIDUELL")onKauf("individuell",{name:passName||"Individuell",he:passHE,bs:passBS,datum:passDatum,rechnung:passRechnung.trim()},passPreis,"");else onKauf("pass",passTyp,passPreis,passRechnung.trim(),passDatum);};
  const sE=()=>{const n=einzelCustom.trim()||einzelSel;const f=EINZELANGEBOTE.find(e=>e.name===einzelSel);const k=einzelCustom.trim()?("CUSTOM_"+einzelCustom.trim().toUpperCase().replace(/\s+/g,"_")):f?.key||"CUSTOM";onKauf("einzel",{key:k,name:n},einzelPreis,einzelRechnung.trim(),einzelDatum);};
  return(<Modal onClose={onClose}><div className="modal-box" style={{background:T.cardSolid,borderRadius:24,padding:28,width:500,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(44,48,38,0.15)",border:`1px solid ${T.cardBorder}`}}>
    <Heading style={{marginBottom:4,fontSize:20}}>Angebot hinzufügen</Heading>
    <p style={{color:T.textMid,fontSize:15,marginBottom:22}}>für <strong style={{color:T.text}}>{selPat?.vorname} {selPat?.nachname}</strong>{selPat?.stammkunde?" · Stammkunde":""}</p>
    <div style={{background:T.bgPale,borderRadius:16,padding:20,border:`1px solid ${T.cardBorder}`,marginBottom:16}}>
      <div style={{fontSize:13,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:2,marginBottom:16}}>Flossenpass</div>
      <div style={{marginBottom:14}}><label style={lbl}>Typ</label><select value={passTyp} onChange={e=>onPTC(e.target.value)} style={inp}>{PASS_OPTIONS.map(o=><option key={o.key} value={o.key}>{o.label}</option>)}</select></div>
      {passTyp==="INDIVIDUELL"&&<div style={{marginBottom:14}}><label style={lbl}>Bezeichnung</label><input value={passName} onChange={e=>setPassName(e.target.value)} placeholder="z.B. Flossenpass Special" style={inp}/></div>}
      <div style={r3}><div><label style={lbl}>HE</label><input type="number" min={0} value={passHE} onChange={e=>setPassHE(Number(e.target.value))} style={inp}/></div><div><label style={lbl}>GA</label><input type="number" min={0} value={passBS} onChange={e=>setPassBS(Number(e.target.value))} style={inp}/></div><div><label style={lbl}>Preis (€)</label><input type="number" min={0} value={passPreis} onChange={e=>setPassPreis(Number(e.target.value))} style={inp}/></div></div>
      <div style={r2}><div><label style={lbl}>Rechnungs-Nr.</label><input value={passRechnung} onChange={e=>setPassRechnung(e.target.value)} placeholder="leer = auto" style={inp}/></div><div><label style={lbl}>Datum</label><input type="date" value={passDatum} onChange={e=>setPassDatum(e.target.value)} style={inp}/></div></div>
      <div style={{display:"flex",justifyContent:"flex-end"}}><Btn gold onClick={sP}>Flossenpass hinzufügen</Btn></div>
    </div>
    <div style={{background:T.bgPale,borderRadius:16,padding:20,border:`1px solid ${T.cardBorder}`}}>
      <div style={{fontSize:13,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:2,marginBottom:16}}>Einzelangebot</div>
      <div style={r2}><div><label style={lbl}>Auswählen</label><select value={einzelSel} onChange={e=>onESC(e.target.value)} style={inp}>{EINZEL_OPTIONS.map(n=><option key={n}>{n}</option>)}</select></div><div><label style={lbl}>Eigener Name</label><input value={einzelCustom} onChange={e=>setEinzelCustom(e.target.value)} placeholder="Sondersitzung" style={inp}/></div></div>
      <div style={r3}><div><label style={lbl}>Preis (€)</label><input type="number" min={0} value={einzelPreis} onChange={e=>setEinzelPreis(Number(e.target.value))} style={inp}/></div><div><label style={lbl}>Rechnungs-Nr.</label><input value={einzelRechnung} onChange={e=>setEinzelRechnung(e.target.value)} placeholder="optional" style={inp}/></div><div><label style={lbl}>Datum</label><input type="date" value={einzelDatum} onChange={e=>setEinzelDatum(e.target.value)} style={inp}/></div></div>
      <div style={{display:"flex",justifyContent:"flex-end"}}><Btn gold onClick={sE}>Einzelangebot hinzufügen</Btn></div>
    </div>
    <div style={{marginTop:16,textAlign:"right"}}><Btn ghost onClick={onClose}>Abbrechen</Btn></div>
  </div></Modal>);
};

const KIEingabeModal=({patienten,onKauf,onClose})=>{
  const [recording,setRecording]=useState(false);const[transcript,setTranscript]=useState("");
  const [loading,setLoading]=useState(false);const[eintraege,setEintraege]=useState([]);
  const [savingIdx,setSavingIdx]=useState(-1);const[error,setError]=useState("");
  const [fotos,setFotos]=useState([]);const[fotoPreview,setFotoPreview]=useState([]);
  const recognitionRef=useRef(null);const fileRef=useRef(null);
  const matchPat=(name)=>{if(!name)return null;return patienten.find(p=>{const full=`${p.vorname||""} ${p.nachname||""}`.toLowerCase();const parts=name.toLowerCase().split(" ");return parts.some(part=>part.length>2&&full.includes(part));})||null;};
  const buildPrompt=(patNames)=>`Du bist "Pingu hilft". Extrahiere ALLE Einträge aus dem Text oder Foto, antworte NUR mit JSON-Array ohne Backticks.
Jedes Element: {"kundenname":"string","typ":"pass/einzel","pass_typ":"BASIS/PLUS/DELUXE/INDIVIDUELL","einzel_name":"string","he_total":n,"bs_total":n,"preis":n,"rechnung":"string","datum":"YYYY-MM-DD","custom_name":"string","ist_alt":bool,"bezahlt":bool/null,"he_genutzt":n,"bs_genutzt":n}
Kunden: ${patNames} | BASIS=3HE 1GA 299€, PLUS=5HE 3GA 499€, DELUXE=10HE 5GA 899€ | Quickie 70€, tDCS 55€, Neurofeedback 350€ | Heute: ${todayISO()}

WICHTIG – Rechnungsnummern-Format: Unsere Codes sehen so aus: "RN412-350€-20.01.2026". Das bedeutet:
- Rechnungsnummer = "RN412" (nur der RN-Teil mit Zahl!)
- Preis = 350 (die Zahl nach dem Bindestrich vor dem €-Zeichen)
- Datum = 20.01.2026 (das Datum am Ende, umwandeln zu YYYY-MM-DD)
TRENNE diese drei Teile sauber! Die Rechnungsnummer ist IMMER nur "RN" + Zahl (z.B. RN412, RN263, RN353). Der Preis steht NACH dem ersten Bindestrich VOR dem €. Das Datum steht am Ende.

Spalte "Haupteinheit" = he_genutzt (bereits genutzte HE). Spalte "Zusatzangebot" = bs_genutzt (bereits genutzte GA/BS).
Wenn Haupteinheit=0 und Zusatzangebot=0 → der Pass ist alt/aufgebraucht → ist_alt:true.
Wenn Haupteinheit>0 oder Zusatzangebot>0 → der Pass ist aktiv → ist_alt:false. Setze he_genutzt und bs_genutzt auf die Werte aus der Tabelle.

Alte Flossenpässe (ist_alt:true) IMMER als typ:"pass", pass_typ:"INDIVIDUELL" mit custom_name:"Individuell" anlegen.
Bezahlt-Checkbox angehakt → bezahlt:true. Nicht angehakt → bezahlt:false.
Wenn ein Foto einer Liste/Tabelle vorliegt, lies ALLE Zeilen sorgfältig ab. Immer Array.`;
  const parseResult=(raw)=>{const c=raw.replace(/```json|```/g,"").trim();const arr=JSON.parse(c);return(Array.isArray(arr)?arr:[arr]).map((item,i)=>({...item,_id:i,_skip:false,matched_pat:matchPat(item.kundenname)}));};
  const fileToBase64=(file)=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=()=>rej(new Error("Datei konnte nicht gelesen werden"));r.readAsDataURL(file);});
  const handleFotos=async(e)=>{const files=Array.from(e.target.files||[]);if(!files.length)return;const valid=files.filter(f=>f.type.startsWith("image/"));if(!valid.length){setError("Bitte nur Bilder hochladen (JPG, PNG, etc.)");return;}setFotos(prev=>[...prev,...valid]);const previews=await Promise.all(valid.map(f=>new Promise((res)=>{const r=new FileReader();r.onload=()=>res(r.result);r.readAsDataURL(f);})));setFotoPreview(prev=>[...prev,...previews]);setError("");};
  const removeFoto=(idx)=>{setFotos(prev=>prev.filter((_,i)=>i!==idx));setFotoPreview(prev=>prev.filter((_,i)=>i!==idx));};
  const analyzeContent=async(text,images)=>{if(!text?.trim()&&(!images||images.length===0))return;if(!ANTHROPIC_KEY){setError("API-Key fehlt. Bitte VITE_ANTHROPIC_KEY in Vercel setzen und neu deployen.");return;}setLoading(true);setError("");setEintraege([]);try{const pn=patienten.map(p=>`${p.vorname} ${p.nachname}`).join(", ");const prompt=buildPrompt(pn);const content=[];if(images&&images.length>0){for(const img of images){const b64=await fileToBase64(img);const mt=img.type||"image/jpeg";content.push({type:"image",source:{type:"base64",media_type:mt,data:b64}});}content.push({type:"text",text:text?.trim()?`${prompt}\n\nZusätzlicher Text: "${text.trim()}"\n\nAnalysiere das Foto/die Fotos und den Text.`:`${prompt}\n\nAnalysiere das Foto/die Fotos sorgfältig. Lies alle Namen, Passtypen, Preise und Status ab.`});}else{content.push({type:"text",text:`${prompt}\n\nText: "${text}"`});}const resp=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":ANTHROPIC_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:4000,messages:[{role:"user",content}]})});if(!resp.ok){const errData=await resp.json().catch(()=>({}));setError(`API-Fehler ${resp.status}: ${errData.error?.message||resp.statusText}`);setLoading(false);return;}const data=await resp.json();const txt=data.content?.map(c=>c.text||"").join("")||"";if(!txt){setError("Leere Antwort von der KI.");setLoading(false);return;}setEintraege(parseResult(txt));}catch(e){setError("Fehler: "+e.message);console.error(e);}setLoading(false);};
  const analyzeText=async(text)=>analyzeContent(text,null);
  const analyzeFotos=async()=>analyzeContent(transcript,fotos);
  const startRec=()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){setError("Spracherkennung nicht unterstützt. Bitte Chrome/Edge.");return;}try{const r=new SR();r.lang="de-DE";r.continuous=true;r.interimResults=true;let ft="";r.onresult=(e)=>{let im="";ft="";for(let i=0;i<e.results.length;i++){if(e.results[i].isFinal)ft+=e.results[i][0].transcript+" ";else im+=e.results[i][0].transcript;}setTranscript((ft+im).trim());};r.onerror=(e)=>{if(e.error==="no-speech")return;setError("Fehler: "+e.error);setRecording(false);};r.onend=()=>{if(recognitionRef.current){setRecording(false);if(ft.trim())analyzeText(ft.trim());}};r.start();recognitionRef.current=r;setRecording(true);setError("");setEintraege([]);}catch(e){setError("Mikrofon konnte nicht gestartet werden.");}};
  const stopRec=()=>{if(recognitionRef.current){const ref=recognitionRef.current;recognitionRef.current=null;ref.stop();setRecording(false);if(transcript.trim())analyzeText(transcript.trim());}};
  const alleBestaetigen=async()=>{const aktive=eintraege.filter(e=>!e._skip&&e.matched_pat);for(let i=0;i<aktive.length;i++){setSavingIdx(i);const v=aktive[i],pat=v.matched_pat,datum=v.datum||todayISO(),rechnung=v.rechnung||"",istAlt=!!v.ist_alt,bez=v.bezahlt===true||v.bezahlt===false?v.bezahlt:null;if(v.typ==="pass"||v.pass_typ){const typ=v.pass_typ||"INDIVIDUELL";const heT=v.he_total||0,bsT=v.bs_total||0,heG=v.he_genutzt||0,bsG=v.bs_genutzt||0;const alt=istAlt||(heT>0&&heG>=heT&&bsT>0&&bsG>=bsT);if(typ==="INDIVIDUELL"||alt){await onKauf(pat,"individuell",{name:v.custom_name||"Individuell",he:heT,bs:bsT,datum,rechnung,ist_alt:alt,bezahlt:bez,he_genutzt:alt?heT:heG,bs_genutzt:alt?bsT:bsG},v.preis||0,"");}else{await onKauf(pat,"pass",typ,v.preis||PASS_TYPES[typ]?.preis||0,rechnung,datum,alt,bez);}}else{const name=v.einzel_name||"Einzelangebot";const f=EINZELANGEBOTE.find(ea=>ea.name.toLowerCase().includes(name.toLowerCase()));await onKauf(pat,"einzel",{key:f?.key||"CUSTOM",name},v.preis||f?.preis||0,rechnung,datum,false,bez);}}setSavingIdx(-1);onClose();};
  const toggleSkip=(id)=>setEintraege(prev=>prev.map(e=>e._id===id?{...e,_skip:!e._skip}:e));
  const updateEintrag=(id,field,val)=>setEintraege(prev=>prev.map(e=>e._id===id?{...e,[field]:val}:e));
  const reMatchPat=(id,name)=>{const pat=matchPat(name);setEintraege(prev=>prev.map(e=>e._id===id?{...e,kundenname:name,matched_pat:pat}:e));};
  const aktiveCount=eintraege.filter(e=>!e._skip&&e.matched_pat).length;const isSaving=savingIdx>=0;
  const inp2={width:"100%",padding:"11px 14px",borderRadius:12,border:`1px solid ${T.cardBorder}`,fontSize:15,background:T.inp,color:T.text,outline:"none"};
  const eInp={padding:"5px 8px",borderRadius:8,border:`1px solid ${T.cardBorder}`,fontSize:13,background:T.inp,color:T.text,outline:"none",fontFamily:"inherit"};
  return(<Modal onClose={onClose}><div className="modal-box" style={{background:T.cardSolid,borderRadius:24,padding:28,width:600,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(44,48,38,0.15)",border:`1px solid ${T.cardBorder}`}}>
    <Heading style={{fontSize:22,marginBottom:6}}>🐧 Pingu hilft</Heading>
    <p style={{color:T.textMid,fontSize:15,marginBottom:22,lineHeight:1.7}}>Sprich, tippe oder <strong style={{color:T.text}}>fotografiere</strong> deine alten Flossenpässe.<br/><span style={{fontSize:13,color:T.textLight}}>Sage ob ein Pass <strong>alt</strong> oder <strong>aktuell</strong> ist, und ob er <strong>bezahlt</strong> wurde.</span></p>

    {/* Foto Upload */}
    <div style={{marginBottom:18}}>
      <div style={{fontSize:12,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:2,marginBottom:10,fontFamily:"Georgia,serif"}}>Foto hochladen</div>
      <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFotos} style={{display:"none"}} capture="environment"/>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-start"}}>
        <button onClick={()=>fileRef.current?.click()} style={{padding:"14px 24px",borderRadius:16,background:`linear-gradient(135deg,${T.gold},#9A8A6A)`,color:"#2A2A1A",border:"none",fontWeight:700,fontSize:14,cursor:"pointer",boxShadow:`0 4px 16px rgba(184,168,138,0.3)`,letterSpacing:0.3}}>📸 Foto auswählen</button>
        {fotos.length>0&&<button onClick={analyzeFotos} disabled={loading} className="btn-a" style={{padding:"14px 24px",borderRadius:16,background:T.oliveDark,color:"#F0EDE0",border:"none",fontWeight:700,fontSize:14,cursor:loading?"not-allowed":"pointer",opacity:loading?0.5:1,letterSpacing:0.3}}>🐧 {fotos.length} Foto{fotos.length>1?"s":""} analysieren</button>}
      </div>
      {fotoPreview.length>0&&<div style={{display:"flex",gap:10,marginTop:12,flexWrap:"wrap"}}>{fotoPreview.map((src,i)=>(<div key={i} style={{position:"relative",borderRadius:12,overflow:"hidden",border:`2px solid ${T.gold}40`,boxShadow:"0 2px 12px rgba(0,0,0,0.08)"}}>
        <img src={src} style={{width:80,height:80,objectFit:"cover",display:"block"}} alt={`Foto ${i+1}`}/>
        <button onClick={()=>removeFoto(i)} style={{position:"absolute",top:4,right:4,width:22,height:22,borderRadius:"50%",background:"rgba(0,0,0,0.6)",color:"#fff",border:"none",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>✕</button>
      </div>))}</div>}
    </div>

    <div style={{height:1,background:T.cardBorder,margin:"0 0 18px"}}/>

    {/* Sprache */}
    <div style={{fontSize:12,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:2,marginBottom:10,fontFamily:"Georgia,serif"}}>Oder per Sprache / Text</div>
    <div style={{display:"flex",gap:10,marginBottom:18,alignItems:"center",flexWrap:"wrap"}}>
      {!recording?<button onClick={startRec} style={{padding:"14px 24px",borderRadius:16,background:T.red,color:"#fff",border:"none",fontWeight:700,fontSize:16,cursor:"pointer",boxShadow:`0 4px 16px ${T.red}40`}}>🎤 Aufnahme starten</button>:<button onClick={stopRec} style={{padding:"14px 24px",borderRadius:16,background:T.olive,color:"#fff",border:"none",fontWeight:700,fontSize:16,cursor:"pointer"}}>⏹ Aufnahme stoppen</button>}
      {recording&&<span style={{fontSize:14,color:T.red,fontWeight:600}}>● läuft</span>}
    </div>
    <div style={{marginBottom:18}}><div style={{display:"flex",gap:8}}><textarea value={transcript} onChange={e=>setTranscript(e.target.value)} rows={3} placeholder="z.B. Anna Müller alter Plus Pass bezahlt 499€..." style={{...inp2,flex:1,resize:"vertical"}}/><Btn gold small onClick={()=>analyzeText(transcript)} disabled={!transcript.trim()||loading}>KI →</Btn></div></div>
    {loading&&<div style={{textAlign:"center",padding:20}}><Spinner/><p style={{color:T.gold,fontSize:14}}>🐧 Pingu analysiert...</p></div>}
    {isSaving&&<div style={{padding:"12px 16px",borderRadius:12,background:T.greenSoft,color:T.green,fontSize:14,fontWeight:600,marginBottom:14}}>Speichere {savingIdx+1}/{aktiveCount}...</div>}
    {error&&<div style={{padding:"12px 16px",borderRadius:12,background:T.redSoft,color:T.red,fontSize:14,marginBottom:14}}>{error}</div>}
    {eintraege.length>0&&!loading&&(<div style={{marginBottom:16}}>
      <div style={{fontSize:13,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:2,marginBottom:14}}>{eintraege.length} Einträge erkannt</div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>{eintraege.map(v=>(<div key={v._id} style={{borderRadius:14,border:`1px solid ${v._skip?T.cardBorder:v.matched_pat?T.green+"30":T.red+"30"}`,background:v._skip?T.bgPale+"60":v.matched_pat?T.greenSoft:T.redSoft,padding:"14px 18px",opacity:v._skip?0.45:1}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:10}}>
          <div style={{flex:1}}>
            {v.matched_pat?<div style={{fontWeight:700,fontSize:15,color:T.text}}>{v.matched_pat.vorname} {v.matched_pat.nachname}</div>:<div style={{display:"flex",alignItems:"center",gap:6}}><span style={{color:T.red,fontWeight:700,fontSize:14}}>⚠ nicht gefunden:</span><input value={v.kundenname||""} onChange={e=>reMatchPat(v._id,e.target.value)} style={{...eInp,flex:1,fontWeight:600}} placeholder="Name eingeben..."/></div>}
          </div>
          <button onClick={()=>toggleSkip(v._id)} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${v._skip?T.green+"40":T.red+"30"}`,background:"transparent",color:v._skip?T.green:T.red,fontSize:12,fontWeight:700,cursor:"pointer",textTransform:"uppercase",flexShrink:0}}>{v._skip?"↩":"✕ Skip"}</button>
        </div>
        {!v._skip&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
          <div><div style={{fontSize:10,color:T.textLight,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Typ</div><select value={v.pass_typ||"INDIVIDUELL"} onChange={e=>{const t=e.target.value;updateEintrag(v._id,"pass_typ",t);if(t!=="INDIVIDUELL"&&PASS_TYPES[t]){updateEintrag(v._id,"he_total",PASS_TYPES[t].he);updateEintrag(v._id,"bs_total",PASS_TYPES[t].bs);if(!v.preis)updateEintrag(v._id,"preis",PASS_TYPES[t].preis);}}} style={{...eInp,width:"100%"}}><option value="INDIVIDUELL">Individuell</option><option value="BASIS">Basis</option><option value="PLUS">Plus</option><option value="DELUXE">Deluxe</option></select></div>
          <div><div style={{fontSize:10,color:T.textLight,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Rechnungs-Nr.</div><input value={v.rechnung||""} onChange={e=>updateEintrag(v._id,"rechnung",e.target.value)} style={{...eInp,width:"100%",fontFamily:"monospace"}} placeholder="RN412"/></div>
          <div><div style={{fontSize:10,color:T.textLight,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Preis (€)</div><input type="number" min={0} value={v.preis||""} onChange={e=>updateEintrag(v._id,"preis",Number(e.target.value))} style={{...eInp,width:"100%"}}/></div>
        </div>}
        {!v._skip&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginBottom:8}}>
          <div><div style={{fontSize:10,color:T.textLight,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>HE ges.</div><input type="number" min={0} value={v.he_total||""} onChange={e=>updateEintrag(v._id,"he_total",Number(e.target.value))} style={{...eInp,width:"100%"}}/></div>
          <div><div style={{fontSize:10,color:T.textLight,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>HE gen.</div><input type="number" min={0} value={v.he_genutzt||""} onChange={e=>updateEintrag(v._id,"he_genutzt",Number(e.target.value))} style={{...eInp,width:"100%"}}/></div>
          <div><div style={{fontSize:10,color:T.textLight,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>GA ges.</div><input type="number" min={0} value={v.bs_total||""} onChange={e=>updateEintrag(v._id,"bs_total",Number(e.target.value))} style={{...eInp,width:"100%"}}/></div>
          <div><div style={{fontSize:10,color:T.textLight,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>GA gen.</div><input type="number" min={0} value={v.bs_genutzt||""} onChange={e=>updateEintrag(v._id,"bs_genutzt",Number(e.target.value))} style={{...eInp,width:"100%"}}/></div>
        </div>}
        {!v._skip&&<div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{fontSize:10,color:T.textLight,textTransform:"uppercase",letterSpacing:1}}>Datum</div><input type="date" value={v.datum||""} onChange={e=>updateEintrag(v._id,"datum",e.target.value)} style={{...eInp}}/></div>
          <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",fontSize:12,fontWeight:700,color:v.ist_alt?T.textMid:T.textLight}}><input type="checkbox" checked={!!v.ist_alt} onChange={e=>updateEintrag(v._id,"ist_alt",e.target.checked)} style={{accentColor:T.olive}}/>Alt</label>
          <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",fontSize:12,fontWeight:700,color:v.bezahlt?T.green:T.textLight}}><input type="checkbox" checked={!!v.bezahlt} onChange={e=>updateEintrag(v._id,"bezahlt",e.target.checked)} style={{accentColor:T.green}}/>Bezahlt</label>
        </div>}
      </div>))}</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:16,flexWrap:"wrap",gap:8}}><span style={{fontSize:14,color:T.textLight}}>{aktiveCount}/{eintraege.length} werden gespeichert</span><div style={{display:"flex",gap:8}}><Btn small ghost onClick={()=>{setEintraege([]);setTranscript("");setFotos([]);setFotoPreview([]);}}>Nochmal</Btn><Btn small gold disabled={aktiveCount===0||isSaving} onClick={alleBestaetigen}>✓ Alle {aktiveCount} speichern</Btn></div></div>
    </div>)}
    <div style={{textAlign:"right",marginTop:10}}><Btn small ghost onClick={onClose}>Abbrechen</Btn></div>
  </div></Modal>);
};

const MitarbeiterApp=({patienten,setPatienten,paesse,setPaesse,log,setLog,rechnungsNr,setRechnungsNr,einzel,setEinzel})=>{
  const [view,setView]=useState("liste");const[selPat,setSelPat]=useState(null);const[search,setSearch]=useState("");
  const [scanMode,setScanMode]=useState(false);const[scanInput,setScanInput]=useState("");
  const [showStats,setShowStats]=useState(false);const[kaufModal,setKaufModal]=useState(false);const[kiModal,setKiModal]=useState(false);
  const [bsModal,setBsModal]=useState(null);const[bsNotiz,setBsNotiz]=useState("");
  const [korrekturModal,setKorrekturModal]=useState(null);const[korrekturTyp,setKorrekturTyp]=useState("HE");
  const [korrekturAnzahl,setKorrekturAnzahl]=useState(1);const[korrekturGrund,setKorrekturGrund]=useState("");
  const [notizText,setNotizText]=useState("");const[saving,setSaving]=useState(false);
  const [shoreSync,setShoreSync]=useState(false);const[shoreSyncMsg,setShoreSyncMsg]=useState("");
  const [confirmDelete,setConfirmDelete]=useState(null);
  const inp={width:"100%",padding:"11px 14px",borderRadius:12,border:`1px solid ${T.cardBorder}`,fontSize:15,background:T.inp,color:T.text,outline:"none"};

  const filtered=patienten.slice().sort((a,b)=>{const na=`${a.vorname||""} ${a.nachname||""}`.trim().toLowerCase();const nb=`${b.vorname||""} ${b.nachname||""}`.trim().toLowerCase();if(!a.vorname&&b.vorname)return 1;if(a.vorname&&!b.vorname)return-1;return na.localeCompare(nb,"de");}).filter(p=>{const q=search.toLowerCase();return`${p.vorname||""} ${p.nachname||""} ${p.email||""}`.toLowerCase().includes(q)||paesse.some(pk=>pk.pat_id===p.id&&(pk.rechnung||"").toLowerCase().includes(q))||einzel.some(e=>e.pat_id===p.id&&(e.rechnung||"").toLowerCase().includes(q));});

  const patPaesse=selPat?paesse.filter(pk=>pk.pat_id===selPat.id):[];
  const patEinzel=selPat?einzel.filter(e=>e.pat_id===selPat.id).sort((a,b)=>(b.datum||"").localeCompare(a.datum||"")):[];
  const patLog=selPat?log.filter(l=>l.pat_id===selPat.id).sort((a,b)=>(b.datum||"").localeCompare(a.datum||"")):[];
  const aktPaesse=patPaesse.filter(pk=>!isPassAlt(pk)),altPaesse=patPaesse.filter(pk=>isPassAlt(pk));
  const aktiverPass=aktPaesse[0]||null;
  const heUebrig=aktPaesse.reduce((s,p)=>s+((p.he_total||0)-(p.he_genutzt||0)),0);
  const bsUebrig=aktPaesse.reduce((s,p)=>s+((p.bs_total||0)-(p.bs_genutzt||0)),0);
  const alleVerkaufe=[...patPaesse.map(pk=>({id:pk.id,art:"pass",name:`Flossenpass ${getPassLabel(pk)}`,rechnung:pk.rechnung,datum:pk.datum,preis:pk.preis||0,bezahlt:pk.bezahlt,isAlt:isPassAlt(pk)})),...patEinzel.map(e=>({id:e.id,art:"einzel",name:e.name,rechnung:e.rechnung,datum:e.datum,preis:e.preis||0,bezahlt:e.bezahlt,isAlt:false}))].sort((a,b)=>(b.datum||"").localeCompare(a.datum||""));

  const getRechnungsNr=async()=>{const{data}=await supabase.from("einstellungen").select("value").eq("key","rechnungs_nr").single();const nr=parseInt(data?.value||"0")+1;await supabase.from("einstellungen").update({value:String(nr)}).eq("key","rechnungs_nr");setRechnungsNr(nr);return nr;};
  const handleKauf=async(typ,info,preis,eigeneRechnung,datum)=>{setSaving(true);await handleKaufFuerPat(selPat,typ,info,preis,eigeneRechnung,datum);setSaving(false);setKaufModal(false);};
  const handleKaufFuerPat=async(pat,typ,info,preis,eigeneRechnung,datum,istAlt,bezahltStatus)=>{
    const ds=datum||todayISO();let rs;
    if(typ==="individuell"){rs=info.rechnung||genRechnung(await getRechnungsNr());const h=info.he||0,b=info.bs||0,alt=istAlt||info.ist_alt||false,bez=bezahltStatus!=null?bezahltStatus:(info.bezahlt!=null?info.bezahlt:false);const heG=info.he_genutzt!=null?info.he_genutzt:(alt?h:0);const bsG=info.bs_genutzt!=null?info.bs_genutzt:(alt?b:0);const np={id:genId(),pat_id:pat.id,typ:"INDIVIDUELL",he_total:h,he_genutzt:heG,bs_total:b,bs_genutzt:bsG,preis:preis||0,rechnung:rs,bezahlt:bez,datum:info.datum||ds,aktiv:!alt,custom_name:info.name||"Individuell"};await supabase.from("paesse").insert(np);setPaesse(prev=>[...prev,np]);}
    else if(typ==="pass"){rs=eigeneRechnung||genRechnung(await getRechnungsNr());const pt=PASS_TYPES[info],alt=!!istAlt,bez=bezahltStatus!=null?bezahltStatus:false;const np={id:genId(),pat_id:pat.id,typ:info,he_total:pt.he,he_genutzt:alt?pt.he:0,bs_total:pt.bs,bs_genutzt:alt?pt.bs:0,preis:preis||0,rechnung:rs,bezahlt:bez,datum:ds,aktiv:!alt};await supabase.from("paesse").insert(np);setPaesse(prev=>[...prev,np]);}
    else{rs=eigeneRechnung||genRechnung(await getRechnungsNr());const bez=bezahltStatus!=null?bezahltStatus:false;const ne={id:genId(),pat_id:pat.id,key:info.key,name:info.name,preis:preis||0,rechnung:rs,bezahlt:bez,datum:ds};const nl={id:genId(),pat_id:pat.id,pass_id:null,typ:info.key,quelle:"INTERN",datum:new Date().toISOString(),notiz:info.name};await supabase.from("einzel").insert(ne);await supabase.from("log").insert(nl);setEinzel(prev=>[...prev,ne]);setLog(prev=>[...prev,nl]);}
  };
  const deletePass=async(pid)=>{await supabase.from("paesse").delete().eq("id",pid);setPaesse(prev=>prev.filter(p=>p.id!==pid));setConfirmDelete(null);};
  const downloadCSV=()=>{const h=["Vorname","Nachname","E-Mail","Telefon","QR-Code","Stammkunde","Stammpreis","Seit","Aktiver Pass","HE","GA"];const rows=filtered.map(p=>{const ap=paesse.find(pk=>pk.pat_id===p.id&&!isPassAlt(pk));const he=ap?(ap.he_total||0)-(ap.he_genutzt||0):"";const bs=ap?(ap.bs_total||0)-(ap.bs_genutzt||0):"";return[p.vorname||"",p.nachname||"",p.email||"",p.telefon||"",p.qr||"",p.stammkunde?"Ja":"Nein",p.stammpreis||"",fmtDate(p.erstellt),ap?`Flossenpass ${getPassLabel(ap)}`:"–",he,bs].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(";");});const csv=[h.map(x=>`"${x}"`).join(";"),...rows].join("\n");const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="gaesteliste-kaiserufer.csv";a.click();URL.revokeObjectURL(url);};

  const heAbziehen=async(pass)=>{if(!pass||pass.he_genutzt>=pass.he_total)return;const u={...pass,he_genutzt:pass.he_genutzt+1};const nl={id:genId(),pat_id:selPat.id,pass_id:pass.id,typ:"HAUPTEINHEIT",quelle:"SHORE",datum:new Date().toISOString(),notiz:"Haupteinheit"};await supabase.from("paesse").update({he_genutzt:u.he_genutzt}).eq("id",pass.id);await supabase.from("log").insert(nl);setPaesse(prev=>prev.map(p=>p.id===pass.id?u:p));setLog(prev=>[...prev,nl]);};
  const bsAbziehen=async(pass)=>{if(!pass||pass.bs_genutzt>=pass.bs_total||!bsNotiz.trim())return;const u={...pass,bs_genutzt:pass.bs_genutzt+1};const nl={id:genId(),pat_id:selPat.id,pass_id:pass.id,typ:"BS",quelle:"INTERN",datum:new Date().toISOString(),notiz:bsNotiz.trim()};await supabase.from("paesse").update({bs_genutzt:u.bs_genutzt}).eq("id",pass.id);await supabase.from("log").insert(nl);setPaesse(prev=>prev.map(p=>p.id===pass.id?u:p));setLog(prev=>[...prev,nl]);setBsNotiz("");setBsModal(null);};
  const korrekturSpeichern=async()=>{if(!korrekturModal||korrekturAnzahl<1)return;const n=Number(korrekturAnzahl);const pass=korrekturModal;const upd=korrekturTyp==="HE"?{he_genutzt:Math.max(0,(pass.he_genutzt||0)-n)}:{bs_genutzt:Math.max(0,(pass.bs_genutzt||0)-n)};const nl={id:genId(),pat_id:selPat.id,pass_id:pass.id,typ:"KORREKTUR",quelle:"MANUELL",datum:new Date().toISOString(),notiz:`${korrekturTyp} +${n} zurück${korrekturGrund?` – ${korrekturGrund}`:""}`};await supabase.from("paesse").update(upd).eq("id",pass.id);await supabase.from("log").insert(nl);setPaesse(prev=>prev.map(p=>p.id===pass.id?{...p,...upd}:p));setLog(prev=>[...prev,nl]);setKorrekturModal(null);setKorrekturAnzahl(1);setKorrekturGrund("");};
  const notizSpeichern=async()=>{if(!notizText.trim())return;const nl={id:genId(),pat_id:selPat.id,pass_id:null,typ:"NOTIZ",quelle:"INTERN",datum:new Date().toISOString(),notiz:notizText.trim()};await supabase.from("log").insert(nl);setLog(prev=>[...prev,nl]);setNotizText("");};
  const toggleBezahlt=async(pid)=>{const p=paesse.find(x=>x.id===pid);if(!p)return;await supabase.from("paesse").update({bezahlt:!p.bezahlt}).eq("id",pid);setPaesse(prev=>prev.map(x=>x.id===pid?{...x,bezahlt:!x.bezahlt}:x));};
  const toggleEinzelBez=async(eid)=>{const e=einzel.find(x=>x.id===eid);if(!e)return;await supabase.from("einzel").update({bezahlt:!e.bezahlt}).eq("id",eid);setEinzel(prev=>prev.map(x=>x.id===eid?{...x,bezahlt:!x.bezahlt}:x));};
  const updatePassField=async(pid,field,val)=>{await supabase.from("paesse").update({[field]:val}).eq("id",pid);setPaesse(prev=>prev.map(p=>p.id===pid?{...p,[field]:val}:p));};
  const updatePassEinheiten=async(pid,field,val)=>{const n=Math.max(0,parseInt(val)||0);await supabase.from("paesse").update({[field]:n}).eq("id",pid);setPaesse(prev=>prev.map(p=>p.id===pid?{...p,[field]:n}:p));};
  const updatePatient=async(id,fields)=>{await supabase.from("patienten").update(fields).eq("id",id);setPatienten(prev=>prev.map(p=>p.id===id?{...p,...fields}:p));if(selPat?.id===id)setSelPat(prev=>({...prev,...fields}));};
  const getUnits=(patId)=>{const ap=paesse.find(pk=>pk.pat_id===patId&&!isPassAlt(pk));if(!ap)return null;return{he:(ap.he_total||0)-(ap.he_genutzt||0),bs:(ap.bs_total||0)-(ap.bs_genutzt||0),typ:ap.typ};};
  const editInp=(w)=>({fontSize:14,fontWeight:600,background:"transparent",border:`1px solid ${T.cardBorder}`,borderRadius:8,padding:"4px 8px",color:T.text,outline:"none",width:w});
  const handleScan=()=>{const pat=patienten.find(p=>p.qr===scanInput.trim().toUpperCase());if(pat){setSelPat(pat);setView("akte");setScanMode(false);setScanInput("");}else alert("QR nicht gefunden: "+scanInput);};

  const PassCard=({pk,isAlt})=>{
    const heL=(pk.he_total||0)-(pk.he_genutzt||0),bsL=(pk.bs_total||0)-(pk.bs_genutzt||0);
    const ni={width:50,padding:"4px 6px",borderRadius:8,border:`1px solid ${T.cardBorder}`,fontSize:15,fontWeight:700,background:"transparent",color:T.text,outline:"none",textAlign:"center"};
    return(<div style={{borderRadius:16,border:`1px solid ${T.cardBorder}`,background:isAlt?T.bgPale+"90":T.cream+"90",overflow:"hidden",marginBottom:12,opacity:isAlt?0.8:1}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${T.cardBorder}`,background:T.bgPale+"80",flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><strong style={{fontFamily:"Georgia,serif",fontSize:17,color:T.oliveDark}}>Flossenpass {getPassLabel(pk)}</strong>{isAlt&&<Badge variant="cream" small>Aufgebraucht</Badge>}</div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",fontSize:12,fontWeight:700,textTransform:"uppercase",color:pk.bezahlt?T.green:T.red,background:pk.bezahlt?T.greenSoft:T.redSoft,padding:"6px 14px",borderRadius:10}}><input type="checkbox" checked={!!pk.bezahlt} onChange={()=>toggleBezahlt(pk.id)} style={{accentColor:T.green,width:15,height:15}}/>{pk.bezahlt?"Bezahlt":"Offen"}</label>
          <button onClick={()=>setConfirmDelete(pk.id)} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${T.red}30`,background:T.redSoft,color:T.red,fontSize:12,fontWeight:700,cursor:"pointer",textTransform:"uppercase"}}>✕</button>
        </div>
      </div>
      <div className="pass-3col" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderBottom:`1px solid ${T.cardBorder}`}}>
        {[{l:"Rechnungs-Nr.",c:<input value={pk.rechnung||""} onChange={e=>updatePassField(pk.id,"rechnung",e.target.value)} style={{...editInp(140),width:"100%"}}/>},{l:"Datum",c:<input type="date" value={pk.datum||""} onChange={e=>updatePassField(pk.id,"datum",e.target.value)} style={{...editInp(140),width:"100%"}}/>},{l:"Preis",c:<div style={{display:"flex",alignItems:"center",gap:4}}><input type="number" min={0} value={pk.preis||0} onChange={e=>updatePassField(pk.id,"preis",Number(e.target.value))} style={{...editInp(80),textAlign:"right"}}/><span style={{fontSize:14,color:T.textMid}}>€</span></div>}].map((f,fi)=>(
          <div key={f.l} style={{padding:"12px 16px",borderLeft:fi>0?`1px solid ${T.cardBorder}`:"none"}}><div style={{fontSize:11,color:T.textLight,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>{f.l}</div>{f.c}</div>
        ))}
      </div>
      <div className="pass-2col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:`1px solid ${T.cardBorder}`}}>
        {[{label:"Haupteinheiten",g:"he_genutzt",t:"he_total",used:pk.he_genutzt||0,tot:pk.he_total||0,left:heL,color:T.olive},{label:"Gruppenangebote",g:"bs_genutzt",t:"bs_total",used:pk.bs_genutzt||0,tot:pk.bs_total||0,left:bsL,color:T.gold}].map((e,ei)=>(
          <div key={e.label} style={{padding:"14px 16px",borderLeft:ei>0?`1px solid ${T.cardBorder}`:"none"}}>
            <div style={{fontSize:12,color:T.textLight,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>{e.label}</div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,flexWrap:"wrap"}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}><span style={{fontSize:11,color:T.textLight}}>Genutzt</span><input type="number" min={0} max={e.tot} value={e.used} onChange={ev=>updatePassEinheiten(pk.id,e.g,ev.target.value)} style={ni}/></div>
              <span style={{fontSize:16,color:T.textLight,marginTop:16}}>/</span>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}><span style={{fontSize:11,color:T.textLight}}>Gesamt</span><input type="number" min={0} value={e.tot} onChange={ev=>updatePassEinheiten(pk.id,e.t,ev.target.value)} style={ni}/></div>
              <span style={{fontFamily:"Georgia,serif",fontSize:20,fontWeight:700,color:T.oliveDark,marginTop:16,marginLeft:4}}>{e.left}<span style={{fontSize:12,fontWeight:400,color:T.textLight}}> übrig</span></span>
            </div><Bar used={e.used} total={e.tot} color={e.color}/>
          </div>))}
      </div>
      {!isAlt&&<div style={{padding:"10px 20px"}}><button onClick={()=>{setKorrekturModal(pk);setKorrekturTyp("HE");setKorrekturAnzahl(1);setKorrekturGrund("");}} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:T.red,padding:"4px 0"}}>✎ Korrektur</button></div>}
    </div>);
  };

  if(scanMode)return(<div className="fade-in resp-pad" style={{padding:28}}><div className="header-row" style={{display:"flex",alignItems:"center",gap:14,marginBottom:28}}><Btn ghost onClick={()=>setScanMode(false)}>← Zurück</Btn><Heading style={{fontSize:22}}>QR-Code Scanner</Heading></div><Card><div style={{textAlign:"center",padding:"24px 8px"}}><div style={{fontSize:40,marginBottom:16}}>📷</div><p style={{color:T.textMid,marginBottom:20,fontSize:16}}>QR-Token eingeben:</p><div style={{display:"flex",gap:8,justifyContent:"center",maxWidth:420,margin:"0 auto",flexWrap:"wrap"}}><input value={scanInput} onChange={e=>setScanInput(e.target.value)} placeholder="z.B. KU-A7F3B2C9" onKeyDown={e=>e.key==="Enter"&&handleScan()} style={{...inp,flex:1,fontFamily:"monospace",minWidth:180}}/><Btn gold onClick={handleScan}>Scannen</Btn></div></div></Card></div>);

  return(<div className="resp-pad" style={{padding:28}}>
    {kaufModal&&<KaufModal selPat={selPat} onKauf={handleKauf} onClose={()=>setKaufModal(false)}/>}
    {kiModal&&<KIEingabeModal patienten={patienten} onKauf={handleKaufFuerPat} onClose={()=>setKiModal(false)}/>}
    {confirmDelete&&<Modal onClose={()=>setConfirmDelete(null)}><Card className="modal-box" style={{width:380,textAlign:"center"}}><div style={{fontSize:36,marginBottom:12}}>⚠️</div><Heading style={{fontSize:20,marginBottom:8}}>Pass löschen?</Heading><p style={{color:T.textMid,fontSize:15,marginBottom:20,lineHeight:1.7}}>Unwiderruflich.</p><div style={{display:"flex",gap:10,justifyContent:"center"}}><Btn ghost onClick={()=>setConfirmDelete(null)}>Abbrechen</Btn><Btn danger onClick={()=>deletePass(confirmDelete)}>Löschen</Btn></div></Card></Modal>}
    {bsModal&&<Modal onClose={()=>{setBsModal(null);setBsNotiz("");}}><Card className="modal-box" style={{width:400}}><Heading style={{fontSize:20,marginBottom:4}}>Gruppenangebot abhaken</Heading><p style={{color:T.textMid,fontSize:15,marginBottom:18}}>Noch {(bsModal.bs_total||0)-(bsModal.bs_genutzt||0)} von {bsModal.bs_total||0}</p><div style={{display:"flex",flexDirection:"column",gap:12}}><input value={bsNotiz} onChange={e=>setBsNotiz(e.target.value)} placeholder="z.B. Yoga, Sound Bath..." style={inp} autoFocus/><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ghost onClick={()=>{setBsModal(null);setBsNotiz("");}}>Abbrechen</Btn><Btn gold disabled={!bsNotiz.trim()} onClick={()=>bsAbziehen(bsModal)}>Abhaken</Btn></div></div></Card></Modal>}
    {korrekturModal&&<Modal onClose={()=>setKorrekturModal(null)}><Card className="modal-box" style={{width:400}}><Heading style={{fontSize:20,marginBottom:18}}>Korrektur</Heading><div style={{display:"flex",flexDirection:"column",gap:14}}><div><label style={{fontSize:14,fontWeight:600,color:T.textMid,textTransform:"uppercase",letterSpacing:1,marginBottom:6,display:"block"}}>Typ</label><select value={korrekturTyp} onChange={e=>setKorrekturTyp(e.target.value)} style={inp}><option value="HE">Haupteinheit</option><option value="BS">Gruppenangebot</option></select></div><div><label style={{fontSize:14,fontWeight:600,color:T.textMid,textTransform:"uppercase",letterSpacing:1,marginBottom:6,display:"block"}}>Anzahl</label><input type="number" min={1} max={10} value={korrekturAnzahl} onChange={e=>setKorrekturAnzahl(e.target.value)} style={inp}/></div><div><label style={{fontSize:14,fontWeight:600,color:T.textMid,textTransform:"uppercase",letterSpacing:1,marginBottom:6,display:"block"}}>Grund</label><input value={korrekturGrund} onChange={e=>setKorrekturGrund(e.target.value)} placeholder="optional" style={inp}/></div><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ghost onClick={()=>setKorrekturModal(null)}>Abbrechen</Btn><Btn danger onClick={korrekturSpeichern}>Speichern</Btn></div></div></Card></Modal>}

    {view==="liste"&&(<div className="fade-in">
      <div className="toolbar" style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, E-Mail oder Rechnungsnummer..." style={{...inp,flex:1,minWidth:200}}/>
        <div className="toolbar-btns" style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          {[{emoji:"📷",label:"QR",onClick:()=>setScanMode(true)},{emoji:"📊",label:showStats?"Statistik ✕":"Statistik",onClick:()=>setShowStats(!showStats)},{emoji:"⬇",label:"CSV",onClick:downloadCSV},{emoji:"🐧",label:"Pingu hilft",onClick:()=>setKiModal(true)}].map(b=>(
            <button key={b.label} onClick={b.onClick} className="btn-a" style={{padding:"10px 16px",borderRadius:14,fontWeight:600,cursor:"pointer",background:T.olive,color:"#fff",border:"none",fontSize:14,letterSpacing:0.3,textTransform:"uppercase"}}><span className="btn-emoji" style={{display:"none"}}>{b.emoji}</span><span className="btn-text">{b.label}</span></button>
          ))}
          <button disabled={shoreSync} className="btn-a" style={{padding:"10px 16px",borderRadius:14,fontWeight:600,cursor:shoreSync?"not-allowed":"pointer",background:T.olive,color:"#fff",border:"none",fontSize:14,textTransform:"uppercase",opacity:shoreSync?0.5:1}} onClick={async()=>{setShoreSync(true);setShoreSyncMsg("");try{const r=await fetch("/api/shore-sync",{method:"POST"});const data=await r.json();if(data.error)throw new Error(data.error);const{data:np}=await supabase.from("patienten").select("*");if(np)setPatienten(np);setShoreSyncMsg(`✓ ${data.neu||0} neue · ${data.gesamt||0} gesamt`);}catch(e){setShoreSyncMsg("Fehler: "+e.message);}setShoreSync(false);}}><span className="btn-emoji" style={{display:"none"}}>🔄</span><span className="btn-text">{shoreSync?"Sync...":"Shore Sync"}</span></button>
        </div>
      </div>
      {shoreSyncMsg&&<div style={{padding:"12px 18px",borderRadius:12,background:shoreSyncMsg.startsWith("Fehler")?T.redSoft:T.greenSoft,color:shoreSyncMsg.startsWith("Fehler")?T.red:T.green,fontSize:14,fontWeight:600,marginBottom:14}}>{shoreSyncMsg}</div>}
      {showStats&&<div style={{marginBottom:22}}><StatistikPanel patienten={patienten} paesse={paesse} einzelArr={einzel}/></div>}
      <div style={{marginBottom:18}}><Heading style={{fontSize:28}}>Gästeliste Kaiserufer</Heading><p style={{color:T.textLight,fontSize:14,marginTop:6}}>{filtered.length} Kunden</p></div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map((p,i)=>{const u=getUnits(p.id);const ub=paesse.filter(pk=>pk.pat_id===p.id).some(pk=>!pk.bezahlt)||einzel.filter(e=>e.pat_id===p.id).some(e=>!e.bezahlt);
          return(<div key={p.id} onClick={()=>{setSelPat(p);setView("akte");}} className="card-h slide-in" style={{animationDelay:`${i<20?i*0.05:0}s`,padding:"16px 24px",background:T.card,borderRadius:20,border:`1px solid ${T.cardBorder}`,cursor:"pointer",backdropFilter:"blur(8px)",boxShadow:"0 2px 12px rgba(74,82,64,0.06)"}}>
            <div className="liste-row" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div><div style={{fontWeight:600,color:T.text,fontSize:17,lineHeight:1.4}}>{p.vorname} {p.nachname}</div><div style={{display:"flex",alignItems:"center",gap:8,marginTop:4,flexWrap:"wrap"}}><span style={{fontSize:14,color:T.textLight}}>{p.email}</span>{p.stammkunde&&<Badge variant="green" small>Stammkunde</Badge>}</div></div>
              <div className="liste-right" style={{display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
                <div style={{display:"flex",border:`1px solid ${T.cardBorder}`,borderRadius:10,overflow:"hidden"}}>{[{label:"HE",val:u?u.he:null},{label:"GA",val:u?u.bs:null}].map((col,ci)=>(<div key={col.label} style={{width:48,padding:"6px 0",textAlign:"center",borderLeft:ci>0?`1px solid ${T.cardBorder}`:"none",background:T.bgPale+"60"}}><div style={{fontSize:10,color:T.textLight,textTransform:"uppercase",letterSpacing:0.8,marginBottom:3}}>{col.label}</div><div style={{fontSize:17,fontWeight:700,fontFamily:"Georgia,serif",color:col.val===null?T.textLight+"40":T.oliveDark,lineHeight:1}}>{col.val!==null?col.val:"–"}</div></div>))}</div>
                <div className="badge-w" style={{width:68,textAlign:"center"}}>{u?<Badge variant="gold">{getPassName(u.typ)}</Badge>:<span style={{fontSize:12,color:T.textLight+"40"}}>–</span>}</div>
                <div className="badge-w" style={{width:48,textAlign:"center"}}>{ub?<Badge variant="red">Offen</Badge>:null}</div>
                <span className="chevron" style={{color:T.gold,fontSize:20,fontWeight:300}}>›</span>
              </div>
            </div>
          </div>);
        })}
        {filtered.length===0&&<p style={{textAlign:"center",color:T.textLight,padding:40,fontSize:16}}>Keine Kunden gefunden</p>}
      </div>
    </div>)}

    {view==="akte"&&selPat&&(<div className="fade-in">
      <div className="header-row" style={{display:"flex",alignItems:"center",gap:14,marginBottom:28}}><Btn ghost onClick={()=>setView("liste")}>← Zurück</Btn><Heading style={{fontSize:22}}>{selPat.vorname} {selPat.nachname}</Heading>{saving&&<span style={{fontSize:13,color:T.gold}}>Speichern...</span>}</div>
      <div className="akte-grid" style={{display:"grid",gridTemplateColumns:"1fr 220px",gap:20,alignItems:"start"}}>
        <div style={{display:"flex",flexDirection:"column",gap:18}}>
          <Card>
            <SectionLabel>Stammdaten</SectionLabel>
            <div style={{display:"flex",flexDirection:"column",gap:10,fontSize:15,lineHeight:1.6}}>
              {[["E-Mail",selPat.email||"–"],["Telefon",selPat.telefon||"–"],["Adresse",selPat.adresse||"–"],["QR",<code style={{background:T.bgPale,padding:"3px 10px",borderRadius:8,fontSize:13,wordBreak:"break-all",color:T.textLight}}>{selPat.qr}</code>],["Seit",fmtDate(selPat.erstellt)]].map(([l,v])=>(<div key={l} style={{display:"flex",gap:12,alignItems:"flex-start",flexWrap:"wrap"}}><span style={{color:T.textLight,minWidth:90,flexShrink:0,fontSize:14}}>{l}:</span><span style={{wordBreak:"break-word",color:T.text,fontSize:15}}>{v}</span></div>))}
              <div style={{marginTop:10,paddingTop:12,borderTop:`1px solid ${T.cardBorder}`}}>
                <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:14}}>
                  {[{val:heUebrig,l:"HE übrig"},{val:bsUebrig,l:"GA übrig"}].map(u=>(<div key={u.l} style={{display:"flex",flexDirection:"column",alignItems:"center",background:T.gold+"18",borderRadius:12,padding:"10px 20px",border:`1px solid ${T.gold}25`}}><span style={{fontSize:28,fontWeight:700,color:T.oliveDark,fontFamily:"Georgia,serif"}}>{u.val}</span><span style={{fontSize:12,color:T.textLight,textTransform:"uppercase",letterSpacing:1,marginTop:3}}>{u.l}</span></div>))}
                </div>
                {aktiverPass&&(<div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  <button disabled={heUebrig===0} onClick={()=>heAbziehen(aktiverPass)} className="btn-a" style={{flex:1,minWidth:160,padding:"16px 18px",borderRadius:18,border:"none",background:heUebrig===0?T.bgPale:T.olive,color:heUebrig===0?T.textLight:"#fff",cursor:heUebrig===0?"not-allowed":"pointer",opacity:heUebrig===0?0.4:1,fontWeight:700,fontSize:15,boxShadow:heUebrig===0?"none":`0 4px 16px ${T.olive}30`,lineHeight:1.5}}>✓ Termin war heute<br/><span style={{fontSize:12,fontWeight:400,opacity:0.75}}>Haupteinheit −1</span></button>
                  <button disabled={bsUebrig===0} onClick={()=>setBsModal(aktiverPass)} className="btn-a" style={{flex:1,minWidth:160,padding:"16px 18px",borderRadius:18,border:"none",background:bsUebrig===0?T.bgPale:T.olive,color:bsUebrig===0?T.textLight:"#fff",cursor:bsUebrig===0?"not-allowed":"pointer",opacity:bsUebrig===0?0.4:1,fontWeight:700,fontSize:15,boxShadow:bsUebrig===0?"none":`0 4px 16px ${T.olive}30`,lineHeight:1.5}}>✓ Termin war heute<br/><span style={{fontSize:12,fontWeight:400,opacity:0.75}}>Gruppenangebot −1</span></button>
                </div>)}
              </div>
              <div className="stammk-row" style={{display:"flex",gap:12,alignItems:"center",paddingTop:12,marginTop:6,borderTop:`1px solid ${T.cardBorder}`}}>
                <span style={{color:T.textLight,minWidth:90,flexShrink:0,fontSize:14}}>Stammkunde:</span>
                <div className="stammk-inner" style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                  {["Ja","Nein"].map(opt=>{const ak=opt==="Ja"?!!selPat.stammkunde:!selPat.stammkunde;return(<button key={opt} onClick={()=>updatePatient(selPat.id,{stammkunde:opt==="Ja"})} style={{padding:"6px 20px",borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer",border:`1px solid ${ak?(opt==="Ja"?T.green:T.text)+"40":T.cardBorder}`,background:ak?(opt==="Ja"?T.greenSoft:T.olive+"12"):"transparent",color:ak?(opt==="Ja"?T.green:T.text):T.textLight,transition:"all 0.15s"}}>{opt}</button>);})}
                  {selPat.stammkunde&&<div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:14,color:T.textMid}}>Preis:</span><input type="number" min={0} value={selPat.stammpreis||""} onChange={e=>updatePatient(selPat.id,{stammpreis:e.target.value})} placeholder="420" style={{width:90,padding:"6px 10px",borderRadius:10,border:`1px solid ${T.cardBorder}`,fontSize:14,background:T.inp,color:T.text,outline:"none"}}/><span style={{fontSize:14,color:T.textMid}}>€</span></div>}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:8}}><SectionLabel>Angebote & Pässe</SectionLabel><Btn small gold onClick={()=>setKaufModal(true)}>+ Hinzufügen</Btn></div>
            {aktPaesse.length===0&&patEinzel.length===0&&altPaesse.length===0&&<p style={{color:T.textLight,textAlign:"center",fontSize:15}}>Noch keine Angebote</p>}
            {aktPaesse.map(pk=><PassCard key={pk.id} pk={pk} isAlt={false}/>)}
            {patEinzel.length>0&&(<div style={{marginTop:aktPaesse.length>0?14:0}}><div style={{fontSize:12,fontWeight:700,color:T.textLight,textTransform:"uppercase",letterSpacing:2,marginBottom:12}}>Einzelangebote</div>
              {patEinzel.map(e=>(<div key={e.id} className="einzel-row" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 18px",borderRadius:12,border:`1px solid ${T.cardBorder}`,background:T.cream+"80",marginBottom:8}}>
                <div style={{display:"flex",flexDirection:"column",gap:4}}><span style={{fontSize:15,fontWeight:600,color:T.text}}>{e.name}</span><div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}><code style={{background:T.bgPale,padding:"3px 10px",borderRadius:8,fontSize:12,color:T.textLight}}>{e.rechnung||"–"}</code><span style={{fontSize:14,color:T.textMid}}>{fmtDate(e.datum)}</span><strong style={{fontSize:14,color:T.text}}>{e.preis||0} €</strong></div></div>
                <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",fontSize:12,fontWeight:700,textTransform:"uppercase",color:e.bezahlt?T.green:T.red,background:e.bezahlt?T.greenSoft:T.redSoft,padding:"6px 14px",borderRadius:10,flexShrink:0}}><input type="checkbox" checked={!!e.bezahlt} onChange={()=>toggleEinzelBez(e.id)} style={{accentColor:T.green,width:15,height:15}}/>{e.bezahlt?"Bezahlt":"Offen"}</label>
              </div>))}</div>)}
            {altPaesse.length>0&&<div style={{marginTop:18,paddingTop:16,borderTop:`1px solid ${T.cardBorder}`}}><div style={{fontSize:12,fontWeight:700,color:T.textLight,textTransform:"uppercase",letterSpacing:2,marginBottom:12}}>Alte Pässe</div><div style={{fontSize:14,color:T.textLight,textAlign:"center",padding:8}}>→ siehe Verkaufshistorie</div></div>}
          </Card>

          <Card>
            <SectionLabel>Verkaufshistorie & Alte Pässe</SectionLabel>
            {alleVerkaufe.length===0&&<p style={{color:T.textLight,textAlign:"center",fontSize:15}}>Noch keine Verkäufe</p>}
            {alleVerkaufe.map(item=>(<div key={item.id} className="vk-row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:item.isAlt?T.bgPale+"50":T.bgPale+"80",borderRadius:12,fontSize:15,marginBottom:6,flexWrap:"wrap",gap:8,opacity:item.isAlt?0.7:1}}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><Badge variant={item.art==="pass"?"gold":"blue"} small>{item.art==="pass"?"Flossenpass":"Einzelangebot"}</Badge>{item.isAlt&&<Badge variant="cream" small>Alt</Badge>}<span style={{fontWeight:600,color:T.text}}>{item.name}</span><code style={{background:T.bgPale,padding:"3px 10px",borderRadius:8,fontSize:12,color:T.textLight}}>{item.rechnung||"–"}</code></div>
              <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0,flexWrap:"wrap"}}><span style={{fontSize:13,color:T.textLight}}>{fmtDate(item.datum)}</span><strong style={{fontFamily:"Georgia,serif",fontSize:15,color:T.oliveDark}}>{item.preis} €</strong><Badge variant={item.bezahlt?"green":"red"} small>{item.bezahlt?"Bezahlt":"Offen"}</Badge><button onClick={()=>{if(item.art==="pass")setConfirmDelete(item.id);else{if(confirm("Einzelangebot löschen?")){(async()=>{await supabase.from("einzel").delete().eq("id",item.id);setEinzel(prev=>prev.filter(e=>e.id!==item.id));})();}}}} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${T.red}25`,background:T.redSoft,color:T.red,fontSize:11,fontWeight:700,cursor:"pointer"}}>✕</button></div>
            </div>))}
            {alleVerkaufe.length>0&&<div style={{marginTop:14,paddingTop:12,borderTop:`1px solid ${T.cardBorder}`,display:"flex",justifyContent:"flex-end",gap:18,fontSize:14,flexWrap:"wrap"}}><span style={{color:T.textLight}}>Gesamt: <strong style={{color:T.text}}>{alleVerkaufe.reduce((s,i)=>s+i.preis,0).toLocaleString("de-DE")} €</strong></span><span style={{color:T.textLight}}>Bezahlt: <strong style={{color:T.green}}>{alleVerkaufe.filter(i=>i.bezahlt).reduce((s,i)=>s+i.preis,0).toLocaleString("de-DE")} €</strong></span><span style={{color:T.textLight}}>Offen: <strong style={{color:T.red}}>{alleVerkaufe.filter(i=>!i.bezahlt).reduce((s,i)=>s+i.preis,0).toLocaleString("de-DE")} €</strong></span></div>}
          </Card>

          <Card>
            <SectionLabel>Einheiten-Verlauf</SectionLabel>
            {patLog.filter(l=>l.typ!=="NOTIZ").length===0&&<p style={{color:T.textLight,textAlign:"center",fontSize:15}}>Noch kein Verlauf</p>}
            {patLog.filter(l=>l.typ!=="NOTIZ").map((l,i)=>{const b=logBadge(l.typ);return(<div key={l.id} className="slide-in log-row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:T.bgPale+"80",borderRadius:12,fontSize:15,marginBottom:6,animationDelay:`${i*0.03}s`}}><div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><Badge variant={b.v} small>{b.label}</Badge><span style={{color:T.text}}>{l.notiz}</span></div><span style={{fontSize:13,color:T.textLight,flexShrink:0,marginLeft:8}}>{fmtDateTime(l.datum)}</span></div>);})}
          </Card>

          <Card>
            <SectionLabel>Notizen</SectionLabel>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:18}}><textarea value={notizText} onChange={e=>setNotizText(e.target.value)} placeholder="Notiz eingeben..." rows={3} style={{...inp,resize:"vertical",lineHeight:1.7}}/><div style={{display:"flex",justifyContent:"flex-end"}}><Btn small gold disabled={!notizText.trim()} onClick={notizSpeichern}>Notiz speichern</Btn></div></div>
            {patLog.filter(l=>l.typ==="NOTIZ").length===0&&<p style={{color:T.textLight,textAlign:"center",fontSize:15}}>Noch keine Notizen</p>}
            {patLog.filter(l=>l.typ==="NOTIZ").map(l=>(<div key={l.id} style={{padding:"12px 16px",background:T.gold+"15",borderRadius:12,fontSize:15,marginBottom:6,borderLeft:`3px solid ${T.gold}`}}><div style={{fontSize:13,color:T.textLight,marginBottom:5}}>{fmtDateTime(l.datum)}</div><div style={{color:T.text,lineHeight:1.7,wordBreak:"break-word"}}>{l.notiz}</div></div>))}
          </Card>
        </div>

        <div className="qr-sidebar" style={{position:"sticky",top:78}}>
          <Card style={{textAlign:"center"}}><SectionLabel>QR-Code</SectionLabel><div style={{background:T.cream,borderRadius:16,padding:18,display:"inline-block",marginBottom:14}}><QRCode value={selPat.qr} size={140}/></div>
            <div style={{display:"flex",flexDirection:"column",gap:8,textAlign:"left"}}>{[["Token",<code style={{fontFamily:"monospace",fontSize:12,color:T.textLight,wordBreak:"break-all"}}>{selPat.qr}</code>],["Name",`${selPat.vorname||""} ${selPat.nachname||""}`],["Seit",fmtDate(selPat.erstellt)],["Pass",aktiverPass?`Flossenpass ${getPassLabel(aktiverPass)}`:"–"]].map(([l,v])=>(<div key={l} style={{display:"flex",gap:8,alignItems:"flex-start"}}><span style={{fontSize:12,color:T.textLight,minWidth:36,flexShrink:0}}>{l}</span><span style={{fontSize:14,color:T.text,fontWeight:500}}>{v}</span></div>))}</div>
          </Card>
        </div>
      </div>
    </div>)}
  </div>);
};

const kundenLogBadge=(typ)=>{const m={HAUPTEINHEIT:{label:"Therapeutische Haupteinheit",v:"green"},BS:{label:"Sound Bath, Yoga und Co.",v:"gold"},QUICKIE:{label:"Psycho Quickie",v:"purple"},TDCS:{label:"tDCS",v:"blue"},NEUROFEEDBACK:{label:"Neurofeedback",v:"blue"}};return m[typ]||{label:typ||"–",v:"cream"};};

/* ═══════════════════════════════════════════════════════════════
   KUNDEN-APP – Elegant Redesign
   ═══════════════════════════════════════════════════════════════ */
const KundenApp=({kunde,paesse,log,einzel})=>{
  const [splash,setSplash]=useState(true);const[splashAnim,setSplashAnim]=useState(false);
  const mp=paesse.filter(p=>p.pat_id===kunde.id),ml=log.filter(l=>l.pat_id===kunde.id&&l.typ!=="NOTIZ"&&l.typ!=="KORREKTUR").sort((a,b)=>(b.datum||"").localeCompare(a.datum||""));
  const me=einzel.filter(e=>e.pat_id===kunde.id),ap=mp.find(p=>!isPassAlt(p));
  const altePaesse=mp.filter(p=>isPassAlt(p));

  useEffect(()=>{const t1=setTimeout(()=>setSplashAnim(true),1800);const t2=setTimeout(()=>setSplash(false),2600);return()=>{clearTimeout(t1);clearTimeout(t2);};},[]);

  if(splash)return(
    <div className={splashAnim?"splash-out":""} style={{minHeight:"100vh",background:T.oliveDark,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"fixed",inset:0,zIndex:200}}>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 40%,rgba(184,168,138,0.06) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div className="landing-title" style={{fontFamily:"Georgia,serif",fontWeight:700,fontSize:"clamp(32px,8vw,48px)",letterSpacing:4,textTransform:"uppercase",color:T.gold,lineHeight:1.1,position:"relative",zIndex:1}}>Kaiserufer</div>
      <div className="landing-sub" style={{fontSize:"clamp(13px,3vw,16px)",color:"rgba(184,168,138,0.35)",letterSpacing:6,textTransform:"uppercase",fontWeight:300,marginTop:8,position:"relative",zIndex:1}}>Home</div>
    </div>
  );

  const heL=ap?(ap.he_total||0)-(ap.he_genutzt||0):0;
  const bsL=ap?(ap.bs_total||0)-(ap.bs_genutzt||0):0;
  const hePct=ap&&ap.he_total>0?((ap.he_genutzt||0)/ap.he_total)*100:0;
  const bsPct=ap&&ap.bs_total>0?((ap.bs_genutzt||0)/ap.bs_total)*100:0;
  const appBg=`linear-gradient(180deg,${T.bg} 0%,${T.bgLight} 50%,${T.bgLighter} 100%)`;

  return(<div className="content-in" style={{minHeight:"100vh",background:appBg}}>
    {/* Sticky Nav */}
    <div style={{background:T.olive+"F0",backdropFilter:"blur(12px)",padding:"0 24px",display:"flex",justifyContent:"center",alignItems:"center",borderBottom:`1px solid ${T.olive}30`,position:"sticky",top:0,zIndex:100,height:52}} className="nav-bar">
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontFamily:"Georgia,serif",fontWeight:700,fontSize:15,letterSpacing:2.5,textTransform:"uppercase",color:T.goldLight}}>Kaiserufer</span>
        <div style={{width:1,height:18,background:T.goldLight+"40",borderRadius:1}}/>
        <span style={{fontSize:12,color:T.goldLight+"80",fontWeight:500,letterSpacing:1.5,textTransform:"uppercase"}}>Home</span>
      </div>
    </div>

    <div className="k-resp-pad" style={{padding:"0 20px 48px",maxWidth:540,margin:"0 auto"}}>

      {/* Hero Greeting */}
      <div className="kunde-hero" style={{textAlign:"center",padding:"36px 0 28px"}}>
        <div style={{fontSize:11,color:T.gold,textTransform:"uppercase",letterSpacing:3,fontWeight:600,marginBottom:8}}>Willkommen zurück</div>
        <h1 style={{fontFamily:"Georgia,serif",fontWeight:700,fontSize:"clamp(26px,6vw,34px)",color:T.oliveDark,margin:"0 0 6px",letterSpacing:0.5,lineHeight:1.2}}>Hallo {kunde.vorname}</h1>
        <div style={{width:40,height:2,background:`linear-gradient(90deg,transparent,${T.gold},transparent)`,margin:"12px auto 0",borderRadius:2}}/>
        {kunde.stammkunde&&<div style={{marginTop:16,fontSize:13,color:T.gold,fontWeight:600,letterSpacing:0.5,fontFamily:"Georgia,serif"}}>VIP-Mitglied · Ihr exklusiver Vorteilstarif ist hinterlegt</div>}
      </div>

      {/* Aktiver Flossenpass */}
      {ap&&(<div className="kunde-card kunde-card-1" style={{marginBottom:24}}>
        {/* Gold accent line */}
        <div style={{height:2,background:`linear-gradient(90deg,transparent,${T.gold},transparent)`,marginBottom:24,borderRadius:2}}/>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24,flexWrap:"wrap",gap:8,padding:"0 4px"}}>
          <div>
            <div style={{fontSize:11,color:T.gold,textTransform:"uppercase",letterSpacing:2.5,marginBottom:4,fontWeight:700,fontFamily:"Georgia,serif"}}>Dein Flossenpass</div>
            <div style={{fontFamily:"Georgia,serif",fontWeight:700,fontSize:28,color:T.oliveDark,letterSpacing:0.5}}>{getPassLabel(ap)}</div>
          </div>
          <span style={{fontSize:12,color:T.textLight,fontWeight:500,marginTop:4}}>seit {fmtDate(ap.datum)}</span>
        </div>

        {/* Einheiten */}
        <div className="kunden-units" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
          {[{label:"Haupteinheit",labelP:"Haupteinheiten",left:heL,total:ap.he_total||0,pct:hePct},{label:"Gruppenangebot",labelP:"Gruppenangebote",left:bsL,total:ap.bs_total||0,pct:bsPct}].map((u,ui)=>(
            <div key={ui} style={{textAlign:"center",padding:"22px 12px 18px",borderRadius:16,border:`1.5px solid ${T.gold}50`,background:`linear-gradient(180deg,${T.gold}08,${T.gold}15)`}}>
              <div style={{fontSize:44,fontWeight:700,fontFamily:"Georgia,serif",color:T.oliveDark,lineHeight:1,marginBottom:4}}>{u.left}</div>
              <div style={{fontSize:12,color:T.textLight,marginBottom:2}}>von {u.total}</div>
              <div style={{fontSize:13,color:T.oliveDark,fontWeight:600}}>{u.left===1?u.label:u.labelP}</div>
              <div style={{marginTop:12,padding:"0 10px"}}><Bar used={u.pct} total={100} color={T.gold} h={3}/></div>
            </div>
          ))}
        </div>

        {/* Booking Buttons */}
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          <a href="https://connect.shore.com/bookings/kaiserufer/services?locale=de" target="_blank" rel="noopener noreferrer" className="btn-a" style={{padding:"10px 22px",borderRadius:12,background:T.bgPale,color:heL===0?T.textLight:T.oliveDark,fontWeight:600,fontSize:13,textDecoration:"none",textAlign:"center",pointerEvents:heL===0?"none":"auto",opacity:heL===0?0.35:1,letterSpacing:0.3,border:`1px solid ${T.cardBorder}`}}>Therapie buchen</a>
          <a href="https://www.eversports.de/widget/w/5tMWoO" target="_blank" rel="noopener noreferrer" className="btn-a" style={{padding:"10px 22px",borderRadius:12,background:T.bgPale,color:bsL===0?T.textLight:T.oliveDark,fontWeight:600,fontSize:13,textDecoration:"none",textAlign:"center",pointerEvents:bsL===0?"none":"auto",opacity:bsL===0?0.35:1,letterSpacing:0.3,border:`1px solid ${T.cardBorder}`}}>Kurs buchen</a>
        </div>

        {heL===0&&bsL===0&&<div style={{textAlign:"center",marginTop:16,fontSize:14,color:T.red,fontWeight:600}}>Alle Einheiten aufgebraucht – sprich uns gerne an!</div>}
      </div>)}

      {/* Kein Pass */}
      {mp.length===0&&me.length===0&&(<Card className="kunde-card kunde-card-1" style={{textAlign:"center",padding:"48px 28px",marginBottom:16}}>
        <div style={{fontSize:36,marginBottom:16,opacity:0.4}}>🐟</div>
        <p style={{color:T.textMid,lineHeight:1.8,fontSize:16,margin:0}}>Du hast noch keine Angebote.<br/><span style={{color:T.textLight}}>Sprich uns gerne an!</span></p>
      </Card>)}

      {/* Alte Pässe */}
      {altePaesse.length>0&&(<Card className="kunde-card kunde-card-2" style={{marginBottom:16,padding:20}}>
        <div style={{fontSize:12,fontWeight:700,color:T.textLight,textTransform:"uppercase",letterSpacing:2,marginBottom:12}}>Abgeschlossene Pässe</div>
        {altePaesse.map(pk=>(<div key={pk.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${T.cardBorder}`,flexWrap:"wrap",gap:6}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontFamily:"Georgia,serif",fontSize:15,fontWeight:600,color:T.textMid}}>Flossenpass {getPassLabel(pk)}</span>
            <Badge variant="cream" small>Aufgebraucht</Badge>
          </div>
          <span style={{fontSize:13,color:T.textLight}}>{fmtDate(pk.datum)}</span>
        </div>))}
      </Card>)}

      {/* Verlauf */}
      {ml.length>0&&(<Card className="kunde-card kunde-card-3" style={{marginBottom:16,padding:20}}>
        <SectionLabel>Mein Verlauf</SectionLabel>
        {ml.map((l,i)=>{const b=kundenLogBadge(l.typ);return(<div key={l.id} className="slide-in log-row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<ml.length-1?`1px solid ${T.cardBorder}`:"none",fontSize:15,animationDelay:`${i*0.04}s`}}>
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <Badge variant={b.v} small>{b.label}</Badge>
            <span style={{color:T.textMid,fontSize:14}}>{l.notiz}</span>
          </div>
          <span style={{color:T.textLight,fontSize:13,flexShrink:0,marginLeft:8}}>{fmtDate(l.datum)}</span>
        </div>);})}
      </Card>)}

      {/* Rechnungen */}
      {(mp.length>0||me.length>0)&&(<Card className="kunde-card kunde-card-4" style={{marginBottom:16,padding:20}}>
        <SectionLabel>Meine Rechnungen</SectionLabel>
        {mp.map((pk,i)=>(<div key={pk.id} className="rechnung-row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<mp.length+me.length-1?`1px solid ${T.cardBorder}`:"none",fontSize:15}}>
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <code style={{background:T.bgPale,padding:"3px 10px",borderRadius:8,fontSize:12,color:T.textLight}}>{pk.rechnung||"–"}</code>
            <span style={{color:T.textMid,fontSize:14}}>Flossenpass {getPassLabel(pk)}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
            <span style={{color:T.textLight,fontSize:13}}>{fmtDate(pk.datum)}</span>
            <strong style={{fontFamily:"Georgia,serif",color:T.oliveDark,fontSize:15}}>{pk.preis||0} €</strong>
          </div>
        </div>))}
        {me.map((e,i)=>(<div key={e.id} className="rechnung-row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<me.length-1?`1px solid ${T.cardBorder}`:"none",fontSize:15}}>
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <code style={{background:T.bgPale,padding:"3px 10px",borderRadius:8,fontSize:12,color:T.textLight}}>{e.rechnung||"–"}</code>
            <span style={{color:T.textMid,fontSize:14}}>{e.name}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
            <span style={{color:T.textLight,fontSize:13}}>{fmtDate(e.datum)}</span>
            <strong style={{fontFamily:"Georgia,serif",color:T.oliveDark,fontSize:15}}>{e.preis||0} €</strong>
          </div>
        </div>))}
      </Card>)}

      {/* Footer */}
      <div style={{textAlign:"center",padding:"40px 0 12px"}}>
        <div style={{width:48,height:1,background:`linear-gradient(90deg,transparent,${T.gold}60,transparent)`,margin:"0 auto 18px"}}/>
        <a href="https://kaiserufer.com" target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:T.oliveDark,textDecoration:"none",letterSpacing:2.5,textTransform:"uppercase",fontWeight:600,fontFamily:"Georgia,serif"}}>kaiserufer.com ↗</a>
        <div style={{marginTop:10}}><a href="https://kaiserufer.com/datenschutz/" target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:T.textLight,textDecoration:"none",letterSpacing:1,textTransform:"uppercase"}}>Datenschutz</a></div>
      </div>
    </div>
  </div>);
};

export default function App(){
  const [mode,setMode]=useState("kunde");const[showLogin,setShowLogin]=useState(false);
  const [patienten,setPatienten]=useState([]);const[paesse,setPaesse]=useState([]);
  const [log,setLog]=useState([]);const[einzel,setEinzel]=useState([]);
  const [rechnungsNr,setRechnungsNr]=useState(0);const[loading,setLoading]=useState(true);
  const urlToken=new URLSearchParams(window.location.search).get("token");
  useEffect(()=>{(async()=>{setLoading(true);try{const[p,pk,l,e,cfg]=await Promise.all([supabase.from("patienten").select("*"),supabase.from("paesse").select("*"),supabase.from("log").select("*"),supabase.from("einzel").select("*"),supabase.from("einstellungen").select("*").eq("key","rechnungs_nr").single()]);if(p.data)setPatienten(p.data);if(pk.data)setPaesse(pk.data);if(l.data)setLog(l.data);if(e.data)setEinzel(e.data);if(cfg.data)setRechnungsNr(parseInt(cfg.data.value)||0);}catch(err){console.error("Ladefehler:",err);}setLoading(false);})();},[]);
  const loginPat=urlToken?patienten.find(p=>p.qr===urlToken.toUpperCase()):null;
  const appBg=`linear-gradient(180deg,${T.bg} 0%,${T.bgLight} 50%,${T.bgLighter} 100%)`;

  if(loading)return(<div style={{fontFamily:"'Inter','Segoe UI',-apple-system,sans-serif",minHeight:"100vh",background:appBg}}><style>{css}</style><Spinner/></div>);

  return(<div style={{fontFamily:"'Inter','Segoe UI',-apple-system,sans-serif",minHeight:"100vh",background:loginPat?undefined:appBg}}>
    <style>{css}</style>
    {showLogin&&<LoginModal onLogin={()=>{setShowLogin(false);setMode("staff");}} onClose={()=>setShowLogin(false)}/>}
    {mode==="staff"&&<div style={{background:T.olive+"F0",backdropFilter:"blur(12px)",color:T.cream,padding:"0 28px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${T.olive}30`,position:"sticky",top:0,zIndex:100,height:58}} className="nav-bar">
      <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontFamily:"Georgia,serif",fontWeight:700,fontSize:17,letterSpacing:2.5,textTransform:"uppercase",color:T.goldLight}}>Kaiserufer</span><div style={{width:1,height:22,background:T.goldLight+"40",borderRadius:1}}/><span style={{fontSize:13,color:T.goldLight+"80",fontWeight:500,letterSpacing:1.5,textTransform:"uppercase"}}>Home</span></div>
      <div>{mode==="staff"&&<button onClick={()=>setMode("kunde")} style={{padding:"7px 18px",borderRadius:12,border:"1px solid rgba(255,255,255,0.2)",background:"transparent",color:"rgba(255,255,255,0.7)",fontWeight:600,fontSize:12,cursor:"pointer",textTransform:"uppercase",letterSpacing:0.8,fontFamily:"inherit"}}>Abmelden</button>}</div>
    </div>}
    {mode==="staff"
      ?<MitarbeiterApp patienten={patienten} setPatienten={setPatienten} paesse={paesse} setPaesse={setPaesse} log={log} setLog={setLog} rechnungsNr={rechnungsNr} setRechnungsNr={setRechnungsNr} einzel={einzel} setEinzel={setEinzel}/>
      :loginPat
        ?<KundenApp kunde={loginPat} paesse={paesse} log={log} einzel={einzel}/>
        :<div style={{minHeight:"100vh",background:`linear-gradient(180deg,${T.land0} 0%,${T.land1} 40%,${T.land2} 70%,${T.land3} 100%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 20px",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 30%,rgba(184,168,138,0.06) 0%,transparent 70%)",pointerEvents:"none"}}/>
          <div style={{position:"absolute",top:"15%",left:"50%",transform:"translateX(-50%)",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(184,168,138,0.04) 0%,transparent 70%)",filter:"blur(60px)",pointerEvents:"none"}}/>
          <div style={{position:"relative",zIndex:1,textAlign:"center",maxWidth:480}}>
            <div className="landing-title" style={{fontFamily:"Georgia,serif",fontWeight:700,fontSize:"clamp(36px,8vw,56px)",letterSpacing:4,textTransform:"uppercase",color:T.gold,marginBottom:8,lineHeight:1.1}}>Kaiserufer</div>
            <div className="landing-sub" style={{fontSize:"clamp(14px,3vw,18px)",color:"rgba(184,168,138,0.4)",letterSpacing:6,textTransform:"uppercase",fontWeight:300,marginBottom:48}}>Home</div>
            <div className="landing-btn" style={{marginTop:48}}><button onClick={()=>setShowLogin(true)} style={{padding:"16px 48px",borderRadius:50,fontWeight:600,fontSize:14,cursor:"pointer",background:"transparent",color:T.gold,border:"1px solid rgba(184,168,138,0.25)",letterSpacing:2,textTransform:"uppercase",fontFamily:"inherit",backdropFilter:"blur(8px)",transition:"all 0.4s cubic-bezier(0.4,0,0.2,1)",boxShadow:"0 0 30px rgba(184,168,138,0.05)"}}>Log in</button></div>
            <div className="landing-footer" style={{marginTop:64}}><div style={{width:40,height:1,background:"rgba(184,168,138,0.15)",margin:"0 auto 20px"}}/><a href="https://kaiserufer.com" target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:"rgba(184,168,138,0.25)",textDecoration:"none",letterSpacing:2,textTransform:"uppercase"}}>kaiserufer.com</a></div>
          </div>
        </div>}
  </div>);
}
