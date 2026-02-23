import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

const T = {
  bg0:"#0A0E06",bg1:"#141A10",bg2:"#1E2618",bg3:"#2A3424",bg4:"#3A4434",
  gold:"#B8A88A",goldLight:"#D4C9AD",goldDim:"rgba(184,168,138,0.4)",goldFaint:"rgba(184,168,138,0.12)",
  cream:"#F0EDE0",creamDim:"rgba(240,237,224,0.7)",creamFaint:"rgba(240,237,224,0.4)",
  red:"#E05555",redDim:"rgba(224,85,85,0.15)",
  green:"#7EBF6A",greenDim:"rgba(126,191,106,0.15)",
  blue:"#6AA8D0",blueDim:"rgba(106,168,208,0.15)",
  purple:"#A07ED0",purpleDim:"rgba(160,126,208,0.15)",
  card:"rgba(26,34,20,0.7)",cardBorder:"rgba(184,168,138,0.1)",
  cardHover:"rgba(34,44,28,0.8)",
  inp:"#1A2214",
};

const PASS_TYPES = {
  BASIS:{name:"Basis",he:3,bs:1,preis:299},
  PLUS:{name:"Plus",he:5,bs:3,preis:499},
  DELUXE:{name:"Deluxe",he:10,bs:5,preis:899},
};
const EINZELANGEBOTE = [
  {key:"QUICKIE",name:"Psycho Quickie",preis:70},
  {key:"TDCS",name:"tDCS",preis:55},
  {key:"NEUROFEEDBACK",name:"Neurofeedback 5er Karte",preis:350},
];
const PASS_OPTIONS = [
  {key:"BASIS",label:"Basis – 3 HE · 1 GA",he:3,bs:1,preis:299},
  {key:"PLUS",label:"Plus – 5 HE · 3 GA",he:5,bs:3,preis:499},
  {key:"DELUXE",label:"Deluxe – 10 HE · 5 GA",he:10,bs:5,preis:899},
  {key:"INDIVIDUELL",label:"Individuell",he:0,bs:0,preis:0},
];
const EINZEL_OPTIONS = EINZELANGEBOTE.map(e=>e.name);
const getPassName=(typ)=>PASS_TYPES[typ]?.name??"Individuell";
const getPassLabel=(pk)=>{if(!pk)return"–";if(pk.typ==="INDIVIDUELL"||!PASS_TYPES[pk.typ])return pk.custom_name||"Individuell";return PASS_TYPES[pk.typ].name;};

const LOGIN_PASS=import.meta.env.VITE_LOGIN_PASS;
const LOGIN_EMAIL=import.meta.env.VITE_LOGIN_EMAIL;
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
  .landing-title{animation:fadeUp 1s ease-out,goldGlow 4s ease-in-out infinite}
  .landing-sub{animation:fadeUp2 1s ease-out 0.3s both}
  .landing-btn{animation:fadeUp2 1s ease-out 0.6s both}
  .landing-footer{animation:fadeUp2 1s ease-out 0.9s both}
  .card-h{transition:all 0.3s cubic-bezier(0.4,0,0.2,1)}
  .card-h:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(0,0,0,0.3),0 0 20px rgba(184,168,138,0.04)}
  .btn-a{transition:all 0.2s cubic-bezier(0.4,0,0.2,1)}
  .btn-a:hover:not(:disabled){transform:translateY(-1px)}
  .fade-in{animation:fadeIn 0.35s ease-out}
  .slide-in{animation:slideIn 0.3s ease-out both}
  *{box-sizing:border-box;scrollbar-width:thin;scrollbar-color:rgba(184,168,138,0.2) transparent}
  ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(184,168,138,0.2);border-radius:3px}
  input,textarea,select,button{font-family:inherit}
  ::selection{background:rgba(184,168,138,0.3);color:#F0EDE0}
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

const Badge=({children,variant="default",small})=>{
  const s={default:{bg:"rgba(240,237,224,0.08)",color:T.creamDim},gold:{bg:T.goldFaint,color:T.gold},green:{bg:T.greenDim,color:T.green},red:{bg:T.redDim,color:T.red},cream:{bg:"rgba(240,237,224,0.06)",color:T.creamFaint},blue:{bg:T.blueDim,color:T.blue},purple:{bg:T.purpleDim,color:T.purple}};
  const st=s[variant]||s.default;
  return<span style={{background:st.bg,color:st.color,fontWeight:600,fontSize:small?10:12,padding:small?"3px 10px":"5px 14px",borderRadius:20,whiteSpace:"nowrap",letterSpacing:0.4,textTransform:"uppercase"}}>{children}</span>;
};

const Bar=({used,total,color=T.gold,h=6})=>(
  <div style={{background:"rgba(184,168,138,0.1)",borderRadius:20,height:h,width:"100%",overflow:"hidden"}}>
    <div style={{background:color,height:"100%",width:`${total>0?(used/total)*100:0}%`,borderRadius:20,transition:"width 0.6s ease"}}/>
  </div>
);

const Card=({children,style,onClick,className=""})=>(
  <div onClick={onClick} className={`${onClick?"card-h":""} ${className}`} style={{
    background:T.card,color:T.cream,borderRadius:20,border:`1px solid ${T.cardBorder}`,
    padding:24,cursor:onClick?"pointer":"default",backdropFilter:"blur(12px)",
    boxShadow:"0 4px 24px rgba(0,0,0,0.2)",...style
  }}>{children}</div>
);

const Btn=({children,onClick,gold,small,disabled,danger,ghost,style:s,className=""})=>(
  <button disabled={disabled} onClick={onClick} className={`btn-a ${className}`} style={{
    padding:small?"8px 18px":"12px 26px",borderRadius:14,fontWeight:600,
    fontSize:small?13:15,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.35:1,
    letterSpacing:0.5,textTransform:"uppercase",lineHeight:1.5,
    background:danger?T.red:ghost?"transparent":gold?`linear-gradient(135deg,${T.gold},#9A8A6A)`:T.bg3,
    color:danger?"#fff":gold?T.bg0:ghost?T.goldDim:T.cream,
    border:ghost?`1px solid ${T.cardBorder}`:"none",
    boxShadow:gold?`0 4px 20px rgba(184,168,138,0.2)`:danger?`0 4px 16px rgba(224,85,85,0.2)`:"none",...s
  }}>{children}</button>
);

const SectionLabel=({children})=>(
  <div style={{fontSize:13,fontWeight:700,color:T.gold,marginBottom:16,textTransform:"uppercase",letterSpacing:2.5,fontFamily:"Georgia,serif"}}>{children}</div>
);

const Heading=({children,style})=>(
  <h2 style={{fontFamily:"Georgia,serif",fontWeight:700,color:T.gold,margin:0,fontSize:26,letterSpacing:1,...style}}>{children}</h2>
);

const QRCode=({value,size=120})=>(
  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=https://kaiserufer-home.vercel.app?token=${value}&color=B8A88A&bgcolor=141A10`} width={size} height={size} style={{borderRadius:12}} alt="QR"/>
);

const Modal=({children,onClose})=>(
  <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(6,8,4,0.75)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16}}>
    <div onClick={e=>e.stopPropagation()} style={{maxWidth:"100%",maxHeight:"90vh",overflowY:"auto"}}>{children}</div>
  </div>
);

const Donut=({value,total,size=56,color=T.green})=>{
  const r=20,circ=2*Math.PI*r,pct=total>0?value/total:0;
  return(
    <svg width={size} height={size} viewBox="0 0 48 48">
      <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(184,168,138,0.1)" strokeWidth="5"/>
      <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="5" strokeDasharray={`${circ*pct} ${circ*(1-pct)}`} strokeDashoffset={circ*0.25} strokeLinecap="round" style={{transition:"stroke-dasharray 0.8s ease"}}/>
      <text x="24" y="26" textAnchor="middle" fontSize="12" fontWeight="700" fill={T.gold} fontFamily="Georgia,serif">{Math.round(pct*100)}%</text>
    </svg>
  );
};

const logBadge=(typ)=>{
  const m={HAUPTEINHEIT:{label:"Haupteinheit",v:"green"},BS:{label:"Gruppenangebot",v:"gold"},KORREKTUR:{label:"Korrektur",v:"red"},NOTIZ:{label:"Notiz",v:"cream"},QUICKIE:{label:"Psycho Quickie",v:"purple"},TDCS:{label:"tDCS",v:"blue"},NEUROFEEDBACK:{label:"Neurofeedback",v:"blue"}};
  return m[typ]||{label:typ||"–",v:"cream"};
};

const Spinner=()=>(
  <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:60}}>
    <div style={{width:32,height:32,border:`3px solid ${T.goldFaint}`,borderTopColor:T.gold,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
  </div>
);

const LoginModal=({onLogin,onClose})=>{
  const [email,setEmail]=useState("");const [pw,setPw]=useState("");const [err,setErr]=useState("");
  const tryLogin=()=>{
    if(!email.trim()||!pw.trim()){setErr("Bitte alle Felder ausfüllen");return;}
    if(LOGIN_EMAIL&&email.toLowerCase().trim()!==LOGIN_EMAIL.toLowerCase()){setErr("Ungültige Anmeldedaten");setPw("");return;}
    if(pw===LOGIN_PASS){onLogin();}else{setErr("Ungültige Anmeldedaten");setPw("");}
  };
  const inpS={width:"100%",padding:"13px 16px",borderRadius:14,border:`1.5px solid ${err?T.red+"60":T.cardBorder}`,fontSize:15,background:T.bg2,color:T.cream,outline:"none"};
  return(
    <Modal onClose={onClose}>
      <div className="modal-box" style={{background:`linear-gradient(180deg,${T.bg1} 0%,${T.bg2} 100%)`,borderRadius:28,padding:44,width:360,textAlign:"center",boxShadow:"0 32px 80px rgba(0,0,0,0.5)",border:`1px solid ${T.cardBorder}`}}>
        <div style={{fontFamily:"Georgia,serif",fontWeight:700,fontSize:22,letterSpacing:3,textTransform:"uppercase",color:T.gold,marginBottom:4}}>Kaiserufer</div>
        <div style={{fontSize:12,color:T.goldDim,letterSpacing:2,textTransform:"uppercase",marginBottom:32}}>Log in</div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} placeholder="E-Mail Adresse" autoFocus style={{...inpS,letterSpacing:0.3}}/>
          <input type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&tryLogin()} placeholder="Passwort" style={{...inpS,letterSpacing:3}}/>
          {err&&<div style={{fontSize:13,color:T.red,fontWeight:600,padding:"4px 0"}}>{err}</div>}
          <Btn gold onClick={tryLogin} style={{marginTop:4}}>Einloggen</Btn>
          <button onClick={onClose} style={{padding:"8px",borderRadius:10,fontSize:13,cursor:"pointer",background:"transparent",color:T.goldDim,border:"none",marginTop:4}}>Abbrechen</button>
        </div>
      </div>
    </Modal>
  );
};

const StatistikPanel=({patienten,paesse,einzelArr})=>{
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
        {[{val:patienten.length,label:"Kunden"},{val:aktive,label:"Aktive Pässe"},{val:offene,label:"Offen",color:offene>0?T.red:T.gold},{val:`${(umsatz/1000).toFixed(1)}k`,label:"Umsatz (€)"}].map((s,i)=>(
          <Card key={i} style={{padding:18,textAlign:"center"}}>
            <div style={{fontSize:30,fontWeight:700,fontFamily:"Georgia,serif",color:s.color||T.gold}}>{s.val}</div>
            <div style={{color:T.creamFaint,fontSize:12,textTransform:"uppercase",letterSpacing:1.5,marginTop:6}}>{s.label}</div>
          </Card>
        ))}
      </div>
      <div className="stat-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Card style={{display:"flex",alignItems:"center",gap:18,padding:20,flexWrap:"wrap"}}>
          <Donut value={kv} total={kl} color={T.green}/>
          <div style={{flex:1,minWidth:140}}>
            <div style={{fontSize:15,fontWeight:600,color:T.cream,marginBottom:8}}>Konversionsrate</div>
            <div style={{fontSize:14,color:T.creamDim,lineHeight:2}}>
              <strong style={{color:T.cream}}>{kl}</strong> Kennenlerngespräche<br/>
              <strong style={{color:T.green}}>{kv}</strong> → Flossenpass<br/>
              <strong style={{color:T.red}}>{kl-kv}</strong> nicht konvertiert
            </div>
          </div>
        </Card>
        <Card style={{padding:20}}>
          <div style={{fontSize:15,fontWeight:600,color:T.cream,marginBottom:16}}>Einheiten-Auslastung</div>
          <div style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:14,marginBottom:6,color:T.creamDim}}><span>Haupteinheiten</span><span style={{fontWeight:600,color:T.cream}}>{gHE}/{tHE}</span></div>
            <Bar used={gHE} total={tHE} color={T.gold}/>
          </div>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:14,marginBottom:6,color:T.creamDim}}><span>Gruppenangebote</span><span style={{fontWeight:600,color:T.cream}}>{gBS}/{tBS}</span></div>
            <Bar used={gBS} total={tBS} color={T.goldLight}/>
          </div>
        </Card>
      </div>
      <Card style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:15,fontWeight:600,color:T.cream}}>Zahlungsübersicht</div>
          <div style={{fontSize:14,color:T.creamDim,marginTop:6,lineHeight:1.8}}>
            Gesamt: <strong style={{color:T.cream}}>{umsatz.toLocaleString("de-DE")} €</strong> · Bezahlt: <strong style={{color:T.green}}>{bezahlt.toLocaleString("de-DE")} €</strong> · Offen: <strong style={{color:T.red}}>{(umsatz-bezahlt).toLocaleString("de-DE")} €</strong>
          </div>
        </div>
        <Donut value={bezahlt} total={umsatz} color={T.green} size={52}/>
      </Card>
    </div>
  );
};

const KaufModal=({selPat,onKauf,onClose})=>{
  const [passTyp,setPassTyp]=useState("BASIS");
  const [passHE,setPassHE]=useState(3);const [passBS,setPassBS]=useState(1);const [passPreis,setPassPreis]=useState(299);
  const [passRechnung,setPassRechnung]=useState("");const [passDatum,setPassDatum]=useState(todayISO());const [passName,setPassName]=useState("");
  const [einzelSel,setEinzelSel]=useState(EINZELANGEBOTE[0].name);const [einzelCustom,setEinzelCustom]=useState("");
  const [einzelPreis,setEinzelPreis]=useState(EINZELANGEBOTE[0].preis);const [einzelRechnung,setEinzelRechnung]=useState("");const [einzelDatum,setEinzelDatum]=useState(todayISO());

  const inp={width:"100%",padding:"10px 14px",borderRadius:12,border:`1px solid ${T.cardBorder}`,fontSize:15,background:T.bg2,color:T.cream,outline:"none"};
  const lbl={fontSize:12,fontWeight:700,color:T.goldDim,textTransform:"uppercase",letterSpacing:1.5,marginBottom:6,display:"block"};
  const row2={display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14};
  const row3={display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14};

  const onPassTypChange=(key)=>{const opt=PASS_OPTIONS.find(p=>p.key===key);setPassTyp(key);if(key!=="INDIVIDUELL"){setPassHE(opt.he);setPassBS(opt.bs);setPassPreis(opt.preis);}else{setPassHE(0);setPassBS(0);setPassPreis(0);}};
  const onEinzelSelChange=(name)=>{setEinzelSel(name);const f=EINZELANGEBOTE.find(e=>e.name===name);if(f)setEinzelPreis(f.preis);else setEinzelPreis(0);};
  const submitPass=()=>{if(passTyp==="INDIVIDUELL"){onKauf("individuell",{name:passName||"Individuell",he:passHE,bs:passBS,datum:passDatum,rechnung:passRechnung.trim()},passPreis,"");}else{onKauf("pass",passTyp,passPreis,passRechnung.trim(),passDatum);}};
  const submitEinzel=()=>{const name=einzelCustom.trim()||einzelSel;const f=EINZELANGEBOTE.find(e=>e.name===einzelSel);const key=einzelCustom.trim()?("CUSTOM_"+einzelCustom.trim().toUpperCase().replace(/\s+/g,"_")):f?.key||"CUSTOM";onKauf("einzel",{key,name},einzelPreis,einzelRechnung.trim(),einzelDatum);};

  return(
    <Modal onClose={onClose}>
      <div className="modal-box" style={{background:`linear-gradient(180deg,${T.bg1},${T.bg2})`,borderRadius:24,padding:28,width:500,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.5)",border:`1px solid ${T.cardBorder}`}}>
        <Heading style={{marginBottom:4,fontSize:20}}>Angebot hinzufügen</Heading>
        <p style={{color:T.creamDim,fontSize:15,marginBottom:22,lineHeight:1.6}}>für <strong style={{color:T.cream}}>{selPat?.vorname} {selPat?.nachname}</strong>{selPat?.stammkunde?" · Stammkunde":""}{selPat?.stammkunde&&selPat?.stammpreis?` · Stammpreis: ${selPat.stammpreis} €`:""}</p>
        <div style={{background:T.bg3+"60",borderRadius:16,padding:20,border:`1px solid ${T.cardBorder}`,marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:2,marginBottom:16}}>Flossenpass</div>
          <div style={{marginBottom:14}}><label style={lbl}>Typ</label><select value={passTyp} onChange={e=>onPassTypChange(e.target.value)} style={inp}>{PASS_OPTIONS.map(o=><option key={o.key} value={o.key}>{o.label}</option>)}</select></div>
          {passTyp==="INDIVIDUELL"&&<div style={{marginBottom:14}}><label style={lbl}>Bezeichnung</label><input value={passName} onChange={e=>setPassName(e.target.value)} placeholder="z.B. Flossenpass Special" style={inp}/></div>}
          <div style={row3}><div><label style={lbl}>HE</label><input type="number" min={0} value={passHE} onChange={e=>setPassHE(Number(e.target.value))} style={inp}/></div><div><label style={lbl}>GA</label><input type="number" min={0} value={passBS} onChange={e=>setPassBS(Number(e.target.value))} style={inp}/></div><div><label style={lbl}>Preis (€)</label><input type="number" min={0} value={passPreis} onChange={e=>setPassPreis(Number(e.target.value))} style={inp}/></div></div>
          <div style={row2}><div><label style={lbl}>Rechnungs-Nr.</label><input value={passRechnung} onChange={e=>setPassRechnung(e.target.value)} placeholder="leer = auto" style={inp}/></div><div><label style={lbl}>Datum</label><input type="date" value={passDatum} onChange={e=>setPassDatum(e.target.value)} style={inp}/></div></div>
          <div style={{display:"flex",justifyContent:"flex-end"}}><Btn gold onClick={submitPass}>Flossenpass hinzufügen</Btn></div>
        </div>
        <div style={{background:T.bg3+"60",borderRadius:16,padding:20,border:`1px solid ${T.cardBorder}`}}>
          <div style={{fontSize:13,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:2,marginBottom:16}}>Einzelangebot</div>
          <div style={row2}><div><label style={lbl}>Auswählen</label><select value={einzelSel} onChange={e=>onEinzelSelChange(e.target.value)} style={inp}>{EINZEL_OPTIONS.map(n=><option key={n}>{n}</option>)}</select></div><div><label style={lbl}>Eigener Name</label><input value={einzelCustom} onChange={e=>setEinzelCustom(e.target.value)} placeholder="z.B. Sondersitzung" style={inp}/></div></div>
          <div style={row3}><div><label style={lbl}>Preis (€)</label><input type="number" min={0} value={einzelPreis} onChange={e=>setEinzelPreis(Number(e.target.value))} style={inp}/></div><div><label style={lbl}>Rechnungs-Nr.</label><input value={einzelRechnung} onChange={e=>setEinzelRechnung(e.target.value)} placeholder="optional" style={inp}/></div><div><label style={lbl}>Datum</label><input type="date" value={einzelDatum} onChange={e=>setEinzelDatum(e.target.value)} style={inp}/></div></div>
          <div style={{display:"flex",justifyContent:"flex-end"}}><Btn gold onClick={submitEinzel}>Einzelangebot hinzufügen</Btn></div>
        </div>
        <div style={{marginTop:16,textAlign:"right"}}><Btn ghost onClick={onClose}>Abbrechen</Btn></div>
      </div>
    </Modal>
  );
};

const KIEingabeModal=({patienten,onKauf,onClose})=>{
  const [recording,setRecording]=useState(false);const [transcript,setTranscript]=useState("");
  const [loading,setLoading]=useState(false);const [eintraege,setEintraege]=useState([]);
  const [savingIdx,setSavingIdx]=useState(-1);const [error,setError]=useState("");
  const recognitionRef=useRef(null);

  const matchPat=(name)=>{if(!name)return null;return patienten.find(p=>{const full=`${p.vorname||""} ${p.nachname||""}`.toLowerCase();const parts=name.toLowerCase().split(" ");return parts.some(part=>part.length>2&&full.includes(part));})||null;};

  const buildPrompt=(patNames)=>`Du bist "Pingu hilft", ein Assistent für ein Kundenverwaltungssystem.
Extrahiere ALLE genannten Einträge und antworte NUR mit einem JSON-Array ohne Markdown-Backticks.
Jedes Element:
{"kundenname":"string oder null","typ":"pass oder einzel","pass_typ":"BASIS, PLUS, DELUXE oder INDIVIDUELL oder null","einzel_name":"string oder null","he_total":Zahl oder null,"bs_total":Zahl oder null,"preis":Zahl oder null,"rechnung":"string oder null","datum":"YYYY-MM-DD oder null","custom_name":"string oder null","ist_alt":true/false,"bezahlt":true/false/null}
Bekannte Kunden: ${patNames}
Pass-Typen: BASIS=3HE 1GA 299€, PLUS=5HE 3GA 499€, DELUXE=10HE 5GA 899€
Einzelangebote: Psycho Quickie 70€, tDCS 55€, Neurofeedback 5er Karte 350€
Heutiges Datum: ${todayISO()}
WICHTIG: "alt/aufgebraucht/abgelaufen" → ist_alt:true. "bezahlt/beglichen" → bezahlt:true. "offen/unbezahlt" → bezahlt:false. Immer Array zurückgeben.`;

  const parseResult=(raw)=>{const c=raw.replace(/```json|```/g,"").trim();const arr=JSON.parse(c);return(Array.isArray(arr)?arr:[arr]).map((item,i)=>({...item,_id:i,_skip:false,matched_pat:matchPat(item.kundenname)}));};

  const analyzeText=async(text)=>{
    if(!text.trim())return;
    setLoading(true);setError("");setEintraege([]);
    try{
      const patNames=patienten.map(p=>`${p.vorname} ${p.nachname}`).join(", ");
      const content=`${buildPrompt(patNames)}\n\nText: "${text}"`;
      const resp=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:2000,messages:[{role:"user",content}]})});
      const data=await resp.json();const txt=data.content?.map(c=>c.text||"").join("")||"";
      setEintraege(parseResult(txt));
    }catch(e){setError("Fehler beim Verarbeiten.");console.error(e);}
    setLoading(false);
  };

  const startRec=()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){setError("Spracherkennung wird in diesem Browser nicht unterstützt. Bitte Chrome oder Edge verwenden.");return;}
    try{
      const recognition=new SR();
      recognition.lang="de-DE";recognition.continuous=true;recognition.interimResults=true;
      let finalText="";
      recognition.onresult=(e)=>{
        let interim="";finalText="";
        for(let i=0;i<e.results.length;i++){
          if(e.results[i].isFinal)finalText+=e.results[i][0].transcript+" ";
          else interim+=e.results[i][0].transcript;
        }
        setTranscript((finalText+interim).trim());
      };
      recognition.onerror=(e)=>{
        if(e.error==="no-speech")return;
        setError("Sprachfehler: "+e.error);setRecording(false);
      };
      recognition.onend=()=>{
        if(recognitionRef.current){
          setRecording(false);
          if(finalText.trim())analyzeText(finalText.trim());
        }
      };
      recognition.start();
      recognitionRef.current=recognition;
      setRecording(true);setError("");setEintraege([]);
    }catch(e){setError("Mikrofon konnte nicht gestartet werden.");}
  };

  const stopRec=()=>{
    if(recognitionRef.current){
      const ref=recognitionRef.current;
      recognitionRef.current=null;
      ref.stop();
      setRecording(false);
      if(transcript.trim())analyzeText(transcript.trim());
    }
  };

  const alleBestaetigen=async()=>{
    const aktive=eintraege.filter(e=>!e._skip&&e.matched_pat);
    for(let i=0;i<aktive.length;i++){
      setSavingIdx(i);const v=aktive[i];const pat=v.matched_pat;
      const datum=v.datum||todayISO(),rechnung=v.rechnung||"",istAlt=!!v.ist_alt;
      const bez=v.bezahlt===true||v.bezahlt===false?v.bezahlt:null;
      if(v.typ==="pass"){const typ=v.pass_typ||"INDIVIDUELL";if(typ==="INDIVIDUELL"){await onKauf(pat,"individuell",{name:v.custom_name||"Individuell",he:v.he_total||0,bs:v.bs_total||0,datum,rechnung,ist_alt:istAlt,bezahlt:bez},v.preis||0,"");}else{await onKauf(pat,"pass",typ,v.preis||PASS_TYPES[typ]?.preis||0,rechnung,datum,istAlt,bez);}}
      else{const name=v.einzel_name||"Einzelangebot";const f=EINZELANGEBOTE.find(ea=>ea.name.toLowerCase().includes(name.toLowerCase()));await onKauf(pat,"einzel",{key:f?.key||"CUSTOM",name},v.preis||f?.preis||0,rechnung,datum,false,bez);}
    }
    setSavingIdx(-1);onClose();
  };

  const toggleSkip=(id)=>setEintraege(prev=>prev.map(e=>e._id===id?{...e,_skip:!e._skip}:e));
  const aktiveCount=eintraege.filter(e=>!e._skip&&e.matched_pat).length;
  const isSaving=savingIdx>=0;
  const inp2={width:"100%",padding:"11px 14px",borderRadius:12,border:`1px solid ${T.cardBorder}`,fontSize:15,background:T.bg2,color:T.cream,outline:"none"};

  return(
    <Modal onClose={onClose}>
      <div className="modal-box" style={{background:`linear-gradient(180deg,${T.bg1},${T.bg2})`,borderRadius:24,padding:28,width:560,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.5)",border:`1px solid ${T.cardBorder}`}}>
        <Heading style={{fontSize:22,marginBottom:6}}>🐧 Pingu hilft</Heading>
        <p style={{color:T.creamDim,fontSize:15,marginBottom:22,lineHeight:1.7}}>Sprich oder tippe <strong style={{color:T.cream}}>mehrere Einträge</strong> auf einmal.<br/>
        <span style={{fontSize:13,color:T.creamFaint}}>Sage ob ein Pass <strong>alt</strong> oder <strong>aktuell</strong> ist, und ob er <strong>bezahlt</strong> wurde.</span></p>

        <div style={{display:"flex",gap:10,marginBottom:18,alignItems:"center",flexWrap:"wrap"}}>
          {!recording
            ?<button onClick={startRec} style={{padding:"14px 24px",borderRadius:16,background:T.red,color:"#fff",border:"none",fontWeight:700,fontSize:16,cursor:"pointer",boxShadow:`0 4px 16px rgba(224,85,85,0.3)`}}>🎤 Aufnahme starten</button>
            :<button onClick={stopRec} style={{padding:"14px 24px",borderRadius:16,background:T.bg3,color:T.cream,border:`1px solid ${T.cardBorder}`,fontWeight:700,fontSize:16,cursor:"pointer"}}>⏹ Aufnahme stoppen</button>
          }
          {recording&&<span style={{fontSize:14,color:T.red,fontWeight:600}}>● läuft</span>}
        </div>

        <div style={{marginBottom:18}}>
          <div style={{fontSize:12,fontWeight:700,color:T.goldDim,textTransform:"uppercase",letterSpacing:1.5,marginBottom:6}}>Oder eintippen</div>
          <div style={{display:"flex",gap:8}}>
            <textarea value={transcript} onChange={e=>setTranscript(e.target.value)} rows={3} placeholder="z.B. Anna Müller alter Plus Pass bezahlt 499€..." style={{...inp2,flex:1,resize:"vertical"}}/>
            <Btn gold small onClick={()=>analyzeText(transcript)} disabled={!transcript.trim()||loading}>KI →</Btn>
          </div>
        </div>

        {loading&&<div style={{textAlign:"center",padding:20}}><Spinner/><p style={{color:T.gold,fontSize:14}}>🐧 Pingu analysiert...</p></div>}
        {isSaving&&<div style={{padding:"12px 16px",borderRadius:12,background:T.greenDim,color:T.green,fontSize:14,fontWeight:600,marginBottom:14}}>Speichere {savingIdx+1}/{aktiveCount}...</div>}
        {error&&<div style={{padding:"12px 16px",borderRadius:12,background:T.redDim,color:T.red,fontSize:14,marginBottom:14}}>{error}</div>}

        {eintraege.length>0&&!loading&&(
          <div style={{marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:2,marginBottom:14}}>{eintraege.length} Einträge erkannt</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {eintraege.map(v=>(
                <div key={v._id} style={{borderRadius:14,border:`1px solid ${v._skip?T.cardBorder:v.matched_pat?T.green+"30":T.red+"30"}`,background:v._skip?T.bg3+"30":v.matched_pat?T.greenDim:T.redDim,padding:"14px 18px",opacity:v._skip?0.45:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:15,color:T.cream,marginBottom:6}}>
                        {v.matched_pat?`${v.matched_pat.vorname} ${v.matched_pat.nachname}`:<span style={{color:T.red}}>⚠ "{v.kundenname}" – nicht gefunden</span>}
                      </div>
                      <div style={{fontSize:13,color:T.creamDim,display:"flex",gap:10,flexWrap:"wrap",lineHeight:2}}>
                        <span>{v.typ==="pass"?`Flossenpass ${v.pass_typ||"Individuell"}`:v.einzel_name||"Einzelangebot"}</span>
                        {v.ist_alt&&<Badge variant="cream" small>Alt</Badge>}
                        {v.bezahlt===true&&<Badge variant="green" small>Bezahlt</Badge>}
                        {v.bezahlt===false&&<Badge variant="red" small>Offen</Badge>}
                        {v.preis&&<span style={{fontWeight:600,color:T.gold}}>{v.preis} €</span>}
                        {v.rechnung&&<code style={{background:T.bg3,padding:"2px 8px",borderRadius:6,fontSize:12,color:T.creamDim}}>{v.rechnung}</code>}
                        {v.datum&&<span style={{color:T.creamFaint}}>{fmtDate(v.datum)}</span>}
                      </div>
                    </div>
                    <button onClick={()=>toggleSkip(v._id)} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${v._skip?T.green+"40":T.red+"30"}`,background:"transparent",color:v._skip?T.green:T.red,fontSize:12,fontWeight:700,cursor:"pointer",textTransform:"uppercase"}}>{v._skip?"↩":"✕ Skip"}</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:16,flexWrap:"wrap",gap:8}}>
              <span style={{fontSize:14,color:T.creamFaint}}>{aktiveCount}/{eintraege.length} werden gespeichert</span>
              <div style={{display:"flex",gap:8}}>
                <Btn small ghost onClick={()=>{setEintraege([]);setTranscript("");}}>Nochmal</Btn>
                <Btn small gold disabled={aktiveCount===0||isSaving} onClick={alleBestaetigen}>✓ Alle {aktiveCount} speichern</Btn>
              </div>
            </div>
          </div>
        )}
        <div style={{textAlign:"right",marginTop:10}}><Btn small ghost onClick={onClose}>Abbrechen</Btn></div>
      </div>
    </Modal>
  );
};

const MitarbeiterApp=({patienten,setPatienten,paesse,setPaesse,log,setLog,rechnungsNr,setRechnungsNr,einzel,setEinzel})=>{
  const [view,setView]=useState("liste");const [selPat,setSelPat]=useState(null);const [search,setSearch]=useState("");
  const [scanMode,setScanMode]=useState(false);const [scanInput,setScanInput]=useState("");
  const [showStats,setShowStats]=useState(false);const [kaufModal,setKaufModal]=useState(false);const [kiModal,setKiModal]=useState(false);
  const [bsModal,setBsModal]=useState(null);const [bsNotiz,setBsNotiz]=useState("");
  const [korrekturModal,setKorrekturModal]=useState(null);const [korrekturTyp,setKorrekturTyp]=useState("HE");
  const [korrekturAnzahl,setKorrekturAnzahl]=useState(1);const [korrekturGrund,setKorrekturGrund]=useState("");
  const [notizText,setNotizText]=useState("");const [saving,setSaving]=useState(false);
  const [shoreSync,setShoreSync]=useState(false);const [shoreSyncMsg,setShoreSyncMsg]=useState("");
  const [confirmDelete,setConfirmDelete]=useState(null);

  const inp={width:"100%",padding:"11px 14px",borderRadius:12,border:`1px solid ${T.cardBorder}`,fontSize:15,background:T.bg2,color:T.cream,outline:"none"};

  const filtered=patienten.slice().sort((a,b)=>{const na=`${a.vorname||""} ${a.nachname||""}`.trim().toLowerCase();const nb=`${b.vorname||""} ${b.nachname||""}`.trim().toLowerCase();if(!a.vorname&&b.vorname)return 1;if(a.vorname&&!b.vorname)return-1;return na.localeCompare(nb,"de");}).filter(p=>{const q=search.toLowerCase();return`${p.vorname||""} ${p.nachname||""} ${p.email||""}`.toLowerCase().includes(q)||paesse.some(pk=>pk.pat_id===p.id&&(pk.rechnung||"").toLowerCase().includes(q))||einzel.some(e=>e.pat_id===p.id&&(e.rechnung||"").toLowerCase().includes(q));});

  const patPaesse=selPat?paesse.filter(pk=>pk.pat_id===selPat.id):[];
  const patEinzel=selPat?einzel.filter(e=>e.pat_id===selPat.id).sort((a,b)=>(b.datum||"").localeCompare(a.datum||"")):[];
  const patLog=selPat?log.filter(l=>l.pat_id===selPat.id).sort((a,b)=>(b.datum||"").localeCompare(a.datum||"")):[];
  const aktPaesse=patPaesse.filter(pk=>!isPassAlt(pk));const altPaesse=patPaesse.filter(pk=>isPassAlt(pk));
  const aktiverPass=aktPaesse[0]||null;
  const heUebrig=aktPaesse.reduce((s,p)=>s+((p.he_total||0)-(p.he_genutzt||0)),0);
  const bsUebrig=aktPaesse.reduce((s,p)=>s+((p.bs_total||0)-(p.bs_genutzt||0)),0);
  const alleVerkaufe=[...patPaesse.map(pk=>({id:pk.id,art:"pass",name:`Flossenpass ${getPassLabel(pk)}`,rechnung:pk.rechnung,datum:pk.datum,preis:pk.preis||0,bezahlt:pk.bezahlt,isAlt:isPassAlt(pk)})),...patEinzel.map(e=>({id:e.id,art:"einzel",name:e.name,rechnung:e.rechnung,datum:e.datum,preis:e.preis||0,bezahlt:e.bezahlt,isAlt:false}))].sort((a,b)=>(b.datum||"").localeCompare(a.datum||""));

  const getRechnungsNr=async()=>{const{data}=await supabase.from("einstellungen").select("value").eq("key","rechnungs_nr").single();const nr=parseInt(data?.value||"0")+1;await supabase.from("einstellungen").update({value:String(nr)}).eq("key","rechnungs_nr");setRechnungsNr(nr);return nr;};
  const handleKauf=async(typ,info,preis,eigeneRechnung,datum)=>{setSaving(true);await handleKaufFuerPat(selPat,typ,info,preis,eigeneRechnung,datum);setSaving(false);setKaufModal(false);};

  const handleKaufFuerPat=async(pat,typ,info,preis,eigeneRechnung,datum,istAlt,bezahltStatus)=>{
    const datumStr=datum||todayISO();let rechnungStr;
    if(typ==="individuell"){
      rechnungStr=info.rechnung||genRechnung(await getRechnungsNr());
      const heT=info.he||0,bsT=info.bs||0,alt=istAlt||info.ist_alt||false;
      const bez=bezahltStatus!=null?bezahltStatus:(info.bezahlt!=null?info.bezahlt:false);
      const np={id:genId(),pat_id:pat.id,typ:"INDIVIDUELL",he_total:heT,he_genutzt:alt?heT:0,bs_total:bsT,bs_genutzt:alt?bsT:0,preis:preis||0,rechnung:rechnungStr,bezahlt:bez,datum:info.datum||datumStr,aktiv:!alt,custom_name:info.name||"Individuell"};
      await supabase.from("paesse").insert(np);setPaesse(prev=>[...prev,np]);
    }else if(typ==="pass"){
      rechnungStr=eigeneRechnung||genRechnung(await getRechnungsNr());
      const pt=PASS_TYPES[info],alt=!!istAlt,bez=bezahltStatus!=null?bezahltStatus:false;
      const np={id:genId(),pat_id:pat.id,typ:info,he_total:pt.he,he_genutzt:alt?pt.he:0,bs_total:pt.bs,bs_genutzt:alt?pt.bs:0,preis:preis||0,rechnung:rechnungStr,bezahlt:bez,datum:datumStr,aktiv:!alt};
      await supabase.from("paesse").insert(np);setPaesse(prev=>[...prev,np]);
    }else{
      rechnungStr=eigeneRechnung||genRechnung(await getRechnungsNr());
      const bez=bezahltStatus!=null?bezahltStatus:false;
      const ne={id:genId(),pat_id:pat.id,key:info.key,name:info.name,preis:preis||0,rechnung:rechnungStr,bezahlt:bez,datum:datumStr};
      const nl={id:genId(),pat_id:pat.id,pass_id:null,typ:info.key,quelle:"INTERN",datum:new Date().toISOString(),notiz:info.name};
      await supabase.from("einzel").insert(ne);await supabase.from("log").insert(nl);
      setEinzel(prev=>[...prev,ne]);setLog(prev=>[...prev,nl]);
    }
  };

  const deletePass=async(pid)=>{await supabase.from("paesse").delete().eq("id",pid);setPaesse(prev=>prev.filter(p=>p.id!==pid));setConfirmDelete(null);};

  const downloadCSV=()=>{
    const header=["Vorname","Nachname","E-Mail","Telefon","QR-Code","Stammkunde","Stammpreis","Kunde seit","Aktiver Pass","HE übrig","GA übrig"];
    const rows=filtered.map(p=>{const ap=paesse.find(pk=>pk.pat_id===p.id&&!isPassAlt(pk));const he=ap?(ap.he_total||0)-(ap.he_genutzt||0):"";const bs=ap?(ap.bs_total||0)-(ap.bs_genutzt||0):"";return[p.vorname||"",p.nachname||"",p.email||"",p.telefon||"",p.qr||"",p.stammkunde?"Ja":"Nein",p.stammpreis||"",fmtDate(p.erstellt),ap?`Flossenpass ${getPassLabel(ap)}`:"–",he,bs].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(";");});
    const csv=[header.map(h=>`"${h}"`).join(";"),...rows].join("\n");
    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="gaesteliste-kaiserufer.csv";a.click();URL.revokeObjectURL(url);
  };

  const heAbziehen=async(pass)=>{if(!pass||pass.he_genutzt>=pass.he_total)return;const u={...pass,he_genutzt:pass.he_genutzt+1};const nl={id:genId(),pat_id:selPat.id,pass_id:pass.id,typ:"HAUPTEINHEIT",quelle:"SHORE",datum:new Date().toISOString(),notiz:"Haupteinheit"};await supabase.from("paesse").update({he_genutzt:u.he_genutzt}).eq("id",pass.id);await supabase.from("log").insert(nl);setPaesse(prev=>prev.map(p=>p.id===pass.id?u:p));setLog(prev=>[...prev,nl]);};
  const bsAbziehen=async(pass)=>{if(!pass||pass.bs_genutzt>=pass.bs_total||!bsNotiz.trim())return;const u={...pass,bs_genutzt:pass.bs_genutzt+1};const nl={id:genId(),pat_id:selPat.id,pass_id:pass.id,typ:"BS",quelle:"INTERN",datum:new Date().toISOString(),notiz:bsNotiz.trim()};await supabase.from("paesse").update({bs_genutzt:u.bs_genutzt}).eq("id",pass.id);await supabase.from("log").insert(nl);setPaesse(prev=>prev.map(p=>p.id===pass.id?u:p));setLog(prev=>[...prev,nl]);setBsNotiz("");setBsModal(null);};
  const korrekturSpeichern=async()=>{if(!korrekturModal||korrekturAnzahl<1)return;const n=Number(korrekturAnzahl);const pass=korrekturModal;const updates=korrekturTyp==="HE"?{he_genutzt:Math.max(0,(pass.he_genutzt||0)-n)}:{bs_genutzt:Math.max(0,(pass.bs_genutzt||0)-n)};const nl={id:genId(),pat_id:selPat.id,pass_id:pass.id,typ:"KORREKTUR",quelle:"MANUELL",datum:new Date().toISOString(),notiz:`${korrekturTyp} +${n} zurück${korrekturGrund?` – ${korrekturGrund}`:""}`};await supabase.from("paesse").update(updates).eq("id",pass.id);await supabase.from("log").insert(nl);setPaesse(prev=>prev.map(p=>p.id===pass.id?{...p,...updates}:p));setLog(prev=>[...prev,nl]);setKorrekturModal(null);setKorrekturAnzahl(1);setKorrekturGrund("");};
  const notizSpeichern=async()=>{if(!notizText.trim())return;const nl={id:genId(),pat_id:selPat.id,pass_id:null,typ:"NOTIZ",quelle:"INTERN",datum:new Date().toISOString(),notiz:notizText.trim()};await supabase.from("log").insert(nl);setLog(prev=>[...prev,nl]);setNotizText("");};
  const toggleBezahlt=async(pid)=>{const p=paesse.find(x=>x.id===pid);if(!p)return;await supabase.from("paesse").update({bezahlt:!p.bezahlt}).eq("id",pid);setPaesse(prev=>prev.map(x=>x.id===pid?{...x,bezahlt:!x.bezahlt}:x));};
  const toggleEinzelBez=async(eid)=>{const e=einzel.find(x=>x.id===eid);if(!e)return;await supabase.from("einzel").update({bezahlt:!e.bezahlt}).eq("id",eid);setEinzel(prev=>prev.map(x=>x.id===eid?{...x,bezahlt:!x.bezahlt}:x));};
  const updatePassField=async(pid,field,val)=>{await supabase.from("paesse").update({[field]:val}).eq("id",pid);setPaesse(prev=>prev.map(p=>p.id===pid?{...p,[field]:val}:p));};
  const updatePassEinheiten=async(pid,field,val)=>{const n=Math.max(0,parseInt(val)||0);await supabase.from("paesse").update({[field]:n}).eq("id",pid);setPaesse(prev=>prev.map(p=>p.id===pid?{...p,[field]:n}:p));};
  const updatePatient=async(id,fields)=>{await supabase.from("patienten").update(fields).eq("id",id);setPatienten(prev=>prev.map(p=>p.id===id?{...p,...fields}:p));if(selPat?.id===id)setSelPat(prev=>({...prev,...fields}));};
  const getUnits=(patId)=>{const ap=paesse.find(pk=>pk.pat_id===patId&&!isPassAlt(pk));if(!ap)return null;return{he:(ap.he_total||0)-(ap.he_genutzt||0),bs:(ap.bs_total||0)-(ap.bs_genutzt||0),typ:ap.typ};};
  const editInp=(w)=>({fontSize:14,fontWeight:600,background:"transparent",border:`1px solid ${T.cardBorder}`,borderRadius:8,padding:"4px 8px",color:T.cream,outline:"none",width:w});
  const handleScan=()=>{const pat=patienten.find(p=>p.qr===scanInput.trim().toUpperCase());if(pat){setSelPat(pat);setView("akte");setScanMode(false);setScanInput("");}else alert("QR-Code nicht gefunden: "+scanInput);};

  const PassCard=({pk,isAlt})=>{
    const heL=(pk.he_total||0)-(pk.he_genutzt||0),bsL=(pk.bs_total||0)-(pk.bs_genutzt||0);
    const ni={width:50,padding:"4px 6px",borderRadius:8,border:`1px solid ${T.cardBorder}`,fontSize:15,fontWeight:700,background:"transparent",color:T.cream,outline:"none",textAlign:"center"};
    return(
      <div style={{borderRadius:16,border:`1px solid ${T.cardBorder}`,background:isAlt?T.bg3+"40":T.bg3+"80",overflow:"hidden",marginBottom:12,opacity:isAlt?0.8:1}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${T.cardBorder}`,background:T.bg3+"60",flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <strong style={{fontFamily:"Georgia,serif",fontSize:17,color:T.gold}}>Flossenpass {getPassLabel(pk)}</strong>
            {isAlt&&<Badge variant="cream" small>Aufgebraucht</Badge>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",fontSize:12,fontWeight:700,textTransform:"uppercase",color:pk.bezahlt?T.green:T.red,background:pk.bezahlt?T.greenDim:T.redDim,padding:"6px 14px",borderRadius:10}}>
              <input type="checkbox" checked={!!pk.bezahlt} onChange={()=>toggleBezahlt(pk.id)} style={{accentColor:T.green,width:15,height:15}}/>{pk.bezahlt?"Bezahlt":"Offen"}
            </label>
            <button onClick={()=>setConfirmDelete(pk.id)} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${T.red}30`,background:T.redDim,color:T.red,fontSize:12,fontWeight:700,cursor:"pointer",textTransform:"uppercase"}}>✕</button>
          </div>
        </div>
        <div className="pass-3col" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderBottom:`1px solid ${T.cardBorder}`}}>
          {[{label:"Rechnungs-Nr.",content:<input value={pk.rechnung||""} onChange={e=>updatePassField(pk.id,"rechnung",e.target.value)} style={{...editInp(140),width:"100%"}}/>},{label:"Datum",content:<input type="date" value={pk.datum||""} onChange={e=>updatePassField(pk.id,"datum",e.target.value)} style={{...editInp(140),width:"100%"}}/>},{label:"Preis",content:<div style={{display:"flex",alignItems:"center",gap:4}}><input type="number" min={0} value={pk.preis||0} onChange={e=>updatePassField(pk.id,"preis",Number(e.target.value))} style={{...editInp(80),textAlign:"right"}}/><span style={{fontSize:14,color:T.creamDim}}>€</span></div>}].map((f,fi)=>(
            <div key={f.label} style={{padding:"12px 16px",borderLeft:fi>0?`1px solid ${T.cardBorder}`:"none"}}><div style={{fontSize:11,color:T.goldDim,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>{f.label}</div>{f.content}</div>
          ))}
        </div>
        <div className="pass-2col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:`1px solid ${T.cardBorder}`}}>
          {[{label:"Haupteinheiten",genutzt:"he_genutzt",total:"he_total",used:pk.he_genutzt||0,tot:pk.he_total||0,left:heL,color:T.gold},{label:"Gruppenangebote",genutzt:"bs_genutzt",total:"bs_total",used:pk.bs_genutzt||0,tot:pk.bs_total||0,left:bsL,color:T.goldLight}].map((e,ei)=>(
            <div key={e.label} style={{padding:"14px 16px",borderLeft:ei>0?`1px solid ${T.cardBorder}`:"none"}}>
              <div style={{fontSize:12,color:T.goldDim,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>{e.label}</div>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,flexWrap:"wrap"}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}><span style={{fontSize:11,color:T.creamFaint}}>Genutzt</span><input type="number" min={0} max={e.tot} value={e.used} onChange={ev=>updatePassEinheiten(pk.id,e.genutzt,ev.target.value)} style={ni}/></div>
                <span style={{fontSize:16,color:T.creamFaint,marginTop:16}}>/</span>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}><span style={{fontSize:11,color:T.creamFaint}}>Gesamt</span><input type="number" min={0} value={e.tot} onChange={ev=>updatePassEinheiten(pk.id,e.total,ev.target.value)} style={ni}/></div>
                <span style={{fontFamily:"Georgia,serif",fontSize:20,fontWeight:700,color:T.gold,marginTop:16,marginLeft:4}}>{e.left}<span style={{fontSize:12,fontWeight:400,color:T.creamFaint}}> übrig</span></span>
              </div>
              <Bar used={e.used} total={e.tot} color={e.color}/>
            </div>
          ))}
        </div>
        {!isAlt&&<div style={{padding:"10px 20px"}}><button onClick={()=>{setKorrekturModal(pk);setKorrekturTyp("HE");setKorrekturAnzahl(1);setKorrekturGrund("");}} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:T.red+"80",padding:"4px 0"}}>✎ Korrektur</button></div>}
      </div>
    );
  };

  if(scanMode)return(
    <div className="fade-in resp-pad" style={{padding:28}}>
      <div className="header-row" style={{display:"flex",alignItems:"center",gap:14,marginBottom:28}}>
        <Btn ghost onClick={()=>setScanMode(false)}>← Zurück</Btn>
        <Heading style={{fontSize:22}}>QR-Code Scanner</Heading>
      </div>
      <Card><div style={{textAlign:"center",padding:"24px 8px"}}><div style={{fontSize:40,marginBottom:16}}>📷</div><p style={{color:T.creamDim,marginBottom:20,lineHeight:1.8,fontSize:16}}>QR-Token eingeben:</p><div style={{display:"flex",gap:8,justifyContent:"center",maxWidth:420,margin:"0 auto",flexWrap:"wrap"}}><input value={scanInput} onChange={e=>setScanInput(e.target.value)} placeholder="z.B. KU-A7F3B2C9" onKeyDown={e=>e.key==="Enter"&&handleScan()} style={{...inp,flex:1,fontFamily:"monospace",minWidth:180}}/><Btn gold onClick={handleScan}>Scannen</Btn></div></div></Card>
    </div>
  );

  return(
    <div className="resp-pad" style={{padding:28}}>
      {kaufModal&&<KaufModal selPat={selPat} onKauf={handleKauf} onClose={()=>setKaufModal(false)}/>}
      {kiModal&&<KIEingabeModal patienten={patienten} onKauf={handleKaufFuerPat} onClose={()=>setKiModal(false)}/>}

      {confirmDelete&&<Modal onClose={()=>setConfirmDelete(null)}><Card className="modal-box" style={{width:380,textAlign:"center"}}><div style={{fontSize:36,marginBottom:12}}>⚠️</div><Heading style={{fontSize:20,marginBottom:8}}>Pass löschen?</Heading><p style={{color:T.creamDim,fontSize:15,marginBottom:20,lineHeight:1.7}}>Unwiderruflich. Kann nicht rückgängig gemacht werden.</p><div style={{display:"flex",gap:10,justifyContent:"center"}}><Btn ghost onClick={()=>setConfirmDelete(null)}>Abbrechen</Btn><Btn danger onClick={()=>deletePass(confirmDelete)}>Endgültig löschen</Btn></div></Card></Modal>}

      {bsModal&&<Modal onClose={()=>{setBsModal(null);setBsNotiz("");}}><Card className="modal-box" style={{width:400}}><Heading style={{fontSize:20,marginBottom:4}}>Gruppenangebot abhaken</Heading><p style={{color:T.creamDim,fontSize:15,marginBottom:18}}>Noch {(bsModal.bs_total||0)-(bsModal.bs_genutzt||0)} von {bsModal.bs_total||0} übrig</p><div style={{display:"flex",flexDirection:"column",gap:12}}><input value={bsNotiz} onChange={e=>setBsNotiz(e.target.value)} placeholder="z.B. Yoga, Sound Bath..." style={inp} autoFocus/><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ghost onClick={()=>{setBsModal(null);setBsNotiz("");}}>Abbrechen</Btn><Btn gold disabled={!bsNotiz.trim()} onClick={()=>bsAbziehen(bsModal)}>Abhaken</Btn></div></div></Card></Modal>}

      {korrekturModal&&<Modal onClose={()=>setKorrekturModal(null)}><Card className="modal-box" style={{width:400}}><Heading style={{fontSize:20,marginBottom:18}}>Korrektur</Heading><div style={{display:"flex",flexDirection:"column",gap:14}}><div><label style={{fontSize:14,fontWeight:600,color:T.creamDim,textTransform:"uppercase",letterSpacing:1,marginBottom:6,display:"block"}}>Typ</label><select value={korrekturTyp} onChange={e=>setKorrekturTyp(e.target.value)} style={inp}><option value="HE">Haupteinheit</option><option value="BS">Gruppenangebot</option></select></div><div><label style={{fontSize:14,fontWeight:600,color:T.creamDim,textTransform:"uppercase",letterSpacing:1,marginBottom:6,display:"block"}}>Anzahl</label><input type="number" min={1} max={10} value={korrekturAnzahl} onChange={e=>setKorrekturAnzahl(e.target.value)} style={inp}/></div><div><label style={{fontSize:14,fontWeight:600,color:T.creamDim,textTransform:"uppercase",letterSpacing:1,marginBottom:6,display:"block"}}>Grund</label><input value={korrekturGrund} onChange={e=>setKorrekturGrund(e.target.value)} placeholder="optional" style={inp}/></div><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ghost onClick={()=>setKorrekturModal(null)}>Abbrechen</Btn><Btn danger onClick={korrekturSpeichern}>Speichern</Btn></div></div></Card></Modal>}

      {view==="liste"&&(
        <div className="fade-in">
          <div className="toolbar" style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, E-Mail oder Rechnungsnummer..." style={{...inp,flex:1,minWidth:200}}/>
            <div className="toolbar-btns" style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
              {[{emoji:"📷",label:"QR",onClick:()=>setScanMode(true)},{emoji:"📊",label:showStats?"Statistik ✕":"Statistik",onClick:()=>setShowStats(!showStats)},{emoji:"⬇",label:"CSV",onClick:downloadCSV},{emoji:"🐧",label:"Pingu hilft",onClick:()=>setKiModal(true)}].map(b=>(
                <button key={b.label} onClick={b.onClick} className="btn-a" style={{padding:"10px 16px",borderRadius:14,fontWeight:600,cursor:"pointer",background:T.bg3,color:T.cream,border:`1px solid ${T.cardBorder}`,fontSize:14,letterSpacing:0.3,textTransform:"uppercase"}}>
                  <span className="btn-emoji" style={{display:"none"}}>{b.emoji}</span><span className="btn-text">{b.label}</span>
                </button>
              ))}
              <button disabled={shoreSync} className="btn-a" style={{padding:"10px 16px",borderRadius:14,fontWeight:600,cursor:shoreSync?"not-allowed":"pointer",background:T.bg3,color:T.cream,border:`1px solid ${T.cardBorder}`,fontSize:14,textTransform:"uppercase",opacity:shoreSync?0.5:1}} onClick={async()=>{setShoreSync(true);setShoreSyncMsg("");try{const r=await fetch("/api/shore-sync",{method:"POST"});const data=await r.json();if(data.error)throw new Error(data.error);const{data:np}=await supabase.from("patienten").select("*");if(np)setPatienten(np);setShoreSyncMsg(`✓ ${data.neu||0} neue · ${data.gesamt||0} gesamt`);}catch(e){setShoreSyncMsg("Fehler: "+e.message);}setShoreSync(false);}}>
                <span className="btn-emoji" style={{display:"none"}}>🔄</span><span className="btn-text">{shoreSync?"Sync...":"Shore Sync"}</span>
              </button>
            </div>
          </div>
          {shoreSyncMsg&&<div style={{padding:"12px 18px",borderRadius:12,background:shoreSyncMsg.startsWith("Fehler")?T.redDim:T.greenDim,color:shoreSyncMsg.startsWith("Fehler")?T.red:T.green,fontSize:14,fontWeight:600,marginBottom:14}}>{shoreSyncMsg}</div>}
          {showStats&&<div style={{marginBottom:22}}><StatistikPanel patienten={patienten} paesse={paesse} einzelArr={einzel}/></div>}

          <div style={{marginBottom:18}}><Heading style={{fontSize:28}}>Gästeliste Kaiserufer</Heading><p style={{color:T.creamFaint,fontSize:14,marginTop:6}}>{filtered.length} Kunden</p></div>

          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {filtered.map((p,i)=>{
              const u=getUnits(p.id);const ub=paesse.filter(pk=>pk.pat_id===p.id).some(pk=>!pk.bezahlt)||einzel.filter(e=>e.pat_id===p.id).some(e=>!e.bezahlt);
              return(
                <div key={p.id} onClick={()=>{setSelPat(p);setView("akte");}} className="card-h slide-in" style={{animationDelay:`${i<20?i*0.05:0}s`,padding:"16px 24px",background:"linear-gradient(135deg,rgba(240,237,224,0.92),rgba(226,227,200,0.88))",borderRadius:20,border:`1px solid ${T.goldFaint}`,cursor:"pointer",boxShadow:"0 2px 12px rgba(0,0,0,0.15)"}}>
                  <div className="liste-row" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div><div style={{fontWeight:600,color:"#3D4435",fontSize:17,lineHeight:1.4}}>{p.vorname} {p.nachname}</div><div style={{display:"flex",alignItems:"center",gap:8,marginTop:4,flexWrap:"wrap"}}><span style={{fontSize:14,color:"#6B7055"}}>{p.email}</span>{p.stammkunde&&<Badge variant="green" small>Stammkunde</Badge>}</div></div>
                    <div className="liste-right" style={{display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
                      <div style={{display:"flex",border:"1px solid rgba(184,168,138,0.25)",borderRadius:10,overflow:"hidden"}}>
                        {[{label:"HE",val:u?u.he:null},{label:"GA",val:u?u.bs:null}].map((col,ci)=>(
                          <div key={col.label} style={{width:48,padding:"6px 0",textAlign:"center",borderLeft:ci>0?"1px solid rgba(184,168,138,0.25)":"none",background:"rgba(255,255,255,0.5)"}}><div style={{fontSize:10,color:"#6B7055",textTransform:"uppercase",letterSpacing:0.8,marginBottom:3}}>{col.label}</div><div style={{fontSize:17,fontWeight:700,fontFamily:"Georgia,serif",color:col.val===null?"#6B705540":"#4A5240",lineHeight:1}}>{col.val!==null?col.val:"–"}</div></div>
                        ))}
                      </div>
                      <div className="badge-w" style={{width:68,textAlign:"center"}}>{u?<Badge variant="gold">{getPassName(u.typ)}</Badge>:<span style={{fontSize:12,color:"#6B705540"}}>–</span>}</div>
                      <div className="badge-w" style={{width:48,textAlign:"center"}}>{ub?<Badge variant="red">Offen</Badge>:null}</div>
                      <span className="chevron" style={{color:T.gold,fontSize:20,fontWeight:300}}>›</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length===0&&<p style={{textAlign:"center",color:T.creamFaint,padding:40,fontSize:16}}>Keine Kunden gefunden</p>}
          </div>
        </div>
      )}

      {view==="akte"&&selPat&&(
        <div className="fade-in">
          <div className="header-row" style={{display:"flex",alignItems:"center",gap:14,marginBottom:28}}>
            <Btn ghost onClick={()=>setView("liste")}>← Zurück</Btn>
            <Heading style={{fontSize:22}}>{selPat.vorname} {selPat.nachname}</Heading>
            {saving&&<span style={{fontSize:13,color:T.gold}}>Speichern...</span>}
          </div>
          <div className="akte-grid" style={{display:"grid",gridTemplateColumns:"1fr 220px",gap:20,alignItems:"start"}}>
            <div style={{display:"flex",flexDirection:"column",gap:18}}>
              <Card>
                <SectionLabel>Stammdaten</SectionLabel>
                <div style={{display:"flex",flexDirection:"column",gap:10,fontSize:15,lineHeight:1.6}}>
                  {[["E-Mail",selPat.email||"–"],["Telefon",selPat.telefon||"–"],["Adresse",selPat.adresse||"–"],["QR-Code",<code style={{background:T.bg3,padding:"3px 10px",borderRadius:8,fontSize:13,wordBreak:"break-all",color:T.creamFaint}}>{selPat.qr}</code>],["Seit",fmtDate(selPat.erstellt)]].map(([label,val])=>(
                    <div key={label} style={{display:"flex",gap:12,alignItems:"flex-start",flexWrap:"wrap"}}><span style={{color:T.creamFaint,minWidth:90,flexShrink:0,fontSize:14}}>{label}:</span><span style={{wordBreak:"break-word",color:T.cream,fontSize:15}}>{val}</span></div>
                  ))}
                  <div style={{marginTop:10,paddingTop:12,borderTop:`1px solid ${T.cardBorder}`}}>
                    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:14}}>
                      {[{val:heUebrig,label:"HE übrig"},{val:bsUebrig,label:"GA übrig"}].map(u=>(
                        <div key={u.label} style={{display:"flex",flexDirection:"column",alignItems:"center",background:T.goldFaint,borderRadius:12,padding:"10px 20px",border:`1px solid ${T.cardBorder}`}}>
                          <span style={{fontSize:28,fontWeight:700,color:T.gold,fontFamily:"Georgia,serif"}}>{u.val}</span>
                          <span style={{fontSize:12,color:T.goldDim,textTransform:"uppercase",letterSpacing:1,marginTop:3}}>{u.label}</span>
                        </div>
                      ))}
                    </div>
                    {aktiverPass&&(
                      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                        <button disabled={heUebrig===0} onClick={()=>heAbziehen(aktiverPass)} className="btn-a" style={{flex:1,minWidth:160,padding:"16px 18px",borderRadius:18,border:"none",background:heUebrig===0?T.bg3:`linear-gradient(135deg,${T.gold},#9A8A6A)`,color:heUebrig===0?T.creamFaint:T.bg0,cursor:heUebrig===0?"not-allowed":"pointer",opacity:heUebrig===0?0.4:1,fontWeight:700,fontSize:15,boxShadow:heUebrig===0?"none":"0 4px 20px rgba(184,168,138,0.2)",lineHeight:1.5}}>✓ Termin war heute<br/><span style={{fontSize:12,fontWeight:400,opacity:0.75}}>Haupteinheit −1</span></button>
                        <button disabled={bsUebrig===0} onClick={()=>setBsModal(aktiverPass)} className="btn-a" style={{flex:1,minWidth:160,padding:"16px 18px",borderRadius:18,border:`1px solid ${T.cardBorder}`,background:T.bg3,color:bsUebrig===0?T.creamFaint:T.cream,cursor:bsUebrig===0?"not-allowed":"pointer",opacity:bsUebrig===0?0.4:1,fontWeight:700,fontSize:15,lineHeight:1.5}}>✓ Termin war heute<br/><span style={{fontSize:12,fontWeight:400,opacity:0.75}}>Gruppenangebot −1</span></button>
                      </div>
                    )}
                  </div>
                  <div className="stammk-row" style={{display:"flex",gap:12,alignItems:"center",paddingTop:12,marginTop:6,borderTop:`1px solid ${T.cardBorder}`}}>
                    <span style={{color:T.creamFaint,minWidth:90,flexShrink:0,fontSize:14}}>Stammkunde:</span>
                    <div className="stammk-inner" style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                      {["Ja","Nein"].map(opt=>{const aktiv=opt==="Ja"?!!selPat.stammkunde:!selPat.stammkunde;return(<button key={opt} onClick={()=>updatePatient(selPat.id,{stammkunde:opt==="Ja"})} style={{padding:"6px 20px",borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer",border:`1px solid ${aktiv?(opt==="Ja"?T.green:T.cream)+"40":T.cardBorder}`,background:aktiv?(opt==="Ja"?T.greenDim:T.bg3):"transparent",color:aktiv?(opt==="Ja"?T.green:T.cream):T.creamFaint,transition:"all 0.15s"}}>{opt}</button>);})}
                      {selPat.stammkunde&&<div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:14,color:T.creamDim}}>Preis:</span><input type="number" min={0} value={selPat.stammpreis||""} onChange={e=>updatePatient(selPat.id,{stammpreis:e.target.value})} placeholder="420" style={{width:90,padding:"6px 10px",borderRadius:10,border:`1px solid ${T.cardBorder}`,fontSize:14,background:T.bg2,color:T.cream,outline:"none"}}/><span style={{fontSize:14,color:T.creamDim}}>€</span></div>}
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:8}}>
                  <SectionLabel>Angebote & Pässe</SectionLabel>
                  <Btn small gold onClick={()=>setKaufModal(true)}>+ Hinzufügen</Btn>
                </div>
                {aktPaesse.length===0&&patEinzel.length===0&&altPaesse.length===0&&<p style={{color:T.creamFaint,textAlign:"center",padding:"8px 0",fontSize:15}}>Noch keine Angebote</p>}
                {aktPaesse.map(pk=><PassCard key={pk.id} pk={pk} isAlt={false}/>)}
                {patEinzel.length>0&&(
                  <div style={{marginTop:aktPaesse.length>0?14:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:T.goldDim,textTransform:"uppercase",letterSpacing:2,marginBottom:12}}>Einzelangebote</div>
                    {patEinzel.map(e=>(
                      <div key={e.id} className="einzel-row" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 18px",borderRadius:12,border:`1px solid ${T.cardBorder}`,background:T.bg3+"60",marginBottom:8}}>
                        <div style={{display:"flex",flexDirection:"column",gap:4}}><span style={{fontSize:15,fontWeight:600,color:T.cream}}>{e.name}</span><div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}><code style={{background:T.bg3,padding:"3px 10px",borderRadius:8,fontSize:12,color:T.creamFaint}}>{e.rechnung||"–"}</code><span style={{fontSize:14,color:T.creamDim}}>{fmtDate(e.datum)}</span><strong style={{fontSize:14,color:T.gold}}>{e.preis||0} €</strong></div></div>
                        <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",fontSize:12,fontWeight:700,textTransform:"uppercase",color:e.bezahlt?T.green:T.red,background:e.bezahlt?T.greenDim:T.redDim,padding:"6px 14px",borderRadius:10,flexShrink:0}}><input type="checkbox" checked={!!e.bezahlt} onChange={()=>toggleEinzelBez(e.id)} style={{accentColor:T.green,width:15,height:15}}/>{e.bezahlt?"Bezahlt":"Offen"}</label>
                      </div>
                    ))}
                  </div>
                )}
                {altPaesse.length>0&&<div style={{marginTop:18,paddingTop:16,borderTop:`1px solid ${T.cardBorder}`}}><div style={{fontSize:12,fontWeight:700,color:T.goldDim,textTransform:"uppercase",letterSpacing:2,marginBottom:12}}>Alte Pässe</div>{altPaesse.map(pk=><PassCard key={pk.id} pk={pk} isAlt={true}/>)}</div>}
              </Card>

              <Card>
                <SectionLabel>Verkaufshistorie</SectionLabel>
                {alleVerkaufe.length===0&&<p style={{color:T.creamFaint,textAlign:"center",fontSize:15}}>Noch keine Verkäufe</p>}
                {alleVerkaufe.map(item=>(
                  <div key={item.id} className="vk-row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:T.bg3+"60",borderRadius:12,fontSize:15,marginBottom:6,flexWrap:"wrap",gap:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><Badge variant={item.art==="pass"?"gold":"blue"} small>{item.art==="pass"?"Flossenpass":"Einzelangebot"}</Badge>{item.isAlt&&<Badge variant="cream" small>Alt</Badge>}<span style={{fontWeight:600,color:T.cream}}>{item.name}</span><code style={{background:T.bg3,padding:"3px 10px",borderRadius:8,fontSize:12,color:T.creamFaint}}>{item.rechnung||"–"}</code></div>
                    <div style={{display:"flex",alignItems:"center",gap:12,flexShrink:0,flexWrap:"wrap"}}><span style={{fontSize:13,color:T.creamFaint}}>{fmtDate(item.datum)}</span><strong style={{fontFamily:"Georgia,serif",fontSize:15,color:T.gold}}>{item.preis} €</strong><Badge variant={item.bezahlt?"green":"red"} small>{item.bezahlt?"Bezahlt":"Offen"}</Badge></div>
                  </div>
                ))}
                {alleVerkaufe.length>0&&<div style={{marginTop:14,paddingTop:12,borderTop:`1px solid ${T.cardBorder}`,display:"flex",justifyContent:"flex-end",gap:18,fontSize:14,flexWrap:"wrap"}}><span style={{color:T.creamFaint}}>Gesamt: <strong style={{color:T.gold}}>{alleVerkaufe.reduce((s,i)=>s+i.preis,0).toLocaleString("de-DE")} €</strong></span><span style={{color:T.creamFaint}}>Bezahlt: <strong style={{color:T.green}}>{alleVerkaufe.filter(i=>i.bezahlt).reduce((s,i)=>s+i.preis,0).toLocaleString("de-DE")} €</strong></span><span style={{color:T.creamFaint}}>Offen: <strong style={{color:T.red}}>{alleVerkaufe.filter(i=>!i.bezahlt).reduce((s,i)=>s+i.preis,0).toLocaleString("de-DE")} €</strong></span></div>}
              </Card>

              <Card>
                <SectionLabel>Einheiten-Verlauf</SectionLabel>
                {patLog.filter(l=>l.typ!=="NOTIZ").length===0&&<p style={{color:T.creamFaint,textAlign:"center",fontSize:15}}>Noch kein Verlauf</p>}
                {patLog.filter(l=>l.typ!=="NOTIZ").map((l,i)=>{const b=logBadge(l.typ);return(<div key={l.id} className="slide-in log-row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:T.bg3+"60",borderRadius:12,fontSize:15,marginBottom:6,animationDelay:`${i*0.03}s`}}><div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><Badge variant={b.v} small>{b.label}</Badge><span style={{color:T.cream}}>{l.notiz}</span></div><span style={{fontSize:13,color:T.creamFaint,flexShrink:0,marginLeft:8}}>{fmtDateTime(l.datum)}</span></div>);})}
              </Card>

              <Card>
                <SectionLabel>Notizen</SectionLabel>
                <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:18}}>
                  <textarea value={notizText} onChange={e=>setNotizText(e.target.value)} placeholder="Notiz eingeben..." rows={3} style={{...inp,resize:"vertical",lineHeight:1.7}}/>
                  <div style={{display:"flex",justifyContent:"flex-end"}}><Btn small gold disabled={!notizText.trim()} onClick={notizSpeichern}>Notiz speichern</Btn></div>
                </div>
                {patLog.filter(l=>l.typ==="NOTIZ").length===0&&<p style={{color:T.creamFaint,textAlign:"center",fontSize:15}}>Noch keine Notizen</p>}
                {patLog.filter(l=>l.typ==="NOTIZ").map(l=>(<div key={l.id} style={{padding:"12px 16px",background:T.goldFaint,borderRadius:12,fontSize:15,marginBottom:6,borderLeft:`3px solid ${T.gold}`}}><div style={{fontSize:13,color:T.creamFaint,marginBottom:5}}>{fmtDateTime(l.datum)}</div><div style={{color:T.cream,lineHeight:1.7,wordBreak:"break-word"}}>{l.notiz}</div></div>))}
              </Card>
            </div>

            <div className="qr-sidebar" style={{position:"sticky",top:78}}>
              <Card style={{textAlign:"center"}}>
                <SectionLabel>QR-Code</SectionLabel>
                <div style={{background:T.bg2,borderRadius:16,padding:18,display:"inline-block",marginBottom:14}}><QRCode value={selPat.qr} size={140}/></div>
                <div style={{display:"flex",flexDirection:"column",gap:8,textAlign:"left"}}>
                  {[["Token",<code style={{fontFamily:"monospace",fontSize:12,color:T.creamFaint,wordBreak:"break-all"}}>{selPat.qr}</code>],["Name",`${selPat.vorname||""} ${selPat.nachname||""}`],["Seit",fmtDate(selPat.erstellt)],["Pass",aktiverPass?`Flossenpass ${getPassLabel(aktiverPass)}`:"–"]].map(([label,val])=>(
                    <div key={label} style={{display:"flex",gap:8,alignItems:"flex-start"}}><span style={{fontSize:12,color:T.creamFaint,minWidth:36,flexShrink:0}}>{label}</span><span style={{fontSize:14,color:T.cream,fontWeight:500}}>{val}</span></div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const KundenApp=({kunde,paesse,log,einzel})=>{
  const mp=paesse.filter(p=>p.pat_id===kunde.id);
  const ml=log.filter(l=>l.pat_id===kunde.id&&l.typ!=="NOTIZ"&&l.typ!=="KORREKTUR").sort((a,b)=>(b.datum||"").localeCompare(a.datum||""));
  const me=einzel.filter(e=>e.pat_id===kunde.id);const ap=mp.find(p=>!isPassAlt(p));
  return(
    <div className="fade-in resp-pad" style={{padding:28,maxWidth:580,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <Heading style={{marginTop:12,fontSize:24}}>Hallo {kunde.vorname}!</Heading>
        <p style={{color:T.creamFaint,margin:"8px 0 0",fontSize:16,lineHeight:1.6}}>Willkommen bei Kaiserufer Home</p>
        <a href="https://kaiserufer.com" target="_blank" rel="noopener noreferrer" style={{display:"inline-block",marginTop:10,fontSize:12,color:T.goldDim,textDecoration:"none",letterSpacing:1,textTransform:"uppercase",borderBottom:`1px solid ${T.cardBorder}`,paddingBottom:1}}>kaiserufer.com ↗</a>
      </div>
      {ap&&(()=>{
        const heL=(ap.he_total||0)-(ap.he_genutzt||0),bsL=(ap.bs_total||0)-(ap.bs_genutzt||0);
        return(
          <Card style={{marginBottom:18}}>
            <div style={{marginBottom:20}}><strong style={{fontSize:19,fontFamily:"Georgia,serif",color:T.gold}}>Flossenpass {getPassLabel(ap)}</strong><span style={{fontSize:14,color:T.creamFaint,marginLeft:10}}>seit {fmtDate(ap.datum)}</span></div>
            <div className="kunden-units" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:22}}>
              <div style={{textAlign:"center",padding:22,borderRadius:16,background:T.bg3,border:`1px solid ${T.cardBorder}`}}>
                <div style={{fontSize:44,fontWeight:700,color:T.gold,fontFamily:"Georgia,serif"}}>{heL}</div>
                <div style={{fontSize:11,color:T.goldDim,textTransform:"uppercase",letterSpacing:2,marginTop:5}}>von {ap.he_total||0} Haupteinheiten</div>
                <div style={{marginTop:12}}><Bar used={ap.he_genutzt||0} total={ap.he_total||0} color={T.gold}/></div>
              </div>
              <div style={{textAlign:"center",padding:22,borderRadius:16,background:T.bg3,border:`1px solid ${T.cardBorder}`}}>
                <div style={{fontSize:44,fontWeight:700,color:T.goldLight,fontFamily:"Georgia,serif"}}>{bsL}</div>
                <div style={{fontSize:11,color:T.goldDim,textTransform:"uppercase",letterSpacing:2,marginTop:5}}>von {ap.bs_total||0} Gruppenangeboten</div>
                <div style={{marginTop:12}}><Bar used={ap.bs_genutzt||0} total={ap.bs_total||0} color={T.goldLight}/></div>
              </div>
            </div>
            <div className="kunden-btns" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <a href="https://connect.shore.com/bookings/kaiserufer/services?locale=de" target="_blank" rel="noopener noreferrer" style={{padding:"12px 18px",borderRadius:12,border:`1px solid ${T.cardBorder}`,background:T.bg3,color:heL===0?T.creamFaint:T.cream,fontWeight:600,fontSize:14,textDecoration:"none",textAlign:"center",pointerEvents:heL===0?"none":"auto",opacity:heL===0?0.35:1}}>Therapie buchen →</a>
              <a href="https://www.eversports.de/widget/w/5tMWoO" target="_blank" rel="noopener noreferrer" style={{padding:"12px 18px",borderRadius:12,border:`1px solid ${T.cardBorder}`,background:T.bg3,color:bsL===0?T.creamFaint:T.cream,fontWeight:600,fontSize:14,textDecoration:"none",textAlign:"center",pointerEvents:bsL===0?"none":"auto",opacity:bsL===0?0.35:1}}>Gruppenangebot buchen →</a>
            </div>
            {heL===0&&bsL===0&&<div style={{textAlign:"center",marginTop:16,padding:"14px 18px",background:T.redDim,borderRadius:12,fontSize:15,color:T.red,fontWeight:600}}>Alle Einheiten aufgebraucht – sprich uns gerne an!</div>}
          </Card>
        );
      })()}
      {mp.filter(p=>isPassAlt(p)).map(pk=>(<Card key={pk.id} style={{marginBottom:14,opacity:0.4,padding:18}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}><div><strong style={{fontSize:16,fontFamily:"Georgia,serif",color:T.gold}}>Flossenpass {getPassLabel(pk)}</strong><span style={{fontSize:13,color:T.creamFaint,marginLeft:8}}>{fmtDate(pk.datum)}</span></div><Badge variant="cream">Aufgebraucht</Badge></div></Card>))}
      {mp.length===0&&me.length===0&&<Card style={{textAlign:"center",padding:48}}><p style={{color:T.creamFaint,lineHeight:1.8,fontSize:16}}>Du hast noch keine Angebote.<br/>Sprich uns gerne an!</p></Card>}
      {ml.length>0&&(<Card style={{marginTop:18}}><SectionLabel>Mein Verlauf</SectionLabel>{ml.map((l,i)=>{const b=logBadge(l.typ);return(<div key={l.id} className="slide-in log-row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${T.cardBorder}`,fontSize:15,animationDelay:`${i*0.04}s`}}><div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><Badge variant={b.v} small>{b.label}</Badge><span style={{color:T.cream}}>{l.notiz}</span></div><span style={{color:T.creamFaint,fontSize:13,flexShrink:0,marginLeft:8}}>{fmtDate(l.datum)}</span></div>);})}</Card>)}
      {(mp.length>0||me.length>0)&&(<Card style={{marginTop:18}}><SectionLabel>Meine Rechnungen</SectionLabel>{mp.map(pk=>(<div key={pk.id} className="rechnung-row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${T.cardBorder}`,fontSize:15}}><div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><code style={{background:T.bg3,padding:"4px 12px",borderRadius:8,fontSize:13,color:T.creamFaint}}>{pk.rechnung||"–"}</code><span style={{color:T.creamDim}}>Flossenpass {getPassLabel(pk)}</span></div><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{color:T.creamFaint,fontSize:13}}>{fmtDate(pk.datum)}</span><strong style={{fontFamily:"Georgia,serif",color:T.gold}}>{pk.preis||0} €</strong></div></div>))}{me.map(e=>(<div key={e.id} className="rechnung-row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${T.cardBorder}`,fontSize:15}}><div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><code style={{background:T.bg3,padding:"4px 12px",borderRadius:8,fontSize:13,color:T.creamFaint}}>{e.rechnung||"–"}</code><span style={{color:T.creamDim}}>{e.name}</span></div><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{color:T.creamFaint,fontSize:13}}>{fmtDate(e.datum)}</span><strong style={{fontFamily:"Georgia,serif",color:T.gold}}>{e.preis||0} €</strong></div></div>))}</Card>)}
      <div style={{textAlign:"center",padding:"36px 0 8px"}}><a href="https://kaiserufer.com/datenschutz/" target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:T.goldDim+"60",textDecoration:"none",letterSpacing:1,textTransform:"uppercase"}}>Datenschutz ↗</a></div>
    </div>
  );
};

export default function App(){
  const [mode,setMode]=useState("kunde");const [showLogin,setShowLogin]=useState(false);
  const [patienten,setPatienten]=useState([]);const [paesse,setPaesse]=useState([]);
  const [log,setLog]=useState([]);const [einzel,setEinzel]=useState([]);
  const [rechnungsNr,setRechnungsNr]=useState(0);const [loading,setLoading]=useState(true);
  const urlToken=new URLSearchParams(window.location.search).get("token");

  useEffect(()=>{(async()=>{
    setLoading(true);
    try{const[p,pk,l,e,cfg]=await Promise.all([supabase.from("patienten").select("*"),supabase.from("paesse").select("*"),supabase.from("log").select("*"),supabase.from("einzel").select("*"),supabase.from("einstellungen").select("*").eq("key","rechnungs_nr").single()]);if(p.data)setPatienten(p.data);if(pk.data)setPaesse(pk.data);if(l.data)setLog(l.data);if(e.data)setEinzel(e.data);if(cfg.data)setRechnungsNr(parseInt(cfg.data.value)||0);}catch(err){console.error("Ladefehler:",err);}
    setLoading(false);
  })();},[]);

  const loginPat=urlToken?patienten.find(p=>p.qr===urlToken.toUpperCase()):null;
  const appBg=`linear-gradient(180deg,${T.bg0} 0%,${T.bg1} 30%,${T.bg2} 60%,${T.bg3} 100%)`;

  if(loading)return(<div style={{fontFamily:"'Inter','Segoe UI',-apple-system,sans-serif",minHeight:"100vh",background:appBg}}><style>{css}</style><Spinner/></div>);

  return(
    <div style={{fontFamily:"'Inter','Segoe UI',-apple-system,sans-serif",minHeight:"100vh",background:appBg,color:T.cream}}>
      <style>{css}</style>
      {showLogin&&<LoginModal onLogin={()=>{setShowLogin(false);setMode("staff");}} onClose={()=>setShowLogin(false)}/>}
      {(mode==="staff"||loginPat)&&<div style={{background:"rgba(10,14,6,0.85)",backdropFilter:"blur(12px)",color:T.cream,padding:"0 28px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${T.cardBorder}`,position:"sticky",top:0,zIndex:100,height:58}} className="nav-bar">
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontFamily:"Georgia,serif",fontWeight:700,fontSize:17,letterSpacing:2.5,textTransform:"uppercase",color:T.gold}}>Kaiserufer</span>
          <div style={{width:1,height:22,background:T.goldFaint,borderRadius:1}}/>
          <span style={{fontSize:13,color:T.goldDim,fontWeight:500,letterSpacing:1.5,textTransform:"uppercase"}}>Home</span>
        </div>
        <div>
          {mode==="staff"&&<button onClick={()=>setMode("kunde")} style={{padding:"7px 18px",borderRadius:12,border:`1px solid ${T.cardBorder}`,background:"transparent",color:T.goldDim,fontWeight:600,fontSize:12,cursor:"pointer",textTransform:"uppercase",letterSpacing:0.8,fontFamily:"inherit"}}>Abmelden</button>}
        </div>
      </div>}
      {mode==="staff"
        ?<MitarbeiterApp patienten={patienten} setPatienten={setPatienten} paesse={paesse} setPaesse={setPaesse} log={log} setLog={setLog} rechnungsNr={rechnungsNr} setRechnungsNr={setRechnungsNr} einzel={einzel} setEinzel={setEinzel}/>
        :loginPat
          ?<KundenApp kunde={loginPat} paesse={paesse} log={log} einzel={einzel}/>
          :<div style={{minHeight:"100vh",background:`linear-gradient(180deg,${T.bg0} 0%,${T.bg1} 40%,${T.bg2} 70%,${T.bg3} 100%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 20px",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 30%,rgba(184,168,138,0.06) 0%,transparent 70%)",pointerEvents:"none"}}/>
            <div style={{position:"absolute",top:"15%",left:"50%",transform:"translateX(-50%)",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(184,168,138,0.04) 0%,transparent 70%)",filter:"blur(60px)",pointerEvents:"none"}}/>
            <div style={{position:"relative",zIndex:1,textAlign:"center",maxWidth:480}}>
              <div className="landing-title" style={{fontFamily:"Georgia,serif",fontWeight:700,fontSize:"clamp(36px,8vw,56px)",letterSpacing:4,textTransform:"uppercase",color:T.gold,marginBottom:8,lineHeight:1.1}}>Kaiserufer</div>
              <div className="landing-sub" style={{fontSize:"clamp(14px,3vw,18px)",color:T.goldDim,letterSpacing:6,textTransform:"uppercase",fontWeight:300,marginBottom:48}}>Home</div>
              <div className="landing-btn" style={{marginTop:48}}>
                <button onClick={()=>setShowLogin(true)} style={{padding:"16px 48px",borderRadius:50,fontWeight:600,fontSize:14,cursor:"pointer",background:"transparent",color:T.gold,border:`1px solid rgba(184,168,138,0.25)`,letterSpacing:2,textTransform:"uppercase",fontFamily:"inherit",backdropFilter:"blur(8px)",transition:"all 0.4s cubic-bezier(0.4,0,0.2,1)",boxShadow:"0 0 30px rgba(184,168,138,0.05)"}}>Log in</button>
              </div>
              <div className="landing-footer" style={{marginTop:64}}><div style={{width:40,height:1,background:"rgba(184,168,138,0.15)",margin:"0 auto 20px"}}/><a href="https://kaiserufer.com" target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:"rgba(184,168,138,0.25)",textDecoration:"none",letterSpacing:2,textTransform:"uppercase"}}>kaiserufer.com</a></div>
            </div>
          </div>}
    </div>
  );
}
