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
  orange:"#D4944A",orangeSoft:"rgba(212,148,74,0.12)",
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
const getPassLabel=(pk)=>{if(!pk)return"–";if(pk.typ==="INDIVIDUELL"||!PASS_TYPES[pk.typ])return pk.custom_name||"Flossenpass";return PASS_TYPES[pk.typ].name;};

const genId=()=>Math.random().toString(36).substr(2,9);
const genRechnung=(n)=>`RN${n}`;
const fmtDate=(d)=>{try{return new Date(d).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});}catch{return"–";}};
const fmtDateTime=(d)=>{try{return new Date(d).toLocaleString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});}catch{return"–";}};
const todayISO=()=>new Date().toISOString().split("T")[0];
const isPassAlt=(pk)=>!pk?false:(pk.he_genutzt??0)>=(pk.he_total??1)&&(pk.bs_genutzt??0)>=(pk.bs_total??1);
const workingDays=(von,bis)=>{let c=0,d=new Date(von);const e=new Date(bis);while(d<=e){const day=d.getDay();if(day!==0&&day!==6)c++;d.setDate(d.getDate()+1);}return c;};
const MONATE=["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const TAGE_KURZ=["Mo","Di","Mi","Do","Fr","Sa","So"];
const CAL_COLORS={event:"#5A94B8",urlaub:"#9070B0",schicht:"#D4944A"};
const MA_COLORS=["#9070B0","#5A94B8","#D4944A","#e46d73","#5A9E4A","#B8A88A","#6BA3A0","#C47DA0"];
const getMaColor=(maList,patId)=>{const idx=maList.findIndex(p=>p.id===patId);return idx>=0?MA_COLORS[idx%MA_COLORS.length]:MA_COLORS[0];};

const css=`
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideIn{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes goldGlow{0%,100%{text-shadow:0 0 20px rgba(184,168,138,0.3),0 0 60px rgba(184,168,138,0.1)}50%{text-shadow:0 0 30px rgba(184,168,138,0.5),0 0 80px rgba(184,168,138,0.2)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeUp2{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  @keyframes splashOut{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-100%)}}
  @keyframes contentIn{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
  @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
  @keyframes toastOut{from{opacity:1;transform:translateX(-50%) translateY(0)}to{opacity:0;transform:translateX(-50%) translateY(20px)}}
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
  .kunde-card-1{animation-delay:0.1s}.kunde-card-2{animation-delay:0.2s}.kunde-card-3{animation-delay:0.3s}.kunde-card-4{animation-delay:0.4s}
  .undo-toast{animation:toastIn 0.3s ease-out;position:fixed;bottom:28px;left:50%;transform:translateX(-50%);z-index:9999}
  .undo-toast.hiding{animation:toastOut 0.3s ease-in forwards}
  *{box-sizing:border-box}
  input,textarea,select,button{font-family:inherit}
  ::selection{background:rgba(184,168,138,0.3)}
  .cal-day:hover{background:rgba(116,122,91,0.12)!important}
  .cal-day-today{box-shadow:inset 0 0 0 2px ${T.gold}!important}
  @media(max-width:640px){
    .resp-pad{padding:14px!important}
    .stat-grid-4{grid-template-columns:repeat(2,1fr)!important}
    .stat-grid-2{grid-template-columns:1fr!important}
    .akte-grid{grid-template-columns:1fr!important}
    .pass-2col{grid-template-columns:1fr!important}
    .pass-3col{grid-template-columns:1fr!important}
    .kunden-units{grid-template-columns:1fr!important}
    .liste-row{flex-direction:column!important;align-items:flex-start!important;gap:10px!important}
    .liste-right{flex-wrap:wrap!important;gap:8px!important;justify-content:flex-start!important}
    .liste-right .badge-w{width:auto!important;text-align:left!important}
    .liste-right .chevron{display:none!important}
    .toolbar-btns{display:flex!important;gap:6px!important;width:100%!important;flex-wrap:wrap!important}
    .toolbar-btns>button{flex:1!important;min-width:0!important;font-size:11px!important;padding:8px 10px!important}
    .btn-text{display:none!important}.btn-emoji{display:inline!important}
    .stammk-row{flex-direction:column!important;align-items:flex-start!important;gap:8px!important}
    .stammk-inner{flex-wrap:wrap!important}
    .log-row,.einzel-row,.rechnung-row,.vk-row{flex-direction:column!important;align-items:flex-start!important;gap:6px!important}
    .qr-sidebar{position:static!important}
    .modal-box{width:calc(100vw - 32px)!important;max-width:none!important;margin:16px!important}
    .nav-bar{padding:0 14px!important}
    .header-row{flex-wrap:wrap!important;gap:8px!important}
    .k-resp-pad{padding:0 16px 40px!important}
    .urlaub-grid{grid-template-columns:1fr!important}
    .cal-grid{font-size:12px!important}
    .cal-grid .cal-day{min-height:48px!important;padding:2px!important}
    .week-grid{grid-template-columns:1fr!important;gap:6px!important}
    .team-detail-grid{grid-template-columns:1fr!important}
    .pingu-btns{flex-direction:column!important}
    .pingu-btns>button{min-width:0!important}
  }
`;

const Badge=({children,variant="default",small})=>{
  const s={default:{bg:T.olive+"15",c:T.olive},gold:{bg:T.gold+"25",c:"#7A6B50"},green:{bg:T.greenSoft,c:T.green},red:{bg:T.redSoft,c:T.red},cream:{bg:T.bgPale,c:T.textLight},blue:{bg:T.blueSoft,c:T.blue},purple:{bg:T.purpleSoft,c:T.purple},orange:{bg:T.orangeSoft,c:T.orange}};
  const st=s[variant]||s.default;
  return<span style={{background:st.bg,color:st.c,fontWeight:600,fontSize:small?10:12,padding:small?"3px 10px":"5px 14px",borderRadius:20,whiteSpace:"nowrap",letterSpacing:0.4,textTransform:"uppercase"}}>{children}</span>;
};
const Bar=({used,total,color=T.olive,h=6})=>(<div style={{background:T.olive+"18",borderRadius:20,height:h,width:"100%",overflow:"hidden"}}><div style={{background:color,height:"100%",width:`${total>0?(used/total)*100:0}%`,borderRadius:20,transition:"width 0.6s ease"}}/></div>);
const Card=({children,style,onClick,className=""})=>(<div onClick={onClick} className={`${onClick?"card-h":""} ${className}`} style={{background:T.card,color:T.text,borderRadius:20,border:`1px solid ${T.cardBorder}`,padding:24,cursor:onClick?"pointer":"default",backdropFilter:"blur(8px)",boxShadow:"0 2px 16px rgba(74,82,64,0.06)",...style}}>{children}</div>);
const Btn=({children,onClick,gold,small,disabled,danger,ghost,active,style:s,className=""})=>(<button disabled={disabled} onClick={onClick} className={`btn-a ${className}`} style={{padding:small?"8px 18px":"12px 26px",borderRadius:14,fontWeight:600,fontSize:small?13:15,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.35:1,letterSpacing:0.5,textTransform:"uppercase",lineHeight:1.5,background:danger?T.red:ghost?"transparent":gold?`linear-gradient(135deg,${T.gold},#9A8A6A)`:active?T.oliveDark:T.olive,color:danger?"#fff":gold?"#2A2A1A":ghost?T.textLight:"#fff",border:ghost?`1px solid ${T.cardBorder}`:"none",boxShadow:gold?`0 4px 20px rgba(184,168,138,0.25)`:danger?`0 4px 16px ${T.red}30`:"none",...s}}>{children}</button>);
const SectionLabel=({children})=>(<div style={{fontSize:13,fontWeight:700,color:T.gold,marginBottom:16,textTransform:"uppercase",letterSpacing:2.5,fontFamily:"Georgia,serif"}}>{children}</div>);
const Heading=({children,style})=>(<h2 style={{fontFamily:"Georgia,serif",fontWeight:700,color:T.oliveDark,margin:0,fontSize:26,letterSpacing:0.5,...style}}>{children}</h2>);
const QRCode=({value,size=120})=>(<img src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=https://home.kaiserufer.com?token=${value}`} width={size} height={size} style={{borderRadius:12}} alt="QR"/>);
const Modal=({children,onClose})=>(<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(44,48,38,0.4)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16}}><div onClick={e=>e.stopPropagation()} style={{maxWidth:"100%",maxHeight:"90vh",overflowY:"auto"}}>{children}</div></div>);
const Donut=({value,total,size=56,color=T.green})=>{const r=20,circ=2*Math.PI*r,pct=total>0?value/total:0;return(<svg width={size} height={size} viewBox="0 0 48 48"><circle cx="24" cy="24" r={r} fill="none" stroke={T.olive+"18"} strokeWidth="5"/><circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="5" strokeDasharray={`${circ*pct} ${circ*(1-pct)}`} strokeDashoffset={circ*0.25} strokeLinecap="round" style={{transition:"stroke-dasharray 0.8s ease"}}/><text x="24" y="26" textAnchor="middle" fontSize="12" fontWeight="700" fill={T.text} fontFamily="Georgia,serif">{Math.round(pct*100)}%</text></svg>);};
const logBadge=(typ)=>{const m={HAUPTEINHEIT:{label:"Haupteinheit",v:"green"},BS:{label:"Gruppenangebot",v:"gold"},KORREKTUR:{label:"Korrektur",v:"red"},NOTIZ:{label:"Notiz",v:"cream"},QUICKIE:{label:"Psycho Quickie",v:"purple"},TDCS:{label:"tDCS",v:"blue"},NEUROFEEDBACK:{label:"Neurofeedback",v:"blue"}};return m[typ]||{label:typ||"–",v:"cream"};};
const Spinner=()=>(<div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:60}}><div style={{width:32,height:32,border:`3px solid ${T.gold}40`,borderTopColor:T.gold,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/></div>);

const UndoToast=({message,onUndo,onDismiss})=>{
  const [hiding,setHiding]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>{setHiding(true);setTimeout(onDismiss,300);},5000);return()=>clearTimeout(t);},[]);
  const doUndo=()=>{setHiding(true);setTimeout(()=>{onUndo();onDismiss();},200);};
  return(<div className={`undo-toast ${hiding?"hiding":""}`} style={{background:T.oliveDark,color:"#F0EDE0",padding:"14px 24px",borderRadius:16,boxShadow:"0 8px 32px rgba(0,0,0,0.25)",display:"flex",alignItems:"center",gap:16,fontSize:15,maxWidth:440}}>
    <span style={{flex:1}}>{message}</span>
    <button onClick={doUndo} style={{background:T.gold,color:"#2A2A1A",border:"none",borderRadius:10,padding:"8px 18px",fontWeight:700,fontSize:13,cursor:"pointer",textTransform:"uppercase",letterSpacing:0.5,whiteSpace:"nowrap"}}>Rückgängig</button>
  </div>);
};

const LoginModal=({onLogin,onClose})=>{
  const [email,setEmail]=useState("");const[pw,setPw]=useState("");const[err,setErr]=useState("");const[loading,setLoading]=useState(false);
  const tryLogin=async()=>{if(!email.trim()||!pw.trim()){setErr("Bitte alle Felder ausfüllen");return;}setLoading(true);setErr("");try{const{error}=await supabase.auth.signInWithPassword({email:email.trim(),password:pw});if(error){setErr("Ungültige Anmeldedaten");setPw("");}else{onLogin();}}catch(e){setErr("Anmeldung fehlgeschlagen");}setLoading(false);};
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
  const gaeste=patienten.filter(p=>!p.mitarbeiter);
  const kl=gaeste.filter(p=>p.kennenlern).length,kv=gaeste.filter(p=>p.konvertiert).length;
  const offene=paesse.filter(p=>!p.bezahlt).length+einzelArr.filter(e=>!e.bezahlt).length;
  const aktive=paesse.filter(p=>!isPassAlt(p)).length;
  const tHE=paesse.filter(p=>!isPassAlt(p)).reduce((s,p)=>s+(p.he_total||0),0),gHE=paesse.filter(p=>!isPassAlt(p)).reduce((s,p)=>s+(p.he_genutzt||0),0);
  const tBS=paesse.filter(p=>!isPassAlt(p)).reduce((s,p)=>s+(p.bs_total||0),0),gBS=paesse.filter(p=>!isPassAlt(p)).reduce((s,p)=>s+(p.bs_genutzt||0),0);
  const umsatz=paesse.reduce((s,p)=>s+(p.preis||0),0)+einzelArr.reduce((s,e)=>s+(e.preis||0),0);
  const bezahlt=paesse.filter(p=>p.bezahlt).reduce((s,p)=>s+(p.preis||0),0)+einzelArr.filter(e=>e.bezahlt).reduce((s,e)=>s+(e.preis||0),0);
  const nTherapie=gaeste.filter(p=>p.therapie||(!p.ergotherapie&&!p.sonstige)).length;
  const nErgo=gaeste.filter(p=>p.ergotherapie).length;
  const nSonstige=gaeste.filter(p=>p.sonstige).length;
  return(
    <div className="fade-in" style={{display:"flex",flexDirection:"column",gap:16}}>
      <div className="stat-grid-4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        {[{val:gaeste.length,label:"Kunden"},{val:aktive,label:"Aktive Pässe"},{val:offene,label:"Offen",color:offene>0?T.red:T.text},{val:`${(umsatz/1000).toFixed(1)}k`,label:"Umsatz (€)"}].map((s,i)=>(
          <Card key={i} style={{padding:18,textAlign:"center"}}><div style={{fontSize:30,fontWeight:700,fontFamily:"Georgia,serif",color:s.color||T.oliveDark}}>{s.val}</div><div style={{color:T.textLight,fontSize:12,textTransform:"uppercase",letterSpacing:1.5,marginTop:6}}>{s.label}</div></Card>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
        {[{val:nTherapie,label:"Therapie",color:T.olive,bg:T.greenSoft},{val:nErgo,label:"Ergotherapie",color:T.blue,bg:T.blueSoft},{val:nSonstige,label:"Sonstige",color:T.purple,bg:T.purpleSoft}].map((s,i)=>(
          <Card key={i} style={{padding:16,textAlign:"center",background:s.bg,border:`1px solid ${s.color}20`}}><div style={{fontSize:26,fontWeight:700,fontFamily:"Georgia,serif",color:s.color}}>{s.val}</div><div style={{color:s.color,fontSize:11,textTransform:"uppercase",letterSpacing:1.5,marginTop:4,fontWeight:600}}>{s.label}</div></Card>
        ))}
      </div>
      <div className="stat-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Card style={{display:"flex",alignItems:"center",gap:18,padding:20,flexWrap:"wrap"}}>
          <Donut value={kv} total={kl||1} color={T.green}/>
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
      <Card style={{padding:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontSize:15,fontWeight:600,color:T.text}}>Verkaufte Flossenpässe</div>
          <span style={{fontSize:13,color:T.textLight}}>{paesse.length} gesamt</span>
        </div>
        <div style={{maxHeight:400,overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>
          {paesse.slice().sort((a,b)=>(b.datum||"").localeCompare(a.datum||"")).map(pk=>{
            const pat=patienten.find(p=>p.id===pk.pat_id);
            const name=pat?`${pat.vorname||""} ${pat.nachname||""}`.trim():"Unbekannt";
            const label=pk.typ==="INDIVIDUELL"||!PASS_TYPES[pk.typ]?(pk.custom_name||"Individuell"):PASS_TYPES[pk.typ].name;
            return(<div key={pk.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:T.bgPale+"80",borderRadius:12,flexWrap:"wrap",gap:8,borderLeft:`3px solid ${pk.bezahlt?T.green:T.red}60`}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <strong style={{fontSize:14,color:T.text}}>{name}</strong>
                <Badge variant="gold" small>{label}</Badge>
                <code style={{background:T.bgPale,padding:"2px 8px",borderRadius:6,fontSize:11,color:T.textLight,fontFamily:"monospace"}}>{pk.rechnung||"–"}</code>
                {pk.rechnung_pdf&&<a href={pk.rechnung_pdf} target="_blank" rel="noopener noreferrer" style={{fontSize:11,fontWeight:700,color:T.green,textDecoration:"none"}}>PDF ↗</a>}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                <span style={{fontSize:12,color:T.textLight}}>{fmtDate(pk.datum)}</span>
                <strong style={{fontFamily:"Georgia,serif",fontSize:14,color:T.oliveDark}}>{pk.preis||0} €</strong>
                <Badge variant={pk.bezahlt?"green":"red"} small>{pk.bezahlt?"Bezahlt":"Offen"}</Badge>
              </div>
            </div>);
          })}
          {paesse.length===0&&<div style={{textAlign:"center",padding:20,color:T.textLight,fontSize:14}}>Noch keine Flossenpässe verkauft</div>}
        </div>
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
    <p style={{color:T.textMid,fontSize:15,marginBottom:22}}>für <strong style={{color:T.text}}>{selPat?.vorname} {selPat?.nachname}</strong></p>
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

/* ═══ PINGU CHAT ═══ */
const PinguChatModal=({patienten,paesse,einzel,log,onAction,onClose})=>{
  const [messages,setMessages]=useState([{role:"assistant",text:"Hey! Ich bin Pingu, dein Praxis-Assistent.\n\nIch kann:\n• Einheiten abziehen (\"Zieh bei Max eine HE ab\", \"Lisa war beim Yoga\")\n• Pässe & Einzelangebote anlegen (\"Basis-Pass für Anna\", \"Quickie für Max\")\n• Zahlungen vermerken (\"RN12 bezahlt\")\n• Fragen beantworten (\"Wer muss noch bezahlen?\", \"Wie viele Einheiten hat Max?\")\n• Notizen & Services setzen\n\nSprich oder tippe einfach los!"}]);
  const [input,setInput]=useState("");const[loading,setLoading]=useState(false);
  const [listening,setListening]=useState(false);const[interimText,setInterimText]=useState("");const recognRef=useRef(null);
  const endRef=useRef(null);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);
  const toggleListening=()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){setMessages(prev=>[...prev,{role:"system",text:"Spracherkennung wird von diesem Browser nicht unterstützt. Bitte Chrome nutzen."}]);return;}
    if(recognRef.current){recognRef.current.stop();return;}
    const r=new SR();r.lang="de-DE";r.continuous=true;r.interimResults=true;r.maxAlternatives=1;
    r.onresult=(e)=>{let interim="",final="";for(let i=e.resultIndex;i<e.results.length;i++){if(e.results[i].isFinal){final+=e.results[i][0].transcript;}else{interim+=e.results[i][0].transcript;}}
      if(final)setInput(prev=>(prev?prev+" ":"")+final);setInterimText(interim);};
    r.onend=()=>{setListening(false);setInterimText("");recognRef.current=null;};
    r.onerror=(e)=>{setListening(false);setInterimText("");recognRef.current=null;if(e.error==="not-allowed")setMessages(prev=>[...prev,{role:"system",text:"Mikrofon-Zugriff verweigert. Bitte in den Browser-Einstellungen erlauben."}]);};
    recognRef.current=r;r.start();setListening(true);
  };
  const stopAndSend=()=>{if(recognRef.current){recognRef.current.stop();}setTimeout(()=>{if(input.trim())send();},200);};
  const buildContext=()=>{
    const gaeste=patienten.filter(p=>!p.mitarbeiter);
    const passInfo=paesse.map(pk=>{const pat=gaeste.find(p=>p.id===pk.pat_id);return pat?`PassID:${pk.id} | Rechnung:${pk.rechnung||"–"} | ${pat.vorname} ${pat.nachname} | ${getPassLabel(pk)} | HE:${pk.he_genutzt||0}/${pk.he_total||0} GA:${pk.bs_genutzt||0}/${pk.bs_total||0} | bezahlt:${pk.bezahlt?"ja":"NEIN"} | ${pk.preis||0}€ | ${pk.datum||"–"}`:null;}).filter(Boolean).join("\n");
    const einzelInfo=einzel.map(e=>{const pat=gaeste.find(p=>p.id===e.pat_id);return pat?`EinzelID:${e.id} | Rechnung:${e.rechnung||"–"} | ${pat.vorname} ${pat.nachname} | ${e.name} | bezahlt:${e.bezahlt?"ja":"NEIN"} | ${e.preis||0}€`:null;}).filter(Boolean).join("\n");
    const recentLog=log.filter(l=>l.typ==="HAUPTEINHEIT"||l.typ==="BS").sort((a,b)=>(b.datum||"").localeCompare(a.datum||"")).slice(0,50).map(l=>{const pat=gaeste.find(p=>p.id===l.pat_id);return pat?`${fmtDate(l.datum)} | ${pat.vorname} ${pat.nachname} | ${l.typ} | ${l.notiz||""}`:null;}).filter(Boolean).join("\n");
    const lines=gaeste.map(p=>{const pp=paesse.filter(pk=>pk.pat_id===p.id);const pe=einzel.filter(e=>e.pat_id===p.id);const ak=pp.find(pk=>!isPassAlt(pk));const offen=pp.filter(pk=>!pk.bezahlt).reduce((s,pk)=>s+(pk.preis||0),0)+pe.filter(e=>!e.bezahlt).reduce((s,e)=>s+(e.preis||0),0);
      const svc=[p.therapie?"Therapie":null,p.ergotherapie?"Ergotherapie":null,p.sonstige?"Sonstige":null].filter(Boolean).join(",");
      const lastLog=log.filter(l=>l.pat_id===p.id&&(l.typ==="HAUPTEINHEIT"||l.typ==="BS")).sort((a,b)=>(b.datum||"").localeCompare(a.datum||""))[0];
      const lastDate=lastLog?fmtDate(lastLog.datum):"nie";
      return`${p.vorname} ${p.nachname} (ID:${p.id})${p.stammkunde?" [Stammkunde]":""}${svc?` [${svc}]`:" [keine Kategorie]"}${ak?` | ${getPassLabel(ak)} HE-Rest:${(ak.he_total||0)-(ak.he_genutzt||0)} GA-Rest:${(ak.bs_total||0)-(ak.bs_genutzt||0)}`:" | Kein Pass"} | Letzter Termin:${lastDate}${offen>0?` | OFFEN:${offen}€`:""}`;}).join("\n");
    return`Du bist Pingu, der KI-Assistent der Kaiserufer Praxis. Du hilfst dem Team im Alltag.

ANTWORTFORMAT: Antworte IMMER als valides JSON ohne Backticks:
{"antwort":"Dein Text hier","aktionen":[]}

DEINE FÄHIGKEITEN:
1. EINHEITEN ABZIEHEN: Haupteinheiten (HE) und Gruppenangebote (GA) von Pässen abziehen. Das ist die wichtigste Alltagsaufgabe!
2. PÄSSE & EINZELANGEBOTE ANLEGEN: Neue Flossenpässe oder Einzelangebote für Kunden erstellen.
3. FRAGEN BEANTWORTEN: Beantworte JEDE Frage zu Kunden, Pässen, Zahlungen, Terminen. Analysiere intelligent.
4. ZAHLUNGEN VERMERKEN: Rechnungen als bezahlt markieren.
5. SERVICES & NOTIZEN: Kategorien setzen, Notizen hinterlegen.
6. PROAKTIV SEIN: Wenn du etwas Auffälliges siehst (fast aufgebrauchte Pässe, offene Rechnungen), erwähne es.
7. MEHRERE AUFGABEN: Wenn der User mehrere Sachen auf einmal sagt, führe ALLE aus.

MÖGLICHE AKTIONEN:
• HE abziehen: {"typ":"HE_ABZIEHEN","pat_id":"id"}
  Beispiele: "Zieh bei Max eine HE ab", "Haupteinheit bei Anna", "Max war heute da"
• GA abziehen: {"typ":"BS_ABZIEHEN","pat_id":"id","notiz":"Yoga"}
  Beispiele: "Max war beim Yoga", "GA bei Anna: Sound Bath"
  WICHTIG: notiz ist PFLICHT (welches Angebot). Wenn nicht klar, FRAGE nach welches Gruppenangebot.
• Pass anlegen: {"typ":"PASS_ANLEGEN","pat_id":"id","passtyp":"BASIS"/"PLUS"/"DELUXE"}
  Passtypen: BASIS (3 HE, 1 GA, 299€), PLUS (5 HE, 3 GA, 499€), DELUXE (10 HE, 5 GA, 899€)
  Beispiele: "Basis-Pass für Anna", "Leg Max einen Deluxe an"
• Einzelangebot: {"typ":"EINZEL_ANLEGEN","pat_id":"id","name":"Psycho Quickie","preis":70}
  Bekannte: Psycho Quickie (70€), tDCS (55€), Neurofeedback 5er Karte (350€). Auch Custom möglich.
  Beispiele: "Quickie für Max", "tDCS bei Anna", "Neurofeedback für Lisa"
• Notiz: {"typ":"NOTIZ","pat_id":"id","text":"..."}
• Bezahlt (per Rechnungsnr.): {"typ":"BEZAHLT_RN","rechnung":"RN12"}
• Bezahlt (per ID): {"typ":"BEZAHLT","id":"pass_oder_einzel_id","art":"pass"/"einzel"}
• Service setzen: {"typ":"SET_SERVICE","pat_id":"id","service":"ergotherapie"/"therapie"/"sonstige"}
  Kann MEHRERE Patienten gleichzeitig. Bei "Entferne Ergotherapie bei Anna" → {"typ":"UNSET_SERVICE","pat_id":"id","service":"ergotherapie"}

REGELN:
- SPRACHEINGABE: Der User nutzt oft Spracherkennung. Interpretiere phonetische Eingaben großzügig. "Suse Sur" = "Susanne Suhr".
- Wenn du einen Namen nicht eindeutig zuordnen kannst, frage nach.
- ANTWORTE IMMER KURZ UND KNAPP. Maximal 5-8 Zeilen. Bei langen Listen: Nur die Top 5 zeigen + "und X weitere". Nie mehr als 10 Einträge auflisten.
- "War heute da" / "hatte Termin" = HE abziehen. "War beim [Angebot]" = GA abziehen.

STATISTIK: ${gaeste.length} Kunden | ${paesse.filter(p=>!isPassAlt(p)).length} aktive Pässe | ${paesse.filter(p=>!p.bezahlt).length+einzel.filter(e=>!e.bezahlt).length} offene Rechnungen | ${gaeste.filter(p=>p.ergotherapie).length} Ergotherapie | ${gaeste.filter(p=>p.sonstige).length} Sonstige
Kundenliste:\n${lines}\nPässe:\n${passInfo}\nEinzelangebote:\n${einzelInfo}\nLetzte Termine:\n${recentLog}\nHeute: ${todayISO()}`;
  };
  const send=async()=>{if(!input.trim()||loading)return;const msg=input.trim();setInput("");setInterimText("");setMessages(prev=>[...prev,{role:"user",text:msg}]);setLoading(true);
    try{
      const history=messages.filter(m=>m.role==="user"||m.role==="assistant").slice(-10).map(m=>({role:m.role,content:m.text}));
      history.push({role:"user",content:msg});
      const resp=await fetch("/api/ai-analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system:buildContext(),messages:history,max_tokens:3000})});
      const data=await resp.json();const raw=(data.text||"").replace(/```json|```/g,"").trim();
      let parsed=null;
      try{parsed=JSON.parse(raw);}catch{const jsonMatch=raw.match(/\{[\s\S]*\}/);if(jsonMatch){try{parsed=JSON.parse(jsonMatch[0]);}catch{}}}
      if(parsed&&parsed.antwort){
        setMessages(prev=>[...prev,{role:"assistant",text:parsed.antwort}]);
        if(parsed.aktionen&&parsed.aktionen.length>0){
          let ok=0;const errors=[];
          for(const a of parsed.aktionen){try{await onAction(a);ok++;}catch(e){errors.push(e.message||"Unbekannter Fehler");}}
          if(ok>0)setMessages(prev=>[...prev,{role:"system",text:`✓ ${ok} Aktion${ok>1?"en":""} ausgeführt`}]);
          if(errors.length>0)setMessages(prev=>[...prev,{role:"error",text:`✗ ${errors.join(", ")}`}]);
        }
      }else{setMessages(prev=>[...prev,{role:"assistant",text:raw||"Ich konnte das leider nicht verarbeiten."}]);}
    }catch(e){setMessages(prev=>[...prev,{role:"assistant",text:"Verbindungsfehler – bitte nochmal versuchen."}]);}setLoading(false);};
  return(<Modal onClose={onClose}><div className="modal-box" style={{background:T.cardSolid,borderRadius:24,width:560,maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(44,48,38,0.15)",border:`1px solid ${T.cardBorder}`,overflow:"hidden"}}>
    <div style={{padding:"20px 24px",borderBottom:`1px solid ${T.cardBorder}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><Heading style={{fontSize:20}}>Pingu</Heading><button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:T.textLight,padding:4}}>✕</button></div>
    <div style={{flex:1,overflowY:"auto",padding:"16px 24px",display:"flex",flexDirection:"column",gap:12,minHeight:300}}>
      {messages.map((m,i)=>(<div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}><div style={{maxWidth:"85%",padding:"10px 16px",borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",background:m.role==="user"?T.olive:m.role==="system"?T.greenSoft:m.role==="error"?T.redSoft:T.bgPale,color:m.role==="user"?"#fff":m.role==="system"?T.green:m.role==="error"?T.red:T.text,fontSize:15,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{m.text}</div></div>))}
      {loading&&<div style={{display:"flex",justifyContent:"flex-start"}}><div style={{padding:"10px 16px",borderRadius:"16px 16px 16px 4px",background:T.bgPale,color:T.textLight,fontSize:14}}>denkt nach...</div></div>}
      <div ref={endRef}/>
    </div>
    <div style={{padding:"12px 24px 20px",borderTop:`1px solid ${T.cardBorder}`,display:"flex",flexDirection:"column",gap:8}}>
      {(listening||interimText)&&<div style={{padding:"8px 14px",borderRadius:12,background:T.redSoft,fontSize:13,color:T.red,display:"flex",alignItems:"center",gap:8}}>
        <span style={{display:"inline-block",width:8,height:8,borderRadius:4,background:T.red,animation:"spin 1s linear infinite"}}/>
        <span style={{fontWeight:600}}>Aufnahme läuft...</span>
        {interimText&&<span style={{color:T.textMid,fontStyle:"italic",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{interimText}</span>}
        <button onClick={stopAndSend} style={{padding:"4px 12px",borderRadius:8,border:`1px solid ${T.red}`,background:"transparent",color:T.red,fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0,fontFamily:"inherit"}}>Fertig & Senden</button>
      </div>}
      <div style={{display:"flex",gap:8}}>
        <button onClick={toggleListening} style={{padding:"10px 14px",borderRadius:14,border:`1.5px solid ${listening?T.red:T.cardBorder}`,background:listening?T.redSoft:"transparent",color:listening?T.red:T.textLight,cursor:"pointer",fontSize:18,flexShrink:0,transition:"all 0.2s"}} title="Spracheingabe">{listening?"⏹":"🎤"}</button>
        <input value={input+(interimText?(" "+interimText):"")} onChange={e=>{setInput(e.target.value);setInterimText("");}} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="z.B. 'Max war heute da' oder 'Basis-Pass für Anna'" style={{flex:1,padding:"12px 16px",borderRadius:14,border:`1px solid ${T.cardBorder}`,fontSize:15,background:T.inp,color:interimText?T.textLight:T.text,outline:"none"}} autoFocus/>
        <Btn gold small onClick={send} disabled={!input.trim()||loading}>→</Btn>
      </div>
    </div>
  </div></Modal>);
};

// ════════════════════════════════════════════════════════════════
// ENDE TEIL 1 – Weiter in Teil 2 (TeamView, MitarbeiterApp, KundenApp, App)
// ════════════════════════════════════════════════════════════════// ════════════════════════════════════════════════════════════════
// TEIL 2 – Direkt unter Teil 1 einfügen (gleiche Datei!)
// ════════════════════════════════════════════════════════════════

/* ═══ TEAM KALENDER ═══ */
const TeamView=({patienten,setPatienten,urlaub,setUrlaub,teamEvents,setTeamEvents,schichten,setSchichten,onOpenAkte})=>{
  const today=new Date();
  const [month,setMonth]=useState(today.getMonth());const[year,setYear]=useState(today.getFullYear());
  const [selDay,setSelDay]=useState(null);const[addModal,setAddModal]=useState(null);
  const [calView,setCalView]=useState("month");
  const getMonday=(dt)=>{const d=new Date(dt);const day=d.getDay();const diff=d.getDate()-day+(day===0?-6:1);d.setDate(diff);d.setHours(0,0,0,0);return d;};
  const [weekStart,setWeekStart]=useState(()=>getMonday(new Date()));
  const [evTitel,setEvTitel]=useState("");const[evFarbe,setEvFarbe]=useState("blue");const[evNotiz,setEvNotiz]=useState("");
  const [schPat,setSchPat]=useState("");const[schVon,setSchVon]=useState("09:00");const[schBis,setSchBis]=useState("17:00");const[schNotiz,setSchNotiz]=useState("");
  const [addMaModal,setAddMaModal]=useState(false);const[maVor,setMaVor]=useState("");const[maName,setMaName]=useState("");const[maEmail,setMaEmail]=useState("");
  const mitarbeiter=patienten.filter(p=>p.mitarbeiter);
  const tresenTeam=mitarbeiter.filter(p=>p.tresen);
  const inp={width:"100%",padding:"10px 14px",borderRadius:12,border:`1px solid ${T.cardBorder}`,fontSize:15,background:T.inp,color:T.text,outline:"none"};
  const prevMonth=()=>{if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);};
  const nextMonth=()=>{if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);};
  const firstDay=new Date(year,month,1);const lastDay=new Date(year,month+1,0);
  let startDow=(firstDay.getDay()+6)%7;
  const days=[];for(let i=0;i<startDow;i++)days.push(null);
  for(let d=1;d<=lastDay.getDate();d++)days.push(d);
  const toISO=(d)=>`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const isToday=(d)=>{const t=todayISO();return toISO(d)===t;};
  const dayEntries=(d)=>{if(!d)return{events:[],urlaube:[],shifts:[]};const iso=toISO(d);
    const events=teamEvents.filter(e=>e.datum===iso);
    const urlaube=urlaub.filter(u=>{const pat=mitarbeiter.find(p=>p.id===u.pat_id);return pat&&u.von<=iso&&u.bis>=iso;});
    const shifts=schichten.filter(s=>s.datum===iso);
    return{events,urlaube,shifts};
  };
  const dayEntriesISO=(iso)=>{
    const events=teamEvents.filter(e=>e.datum===iso);
    const urlaube=urlaub.filter(u=>{const pat=mitarbeiter.find(p=>p.id===u.pat_id);return pat&&u.von<=iso&&u.bis>=iso;});
    const shifts=schichten.filter(s=>s.datum===iso);
    return{events,urlaube,shifts};
  };
  const weekDays=Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setDate(d.getDate()+i);return d;});
  const prevWeek=()=>setWeekStart(w=>{const d=new Date(w);d.setDate(d.getDate()-7);return d;});
  const nextWeek=()=>setWeekStart(w=>{const d=new Date(w);d.setDate(d.getDate()+7);return d;});
  const fmtWeekHeader=()=>{const end=new Date(weekStart);end.setDate(end.getDate()+6);const s=weekStart;return`${s.getDate()}. – ${end.getDate()}. ${MONATE[end.getMonth()]} ${end.getFullYear()}`;};
  const addEvent=async()=>{if(!evTitel.trim()||!selDay)return;const ne={id:genId(),titel:evTitel.trim(),datum:toISO(selDay),farbe:evFarbe,notiz:evNotiz.trim()};await supabase.from("team_events").insert(ne);setTeamEvents(prev=>[...prev,ne]);setEvTitel("");setEvNotiz("");setAddModal(null);};
  const deleteEvent=async(eid)=>{await supabase.from("team_events").delete().eq("id",eid);setTeamEvents(prev=>prev.filter(e=>e.id!==eid));};
  const addSchicht=async()=>{if(!schPat||!selDay)return;const ns={id:genId(),pat_id:schPat,datum:toISO(selDay),von_zeit:schVon,bis_zeit:schBis,notiz:schNotiz.trim()};await supabase.from("schichten").insert(ns);setSchichten(prev=>[...prev,ns]);setSchPat("");setSchNotiz("");setAddModal(null);};
  const deleteSchicht=async(sid)=>{await supabase.from("schichten").delete().eq("id",sid);setSchichten(prev=>prev.filter(s=>s.id!==sid));};
  const addMitarbeiter=async()=>{if(!maVor.trim())return;const np={id:genId(),vorname:maVor.trim(),nachname:maName.trim(),email:maEmail.trim()||null,telefon:null,adresse:null,qr:"KU-"+Math.random().toString(36).substring(2,10).toUpperCase(),erstellt:new Date().toISOString(),mitarbeiter:true,tresen:false,kennenlern:false,konvertiert:false,stammkunde:false,stammpreis:null,urlaub_total:30};await supabase.from("patienten").insert(np);setPatienten(prev=>[...prev,np]);setMaVor("");setMaName("");setMaEmail("");setAddMaModal(false);};
  const selEntries=selDay?dayEntries(selDay):{events:[],urlaube:[],shifts:[]};
  const hasAny=selEntries.events.length+selEntries.urlaube.length+selEntries.shifts.length>0;

  const todayShifts=(()=>{const iso=todayISO();return schichten.filter(s=>s.datum===iso);})();
  const todayUrlaub=(()=>{const iso=todayISO();return urlaub.filter(u=>{const pat=mitarbeiter.find(p=>p.id===u.pat_id);return pat&&u.von<=iso&&u.bis>=iso;});})();
  return(<div className="fade-in" style={{display:"flex",flexDirection:"column",gap:18}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
      <Heading style={{fontSize:28}}>Team</Heading>
      <div style={{display:"flex",gap:16,fontSize:13,flexWrap:"wrap"}}>
        {[{c:CAL_COLORS.event,l:"Events"},{c:CAL_COLORS.schicht,l:"Tresen"}].map(x=>(<div key={x.l} style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:10,height:10,borderRadius:3,background:x.c}}/><span style={{color:T.textMid}}>{x.l}</span></div>))}
        {mitarbeiter.map((p,i)=>(<div key={p.id} style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:10,height:10,borderRadius:3,background:MA_COLORS[i%MA_COLORS.length]}}/><span style={{color:T.textMid}}>{p.vorname}</span></div>))}
      </div>
    </div>
    {(todayShifts.length>0||todayUrlaub.length>0)&&<div style={{display:"grid",gridTemplateColumns:todayShifts.length>0&&todayUrlaub.length>0?"1fr 1fr":"1fr",gap:12}}>
      {todayShifts.length>0&&<Card style={{padding:"14px 20px",borderLeft:`4px solid ${CAL_COLORS.schicht}`}}><div style={{fontSize:11,fontWeight:700,color:CAL_COLORS.schicht,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>Heute am Tresen</div>{todayShifts.map(s=>{const pat=mitarbeiter.find(p=>p.id===s.pat_id);return(<div key={s.id} style={{fontSize:15,padding:"4px 0"}}><strong style={{color:T.text}}>{pat?.vorname} {pat?.nachname}</strong><span style={{color:T.textLight,marginLeft:8,fontSize:13}}>{s.von_zeit} – {s.bis_zeit}</span></div>);})}</Card>}
      {todayUrlaub.length>0&&<Card style={{padding:"14px 20px",borderLeft:`4px solid ${CAL_COLORS.urlaub}`}}><div style={{fontSize:11,fontWeight:700,color:CAL_COLORS.urlaub,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>Heute im Urlaub</div>{todayUrlaub.map(u=>{const pat=mitarbeiter.find(p=>p.id===u.pat_id);const mc=getMaColor(mitarbeiter,u.pat_id);return(<div key={u.id} style={{fontSize:15,padding:"4px 0",display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:4,background:mc,flexShrink:0}}/><strong style={{color:T.text}}>{pat?.vorname} {pat?.nachname}</strong><span style={{color:T.textLight,fontSize:13}}>bis {fmtDate(u.bis)}</span></div>);})}</Card>}
    </div>}
    <div style={{display:"flex",justifyContent:"center",gap:4,marginBottom:-8}}>
      {["month","week"].map(v=>(<button key={v} onClick={()=>setCalView(v)} style={{padding:"6px 18px",borderRadius:10,border:`1px solid ${calView===v?T.olive:T.cardBorder}`,background:calView===v?T.olive+"20":T.bgPale,color:calView===v?T.oliveDark:T.textLight,fontWeight:calView===v?700:500,fontSize:13,cursor:"pointer",transition:"all 0.2s"}}>{v==="month"?"Monat":"Woche"}</button>))}
    </div>
    {calView==="month"?<Card style={{padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <button onClick={prevMonth} style={{background:T.bgPale,border:`1px solid ${T.cardBorder}`,borderRadius:10,padding:"8px 16px",cursor:"pointer",fontSize:16,color:T.text}}>‹</button>
        <div style={{fontFamily:"Georgia,serif",fontSize:22,fontWeight:700,color:T.oliveDark}}>{MONATE[month]} {year}</div>
        <button onClick={nextMonth} style={{background:T.bgPale,border:`1px solid ${T.cardBorder}`,borderRadius:10,padding:"8px 16px",cursor:"pointer",fontSize:16,color:T.text}}>›</button>
      </div>
      <div className="cal-grid" style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {TAGE_KURZ.map(t=>(<div key={t} style={{textAlign:"center",fontSize:12,fontWeight:700,color:T.textLight,padding:"8px 0",textTransform:"uppercase",letterSpacing:1}}>{t}</div>))}
        {days.map((d,i)=>{
          if(!d)return<div key={`e${i}`}/>;
          const {events,urlaube,shifts}=dayEntries(d);
          const hasDots=events.length+urlaube.length+shifts.length>0;
          const isSel=selDay===d;
          return(<div key={d} className={`cal-day ${isToday(d)?"cal-day-today":""}`} onClick={()=>setSelDay(d===selDay?null:d)} style={{minHeight:64,padding:4,borderRadius:10,cursor:"pointer",background:isSel?T.olive+"18":"transparent",border:isSel?`2px solid ${T.olive}40`:"2px solid transparent",transition:"all 0.15s"}}>
            <div style={{fontSize:14,fontWeight:isToday(d)?800:500,color:isToday(d)?T.oliveDark:T.text,textAlign:"center",marginBottom:4}}>{d}</div>
            {hasDots&&<div style={{display:"flex",gap:2,justifyContent:"center",flexWrap:"wrap"}}>
              {events.map((_,ei)=><div key={`e${ei}`} style={{width:6,height:6,borderRadius:3,background:CAL_COLORS.event}}/>)}
              {urlaube.map((u,ui)=><div key={`u${ui}`} style={{width:6,height:6,borderRadius:3,background:getMaColor(mitarbeiter,u.pat_id)}}/>)}
              {shifts.map((_,si)=><div key={`s${si}`} style={{width:6,height:6,borderRadius:3,background:CAL_COLORS.schicht}}/>)}
            </div>}
          </div>);
        })}
      </div>
    </Card>
    :<Card style={{padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <button onClick={prevWeek} style={{background:T.bgPale,border:`1px solid ${T.cardBorder}`,borderRadius:10,padding:"8px 16px",cursor:"pointer",fontSize:16,color:T.text}}>‹</button>
        <div style={{fontFamily:"Georgia,serif",fontSize:22,fontWeight:700,color:T.oliveDark}}>{fmtWeekHeader()}</div>
        <button onClick={nextWeek} style={{background:T.bgPale,border:`1px solid ${T.cardBorder}`,borderRadius:10,padding:"8px 16px",cursor:"pointer",fontSize:16,color:T.text}}>›</button>
      </div>
      <div className="week-grid" style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:8}}>
        {weekDays.map(wd=>{
          const iso=`${wd.getFullYear()}-${String(wd.getMonth()+1).padStart(2,"0")}-${String(wd.getDate()).padStart(2,"0")}`;
          const isT=iso===todayISO();
          const dow=TAGE_KURZ[(wd.getDay()+6)%7];
          const {events,urlaube,shifts}=dayEntriesISO(iso);
          const dayNum=wd.getDate();
          const isSel=calView==="week"&&selDay===dayNum&&wd.getMonth()===month&&wd.getFullYear()===year;
          return(<div key={iso} onClick={()=>{setMonth(wd.getMonth());setYear(wd.getFullYear());setSelDay(dayNum);}} style={{minHeight:120,padding:10,borderRadius:12,background:isT?T.gold+"14":T.bgPale+"80",border:isT?`2px solid ${T.gold}40`:`1px solid ${T.cardBorder}`,cursor:"pointer",transition:"all 0.15s",display:"flex",flexDirection:"column",gap:6}}>
            <div style={{textAlign:"center",marginBottom:4}}>
              <div style={{fontSize:11,fontWeight:700,color:T.textLight,textTransform:"uppercase",letterSpacing:1}}>{dow}</div>
              <div style={{fontSize:18,fontWeight:isT?800:600,color:isT?T.oliveDark:T.text}}>{dayNum}.{wd.getMonth()+1}.</div>
            </div>
            {shifts.map(s=>{const pat=mitarbeiter.find(p=>p.id===s.pat_id);const mc=getMaColor(mitarbeiter,s.pat_id);return(
              <div key={s.id} style={{padding:"4px 8px",borderRadius:8,background:mc+"20",borderLeft:`3px solid ${mc}`,fontSize:11}}>
                <div style={{fontWeight:700,color:mc}}>{pat?.vorname}</div>
                <div style={{color:T.textMid,fontSize:10}}>{s.von_zeit}–{s.bis_zeit}</div>
              </div>);})}
            {urlaube.map(u=>{const pat=mitarbeiter.find(p=>p.id===u.pat_id);const mc=getMaColor(mitarbeiter,u.pat_id);return(
              <div key={u.id+iso} style={{padding:"3px 8px",borderRadius:8,background:mc+"14",borderLeft:`3px solid ${mc}50`,fontSize:11}}>
                <span style={{color:mc,fontWeight:600}}>{pat?.vorname}</span><span style={{color:T.textLight,marginLeft:4,fontSize:10}}>Urlaub</span>
              </div>);})}
            {events.map(ev=>(
              <div key={ev.id} style={{padding:"3px 8px",borderRadius:8,background:T.blueSoft,borderLeft:`3px solid ${CAL_COLORS.event}`,fontSize:11}}>
                <span style={{color:CAL_COLORS.event,fontWeight:600}}>{ev.titel}</span>
              </div>))}
          </div>);
        })}
      </div>
    </Card>}
    {selDay&&<Card style={{padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}> 
        <Heading style={{fontSize:20}}>{selDay}. {MONATE[month]} {year}</Heading>
        <div style={{display:"flex",gap:8}}><Btn small gold onClick={()=>setAddModal("event")}>+ Event</Btn><Btn small onClick={()=>setAddModal("schicht")} style={{background:CAL_COLORS.schicht}}>+ Tresen</Btn></div>
      </div>
      {!hasAny&&<p style={{color:T.textLight,textAlign:"center",fontSize:14,padding:12}}>Keine Einträge an diesem Tag</p>}
      {selEntries.events.length>0&&<div style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:CAL_COLORS.event,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>Events</div>
        {selEntries.events.map(ev=>(<div key={ev.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:T.blueSoft,borderRadius:12,marginBottom:6,borderLeft:`4px solid ${CAL_COLORS.event}`}}><div><strong style={{color:T.text,fontSize:15}}>{ev.titel}</strong>{ev.notiz&&<span style={{color:T.textLight,fontSize:13,marginLeft:8}}>· {ev.notiz}</span>}</div><button onClick={()=>deleteEvent(ev.id)} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${T.red}25`,background:T.redSoft,color:T.red,fontSize:11,fontWeight:700,cursor:"pointer"}}>✕</button></div>))}
      </div>}
      {selEntries.urlaube.length>0&&<div style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:CAL_COLORS.urlaub,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>Urlaub</div>
        {selEntries.urlaube.map(u=>{const pat=mitarbeiter.find(p=>p.id===u.pat_id);const mc=getMaColor(mitarbeiter,u.pat_id);return(<div key={u.id} style={{padding:"10px 14px",background:mc+"18",borderRadius:12,marginBottom:6,borderLeft:`4px solid ${mc}`,fontSize:14}}><strong style={{color:mc}}>{pat?.vorname} {pat?.nachname}</strong><span style={{color:T.textLight,marginLeft:8}}>· {fmtDate(u.von)} – {fmtDate(u.bis)}</span>{u.notiz&&<span style={{color:T.textLight,marginLeft:6}}>· {u.notiz}</span>}</div>);})}
      </div>}
      {selEntries.shifts.length>0&&<div style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:CAL_COLORS.schicht,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>Tresen-Schichten</div>
        {selEntries.shifts.map(s=>{const pat=mitarbeiter.find(p=>p.id===s.pat_id);return(<div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:T.orangeSoft,borderRadius:12,marginBottom:6,borderLeft:`4px solid ${CAL_COLORS.schicht}`}}><div style={{fontSize:14}}><strong style={{color:T.orange}}>{pat?.vorname} {pat?.nachname}</strong><span style={{color:T.textMid,marginLeft:8}}>{s.von_zeit} – {s.bis_zeit}</span>{s.notiz&&<span style={{color:T.textLight,marginLeft:6}}>· {s.notiz}</span>}</div><button onClick={()=>deleteSchicht(s.id)} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${T.red}25`,background:T.redSoft,color:T.red,fontSize:11,fontWeight:700,cursor:"pointer"}}>✕</button></div>);})}
      </div>}
    </Card>}
    {addModal==="event"&&<Modal onClose={()=>setAddModal(null)}><Card className="modal-box" style={{width:400}}>
      <Heading style={{fontSize:20,marginBottom:16}}>Event am {selDay}. {MONATE[month]}</Heading>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div><label style={{fontSize:12,fontWeight:700,color:T.textLight,textTransform:"uppercase",letterSpacing:1.5,marginBottom:6,display:"block"}}>Titel</label><input value={evTitel} onChange={e=>setEvTitel(e.target.value)} placeholder="z.B. Teammeeting, Geburtstag..." style={inp} autoFocus/></div>
        <div><label style={{fontSize:12,fontWeight:700,color:T.textLight,textTransform:"uppercase",letterSpacing:1.5,marginBottom:6,display:"block"}}>Notiz</label><input value={evNotiz} onChange={e=>setEvNotiz(e.target.value)} placeholder="optional" style={inp}/></div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ghost onClick={()=>setAddModal(null)}>Abbrechen</Btn><Btn gold onClick={addEvent} disabled={!evTitel.trim()}>Speichern</Btn></div>
      </div>
    </Card></Modal>}
    {addModal==="schicht"&&<Modal onClose={()=>setAddModal(null)}><Card className="modal-box" style={{width:420}}>
      <Heading style={{fontSize:20,marginBottom:16}}>Tresen am {selDay}. {MONATE[month]}</Heading>
      {tresenTeam.length===0?<p style={{color:T.textLight,fontSize:14,textAlign:"center",padding:16}}>Noch niemand als Tresen-Team markiert.</p>:
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div><label style={{fontSize:12,fontWeight:700,color:T.textLight,textTransform:"uppercase",letterSpacing:1.5,marginBottom:6,display:"block"}}>Mitarbeiter:in</label><select value={schPat} onChange={e=>setSchPat(e.target.value)} style={inp}><option value="">Auswählen...</option>{tresenTeam.map(p=><option key={p.id} value={p.id}>{p.vorname} {p.nachname}</option>)}</select></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><label style={{fontSize:12,fontWeight:700,color:T.textLight,textTransform:"uppercase",letterSpacing:1.5,marginBottom:6,display:"block"}}>Von</label><input type="time" value={schVon} onChange={e=>setSchVon(e.target.value)} style={inp}/></div>
          <div><label style={{fontSize:12,fontWeight:700,color:T.textLight,textTransform:"uppercase",letterSpacing:1.5,marginBottom:6,display:"block"}}>Bis</label><input type="time" value={schBis} onChange={e=>setSchBis(e.target.value)} style={inp}/></div>
        </div>
        <div><label style={{fontSize:12,fontWeight:700,color:T.textLight,textTransform:"uppercase",letterSpacing:1.5,marginBottom:6,display:"block"}}>Notiz</label><input value={schNotiz} onChange={e=>setSchNotiz(e.target.value)} placeholder="optional" style={inp}/></div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ghost onClick={()=>setAddModal(null)}>Abbrechen</Btn><Btn gold onClick={addSchicht} disabled={!schPat}>Speichern</Btn></div>
      </div>}
    </Card></Modal>}
    <div style={{marginTop:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><Heading style={{fontSize:22}}>Mitarbeiter:innen</Heading><Btn small gold onClick={()=>setAddMaModal(true)}>+ Hinzufügen</Btn></div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {mitarbeiter.length===0&&<p style={{textAlign:"center",color:T.textLight,padding:20,fontSize:14}}>Noch keine Mitarbeiter:innen</p>}
        {mitarbeiter.map(p=>{const pu=urlaub.filter(u=>u.pat_id===p.id);const uGen=pu.reduce((s,u)=>s+workingDays(u.von,u.bis),0);const uRest=(p.urlaub_total||30)-uGen;
          const isHeuteUrlaub=todayUrlaub.some(u=>u.pat_id===p.id);
          const heuteTresen=todayShifts.find(s=>s.pat_id===p.id);
          const mc=getMaColor(mitarbeiter,p.id);
          return(<div key={p.id} onClick={()=>onOpenAkte(p)} className="card-h" style={{padding:"16px 24px",background:T.card,borderRadius:20,border:`1px solid ${T.cardBorder}`,borderLeft:`4px solid ${mc}`,cursor:"pointer",backdropFilter:"blur(8px)",boxShadow:"0 2px 12px rgba(74,82,64,0.06)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
              <div><div style={{fontWeight:600,color:T.text,fontSize:17}}>{p.vorname} {p.nachname}</div><div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap"}}><Badge variant="purple" small>Mitarbeiter:in</Badge>{p.tresen&&<Badge variant="orange" small>Tresen</Badge>}{heuteTresen&&<Badge variant="green" small>Heute Tresen {heuteTresen.von_zeit}–{heuteTresen.bis_zeit}</Badge>}{isHeuteUrlaub&&<Badge variant="red" small>Im Urlaub</Badge>}</div></div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{textAlign:"center",background:T.purpleSoft,borderRadius:10,padding:"6px 14px"}}><div style={{fontSize:18,fontWeight:700,color:T.purple,fontFamily:"Georgia,serif"}}>{uRest}</div><div style={{fontSize:10,color:T.textLight,textTransform:"uppercase",letterSpacing:0.8}}>Urlaub</div></div>
                <span style={{color:T.gold,fontSize:20,fontWeight:300}}>›</span>
              </div>
            </div>
          </div>);})}
      </div>
    </div>
    {addMaModal&&<Modal onClose={()=>setAddMaModal(false)}><Card className="modal-box" style={{width:400}}>
      <Heading style={{fontSize:20,marginBottom:16}}>Mitarbeiter:in hinzufügen</Heading>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div><label style={{fontSize:12,fontWeight:700,color:T.textLight,textTransform:"uppercase",letterSpacing:1.5,marginBottom:6,display:"block"}}>Vorname</label><input value={maVor} onChange={e=>setMaVor(e.target.value)} placeholder="z.B. Anna" style={inp} autoFocus/></div>
        <div><label style={{fontSize:12,fontWeight:700,color:T.textLight,textTransform:"uppercase",letterSpacing:1.5,marginBottom:6,display:"block"}}>Nachname</label><input value={maName} onChange={e=>setMaName(e.target.value)} placeholder="z.B. Schmidt" style={inp}/></div>
        <div><label style={{fontSize:12,fontWeight:700,color:T.textLight,textTransform:"uppercase",letterSpacing:1.5,marginBottom:6,display:"block"}}>E-Mail (optional)</label><input value={maEmail} onChange={e=>setMaEmail(e.target.value)} placeholder="anna@kaiserufer.com" style={inp}/></div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}><Btn ghost onClick={()=>setAddMaModal(false)}>Abbrechen</Btn><Btn gold onClick={addMitarbeiter} disabled={!maVor.trim()}>Hinzufügen</Btn></div>
      </div>
    </Card></Modal>}
  </div>);
};

/* ═══ MITARBEITER APP ═══ */
const MitarbeiterApp=({patienten,setPatienten,paesse,setPaesse,log,setLog,rechnungsNr,setRechnungsNr,einzel,setEinzel,urlaub,setUrlaub,teamEvents,setTeamEvents,schichten,setSchichten})=>{
  const [view,setView]=useState("liste");const[selPat,setSelPat]=useState(null);const[search,setSearch]=useState("");const[listFilter,setListFilter]=useState("alle");
  const [scanMode,setScanMode]=useState(false);const[scanInput,setScanInput]=useState("");
  const [showStats,setShowStats]=useState(false);const[kaufModal,setKaufModal]=useState(false);const[pinguChat,setPinguChat]=useState(false);
  const [bsModal,setBsModal]=useState(null);const[bsNotiz,setBsNotiz]=useState("");
  const [korrekturModal,setKorrekturModal]=useState(null);const[korrekturTyp,setKorrekturTyp]=useState("HE");
  const [korrekturAnzahl,setKorrekturAnzahl]=useState(1);const[korrekturGrund,setKorrekturGrund]=useState("");
  const [notizText,setNotizText]=useState("");const[saving,setSaving]=useState(false);
  const [shoreSync,setShoreSync]=useState(false);const[shoreSyncMsg,setShoreSyncMsg]=useState("");
  const [shoreCalendar,setShoreCalendar]=useState([]);
  const [confirmDelete,setConfirmDelete]=useState(null);
  const [undoAction,setUndoAction]=useState(null);
  const [pendingPasses,setPendingPasses]=useState([]);
  const [editPass,setEditPass]=useState(null);
  const [autoDeductRecent,setAutoDeductRecent]=useState({});
  const [urlaubVon,setUrlaubVon]=useState("");const[urlaubBis,setUrlaubBis]=useState("");const[urlaubNotiz,setUrlaubNotiz]=useState("");

  const doShoreSync=async(silent)=>{if(shoreSync)return;setShoreSync(true);if(!silent)setShoreSyncMsg("Shore-Kalender synchronisiert gerade, bitte warten …");try{const r=await fetch("/api/shore-sync",{method:"POST"});const data=await r.json();if(data.error)throw new Error(data.error);const{data:np}=await supabase.from("patienten").select("*");if(np){const oldIds=new Set(patienten.map(p=>p.id));const newPats=np.filter(p=>!oldIds.has(p.id));for(const p of newPats){if(!p.kennenlern){await supabase.from("patienten").update({kennenlern:true}).eq("id",p.id);p.kennenlern=true;}}setPatienten(np);}if(!silent){setShoreSyncMsg(`Shore-Daten sind synchronisiert – ${data.neu||0} neue, ${data.gesamt||0} gesamt`);setTimeout(()=>setShoreSyncMsg(""),5000);}}catch(e){if(!silent){setShoreSyncMsg("Fehler: "+e.message);setTimeout(()=>setShoreSyncMsg(""),8000);}}setShoreSync(false);};
  useEffect(()=>{doShoreSync(true);const iv=setInterval(()=>doShoreSync(true),5*60*1000);return()=>clearInterval(iv);},[]);

  // Shore-Tageskalender laden
  const fetchShoreCalendar=async()=>{try{const r=await fetch("/api/shore-calendar");const d=await r.json();if(d.appointments)setShoreCalendar(d.appointments);if(d.created?.length){const{data:np}=await supabase.from("patienten").select("*");if(np)setPatienten(np);setToast(`Neue Kunden aus Kalender: ${d.created.join(", ")}`);}}catch(e){}};
  useEffect(()=>{fetchShoreCalendar();const iv=setInterval(fetchShoreCalendar,5*60*1000);return()=>clearInterval(iv);},[]);

  // Pass-Check: Neue Flossenpass-Verkäufe aus Shore erkennen
  const checkPassSales=async()=>{try{const r=await fetch("/api/pass-check");const d=await r.json();if(d.pending?.length)setPendingPasses(d.pending);}catch(e){}};
  useEffect(()=>{
    // Test-Modus: ?test-pass=1 zeigt Fake-Benachrichtigungen
    if(new URLSearchParams(window.location.search).get("test-pass")){
      const testPat=patienten.find(p=>!p.mitarbeiter);
      if(testPat)setPendingPasses([
        {orderId:"test1",customer:{name:`${testPat.vorname} ${testPat.nachname}`,email:testPat.email},passType:"PLUS",price:499,standardPrice:499,priceMatch:true,date:todayISO(),productName:"Plus (Test)",invoiceNumber:"SHORE-2026-1234"},
        {orderId:"test2",customer:{name:`${testPat.vorname} ${testPat.nachname}`,email:testPat.email},passType:"DELUXE",price:750,standardPrice:899,priceMatch:false,date:todayISO(),productName:"Deluxe (Sonderpreis Test)",invoiceNumber:"SHORE-2026-5678"},
      ]);
      return;
    }
    if(patienten.length>0)checkPassSales();const iv=setInterval(checkPassSales,5*60*1000);return()=>clearInterval(iv);
  },[patienten.length]);

  // Auto-Deduct: Shore-Termine prüfen und HE automatisch abziehen
  const checkAutoDeduct=async()=>{try{const r=await fetch("/api/pass-auto-deduct");const d=await r.json();if(d.deducted?.length){const now=Date.now();const updates={};d.deducted.forEach(x=>{updates[x.patient]=now;});setAutoDeductRecent(prev=>({...prev,...updates}));const{data:np}=await supabase.from("paesse").select("*");if(np)setPaesse(np);const{data:nl}=await supabase.from("log").select("*");if(nl)setLog(nl);fetchShoreCalendar();}}catch(e){}};
  useEffect(()=>{if(patienten.length>0)checkAutoDeduct();const iv=setInterval(checkAutoDeduct,5*60*1000);return()=>clearInterval(iv);},[patienten.length]);
  // Alte Deduct-Meldungen nach 15 Min aufräumen
  useEffect(()=>{const iv=setInterval(()=>{const now=Date.now();setAutoDeductRecent(prev=>{const next={};for(const[k,v]of Object.entries(prev)){if(now-v<15*60*1000)next[k]=v;}return next;});},60*1000);return()=>clearInterval(iv);},[]);

  const confirmPassSale=async(pp,custom)=>{
    const pt=custom||PASS_TYPES[pp.passType];
    const cname=pp.customer?.name||"";
    const parts=cname.toLowerCase().trim().split(/\s+/).filter(p=>p.length>0);
    const pat=patienten.find(p=>{const full=`${p.vorname||""} ${p.nachname||""}`.toLowerCase();return parts.length>0&&parts.every(part=>full.includes(part));});
    if(!pat){alert("Patient nicht gefunden: "+cname);return;}
    const rs=custom?.rechnung||pp.invoiceNumber||genRechnung(await getRechnungsNr());
    const ds=custom?.datum||(pp.date||"").split("T")[0]||todayISO();
    const np={id:genId(),pat_id:pat.id,typ:custom?"INDIVIDUELL":pp.passType,custom_name:custom?.name||null,he_total:custom?custom.he:pt.he,he_genutzt:0,bs_total:custom?custom.bs:pt.bs,bs_genutzt:0,preis:custom?custom.preis:pp.price,rechnung:rs,bezahlt:true,datum:ds,aktiv:true,rechnung_pdf:pp.receiptPdf||null};
    await supabase.from("paesse").insert(np);setPaesse(prev=>[...prev,np]);
    await fetch("/api/pass-check",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderIds:[pp.orderId]})});
    setPendingPasses(prev=>prev.filter(p=>p.orderId!==pp.orderId));setEditPass(null);
  };
  const dismissPassSale=async(pp)=>{
    await fetch("/api/pass-check",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderIds:[pp.orderId]})});
    setPendingPasses(prev=>prev.filter(p=>p.orderId!==pp.orderId));
  };
  useEffect(()=>{const fixTherapie=async()=>{const toFix=patienten.filter(p=>!p.mitarbeiter&&!p.therapie&&!p.ergotherapie&&!p.sonstige);if(toFix.length===0)return;for(const p of toFix){await supabase.from("patienten").update({therapie:true}).eq("id",p.id);}setPatienten(prev=>prev.map(p=>(!p.mitarbeiter&&!p.therapie&&!p.ergotherapie&&!p.sonstige)?{...p,therapie:true}:p));};if(patienten.length>0)fixTherapie();},[patienten.length]);

  const isTherapieKunde=(p)=>p.therapie||(!p.ergotherapie&&!p.sonstige);

  const inp={width:"100%",padding:"11px 14px",borderRadius:12,border:`1px solid ${T.cardBorder}`,fontSize:15,background:T.inp,color:T.text,outline:"none"};
  const sorted=patienten.slice().sort((a,b)=>{const na=`${a.vorname||""} ${a.nachname||""}`.trim().toLowerCase();const nb=`${b.vorname||""} ${b.nachname||""}`.trim().toLowerCase();if(!a.vorname&&b.vorname)return 1;if(a.vorname&&!b.vorname)return-1;return na.localeCompare(nb,"de");});
  const matchSearch=(p)=>{const q=search.toLowerCase();return`${p.vorname||""} ${p.nachname||""} ${p.email||""}`.toLowerCase().includes(q)||paesse.some(pk=>pk.pat_id===p.id&&(pk.rechnung||"").toLowerCase().includes(q))||einzel.some(e=>e.pat_id===p.id&&(e.rechnung||"").toLowerCase().includes(q));};
  const gaesteAll=sorted.filter(p=>!p.mitarbeiter&&matchSearch(p));
  const gaeste=listFilter==="alle"?gaesteAll:listFilter==="therapie"?gaesteAll.filter(p=>p.therapie||(!p.ergotherapie&&!p.sonstige)):listFilter==="ergo"?gaesteAll.filter(p=>p.ergotherapie):gaesteAll.filter(p=>p.sonstige);
  const patPaesse=selPat?paesse.filter(pk=>pk.pat_id===selPat.id):[];
  const patEinzel=selPat?einzel.filter(e=>e.pat_id===selPat.id).sort((a,b)=>(b.datum||"").localeCompare(a.datum||"")):[];
  const patLog=selPat?log.filter(l=>l.pat_id===selPat.id).sort((a,b)=>(b.datum||"").localeCompare(a.datum||"")):[];
  const patUrlaub=selPat?urlaub.filter(u=>u.pat_id===selPat.id).sort((a,b)=>(b.von||"").localeCompare(a.von||"")):[];
  const aktPaesse=patPaesse.filter(pk=>!isPassAlt(pk)),altPaesse=patPaesse.filter(pk=>isPassAlt(pk));
  const aktiverPass=aktPaesse[0]||null;
  const heUebrig=aktPaesse.reduce((s,p)=>s+((p.he_total||0)-(p.he_genutzt||0)),0);
  const bsUebrig=aktPaesse.reduce((s,p)=>s+((p.bs_total||0)-(p.bs_genutzt||0)),0);
  const alleVerkaufe=[...patPaesse.map(pk=>({id:pk.id,art:"pass",name:"Flossenpass",rechnung:pk.rechnung,rechnung_pdf:pk.rechnung_pdf||null,datum:pk.datum,preis:pk.preis||0,bezahlt:pk.bezahlt,isAlt:isPassAlt(pk)})),...patEinzel.map(e=>({id:e.id,art:"einzel",name:e.name,rechnung:e.rechnung,rechnung_pdf:e.rechnung_pdf||null,datum:e.datum,preis:e.preis||0,bezahlt:e.bezahlt,isAlt:false}))].sort((a,b)=>(b.datum||"").localeCompare(a.datum||""));

  const getRechnungsNr=async()=>{const{data}=await supabase.from("einstellungen").select("value").eq("key","rechnungs_nr").single();const nr=parseInt(data?.value||"0")+1;await supabase.from("einstellungen").update({value:String(nr)}).eq("key","rechnungs_nr");setRechnungsNr(nr);return nr;};
  const handleKauf=async(typ,info,preis,eigeneRechnung,datum)=>{setSaving(true);await handleKaufFuerPat(selPat,typ,info,preis,eigeneRechnung,datum);setSaving(false);setKaufModal(false);};
  const handleKaufFuerPat=async(pat,typ,info,preis,eigeneRechnung,datum,istAlt,bezahltStatus)=>{
    const ds=datum||todayISO();let rs;
    if((typ==="pass"||typ==="individuell")&&pat.kennenlern&&!pat.konvertiert){await supabase.from("patienten").update({konvertiert:true}).eq("id",pat.id);setPatienten(prev=>prev.map(p=>p.id===pat.id?{...p,konvertiert:true}:p));}
    if(typ==="individuell"){rs=info.rechnung||genRechnung(await getRechnungsNr());const h=info.he||0,b=info.bs||0,alt=istAlt||info.ist_alt||false,bez=bezahltStatus!=null?bezahltStatus:(info.bezahlt!=null?info.bezahlt:false);const heG=info.he_genutzt!=null?info.he_genutzt:(alt?h:0);const bsG=info.bs_genutzt!=null?info.bs_genutzt:(alt?b:0);const np={id:genId(),pat_id:pat.id,typ:"INDIVIDUELL",he_total:h,he_genutzt:heG,bs_total:b,bs_genutzt:bsG,preis:preis||0,rechnung:rs,bezahlt:bez,datum:info.datum||ds,aktiv:!alt,custom_name:info.name||"Flossenpass"};await supabase.from("paesse").insert(np);setPaesse(prev=>[...prev,np]);}
    else if(typ==="pass"){rs=eigeneRechnung||genRechnung(await getRechnungsNr());const pt=PASS_TYPES[info],alt=!!istAlt,bez=bezahltStatus!=null?bezahltStatus:false;const np={id:genId(),pat_id:pat.id,typ:info,he_total:pt.he,he_genutzt:alt?pt.he:0,bs_total:pt.bs,bs_genutzt:alt?pt.bs:0,preis:preis||0,rechnung:rs,bezahlt:bez,datum:ds,aktiv:!alt};await supabase.from("paesse").insert(np);setPaesse(prev=>[...prev,np]);}
    else{rs=eigeneRechnung||genRechnung(await getRechnungsNr());const bez=bezahltStatus!=null?bezahltStatus:false;const ne={id:genId(),pat_id:pat.id,key:info.key,name:info.name,preis:preis||0,rechnung:rs,bezahlt:bez,datum:ds};const nl={id:genId(),pat_id:pat.id,pass_id:null,typ:info.key,quelle:"INTERN",datum:new Date().toISOString(),notiz:info.name};await supabase.from("einzel").insert(ne);await supabase.from("log").insert(nl);setEinzel(prev=>[...prev,ne]);setLog(prev=>[...prev,nl]);}
  };
  const deletePass=async(pid)=>{await supabase.from("paesse").delete().eq("id",pid);setPaesse(prev=>prev.filter(p=>p.id!==pid));setConfirmDelete(null);};
  const downloadCSV=()=>{const h=["Vorname","Nachname","E-Mail","Telefon","QR-Code","Stammkunde","Seit","Aktiver Pass","HE","GA","Rechnungsnummern"];const rows=gaeste.map(p=>{const ap=paesse.find(pk=>pk.pat_id===p.id&&!isPassAlt(pk));const he=ap?(ap.he_total||0)-(ap.he_genutzt||0):"";const bs=ap?(ap.bs_total||0)-(ap.bs_genutzt||0):"";const rns=[...paesse.filter(pk=>pk.pat_id===p.id).map(pk=>pk.rechnung),...einzel.filter(e=>e.pat_id===p.id).map(e=>e.rechnung)].filter(Boolean).join(", ");return[p.vorname||"",p.nachname||"",p.email||"",p.telefon||"",p.qr||"",p.stammkunde?"Ja":"Nein",fmtDate(p.erstellt),ap?"Flossenpass":"–",he,bs,rns].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(";");});const csv=[h.map(x=>`"${x}"`).join(";"),...rows].join("\n");const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="gaesteliste-kaiserufer.csv";a.click();URL.revokeObjectURL(url);};

  const heAbziehen=async(pass)=>{if(!pass||pass.he_genutzt>=pass.he_total)return;const prev={he_genutzt:pass.he_genutzt};const u={...pass,he_genutzt:pass.he_genutzt+1};const nl={id:genId(),pat_id:selPat.id,pass_id:pass.id,typ:"HAUPTEINHEIT",quelle:"INTERN",datum:new Date().toISOString(),notiz:"Haupteinheit"};await supabase.from("paesse").update({he_genutzt:u.he_genutzt}).eq("id",pass.id);await supabase.from("log").insert(nl);setPaesse(p=>p.map(x=>x.id===pass.id?u:x));setLog(p=>[...p,nl]);
    setUndoAction({msg:"Haupteinheit −1 bei "+selPat.vorname,undo:async()=>{await supabase.from("paesse").update(prev).eq("id",pass.id);await supabase.from("log").delete().eq("id",nl.id);setPaesse(p=>p.map(x=>x.id===pass.id?{...x,...prev}:x));setLog(p=>p.filter(l=>l.id!==nl.id));}});};
  const bsAbziehen=async(pass)=>{if(!pass||pass.bs_genutzt>=pass.bs_total||!bsNotiz.trim())return;const prev={bs_genutzt:pass.bs_genutzt};const u={...pass,bs_genutzt:pass.bs_genutzt+1};const nl={id:genId(),pat_id:selPat.id,pass_id:pass.id,typ:"BS",quelle:"INTERN",datum:new Date().toISOString(),notiz:bsNotiz.trim()};await supabase.from("paesse").update({bs_genutzt:u.bs_genutzt}).eq("id",pass.id);await supabase.from("log").insert(nl);setPaesse(p=>p.map(x=>x.id===pass.id?u:x));setLog(p=>[...p,nl]);setBsNotiz("");setBsModal(null);
    setUndoAction({msg:"Gruppenangebot −1 bei "+selPat.vorname,undo:async()=>{await supabase.from("paesse").update(prev).eq("id",pass.id);await supabase.from("log").delete().eq("id",nl.id);setPaesse(p=>p.map(x=>x.id===pass.id?{...x,...prev}:x));setLog(p=>p.filter(l=>l.id!==nl.id));}});};
  const korrekturSpeichern=async()=>{if(!korrekturModal||korrekturAnzahl<1)return;const n=Number(korrekturAnzahl);const pass=korrekturModal;const upd=korrekturTyp==="HE"?{he_genutzt:Math.max(0,(pass.he_genutzt||0)-n)}:{bs_genutzt:Math.max(0,(pass.bs_genutzt||0)-n)};const nl={id:genId(),pat_id:selPat.id,pass_id:pass.id,typ:"KORREKTUR",quelle:"MANUELL",datum:new Date().toISOString(),notiz:`${korrekturTyp} +${n} zurück${korrekturGrund?` – ${korrekturGrund}`:""}`};await supabase.from("paesse").update(upd).eq("id",pass.id);await supabase.from("log").insert(nl);setPaesse(p=>p.map(x=>x.id===pass.id?{...x,...upd}:x));setLog(p=>[...p,nl]);setKorrekturModal(null);setKorrekturAnzahl(1);setKorrekturGrund("");};
  const notizSpeichern=async()=>{if(!notizText.trim())return;const nl={id:genId(),pat_id:selPat.id,pass_id:null,typ:"NOTIZ",quelle:"INTERN",datum:new Date().toISOString(),notiz:notizText.trim()};await supabase.from("log").insert(nl);setLog(p=>[...p,nl]);setNotizText("");};
  const toggleBezahlt=async(pid)=>{const p=paesse.find(x=>x.id===pid);if(!p)return;await supabase.from("paesse").update({bezahlt:!p.bezahlt}).eq("id",pid);setPaesse(prev=>prev.map(x=>x.id===pid?{...x,bezahlt:!x.bezahlt}:x));};
  const toggleEinzelBez=async(eid)=>{const e=einzel.find(x=>x.id===eid);if(!e)return;await supabase.from("einzel").update({bezahlt:!e.bezahlt}).eq("id",eid);setEinzel(prev=>prev.map(x=>x.id===eid?{...x,bezahlt:!x.bezahlt}:x));};
  const updatePassField=async(pid,field,val)=>{await supabase.from("paesse").update({[field]:val}).eq("id",pid);setPaesse(prev=>prev.map(p=>p.id===pid?{...p,[field]:val}:p));};
  const updatePassEinheiten=async(pid,field,val)=>{const n=Math.max(0,parseInt(val)||0);await supabase.from("paesse").update({[field]:n}).eq("id",pid);setPaesse(prev=>prev.map(p=>p.id===pid?{...p,[field]:n}:p));};
  const updatePatient=async(id,fields)=>{await supabase.from("patienten").update(fields).eq("id",id);setPatienten(prev=>prev.map(p=>p.id===id?{...p,...fields}:p));if(selPat?.id===id)setSelPat(prev=>({...prev,...fields}));};
  const getUnits=(patId)=>{const ap=paesse.find(pk=>pk.pat_id===patId&&!isPassAlt(pk));if(!ap)return null;return{he:(ap.he_total||0)-(ap.he_genutzt||0),bs:(ap.bs_total||0)-(ap.bs_genutzt||0),typ:ap.typ};};
  const editInp=(w)=>({fontSize:14,fontWeight:600,background:"transparent",border:`1px solid ${T.cardBorder}`,borderRadius:8,padding:"4px 8px",color:T.text,outline:"none",width:w});
  const handleScan=()=>{const pat=patienten.find(p=>p.qr===scanInput.trim().toUpperCase());if(pat){setSelPat(pat);setView("akte");setScanMode(false);setScanInput("");}else alert("QR nicht gefunden: "+scanInput);};
  const addUrlaub=async()=>{if(!urlaubVon||!urlaubBis||!selPat)return;const nu={id:genId(),pat_id:selPat.id,von:urlaubVon,bis:urlaubBis,notiz:urlaubNotiz.trim()};await supabase.from("urlaub").insert(nu);setUrlaub(prev=>[...prev,nu]);setUrlaubVon("");setUrlaubBis("");setUrlaubNotiz("");};
  const deleteUrlaub=async(uid)=>{await supabase.from("urlaub").delete().eq("id",uid);setUrlaub(prev=>prev.filter(u=>u.id!==uid));};
  const deletePerson=async(pat)=>{const pw=prompt("Passwort zum Löschen:");if(pw!=="Vogel"){if(pw!==null)alert("Falsches Passwort");return;}if(!confirm(`${pat.vorname} ${pat.nachname} wirklich löschen? Alle Pässe, Logs, Einzelangebote und Urlaubseinträge werden entfernt.`))return;await supabase.from("log").delete().eq("pat_id",pat.id);await supabase.from("paesse").delete().eq("pat_id",pat.id);await supabase.from("einzel").delete().eq("pat_id",pat.id);await supabase.from("urlaub").delete().eq("pat_id",pat.id);await supabase.from("patienten").delete().eq("id",pat.id);setPatienten(prev=>prev.filter(p=>p.id!==pat.id));setPaesse(prev=>prev.filter(p=>p.pat_id!==pat.id));setLog(prev=>prev.filter(l=>l.pat_id!==pat.id));setEinzel(prev=>prev.filter(e=>e.pat_id!==pat.id));setUrlaub(prev=>prev.filter(u=>u.pat_id!==pat.id));setView(pat.mitarbeiter?"team":"liste");setSelPat(null);setToast(`${pat.vorname} ${pat.nachname} gelöscht`);};
  const urlaubGenutzt=patUrlaub.reduce((s,u)=>s+workingDays(u.von,u.bis),0);
  const handlePinguAction=async(action)=>{
    if(action.typ==="HE_ABZIEHEN"&&action.pat_id){
      const pat=patienten.find(p=>p.id===action.pat_id);if(!pat)throw new Error("Patient nicht gefunden");
      const ap=paesse.find(pk=>pk.pat_id===action.pat_id&&!isPassAlt(pk));if(!ap)throw new Error(`${pat.vorname} hat keinen aktiven Pass`);
      const heLeft=(ap.he_total||0)-(ap.he_genutzt||0);if(heLeft<=0)throw new Error(`Keine Haupteinheiten mehr bei ${pat.vorname}`);
      const prev={he_genutzt:ap.he_genutzt};const u={...ap,he_genutzt:ap.he_genutzt+1};
      const nl={id:genId(),pat_id:pat.id,pass_id:ap.id,typ:"HAUPTEINHEIT",quelle:"PINGU",datum:new Date().toISOString(),notiz:"Haupteinheit"};
      await supabase.from("paesse").update({he_genutzt:u.he_genutzt}).eq("id",ap.id);await supabase.from("log").insert(nl);
      setPaesse(p=>p.map(x=>x.id===ap.id?u:x));setLog(p=>[...p,nl]);
      setUndoAction({msg:`Haupteinheit −1 bei ${pat.vorname}`,undo:async()=>{await supabase.from("paesse").update(prev).eq("id",ap.id);await supabase.from("log").delete().eq("id",nl.id);setPaesse(p=>p.map(x=>x.id===ap.id?{...x,...prev}:x));setLog(p=>p.filter(l=>l.id!==nl.id));}});
    }
    if(action.typ==="BS_ABZIEHEN"&&action.pat_id){
      const pat=patienten.find(p=>p.id===action.pat_id);if(!pat)throw new Error("Patient nicht gefunden");
      const ap=paesse.find(pk=>pk.pat_id===action.pat_id&&!isPassAlt(pk));if(!ap)throw new Error(`${pat.vorname} hat keinen aktiven Pass`);
      const bsLeft=(ap.bs_total||0)-(ap.bs_genutzt||0);if(bsLeft<=0)throw new Error(`Keine Gruppenangebote mehr bei ${pat.vorname}`);
      const prev={bs_genutzt:ap.bs_genutzt};const u={...ap,bs_genutzt:ap.bs_genutzt+1};
      const nl={id:genId(),pat_id:pat.id,pass_id:ap.id,typ:"BS",quelle:"PINGU",datum:new Date().toISOString(),notiz:action.notiz||"Gruppenangebot"};
      await supabase.from("paesse").update({bs_genutzt:u.bs_genutzt}).eq("id",ap.id);await supabase.from("log").insert(nl);
      setPaesse(p=>p.map(x=>x.id===ap.id?u:x));setLog(p=>[...p,nl]);
      setUndoAction({msg:`Gruppenangebot −1 bei ${pat.vorname}`,undo:async()=>{await supabase.from("paesse").update(prev).eq("id",ap.id);await supabase.from("log").delete().eq("id",nl.id);setPaesse(p=>p.map(x=>x.id===ap.id?{...x,...prev}:x));setLog(p=>p.filter(l=>l.id!==nl.id));}});
    }
    if(action.typ==="PASS_ANLEGEN"&&action.pat_id){
      const pat=patienten.find(p=>p.id===action.pat_id);if(!pat)throw new Error("Patient nicht gefunden");
      if(!PASS_TYPES[action.passtyp])throw new Error(`Unbekannter Passtyp: ${action.passtyp}`);
      await handleKaufFuerPat(pat,"pass",action.passtyp,action.preis||PASS_TYPES[action.passtyp].preis,"",todayISO());
    }
    if(action.typ==="EINZEL_ANLEGEN"&&action.pat_id){
      const pat=patienten.find(p=>p.id===action.pat_id);if(!pat)throw new Error("Patient nicht gefunden");
      const found=EINZELANGEBOTE.find(e=>e.name.toLowerCase()===(action.name||"").toLowerCase())||EINZELANGEBOTE.find(e=>(action.name||"").toLowerCase().includes(e.key.toLowerCase()));
      const key=found?found.key:"CUSTOM";const name=action.name||found?.name||"Einzelangebot";const preis=action.preis??found?.preis??0;
      await handleKaufFuerPat(pat,"einzel",{key,name},preis,"",todayISO());
    }
    if(action.typ==="NOTIZ"&&action.pat_id){const nl={id:genId(),pat_id:action.pat_id,pass_id:null,typ:"NOTIZ",quelle:"PINGU",datum:new Date().toISOString(),notiz:action.text||""};await supabase.from("log").insert(nl);setLog(p=>[...p,nl]);}
    if(action.typ==="BEZAHLT"&&action.id){if(action.art==="pass"){await toggleBezahlt(action.id);}else{await toggleEinzelBez(action.id);}}
    if(action.typ==="BEZAHLT_RN"&&action.rechnung){const rn=action.rechnung.trim().toUpperCase();const pk=paesse.find(p=>(p.rechnung||"").toUpperCase()===rn);const ek=einzel.find(e=>(e.rechnung||"").toUpperCase()===rn);if(pk&&!pk.bezahlt)await toggleBezahlt(pk.id);else if(ek&&!ek.bezahlt)await toggleEinzelBez(ek.id);}
    if(action.typ==="SET_SERVICE"&&action.pat_id){const fields={};if(action.service==="therapie")fields.therapie=true;if(action.service==="ergotherapie")fields.ergotherapie=true;if(action.service==="sonstige")fields.sonstige=true;if(Object.keys(fields).length>0)await updatePatient(action.pat_id,fields);}
    if(action.typ==="UNSET_SERVICE"&&action.pat_id){const fields={};if(action.service==="therapie")fields.therapie=false;if(action.service==="ergotherapie")fields.ergotherapie=false;if(action.service==="sonstige")fields.sonstige=false;if(Object.keys(fields).length>0)await updatePatient(action.pat_id,fields);}
  };

  const PassCard=({pk,isAlt})=>{
    const heL=(pk.he_total||0)-(pk.he_genutzt||0),bsL=(pk.bs_total||0)-(pk.bs_genutzt||0);
    const ni={width:50,padding:"4px 6px",borderRadius:8,border:`1px solid ${T.cardBorder}`,fontSize:15,fontWeight:700,background:"transparent",color:T.text,outline:"none",textAlign:"center"};
    return(<div style={{borderRadius:16,border:`1px solid ${T.cardBorder}`,background:isAlt?T.bgPale+"90":T.cream+"90",overflow:"hidden",marginBottom:12,opacity:isAlt?0.8:1}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${T.cardBorder}`,background:T.bgPale+"80",flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><strong style={{fontFamily:"Georgia,serif",fontSize:17,color:T.oliveDark}}>Flossenpass</strong>{isAlt&&<Badge variant="cream" small>Aufgebraucht</Badge>}</div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",fontSize:12,fontWeight:700,textTransform:"uppercase",color:pk.bezahlt?T.green:T.red,background:pk.bezahlt?T.greenSoft:T.redSoft,padding:"6px 14px",borderRadius:10}}><input type="checkbox" checked={!!pk.bezahlt} onChange={()=>toggleBezahlt(pk.id)} style={{accentColor:T.green,width:15,height:15}}/>{pk.bezahlt?"Bezahlt":"Offen"}</label>
          <button onClick={()=>setConfirmDelete(pk.id)} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${T.red}30`,background:T.redSoft,color:T.red,fontSize:12,fontWeight:700,cursor:"pointer"}}>✕</button>
        </div>
      </div>
      <div className="pass-3col" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderBottom:`1px solid ${T.cardBorder}`}}>
        {[{l:"Rechnungs-Nr.",c:<input value={pk.rechnung||""} onChange={e=>updatePassField(pk.id,"rechnung",e.target.value)} style={{...editInp(140),width:"100%"}}/>},{l:"Datum",c:<input type="date" value={pk.datum||""} onChange={e=>updatePassField(pk.id,"datum",e.target.value)} style={{...editInp(140),width:"100%"}}/>},{l:"Preis",c:<div style={{display:"flex",alignItems:"center",gap:4}}><input type="number" min={0} value={pk.preis||0} onChange={e=>updatePassField(pk.id,"preis",Number(e.target.value))} style={{...editInp(80),textAlign:"right"}}/><span style={{fontSize:14,color:T.textMid}}>€</span></div>}].map((f,fi)=>(
          <div key={f.l} style={{padding:"12px 16px",borderLeft:fi>0?`1px solid ${T.cardBorder}`:"none"}}><div style={{fontSize:11,color:T.textLight,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>{f.l}</div>{f.c}</div>))}
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

  const getLastActivity=(patId)=>{const pl=log.filter(l=>l.pat_id===patId&&(l.typ==="HAUPTEINHEIT"||l.typ==="BS")).sort((a,b)=>(b.datum||"").localeCompare(a.datum||""));return pl[0]?.datum?fmtDate(pl[0].datum):null;};
  const ListRow=({p,i})=>{
    const u=getUnits(p.id);
    const ub=paesse.filter(pk=>pk.pat_id===p.id).some(pk=>!pk.bezahlt)||einzel.filter(e=>e.pat_id===p.id).some(e=>!e.bezahlt);
    const heW=u?(u.he===1):false;const bsW=u?(u.bs===1):false;
    const showPass=isTherapieKunde(p);
    const lastAct=showPass?getLastActivity(p.id):null;
    return(<div key={p.id} onClick={()=>{setSelPat(p);setView("akte");}} className="card-h slide-in" style={{animationDelay:`${i<20?i*0.05:0}s`,padding:"16px 24px",background:T.card,borderRadius:20,border:`1px solid ${T.cardBorder}`,cursor:"pointer",backdropFilter:"blur(8px)",boxShadow:"0 2px 12px rgba(74,82,64,0.06)"}}>
      <div className="liste-row" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div><div style={{fontWeight:600,color:T.text,fontSize:17,lineHeight:1.4}}>{p.vorname} {p.nachname}</div><div style={{display:"flex",alignItems:"center",gap:8,marginTop:4,flexWrap:"wrap"}}><span style={{fontSize:14,color:T.textLight}}>{p.email}</span>{p.stammkunde&&<Badge variant="green" small>Stammkunde</Badge>}{lastAct&&<span style={{fontSize:11,color:T.textLight+"90"}}>Letzter Termin: {lastAct}</span>}</div></div>
        <div className="liste-right" style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          {showPass&&<div style={{display:"flex",border:`1px solid ${T.cardBorder}`,borderRadius:10,overflow:"hidden"}}>{[{label:"HE",val:u?u.he:null,warn:heW},{label:"GA",val:u?u.bs:null,warn:bsW}].map((col,ci)=>(<div key={col.label} style={{width:44,padding:"5px 0",textAlign:"center",borderLeft:ci>0?`1px solid ${T.cardBorder}`:"none",background:col.warn?T.orangeSoft:T.bgPale+"60"}}><div style={{fontSize:9,color:T.textLight,textTransform:"uppercase",letterSpacing:0.8,marginBottom:2}}>{col.label}</div><div style={{fontSize:16,fontWeight:700,fontFamily:"Georgia,serif",color:col.warn?T.orange:col.val===null?T.textLight+"40":T.oliveDark,lineHeight:1}}>{col.val!==null?col.val:"–"}</div></div>))}</div>}
          {showPass&&u&&<Badge variant="gold">{getPassName(u.typ)}</Badge>}
          {p.ergotherapie&&<Badge variant="blue">{showPass?"Ergo":"Ergotherapie"}</Badge>}
          {!showPass&&!p.ergotherapie&&<Badge variant="purple">Sonstige</Badge>}
          {ub&&<Badge variant="red">Offen</Badge>}
          <span className="chevron" style={{color:T.gold,fontSize:18,fontWeight:300}}>›</span>
        </div>
      </div>
    </div>);
  };

  if(scanMode)return(<div className="fade-in resp-pad" style={{padding:28}}><div className="header-row" style={{display:"flex",alignItems:"center",gap:14,marginBottom:28}}><Btn ghost onClick={()=>setScanMode(false)}>← Zurück</Btn><Heading style={{fontSize:22}}>QR-Code Scanner</Heading></div><Card><div style={{textAlign:"center",padding:"24px 8px"}}><div style={{fontSize:40,marginBottom:16}}>📷</div><p style={{color:T.textMid,marginBottom:20}}>QR-Token eingeben:</p><div style={{display:"flex",gap:8,justifyContent:"center",maxWidth:420,margin:"0 auto",flexWrap:"wrap"}}><input value={scanInput} onChange={e=>setScanInput(e.target.value)} placeholder="z.B. KU-A7F3B2C9" onKeyDown={e=>e.key==="Enter"&&handleScan()} style={{...inp,flex:1,fontFamily:"monospace",minWidth:180}}/><Btn gold onClick={handleScan}>Scannen</Btn></div></div></Card></div>);

  const tbBtn=(emoji,label,onClick,isActive)=>(<button key={label} onClick={onClick} className="btn-a" style={{padding:"9px 14px",borderRadius:12,fontWeight:600,cursor:"pointer",background:isActive?T.oliveDark:T.olive,color:"#fff",border:"none",fontSize:13,letterSpacing:0.3,textTransform:"uppercase"}}><span className="btn-emoji" style={{display:"none"}}>{emoji}</span><span className="btn-text">{label}</span></button>);

  return(<div className="resp-pad" style={{padding:28}}>
    {kaufModal&&<KaufModal selPat={selPat} onKauf={handleKauf} onClose={()=>setKaufModal(false)}/>}
    {pinguChat&&<PinguChatModal patienten={patienten} paesse={paesse} einzel={einzel} log={log} onAction={handlePinguAction} onClose={()=>setPinguChat(false)}/>}
    {confirmDelete&&<Modal onClose={()=>setConfirmDelete(null)}><Card className="modal-box" style={{width:380,textAlign:"center"}}><div style={{fontSize:36,marginBottom:12}}>⚠️</div><Heading style={{fontSize:20,marginBottom:8}}>Pass löschen?</Heading><p style={{color:T.textMid,fontSize:15,marginBottom:20}}>Unwiderruflich.</p><div style={{display:"flex",gap:10,justifyContent:"center"}}><Btn ghost onClick={()=>setConfirmDelete(null)}>Abbrechen</Btn><Btn danger onClick={()=>deletePass(confirmDelete)}>Löschen</Btn></div></Card></Modal>}
    {bsModal&&<Modal onClose={()=>{setBsModal(null);setBsNotiz("");}}><Card className="modal-box" style={{width:400}}><Heading style={{fontSize:20,marginBottom:4}}>Gruppenangebot abhaken</Heading><p style={{color:T.textMid,fontSize:15,marginBottom:18}}>Noch {(bsModal.bs_total||0)-(bsModal.bs_genutzt||0)} von {bsModal.bs_total||0}</p><div style={{display:"flex",flexDirection:"column",gap:12}}><input value={bsNotiz} onChange={e=>setBsNotiz(e.target.value)} placeholder="z.B. Yoga, Sound Bath..." style={inp} autoFocus/><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ghost onClick={()=>{setBsModal(null);setBsNotiz("");}}>Abbrechen</Btn><Btn gold disabled={!bsNotiz.trim()} onClick={()=>bsAbziehen(bsModal)}>Abhaken</Btn></div></div></Card></Modal>}
    {korrekturModal&&<Modal onClose={()=>setKorrekturModal(null)}><Card className="modal-box" style={{width:400}}><Heading style={{fontSize:20,marginBottom:18}}>Korrektur</Heading><div style={{display:"flex",flexDirection:"column",gap:14}}><div><label style={{fontSize:14,fontWeight:600,color:T.textMid,textTransform:"uppercase",letterSpacing:1,marginBottom:6,display:"block"}}>Typ</label><select value={korrekturTyp} onChange={e=>setKorrekturTyp(e.target.value)} style={inp}><option value="HE">Haupteinheit</option><option value="BS">Gruppenangebot</option></select></div><div><label style={{fontSize:14,fontWeight:600,color:T.textMid,textTransform:"uppercase",letterSpacing:1,marginBottom:6,display:"block"}}>Anzahl</label><input type="number" min={1} max={10} value={korrekturAnzahl} onChange={e=>setKorrekturAnzahl(e.target.value)} style={inp}/></div><div><label style={{fontSize:14,fontWeight:600,color:T.textMid,textTransform:"uppercase",letterSpacing:1,marginBottom:6,display:"block"}}>Grund</label><input value={korrekturGrund} onChange={e=>setKorrekturGrund(e.target.value)} placeholder="optional" style={inp}/></div><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ghost onClick={()=>setKorrekturModal(null)}>Abbrechen</Btn><Btn danger onClick={korrekturSpeichern}>Speichern</Btn></div></div></Card></Modal>}
    {undoAction&&<UndoToast message={undoAction.msg} onUndo={undoAction.undo} onDismiss={()=>setUndoAction(null)}/>}
    {pendingPasses.length>0&&<div className="fade-in" style={{marginBottom:22}}>
      {pendingPasses.map(pp=>{
        const isEdit=editPass?.orderId===pp.orderId;
        const cleanInv=(s)=>(s||"").replace(/^[A-Z]+-\d{4}-/,"");
        const invNum=cleanInv(pp.invoiceNumber);
        const passDate=(pp.date||"").split("T")[0]||todayISO();
        return(<div key={pp.orderId} style={{borderRadius:16,background:T.cream,borderLeft:"5px solid #e46d73",padding:"22px 26px",marginBottom:14,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <span style={{background:"#e46d73",color:"#fff",fontSize:12,fontWeight:800,padding:"5px 14px",borderRadius:8,textTransform:"uppercase",letterSpacing:1}}>Neuer Flossenpass-Verkauf</span>
            <span style={{fontSize:14,color:T.textLight,fontWeight:500}}>{passDate}</span>
          </div>
          <div style={{fontSize:22,fontWeight:700,color:T.text,marginBottom:10}}>{pp.customer?.name||"Unbekannt"}</div>
          <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:16}}>
            <span style={{background:"#fde8e9",color:"#e46d73",fontSize:14,fontWeight:700,padding:"6px 16px",borderRadius:24}}>{getPassName(pp.passType)}</span>
            <span style={{fontSize:18,fontWeight:700,color:T.text}}>{pp.price}€</span>
            {!pp.priceMatch&&<span style={{fontSize:14,color:"#e46d73",fontWeight:600}}>statt {pp.standardPrice}€</span>}
            {invNum&&<span style={{fontSize:14,color:T.textMid,fontWeight:600}}>RN{invNum}</span>}
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button onClick={()=>confirmPassSale(pp)} style={{padding:"11px 24px",borderRadius:12,background:"#e46d73",color:"#fff",fontWeight:700,fontSize:14,border:"none",cursor:"pointer"}}>Bestätigen</button>
            <button onClick={()=>setEditPass(isEdit?null:{orderId:pp.orderId,he:PASS_TYPES[pp.passType]?.he||0,bs:PASS_TYPES[pp.passType]?.bs||0,preis:pp.price,name:getPassName(pp.passType),rechnung:invNum?"RN"+invNum:(pp.invoiceNumber||""),datum:passDate})} style={{padding:"11px 24px",borderRadius:12,background:"transparent",color:"#e46d73",fontWeight:700,fontSize:14,border:"1.5px solid #e46d73",cursor:"pointer"}}>{isEdit?"Schließen":"Anpassen"}</button>
            <button onClick={()=>dismissPassSale(pp)} style={{padding:"11px 24px",borderRadius:12,background:"transparent",color:T.textMid,fontWeight:600,fontSize:14,border:`1.5px solid ${T.cardBorder}`,cursor:"pointer"}}>Ignorieren</button>
          </div>
          {isEdit&&<div style={{marginTop:18,paddingTop:18,borderTop:`1px solid ${T.cardBorder}`,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
            <div><label style={{fontSize:12,fontWeight:700,color:T.textMid,textTransform:"uppercase",display:"block",marginBottom:6,letterSpacing:0.5}}>Haupteinheiten</label><input type="number" min={0} value={editPass.he} onChange={e=>setEditPass({...editPass,he:Number(e.target.value)})} style={inp}/></div>
            <div><label style={{fontSize:12,fontWeight:700,color:T.textMid,textTransform:"uppercase",display:"block",marginBottom:6,letterSpacing:0.5}}>Gruppenangebote</label><input type="number" min={0} value={editPass.bs} onChange={e=>setEditPass({...editPass,bs:Number(e.target.value)})} style={inp}/></div>
            <div><label style={{fontSize:12,fontWeight:700,color:T.textMid,textTransform:"uppercase",display:"block",marginBottom:6,letterSpacing:0.5}}>Preis (€)</label><input type="number" min={0} value={editPass.preis} onChange={e=>setEditPass({...editPass,preis:Number(e.target.value)})} style={inp}/></div>
            <div><label style={{fontSize:12,fontWeight:700,color:T.textMid,textTransform:"uppercase",display:"block",marginBottom:6,letterSpacing:0.5}}>Name</label><input value={editPass.name} onChange={e=>setEditPass({...editPass,name:e.target.value})} style={inp}/></div>
            <div><label style={{fontSize:12,fontWeight:700,color:T.textMid,textTransform:"uppercase",display:"block",marginBottom:6,letterSpacing:0.5}}>Rechnungsnr.</label><input value={editPass.rechnung} onChange={e=>setEditPass({...editPass,rechnung:e.target.value})} placeholder="z.B. RN123" style={inp}/></div>
            <div><label style={{fontSize:12,fontWeight:700,color:T.textMid,textTransform:"uppercase",display:"block",marginBottom:6,letterSpacing:0.5}}>Datum</label><input type="date" value={editPass.datum} onChange={e=>setEditPass({...editPass,datum:e.target.value})} style={inp}/></div>
            <div style={{gridColumn:"span 3",display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}><button onClick={()=>confirmPassSale(pp,{he:editPass.he,bs:editPass.bs,preis:editPass.preis,name:editPass.name,rechnung:editPass.rechnung,datum:editPass.datum})} style={{padding:"11px 24px",borderRadius:12,background:"#e46d73",color:"#fff",fontWeight:700,fontSize:14,border:"none",cursor:"pointer"}}>Bestätigen</button><button onClick={()=>{const cname=pp.customer?.name||"";const parts=cname.toLowerCase().trim().split(/\s+/).filter(p=>p.length>0);const pat=patienten.find(p=>{const full=`${p.vorname||""} ${p.nachname||""}`.toLowerCase();return parts.length>0&&parts.every(part=>full.includes(part));});if(!pat){alert("Patient nicht gefunden: "+cname);return;}setSelPat(pat);setView("akte");dismissPassSale(pp);}} style={{padding:"11px 24px",borderRadius:12,background:"transparent",color:T.textMid,fontWeight:600,fontSize:14,border:`1.5px solid ${T.cardBorder}`,cursor:"pointer"}}>Kundenakte öffnen</button></div>
          </div>}
        </div>);
      })}
    </div>}

    {(view==="liste"||view==="team")&&(<div className="fade-in">
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, E-Mail oder Rechnungsnummer..." style={{...inp,marginBottom:12}}/>
      <div className="toolbar-btns" style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:18}}>
        {tbBtn("📋","Gäste",()=>setView("liste"),view==="liste")}
        {tbBtn("👥","Team",()=>setView("team"),view==="team")}
        {tbBtn("📊",showStats?"Statistik ✕":"Statistik",()=>{if(showStats){setShowStats(false);return;}const pw=prompt("Passwort für Statistik:");if(pw==="Vogel")setShowStats(true);else if(pw!==null)alert("Falsches Passwort");},showStats)}
        {tbBtn("📷","QR",()=>setScanMode(true))}
        {tbBtn("⬇","CSV",downloadCSV)}
        {tbBtn("🐧","Pingu",()=>setPinguChat(true))}
        <button disabled={shoreSync} className="btn-a" style={{padding:"9px 14px",borderRadius:12,fontWeight:600,cursor:shoreSync?"not-allowed":"pointer",background:T.olive,color:"#fff",border:"none",fontSize:13,textTransform:"uppercase",opacity:shoreSync?0.5:1}} onClick={()=>doShoreSync(false)}><span className="btn-emoji" style={{display:"none"}}>🔄</span><span className="btn-text">{shoreSync?"Synchronisiere…":"Sync"}</span></button>
      </div>
      {shoreSyncMsg&&<div className="fade-in" style={{padding:"12px 18px",borderRadius:12,background:shoreSyncMsg.startsWith("Fehler")?T.redSoft:shoreSyncMsg.includes("bitte warten")?T.goldSoft:T.greenSoft,color:shoreSyncMsg.startsWith("Fehler")?T.red:shoreSyncMsg.includes("bitte warten")?T.gold:T.green,fontSize:14,fontWeight:600,marginBottom:14,textAlign:"center"}}>{shoreSyncMsg}</div>}
      {showStats&&<div style={{marginBottom:22}}><StatistikPanel patienten={patienten} paesse={paesse} einzelArr={einzel}/></div>}

      {view==="liste"&&<>
        {shoreCalendar.length>0&&<Card style={{padding:16,marginBottom:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:13,fontWeight:700,color:T.olive,textTransform:"uppercase",letterSpacing:2}}>Shore Termine heute</div>
            <div style={{fontSize:12,color:T.textLight}}>{shoreCalendar.length} Kunden</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {shoreCalendar.map((a,i)=>{const now=new Date();const h=now.getHours();const m=now.getMinutes();const nowMin=h*60+m;const [sh,sm]=(a.start||"").split(":").map(Number);const [eh,em]=(a.end||"").split(":").map(Number);const startMin=(sh||0)*60+(sm||0);const endMin=(eh||0)*60+(em||0);const isPast=endMin<=nowMin;const isNow=startMin<=nowMin&&endMin>nowMin;
              const parts=(a.customer||"").toLowerCase().trim().split(/\s+/).filter(p=>p.length>0);
              const matchedPat=patienten.find(p=>{const full=`${p.vorname||""} ${p.nachname||""}`.toLowerCase();return parts.length>0&&parts.every(part=>full.includes(part));});
              const openPat=()=>{if(matchedPat){setSelPat(matchedPat);setView("akte");}};
              const aktPass=matchedPat?paesse.find(pk=>pk.pat_id===matchedPat.id&&!isPassAlt(pk)):null;
              const heUebrig=aktPass?((aktPass.he_total||0)-(aktPass.he_genutzt||0)):null;
              const letzteEinheit=heUebrig===1;
              return(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:10,background:isNow?T.goldSoft:isPast?T.bg+"80":"transparent",opacity:isPast?0.5:1,borderLeft:isNow?`3px solid ${T.gold}`:"3px solid transparent"}}>
                <div style={{fontSize:14,fontWeight:700,color:isNow?T.gold:T.textMid,minWidth:90,fontVariantNumeric:"tabular-nums"}}>{a.start} – {a.end}</div>
                <div style={{fontSize:14,fontWeight:600,flex:1}}>
                  <span onClick={matchedPat?openPat:undefined} style={{color:T.text,cursor:matchedPat?"pointer":"default",borderBottom:matchedPat?`1px dashed ${T.cardBorder}`:"none"}}>{a.customer}</span>
                  {!matchedPat&&<span style={{marginLeft:8,fontSize:11,fontWeight:700,color:T.orange,background:T.orangeSoft,padding:"2px 8px",borderRadius:8}}>Unbekannt</span>}
                  {a.deducted&&(()=>{const isRecent=autoDeductRecent[a.customer]&&(Date.now()-autoDeductRecent[a.customer]<15*60*1000);return <span className={isRecent?"fade-in":""} style={{marginLeft:8,fontSize:11,fontWeight:700,color:T.green,background:T.greenSoft,padding:"2px 8px",borderRadius:8}}>{isRecent?"HE gerade abgezogen":"HE abgezogen"}</span>;})()}
                  {aktPass&&!a.deducted&&<span style={{marginLeft:8,fontSize:11,fontWeight:600,color:letzteEinheit?T.red:T.textMid,background:letzteEinheit?T.redSoft:T.bg,padding:"2px 8px",borderRadius:8}}>{letzteEinheit?"Letzte HE!":heUebrig+"/"+aktPass.he_total+" HE"}</span>}
                </div>
                <div style={{fontSize:12,color:T.textLight}}>{a.service}</div>
                <div style={{fontSize:11,color:T.textLight,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.employee}</div>
              </div>);})}
          </div>
        </Card>}
        <div style={{marginBottom:18}}>
          <Heading style={{fontSize:28}}>Gästeliste Kaiserufer</Heading>
          <div style={{display:"flex",gap:6,marginTop:12,flexWrap:"wrap"}}>
            {[{k:"alle",l:"Alle",c:T.olive},{k:"therapie",l:"Therapie",c:T.olive},{k:"ergo",l:"Ergotherapie",c:T.blue},{k:"sonstige",l:"Sonstige",c:T.purple}].map(f=>(
              <button key={f.k} onClick={()=>setListFilter(f.k)} style={{padding:"7px 16px",borderRadius:20,border:listFilter===f.k?"none":`1px solid ${T.cardBorder}`,background:listFilter===f.k?f.c:"transparent",color:listFilter===f.k?"#fff":T.textMid,fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit"}}>{f.l}</button>
            ))}
          </div>
          <p style={{color:T.textLight,fontSize:14,marginTop:8}}>{gaeste.length} Kunden</p>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {gaeste.map((p,i)=><ListRow key={p.id} p={p} i={i}/>)}
          {gaeste.length===0&&<p style={{textAlign:"center",color:T.textLight,padding:40}}>Keine Kunden gefunden</p>}
        </div>
      </>}

      {view==="team"&&<TeamView patienten={patienten} setPatienten={setPatienten} urlaub={urlaub} setUrlaub={setUrlaub} teamEvents={teamEvents} setTeamEvents={setTeamEvents} schichten={schichten} setSchichten={setSchichten} onOpenAkte={(p)=>{setSelPat(p);setView("akte");}}/>}
    </div>)}

    {view==="akte"&&selPat&&(<div className="fade-in">
      <div className="header-row" style={{display:"flex",alignItems:"center",gap:14,marginBottom:28}}><Btn ghost onClick={()=>setView(selPat.mitarbeiter?"team":"liste")}>← Zurück</Btn><Heading style={{fontSize:22}}>{selPat.vorname} {selPat.nachname}</Heading>{selPat.mitarbeiter&&<Badge variant="purple">Mitarbeiter:in</Badge>}{selPat.tresen&&<Badge variant="orange">Tresen</Badge>}{saving&&<span style={{fontSize:13,color:T.gold}}>Speichern...</span>}<div style={{marginLeft:"auto"}}><button onClick={()=>deletePerson(selPat)} style={{padding:"6px 14px",borderRadius:10,border:`1px solid ${T.red}25`,background:T.redSoft,color:T.red,fontSize:12,fontWeight:700,cursor:"pointer",opacity:0.7,transition:"opacity 0.2s"}} onMouseEnter={e=>e.target.style.opacity=1} onMouseLeave={e=>e.target.style.opacity=0.7}>Löschen</button></div></div>
      <div className="akte-grid" style={{display:"grid",gridTemplateColumns:"1fr 220px",gap:20,alignItems:"start"}}>
        <div style={{display:"flex",flexDirection:"column",gap:18}}>

          <Card>
            <SectionLabel>Stammdaten</SectionLabel>
            <div style={{display:"flex",flexDirection:"column",gap:10,fontSize:15,lineHeight:1.6}}>
              {[["E-Mail",selPat.email||"–"],["Telefon",selPat.telefon||"–"],["Adresse",selPat.adresse||"–"],["QR",<code style={{background:T.bgPale,padding:"3px 10px",borderRadius:8,fontSize:13,wordBreak:"break-all",color:T.textLight}}>{selPat.qr}</code>],["Seit",fmtDate(selPat.erstellt)]].map(([l,v])=>(<div key={l} style={{display:"flex",gap:12,alignItems:"flex-start",flexWrap:"wrap"}}><span style={{color:T.textLight,minWidth:90,flexShrink:0,fontSize:14}}>{l}:</span><span style={{wordBreak:"break-word",color:T.text,fontSize:15}}>{v}</span></div>))}

              {!selPat.mitarbeiter&&<>
                {isTherapieKunde(selPat)&&<div style={{marginTop:10,paddingTop:12,borderTop:`1px solid ${T.cardBorder}`}}>
                  <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:14}}>
                    {[{val:heUebrig,l:"HE übrig"},{val:bsUebrig,l:"GA übrig"}].map(u=>(<div key={u.l} style={{display:"flex",flexDirection:"column",alignItems:"center",background:T.gold+"18",borderRadius:12,padding:"10px 20px",border:`1px solid ${T.gold}25`}}><span style={{fontSize:28,fontWeight:700,color:T.oliveDark,fontFamily:"Georgia,serif"}}>{u.val}</span><span style={{fontSize:12,color:T.textLight,textTransform:"uppercase",letterSpacing:1,marginTop:3}}>{u.l}</span></div>))}
                  </div>
                  {aktiverPass&&(<div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                    <button disabled={heUebrig===0} onClick={()=>heAbziehen(aktiverPass)} className="btn-a" style={{flex:1,minWidth:160,padding:"16px 18px",borderRadius:18,border:"none",background:heUebrig===0?T.bgPale:T.olive,color:heUebrig===0?T.textLight:"#fff",cursor:heUebrig===0?"not-allowed":"pointer",opacity:heUebrig===0?0.4:1,fontWeight:700,fontSize:15,boxShadow:heUebrig===0?"none":`0 4px 16px ${T.olive}30`,lineHeight:1.5}}>✓ Termin war heute<br/><span style={{fontSize:12,fontWeight:400,opacity:0.75}}>Haupteinheit −1</span></button>
                    <button disabled={bsUebrig===0} onClick={()=>setBsModal(aktiverPass)} className="btn-a" style={{flex:1,minWidth:160,padding:"16px 18px",borderRadius:18,border:"none",background:bsUebrig===0?T.bgPale:T.olive,color:bsUebrig===0?T.textLight:"#fff",cursor:bsUebrig===0?"not-allowed":"pointer",opacity:bsUebrig===0?0.4:1,fontWeight:700,fontSize:15,boxShadow:bsUebrig===0?"none":`0 4px 16px ${T.olive}30`,lineHeight:1.5}}>✓ Termin war heute<br/><span style={{fontSize:12,fontWeight:400,opacity:0.75}}>Gruppenangebot −1</span></button>
                  </div>)}
                </div>}
                <div className="stammk-row" style={{display:"flex",gap:12,alignItems:"center",paddingTop:12,marginTop:6,borderTop:`1px solid ${T.cardBorder}`}}>
                  <span style={{color:T.textLight,minWidth:90,flexShrink:0,fontSize:14}}>Stammkunde:</span>
                  <div className="stammk-inner" style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                    {["Ja","Nein"].map(opt=>{const ak=opt==="Ja"?!!selPat.stammkunde:!selPat.stammkunde;return(<button key={opt} onClick={()=>updatePatient(selPat.id,{stammkunde:opt==="Ja"})} style={{padding:"6px 20px",borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer",border:`1px solid ${ak?(opt==="Ja"?T.green:T.text)+"40":T.cardBorder}`,background:ak?(opt==="Ja"?T.greenSoft:T.olive+"12"):"transparent",color:ak?(opt==="Ja"?T.green:T.text):T.textLight}}>{opt}</button>);})}
                    {selPat.stammkunde&&<div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:14,color:T.textMid}}>Preis:</span><input type="number" min={0} value={selPat.stammpreis||""} onChange={e=>updatePatient(selPat.id,{stammpreis:e.target.value})} placeholder="420" style={{width:90,padding:"6px 10px",borderRadius:10,border:`1px solid ${T.cardBorder}`,fontSize:14,background:T.inp,color:T.text,outline:"none"}}/><span style={{fontSize:14,color:T.textMid}}>€</span></div>}
                  </div>
                </div>
                <div className="stammk-row" style={{display:"flex",gap:12,alignItems:"center",paddingTop:12,marginTop:6,borderTop:`1px solid ${T.cardBorder}`}}>
                  <span style={{color:T.textLight,minWidth:90,flexShrink:0,fontSize:14}}>Leistungen:</span>
                  <div className="stammk-inner" style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    {[{key:"therapie",label:"Therapie",color:T.olive},{key:"ergotherapie",label:"Ergotherapie",color:T.blue},{key:"sonstige",label:"Sonstige",color:T.purple}].map(opt=>{const ak=!!selPat[opt.key];return(<button key={opt.key} onClick={()=>updatePatient(selPat.id,{[opt.key]:!ak})} style={{padding:"6px 16px",borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer",border:`1px solid ${ak?opt.color+"40":T.cardBorder}`,background:ak?opt.color+"15":"transparent",color:ak?opt.color:T.textLight}}>{ak?"✓ ":""}{opt.label}</button>);})}
                  </div>
                </div>
              </>}
            </div>
          </Card>

          {selPat.mitarbeiter&&<>
            <Card>
              <SectionLabel>Urlaub</SectionLabel>
              <div style={{display:"flex",gap:12,marginBottom:18,flexWrap:"wrap",alignItems:"center"}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",background:T.purpleSoft,borderRadius:12,padding:"10px 20px",border:`1px solid ${T.purple}25`}}><span style={{fontSize:28,fontWeight:700,color:T.purple,fontFamily:"Georgia,serif"}}>{(selPat.urlaub_total||30)-urlaubGenutzt}</span><span style={{fontSize:12,color:T.textLight,textTransform:"uppercase",letterSpacing:1,marginTop:3}}>Tage übrig</span></div>
                <div style={{fontSize:14,color:T.textMid,lineHeight:1.8}}><strong style={{color:T.text}}>{urlaubGenutzt}</strong> von <strong style={{color:T.text}}>{selPat.urlaub_total||30}</strong> Arbeitstagen genommen<br/>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}><span style={{fontSize:13,color:T.textLight}}>Jahresanspruch:</span><input type="number" min={0} value={selPat.urlaub_total||30} onChange={e=>updatePatient(selPat.id,{urlaub_total:Number(e.target.value)})} style={{width:60,padding:"4px 8px",borderRadius:8,border:`1px solid ${T.cardBorder}`,fontSize:14,background:T.inp,color:T.text,outline:"none",textAlign:"center"}}/><span style={{fontSize:13,color:T.textLight}}>Tage</span></div>
                </div>
              </div>
              <Bar used={urlaubGenutzt} total={selPat.urlaub_total||30} color={T.purple} h={5}/>
              <div style={{marginTop:18,paddingTop:14,borderTop:`1px solid ${T.cardBorder}`}}>
                <div style={{fontSize:12,fontWeight:700,color:T.textLight,textTransform:"uppercase",letterSpacing:2,marginBottom:12}}>Neuen Urlaub eintragen</div>
                <div className="urlaub-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
                  <div><div style={{fontSize:11,color:T.textLight,marginBottom:4}}>Von</div><input type="date" value={urlaubVon} onChange={e=>setUrlaubVon(e.target.value)} style={{...inp,padding:"8px 12px",fontSize:14}}/></div>
                  <div><div style={{fontSize:11,color:T.textLight,marginBottom:4}}>Bis</div><input type="date" value={urlaubBis} onChange={e=>setUrlaubBis(e.target.value)} style={{...inp,padding:"8px 12px",fontSize:14}}/></div>
                  <div><div style={{fontSize:11,color:T.textLight,marginBottom:4}}>Notiz</div><input value={urlaubNotiz} onChange={e=>setUrlaubNotiz(e.target.value)} placeholder="optional" style={{...inp,padding:"8px 12px",fontSize:14}}/></div>
                </div>
                {urlaubVon&&urlaubBis&&<div style={{fontSize:13,color:T.purple,fontWeight:600,marginBottom:10}}>= {workingDays(urlaubVon,urlaubBis)} Arbeitstage</div>}
                <Btn small gold disabled={!urlaubVon||!urlaubBis} onClick={addUrlaub}>Urlaub eintragen</Btn>
              </div>
              {patUrlaub.length>0&&<div style={{marginTop:18}}>
                <div style={{fontSize:12,fontWeight:700,color:T.textLight,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>Eingetragene Zeiträume</div>
                {patUrlaub.map(u=>{const tage=workingDays(u.von,u.bis);return(<div key={u.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:T.purpleSoft,borderRadius:12,marginBottom:6,fontSize:14}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><strong style={{color:T.purple}}>{fmtDate(u.von)} – {fmtDate(u.bis)}</strong><span style={{color:T.textMid}}>{tage} Tag{tage!==1?"e":""}</span>{u.notiz&&<span style={{color:T.textLight}}>· {u.notiz}</span>}</div>
                  <button onClick={()=>deleteUrlaub(u.id)} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${T.red}25`,background:T.redSoft,color:T.red,fontSize:11,fontWeight:700,cursor:"pointer"}}>✕</button>
                </div>);})}
              </div>}
            </Card>
          </>}

          {!selPat.mitarbeiter&&isTherapieKunde(selPat)&&<>
            <Card>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:8}}><SectionLabel>Aktiver Flossenpass</SectionLabel><Btn small gold onClick={()=>setKaufModal(true)}>+ Hinzufügen</Btn></div>
              {aktPaesse.length===0&&<p style={{color:T.textLight,textAlign:"center",fontSize:15,padding:8}}>Kein aktiver Flossenpass</p>}
              {aktPaesse.map(pk=><PassCard key={pk.id} pk={pk} isAlt={false}/>)}
              {patEinzel.length>0&&(<div style={{marginTop:aktPaesse.length>0?14:0}}><div style={{fontSize:12,fontWeight:700,color:T.textLight,textTransform:"uppercase",letterSpacing:2,marginBottom:12}}>Einzelangebote</div>
                {patEinzel.map(e=>(<div key={e.id} className="einzel-row" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 18px",borderRadius:12,border:`1px solid ${T.cardBorder}`,background:T.cream+"80",marginBottom:8}}>
                  <div style={{display:"flex",flexDirection:"column",gap:4}}><span style={{fontSize:15,fontWeight:600,color:T.text}}>{e.name}</span><div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}><code style={{background:T.bgPale,padding:"3px 10px",borderRadius:8,fontSize:12,color:T.textLight}}>{e.rechnung||"–"}</code><span style={{fontSize:14,color:T.textMid}}>{fmtDate(e.datum)}</span><strong style={{fontSize:14,color:T.text}}>{e.preis||0} €</strong></div></div>
                  <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",fontSize:12,fontWeight:700,textTransform:"uppercase",color:e.bezahlt?T.green:T.red,background:e.bezahlt?T.greenSoft:T.redSoft,padding:"6px 14px",borderRadius:10,flexShrink:0}}><input type="checkbox" checked={!!e.bezahlt} onChange={()=>toggleEinzelBez(e.id)} style={{accentColor:T.green,width:15,height:15}}/>{e.bezahlt?"Bezahlt":"Offen"}</label>
                </div>))}</div>)}
            </Card>
            <Card>
              <SectionLabel>Flossenpass-Historie</SectionLabel>
              {alleVerkaufe.length===0&&<p style={{color:T.textLight,textAlign:"center",fontSize:15}}>Noch keine Einträge</p>}
              {alleVerkaufe.map(item=>(<div key={item.id} className="vk-row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:item.isAlt?T.bgPale+"50":T.bgPale+"80",borderRadius:12,fontSize:15,marginBottom:6,flexWrap:"wrap",gap:8,opacity:item.isAlt?0.65:1,borderLeft:item.isAlt?`3px solid ${T.gold}40`:`3px solid ${T.green}60`}}>
                <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                  <Badge variant={item.art==="pass"?"gold":"blue"} small>{item.art==="pass"?"Flossenpass":"Einzelangebot"}</Badge>
                  {item.isAlt&&<Badge variant="cream" small>Aufgebraucht</Badge>}
                  <code style={{background:T.bgPale,padding:"3px 10px",borderRadius:8,fontSize:12,color:T.textLight,fontFamily:"monospace"}}>{item.rechnung||"–"}</code>
                  {item.rechnung_pdf&&<a href={item.rechnung_pdf} target="_blank" rel="noopener noreferrer" style={{padding:"3px 10px",borderRadius:8,fontSize:11,fontWeight:700,background:T.green+"20",color:T.green,textDecoration:"none",border:`1px solid ${T.green}30`}}>PDF ↗</a>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0,flexWrap:"wrap"}}>
                  <span style={{fontSize:13,color:T.textLight}}>{fmtDate(item.datum)}</span>
                  <strong style={{fontFamily:"Georgia,serif",fontSize:15,color:T.oliveDark,minWidth:60,textAlign:"right"}}>{item.preis} €</strong>
                  <Badge variant={item.bezahlt?"green":"red"} small>{item.bezahlt?"Bezahlt":"Offen"}</Badge>
                  <button onClick={()=>{if(item.art==="pass")setConfirmDelete(item.id);else{if(confirm("Einzelangebot löschen?")){(async()=>{await supabase.from("einzel").delete().eq("id",item.id);setEinzel(prev=>prev.filter(e=>e.id!==item.id));})();}}}} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${T.red}25`,background:T.redSoft,color:T.red,fontSize:11,fontWeight:700,cursor:"pointer"}}>✕</button>
                </div>
              </div>))}
              {alleVerkaufe.length>0&&<div style={{marginTop:14,paddingTop:12,borderTop:`1px solid ${T.cardBorder}`,display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:14,flexWrap:"wrap",gap:8}}>
                <span style={{color:T.textLight,fontSize:13}}>{alleVerkaufe.length} Einträge · {alleVerkaufe.filter(i=>i.isAlt).length} aufgebraucht</span>
                <div style={{display:"flex",gap:16,flexWrap:"wrap"}}><span style={{color:T.textLight}}>Gesamt: <strong style={{color:T.text}}>{alleVerkaufe.reduce((s,i)=>s+i.preis,0).toLocaleString("de-DE")} €</strong></span><span style={{color:T.textLight}}>Offen: <strong style={{color:T.red}}>{alleVerkaufe.filter(i=>!i.bezahlt).reduce((s,i)=>s+i.preis,0).toLocaleString("de-DE")} €</strong></span></div>
              </div>}
            </Card>
            <Card>
              <SectionLabel>Einheiten-Verlauf</SectionLabel>
              {patLog.filter(l=>l.typ!=="NOTIZ").length===0&&<p style={{color:T.textLight,textAlign:"center",fontSize:15}}>Noch kein Verlauf</p>}
              {patLog.filter(l=>l.typ!=="NOTIZ").map((l,i)=>{const b=logBadge(l.typ);return(<div key={l.id} className="slide-in log-row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:T.bgPale+"80",borderRadius:12,fontSize:15,marginBottom:6,animationDelay:`${i*0.03}s`}}><div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><Badge variant={b.v} small>{b.label}</Badge><span style={{color:T.text}}>{l.notiz}</span></div><span style={{fontSize:13,color:T.textLight,flexShrink:0,marginLeft:8}}>{fmtDateTime(l.datum)}</span></div>);})}
            </Card>
          </>}

          <Card>
            <SectionLabel>Notizen</SectionLabel>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:18}}><textarea value={notizText} onChange={e=>setNotizText(e.target.value)} placeholder="Notiz eingeben..." rows={3} style={{...inp,resize:"vertical",lineHeight:1.7}}/><div style={{display:"flex",justifyContent:"flex-end"}}><Btn small gold disabled={!notizText.trim()} onClick={notizSpeichern}>Notiz speichern</Btn></div></div>
            {patLog.filter(l=>l.typ==="NOTIZ").length===0&&<p style={{color:T.textLight,textAlign:"center",fontSize:15}}>Noch keine Notizen</p>}
            {patLog.filter(l=>l.typ==="NOTIZ").map(l=>(<div key={l.id} style={{padding:"12px 16px",background:T.gold+"15",borderRadius:12,fontSize:15,marginBottom:6,borderLeft:`3px solid ${T.gold}`}}><div style={{fontSize:13,color:T.textLight,marginBottom:5}}>{fmtDateTime(l.datum)}{l.quelle==="PINGU"?" · 🐧":""}</div><div style={{color:T.text,lineHeight:1.7,wordBreak:"break-word"}}>{l.notiz}</div></div>))}
          </Card>

          <Card>
            <SectionLabel>Einstellungen</SectionLabel>
            <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap",marginBottom:selPat.mitarbeiter?14:0}}>
              <span style={{color:T.textLight,minWidth:90,flexShrink:0,fontSize:14}}>Rolle:</span>
              {["Kunde","Mitarbeiter:in"].map(opt=>{const ak=opt==="Mitarbeiter:in"?!!selPat.mitarbeiter:!selPat.mitarbeiter;return(<button key={opt} onClick={()=>updatePatient(selPat.id,{mitarbeiter:opt==="Mitarbeiter:in"})} style={{padding:"6px 20px",borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer",border:`1px solid ${ak?(opt==="Mitarbeiter:in"?T.purple:T.olive)+"40":T.cardBorder}`,background:ak?(opt==="Mitarbeiter:in"?T.purpleSoft:T.olive+"12"):"transparent",color:ak?(opt==="Mitarbeiter:in"?T.purple:T.olive):T.textLight,transition:"all 0.15s"}}>{opt}</button>);})}
            </div>
            {selPat.mitarbeiter&&<div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{color:T.textLight,minWidth:90,flexShrink:0,fontSize:14}}>Tresen:</span>
              {["Ja","Nein"].map(opt=>{const ak=opt==="Ja"?!!selPat.tresen:!selPat.tresen;return(<button key={opt} onClick={()=>updatePatient(selPat.id,{tresen:opt==="Ja"})} style={{padding:"6px 20px",borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer",border:`1px solid ${ak?(opt==="Ja"?T.orange:T.text)+"40":T.cardBorder}`,background:ak?(opt==="Ja"?T.orangeSoft:T.olive+"12"):"transparent",color:ak?(opt==="Ja"?T.orange:T.text):T.textLight,transition:"all 0.15s"}}>{opt}</button>);})}
            </div>}
          </Card>
        </div>

        <div className="qr-sidebar" style={{position:"sticky",top:78}}>
          <Card style={{textAlign:"center"}}><SectionLabel>QR-Code</SectionLabel><div style={{background:T.cream,borderRadius:16,padding:18,display:"inline-block",marginBottom:14}}><QRCode value={selPat.qr} size={140}/></div>
            <div style={{display:"flex",flexDirection:"column",gap:8,textAlign:"left"}}>{[["Token",<code style={{fontFamily:"monospace",fontSize:12,color:T.textLight,wordBreak:"break-all"}}>{selPat.qr}</code>],["Name",`${selPat.vorname||""} ${selPat.nachname||""}`],["Seit",fmtDate(selPat.erstellt)],["Rolle",selPat.mitarbeiter?"Mitarbeiter:in":"Kunde"],!selPat.mitarbeiter?["Pass",aktiverPass?`${getPassLabel(aktiverPass)}`:"–"]:null].filter(Boolean).map(([l,v])=>(<div key={l} style={{display:"flex",gap:8,alignItems:"flex-start"}}><span style={{fontSize:12,color:T.textLight,minWidth:36,flexShrink:0}}>{l}</span><span style={{fontSize:14,color:T.text,fontWeight:500}}>{v}</span></div>))}</div>
          </Card>
        </div>
      </div>
    </div>)}
  </div>);
};

/* ═══ KUNDEN APP (VOLLSTÄNDIG) ═══ */


const KundenApp=({kunde,paesse})=>{
  const [splash,setSplash]=useState(true);const[splashAnim,setSplashAnim]=useState(false);
  const mp=paesse.filter(p=>p.pat_id===kunde.id);
  const ap=mp.find(p=>!isPassAlt(p));
  useEffect(()=>{const t1=setTimeout(()=>setSplashAnim(true),1800);const t2=setTimeout(()=>setSplash(false),2600);return()=>{clearTimeout(t1);clearTimeout(t2);};},[]);
  if(splash)return(<div className={splashAnim?"splash-out":""} style={{minHeight:"100vh",background:"#2A3222",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"fixed",inset:0,zIndex:200}}><div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 40%,rgba(212,196,160,0.06) 0%,transparent 70%)",pointerEvents:"none"}}/><div className="landing-title" style={{fontFamily:"Georgia,serif",fontWeight:700,fontSize:"clamp(32px,8vw,48px)",letterSpacing:4,textTransform:"uppercase",color:"#D4C4A0",lineHeight:1.1,position:"relative",zIndex:1}}>Kaiserufer</div><div className="landing-sub" style={{fontSize:"clamp(13px,3vw,16px)",color:"#D4C4A040",letterSpacing:6,textTransform:"uppercase",fontWeight:300,marginTop:8,position:"relative",zIndex:1}}>Home</div></div>);
  const heL=ap?(ap.he_total||0)-(ap.he_genutzt||0):0,bsL=ap?(ap.bs_total||0)-(ap.bs_genutzt||0):0;
  const hePct=ap&&ap.he_total>0?((ap.he_genutzt||0)/ap.he_total)*100:0,bsPct=ap&&ap.bs_total>0?((ap.bs_genutzt||0)/ap.bs_total)*100:0;
  return(<div className="content-in" style={{minHeight:"100vh",background:"#2A3222"}}>
    <div style={{background:"#2A3222F0",backdropFilter:"blur(12px)",padding:"0 24px",display:"flex",justifyContent:"center",alignItems:"center",position:"sticky",top:0,zIndex:100,height:52}} className="nav-bar"><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontFamily:"Georgia,serif",fontWeight:700,fontSize:15,letterSpacing:2.5,textTransform:"uppercase",color:"#D4C4A0"}}>Kaiserufer</span><div style={{width:1,height:18,background:"#D4C4A040",borderRadius:1}}/><span style={{fontSize:12,color:"#D4C4A060",fontWeight:500,letterSpacing:1.5,textTransform:"uppercase"}}>Home</span></div></div>
    <div className="k-resp-pad" style={{padding:"0 20px 48px",maxWidth:540,margin:"0 auto"}}>
      <div className="kunde-hero" style={{textAlign:"center",padding:"36px 0 28px"}}><h1 style={{fontFamily:"Georgia,serif",fontWeight:700,fontSize:"clamp(26px,6vw,34px)",color:"#E8E0D0",margin:"0 0 6px",letterSpacing:0.5,lineHeight:1.2}}>Willkommen {kunde.vorname}</h1><div style={{width:40,height:2,background:`linear-gradient(90deg,transparent,#D4C4A0,transparent)`,margin:"12px auto 0",borderRadius:2}}/>{kunde.stammkunde&&<div style={{marginTop:16,fontSize:13,color:"#D4C4A0",fontWeight:600,letterSpacing:0.5,fontFamily:"Georgia,serif"}}>VIP-Mitglied · Ihr exklusiver Vorteilstarif ist hinterlegt</div>}</div>
      {ap&&(<div className="kunde-card kunde-card-1" style={{marginBottom:24}}>
        <div style={{height:2,background:`linear-gradient(90deg,transparent,${T.gold},transparent)`,marginBottom:24,borderRadius:2}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24,flexWrap:"wrap",gap:8,padding:"0 4px"}}><div><div style={{fontSize:11,color:T.gold,textTransform:"uppercase",letterSpacing:2.5,marginBottom:4,fontWeight:700,fontFamily:"Georgia,serif"}}>Dein Flossenpass</div><div style={{fontFamily:"Georgia,serif",fontWeight:700,fontSize:28,color:"#F0EDE0",letterSpacing:0.5}}>Flossenpass</div></div><span style={{fontSize:12,color:T.goldDim,fontWeight:500,marginTop:4}}>seit {fmtDate(ap.datum)}</span></div>
        <div className="kunden-units" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
          {[{label:"Haupteinheit",labelP:"Haupteinheiten",left:heL,total:ap.he_total||0,pct:hePct},{label:"Gruppenangebot",labelP:"Gruppenangebote",left:bsL,total:ap.bs_total||0,pct:bsPct}].map((u,ui)=>(<div key={ui} style={{textAlign:"center",padding:"22px 12px 18px",borderRadius:16,border:`1.5px solid ${T.gold}50`,background:`${T.gold}15`}}><div style={{fontSize:44,fontWeight:700,fontFamily:"Georgia,serif",color:"#F0EDE0",lineHeight:1,marginBottom:4}}>{u.left}</div><div style={{fontSize:12,color:T.goldDim,marginBottom:2}}>von {u.total}</div><div style={{fontSize:13,color:T.goldLight,fontWeight:600}}>{u.left===1?u.label:u.labelP}</div><div style={{marginTop:12,padding:"0 10px"}}><Bar used={u.pct} total={100} color={T.gold} h={3}/></div></div>))}
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          <a href="https://connect.shore.com/bookings/kaiserufer/services?locale=de" target="_blank" rel="noopener noreferrer" className="btn-a" style={{padding:"10px 22px",borderRadius:12,background:T.goldDim+"30",color:heL===0?T.goldDim:"#F0EDE0",fontWeight:600,fontSize:13,textDecoration:"none",textAlign:"center",pointerEvents:heL===0?"none":"auto",opacity:heL===0?0.35:1,border:`1px solid ${T.gold}30`}}>Therapie buchen</a>
          <a href="https://www.eversports.de/widget/w/5tMWoO" target="_blank" rel="noopener noreferrer" className="btn-a" style={{padding:"10px 22px",borderRadius:12,background:T.goldDim+"30",color:bsL===0?T.goldDim:"#F0EDE0",fontWeight:600,fontSize:13,textDecoration:"none",textAlign:"center",pointerEvents:bsL===0?"none":"auto",opacity:bsL===0?0.35:1,border:`1px solid ${T.gold}30`}}>Kurs buchen</a>
        </div>
        {heL===0&&bsL===0&&<div style={{textAlign:"center",marginTop:16,fontSize:14,color:T.goldLight,fontWeight:600}}>Alle Einheiten aufgebraucht – sprich uns gerne an!</div>}
      </div>)}
      {mp.length===0&&(<Card className="kunde-card kunde-card-1" style={{textAlign:"center",padding:"48px 28px",marginBottom:16}}><div style={{fontSize:36,marginBottom:16,opacity:0.4}}>🐟</div><p style={{color:T.textMid,lineHeight:1.8,fontSize:16,margin:0}}>Du hast noch keine Angebote.<br/><span style={{color:T.textLight}}>Sprich uns gerne an!</span></p></Card>)}
      <div style={{textAlign:"center",padding:"40px 0 12px"}}><div style={{width:48,height:1,background:`linear-gradient(90deg,transparent,${T.gold}60,transparent)`,margin:"0 auto 18px"}}/><a href="https://kaiserufer.com" target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:T.oliveDark,textDecoration:"none",letterSpacing:2.5,textTransform:"uppercase",fontWeight:600,fontFamily:"Georgia,serif"}}>kaiserufer.com ↗</a><div style={{marginTop:10}}><a href="https://kaiserufer.com/datenschutz/" target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:T.textLight,textDecoration:"none",letterSpacing:1,textTransform:"uppercase"}}>Datenschutz</a></div></div>
    </div>
  </div>);
};

/* ═══ MAIN APP ═══ */

export default function App(){
  const [mode,setMode]=useState("kunde");const[showLogin,setShowLogin]=useState(false);
  const [patienten,setPatienten]=useState([]);const[paesse,setPaesse]=useState([]);
  const [log,setLog]=useState([]);const[einzel,setEinzel]=useState([]);
  const [urlaub,setUrlaub]=useState([]);
  const [teamEvents,setTeamEvents]=useState([]);const[schichten,setSchichten]=useState([]);
  const [rechnungsNr,setRechnungsNr]=useState(0);const[loading,setLoading]=useState(false);
  const urlToken=new URLSearchParams(window.location.search).get("token");
  const[qrPat,setQrPat]=useState(null);const[qrPaesse,setQrPaesse]=useState([]);const[qrLoading,setQrLoading]=useState(!!urlToken);
  useEffect(()=>{supabase.auth.getSession().then(({data:{session}})=>{if(session)setMode("staff");});const{data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{if(session)setMode("staff");else setMode("kunde");});return()=>subscription.unsubscribe();},[]);
  useEffect(()=>{if(!urlToken)return;(async()=>{setQrLoading(true);try{const{data:patArr}=await supabase.rpc('get_patient_by_qr',{qr_code:urlToken});if(patArr&&patArr.length>0){const pat=patArr[0];setQrPat(pat);const{data:pkData}=await supabase.rpc('get_paesse_for_patient',{p_id:pat.id});if(pkData)setQrPaesse(pkData);}}catch(err){console.error("QR-Ladefehler:",err);}setQrLoading(false);})();},[]);
  useEffect(()=>{if(mode!=="staff")return;(async()=>{setLoading(true);try{const[p,pk,l,e,cfg,u,te,sc]=await Promise.all([supabase.from("patienten").select("*"),supabase.from("paesse").select("*"),supabase.from("log").select("*"),supabase.from("einzel").select("*"),supabase.from("einstellungen").select("*").eq("key","rechnungs_nr").single(),supabase.from("urlaub").select("*"),supabase.from("team_events").select("*"),supabase.from("schichten").select("*")]);if(p.data)setPatienten(p.data);if(pk.data)setPaesse(pk.data);if(l.data)setLog(l.data);if(e.data)setEinzel(e.data);if(cfg.data)setRechnungsNr(parseInt(cfg.data.value)||0);if(u.data)setUrlaub(u.data);if(te.data)setTeamEvents(te.data);if(sc.data)setSchichten(sc.data);}catch(err){console.error("Ladefehler:",err);}setLoading(false);})();},[mode]);
  const loginPat=qrPat||(urlToken?patienten.find(p=>p.qr===urlToken.toUpperCase()):null);
  const appBg=`linear-gradient(180deg,${T.bg} 0%,${T.bgLight} 50%,${T.bgLighter} 100%)`;
  if(loading||qrLoading)return(<div style={{fontFamily:"'Inter','Segoe UI',-apple-system,sans-serif",minHeight:"100vh",background:appBg}}><style>{css}</style><Spinner/></div>);
  return(<div style={{fontFamily:"'Inter','Segoe UI',-apple-system,sans-serif",minHeight:"100vh",background:loginPat?undefined:appBg}}>
    <style>{css}</style>
    {showLogin&&<LoginModal onLogin={()=>{setShowLogin(false);setMode("staff");}} onClose={()=>setShowLogin(false)}/>}
    {mode==="staff"&&<div style={{background:T.olive+"F0",backdropFilter:"blur(12px)",color:T.cream,padding:"0 28px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${T.olive}30`,position:"sticky",top:0,zIndex:100,height:58}} className="nav-bar"><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontFamily:"Georgia,serif",fontWeight:700,fontSize:17,letterSpacing:2.5,textTransform:"uppercase",color:T.goldLight}}>Kaiserufer</span><div style={{width:1,height:22,background:T.goldLight+"40",borderRadius:1}}/><span style={{fontSize:13,color:T.goldLight+"80",fontWeight:500,letterSpacing:1.5,textTransform:"uppercase"}}>Home</span></div><div><button onClick={()=>{supabase.auth.signOut();setMode("kunde");}} style={{padding:"7px 18px",borderRadius:12,border:"1px solid rgba(255,255,255,0.2)",background:"transparent",color:"rgba(255,255,255,0.7)",fontWeight:600,fontSize:12,cursor:"pointer",textTransform:"uppercase",letterSpacing:0.8,fontFamily:"inherit"}}>Abmelden</button></div></div>}
    {mode==="staff"
      ?<MitarbeiterApp patienten={patienten} setPatienten={setPatienten} paesse={paesse} setPaesse={setPaesse} log={log} setLog={setLog} rechnungsNr={rechnungsNr} setRechnungsNr={setRechnungsNr} einzel={einzel} setEinzel={setEinzel} urlaub={urlaub} setUrlaub={setUrlaub} teamEvents={teamEvents} setTeamEvents={setTeamEvents} schichten={schichten} setSchichten={setSchichten}/>
      :loginPat
        ?<KundenApp kunde={loginPat} paesse={qrPat?qrPaesse:paesse}/>
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
