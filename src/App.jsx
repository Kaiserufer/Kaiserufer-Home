// ============================================================
// ÄNDERUNG 1: Einfügen NACH dieser Zeile in MitarbeiterApp:
//   const [pinguName,setPinguName]=useState(""); ... const[pinguDone,setPinguDone]=useState("");
// UND VOR:
//   const inp={width:"100%", ...
// ============================================================

  const [pinguBsStep,setPinguBsStep]=useState(false);

  const pinguMatchPat=(name)=>{
    if(!name||name.trim().length<2)return null;
    const nl=name.toLowerCase().trim();
    const parts=nl.split(/\s+/).filter(p=>p.length>0);
    const guests=patienten.filter(p=>!p.mitarbeiter);
    // Exakter Volltreffer
    const exact=guests.find(p=>`${p.vorname||""} ${p.nachname||""}`.toLowerCase().trim()===nl);
    if(exact)return exact;
    // Alle Teile matchen irgendwo im Namen
    const allParts=guests.find(p=>{
      const full=`${p.vorname||""} ${p.nachname||""}`.toLowerCase();
      return parts.every(part=>full.includes(part));
    });
    if(allParts)return allParts;
    // Ein Teil mit >2 Zeichen matcht
    const partial=guests.filter(p=>{
      const full=`${p.vorname||""} ${p.nachname||""}`.toLowerCase();
      return parts.some(part=>part.length>2&&full.includes(part));
    });
    if(partial.length===1)return partial[0];
    // Vorname exakt
    if(parts[0]&&parts[0].length>2){
      const fnMatch=guests.filter(p=>(p.vorname||"").toLowerCase()===parts[0]);
      if(fnMatch.length===1)return fnMatch[0];
    }
    // Beginnt mit...
    if(parts[0]&&parts[0].length>2){
      const sw=guests.filter(p=>
        (p.vorname||"").toLowerCase().startsWith(parts[0])||
        (p.nachname||"").toLowerCase().startsWith(parts[0])
      );
      if(sw.length===1)return sw[0];
    }
    return null;
  };

  const pinguReset=()=>{
    setPinguName("");setPinguMatch(null);setPinguConfirmed(false);
    setPinguBsNotiz("");setPinguDone("");setPinguBsStep(false);
  };

  const pinguOnNameChange=(val)=>{
    setPinguName(val);setPinguConfirmed(false);setPinguDone("");
    setPinguBsStep(false);setPinguBsNotiz("");
    setPinguMatch(pinguMatchPat(val));
  };

  const pinguConfirm=()=>{if(pinguMatch)setPinguConfirmed(true);};

  const pinguAktPass=pinguMatch?paesse.find(pk=>pk.pat_id===pinguMatch.id&&!isPassAlt(pk)):null;
  const pinguHeLeft=pinguAktPass?(pinguAktPass.he_total||0)-(pinguAktPass.he_genutzt||0):0;
  const pinguBsLeft=pinguAktPass?(pinguAktPass.bs_total||0)-(pinguAktPass.bs_genutzt||0):0;

  const pinguHeAbziehen=async()=>{
    if(!pinguMatch||!pinguAktPass||pinguHeLeft===0)return;
    const ap=pinguAktPass;
    const prev={he_genutzt:ap.he_genutzt};
    const u={...ap,he_genutzt:ap.he_genutzt+1};
    const nl={id:genId(),pat_id:pinguMatch.id,pass_id:ap.id,typ:"HAUPTEINHEIT",quelle:"PINGU",datum:new Date().toISOString(),notiz:"Haupteinheit"};
    await supabase.from("paesse").update({he_genutzt:u.he_genutzt}).eq("id",ap.id);
    await supabase.from("log").insert(nl);
    setPaesse(p=>p.map(x=>x.id===ap.id?u:x));
    setLog(p=>[...p,nl]);
    setPinguDone(`Haupteinheit bei ${pinguMatch.vorname} abgezogen ✓`);
    setUndoAction({msg:`Haupteinheit −1 bei ${pinguMatch.vorname}`,undo:async()=>{
      await supabase.from("paesse").update(prev).eq("id",ap.id);
      await supabase.from("log").delete().eq("id",nl.id);
      setPaesse(p=>p.map(x=>x.id===ap.id?{...x,...prev}:x));
      setLog(p=>p.filter(l=>l.id!==nl.id));
    }});
    setTimeout(pinguReset,3000);
  };

  const pinguBsAbziehen=async()=>{
    if(!pinguMatch||!pinguAktPass||pinguBsLeft===0||!pinguBsNotiz.trim())return;
    const ap=pinguAktPass;
    const prev={bs_genutzt:ap.bs_genutzt};
    const u={...ap,bs_genutzt:ap.bs_genutzt+1};
    const nl={id:genId(),pat_id:pinguMatch.id,pass_id:ap.id,typ:"BS",quelle:"PINGU",datum:new Date().toISOString(),notiz:pinguBsNotiz.trim()};
    await supabase.from("paesse").update({bs_genutzt:u.bs_genutzt}).eq("id",ap.id);
    await supabase.from("log").insert(nl);
    setPaesse(p=>p.map(x=>x.id===ap.id?u:x));
    setLog(p=>[...p,nl]);
    setPinguDone(`Gruppenangebot bei ${pinguMatch.vorname} abgezogen ✓`);
    setUndoAction({msg:`Gruppenangebot −1 bei ${pinguMatch.vorname}`,undo:async()=>{
      await supabase.from("paesse").update(prev).eq("id",ap.id);
      await supabase.from("log").delete().eq("id",nl.id);
      setPaesse(p=>p.map(x=>x.id===ap.id?{...x,...prev}:x));
      setLog(p=>p.filter(l=>l.id!==nl.id));
    }});
    setTimeout(pinguReset,3000);
  };


// ============================================================
// ÄNDERUNG 2: Einfügen DIREKT NACH dieser Zeile:
//   {view==="liste"&&<>
// UND VOR:
//   <div style={{marginBottom:18}}><Heading style={{fontSize:28}}>Gästeliste Kaiserufer
// ============================================================

        {/* 🐧 Pingu Quick Action */}
        <Card style={{marginBottom:20,padding:"20px 24px",background:`linear-gradient(135deg,${T.bgPale},${T.cream})`,border:`1.5px solid ${T.gold}30`,overflow:"hidden"}}>
          <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
            <div style={{fontSize:40,lineHeight:1,flexShrink:0,marginTop:2}}>🐧</div>
            <div style={{flex:1,minWidth:0}}>
              {pinguDone?(
                <div className="fade-in" style={{padding:"8px 0",fontSize:16,fontWeight:700,color:T.green,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                  <span>{pinguDone}</span>
                  <button onClick={pinguReset} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",fontSize:13,color:T.textLight,textDecoration:"underline",fontFamily:"inherit"}}>Nochmal</button>
                </div>
              ):(
                <>
                  <div style={{fontFamily:"Georgia,serif",fontSize:16,fontWeight:600,color:T.oliveDark,marginBottom:12,lineHeight:1.5}}>
                    {!pinguConfirmed?"Wem darf ich eine Einheit abziehen?":`Was möchtest du bei ${pinguMatch?.vorname} abhaken?`}
                  </div>

                  {!pinguConfirmed?(
                    <div>
                      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:pinguMatch||pinguName.length>2?10:0}}>
                        <input value={pinguName} onChange={e=>pinguOnNameChange(e.target.value)}
                          placeholder="Name eingeben..." autoComplete="off"
                          onKeyDown={e=>{if(e.key==="Enter"&&pinguMatch)pinguConfirm();}}
                          style={{...inp,flex:1,background:T.white,border:`1.5px solid ${pinguMatch?T.green+"60":pinguName.length>2&&!pinguMatch?T.red+"30":T.cardBorder}`}}/>
                        {pinguMatch&&<Btn small gold onClick={pinguConfirm}>Bestätigen</Btn>}
                      </div>
                      {pinguMatch&&(
                        <div className="fade-in" style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:T.greenSoft,borderRadius:12,fontSize:14,flexWrap:"wrap"}}>
                          <span style={{color:T.green,fontWeight:700,fontSize:16}}>✓</span>
                          <span style={{fontWeight:600,color:T.text}}>{pinguMatch.vorname} {pinguMatch.nachname}</span>
                          {pinguAktPass?(
                            <span style={{color:T.textLight,fontSize:13}}>· {getPassLabel(pinguAktPass)} – {pinguHeLeft} HE · {pinguBsLeft} GA übrig</span>
                          ):(
                            <span style={{color:T.red,fontSize:13,fontWeight:600}}>· Kein aktiver Pass</span>
                          )}
                        </div>
                      )}
                      {pinguName.length>2&&!pinguMatch&&(
                        <div className="fade-in" style={{fontSize:13,color:T.red,padding:"6px 0"}}>Kein Kunde gefunden – versuch einen anderen Namen</div>
                      )}
                    </div>
                  ):(
                    <div>
                      {!pinguAktPass?(
                        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                          <div style={{fontSize:14,color:T.red,fontWeight:600}}>Kein aktiver Pass vorhanden</div>
                          <button onClick={pinguReset} style={{padding:"8px 16px",borderRadius:12,border:`1px solid ${T.cardBorder}`,background:"transparent",color:T.textLight,cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit"}}>← Zurück</button>
                        </div>
                      ):!pinguBsStep?(
                        <div className="fade-in" style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                          <button disabled={pinguHeLeft===0} onClick={pinguHeAbziehen} className="btn-a"
                            style={{flex:1,minWidth:140,padding:"14px 18px",borderRadius:16,border:"none",
                              background:pinguHeLeft===0?T.bgPale:T.olive,color:pinguHeLeft===0?T.textLight:"#fff",
                              cursor:pinguHeLeft===0?"not-allowed":"pointer",opacity:pinguHeLeft===0?0.4:1,
                              fontWeight:700,fontSize:14,lineHeight:1.5}}>
                            ✓ Haupteinheit −1<br/><span style={{fontSize:12,fontWeight:400,opacity:0.75}}>{pinguHeLeft} übrig</span>
                          </button>
                          <button disabled={pinguBsLeft===0} onClick={()=>setPinguBsStep(true)} className="btn-a"
                            style={{flex:1,minWidth:140,padding:"14px 18px",borderRadius:16,border:"none",
                              background:pinguBsLeft===0?T.bgPale:`linear-gradient(135deg,${T.gold},#9A8A6A)`,
                              color:pinguBsLeft===0?T.textLight:"#2A2A1A",
                              cursor:pinguBsLeft===0?"not-allowed":"pointer",opacity:pinguBsLeft===0?0.4:1,
                              fontWeight:700,fontSize:14,lineHeight:1.5}}>
                            ✓ Gruppenangebot −1<br/><span style={{fontSize:12,fontWeight:400,opacity:0.75}}>{pinguBsLeft} übrig</span>
                          </button>
                          <button onClick={pinguReset} style={{padding:"14px 12px",borderRadius:16,border:`1px solid ${T.cardBorder}`,background:"transparent",color:T.textLight,cursor:"pointer",fontSize:16,lineHeight:1}}>✕</button>
                        </div>
                      ):(
                        <div className="fade-in">
                          <div style={{fontSize:13,color:T.textLight,marginBottom:8}}>Welches Gruppenangebot war es?</div>
                          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                            <input value={pinguBsNotiz} onChange={e=>setPinguBsNotiz(e.target.value)}
                              placeholder="z.B. Yoga, Sound Bath..." autoFocus
                              onKeyDown={e=>e.key==="Enter"&&pinguBsNotiz.trim()&&pinguBsAbziehen()}
                              style={{...inp,flex:1,background:T.white,minWidth:160}}/>
                            <Btn small gold disabled={!pinguBsNotiz.trim()} onClick={pinguBsAbziehen}>Abhaken</Btn>
                            <button onClick={()=>{setPinguBsStep(false);setPinguBsNotiz("");}}
                              style={{padding:"8px 14px",borderRadius:12,border:`1px solid ${T.cardBorder}`,background:"transparent",color:T.textLight,cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>←</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </Card>
