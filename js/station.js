(function(){
  "use strict";
  const $=id=>document.getElementById(id);

  const S={powered:false,mode:"manual",running:false,faulted:false,
    selected:"K561TL1",relay:"primary",idx:0,remaining:30,wdt:30,
    speed:5,simClock:0,cycles:0,failovers:0,motionCount:0,falseTriggers:0,motionPending:false,
    blinkAcc:0,blinkOn:true,windNoiseAcc:0,
    foByChip:{NE555:0,K561TL1:0},ftByChip:{NE555:0,K561TL1:0},
    env:{season:"summer",tod:"day",air:false,wind:1,precip:"none"}};

  const WDT_TIMEOUT=30,BACKUP="NE555";
  const tr=window.STS.tr;

  const CHIPS={
    NE555:{disp:"NE555",isup:"10 mA",acc:"50 µs",noise:["низкая","poor"],poor:true},
    K561TL1:{disp:"К561ТЛ1",isup:"0.4 µA",acc:"5 µs",noise:["отличная","excellent"],poor:false}};
  const STATES=[
    {key:"RED",label:["Красный","Red"],dur:30,red:true,amber:false,green:false,cls:"r"},
    {key:"RED_YELLOW",label:["Красный+жёлтый","Red+yellow"],dur:2,red:true,amber:true,green:false,cls:"a"},
    {key:"GREEN",label:["Зелёный","Green"],dur:25,red:false,amber:false,green:true,cls:"g"},
    {key:"YELLOW",label:["Жёлтый","Yellow"],dur:3,red:false,amber:true,green:false,cls:"a"}];
  const SEASON={summer:["Лето","Summer"],autumn:["Осень","Autumn"],winter:["Зима","Winter"],spring:["Весна","Spring"]};
  const TOD={morning:["Утро","Morning"],day:["День","Day"],evening:["Вечер","Evening"],night:["Ночь","Night"]};
  const PRECIP={none:["Нет","None"],rain:["Дождь","Rain"],snow:["Снег","Snow"],hail:["Град","Hail"]};
  const WIND=[["штиль","calm"],["слабый","light"],["умеренный","moderate"],["сильный","strong"],["очень сильный","very strong"],["шторм","storm"]];
  const L=(m,k)=>m[k][window.STS.lang==="ru"?0:1];
  const noiseName=c=>c.noise[window.STS.lang==="ru"?0:1];
  const stLabel=s=>s.label[window.STS.lang==="ru"?0:1];
  const windName=v=>WIND[v][window.STS.lang==="ru"?0:1];


  // ---- console ----
  const term=$("term");
  function fmtClock(t){const m=String(Math.floor(t/60)).padStart(2,"0");
    const s=String(Math.floor(t%60)).padStart(2,"0");return m+":"+s;}
  function log(tag,msg){const ln=document.createElement("div");ln.className="ln";
    ln.innerHTML='<span class="t-time">['+fmtClock(S.simClock)+'] </span><span class="t-'+tag+'">'+tag.padEnd(3)+' </span>'+msg;
    term.appendChild(ln);while(term.children.length>140)term.removeChild(term.firstChild);
    term.scrollTop=term.scrollHeight;}

  function activeChipKey(){return S.relay==="primary"?S.selected:BACKUP;}
  function effMode(){if(S.env.air)return"AIR";if(S.env.tod==="night")return"NIGHT";return"NORMAL";}

  // ---- FSM strip ----
  function buildFsm(){const f=$("fsm");f.innerHTML="";STATES.forEach((s,i)=>{const d=document.createElement("div");
    d.className="ph";d.dataset.i=i;
    d.innerHTML=(i?'<span class="arr">→</span>':'')+
      '<div class="nm"><span class="dot '+s.cls+'"></span>'+stLabel(s)+'</div><div class="du">'+s.dur+'s</div>';
    f.appendChild(d);});}

  // ---- dynamic button labels ----
  function updPower(){$("btnPower").textContent=S.powered?tr("Питание выкл","Power off"):tr("Питание вкл","Power on");}
  function updRun(){$("btnRun").textContent=S.running?tr("Пауза","Pause"):tr("Пуск","Run");}
  function updAir(){$("btnAir").textContent=S.env.air?tr("Отбой тревоги","Cancel alert"):tr("Активировать тревогу","Activate alert");}
  function updWindLab(){$("windLab").innerHTML='<span style="color:var(--ink)">'+windName(S.env.wind)+" ("+S.env.wind+")</span>";}
  function updModeHint(){$("modeHint").innerHTML=S.mode==="manual"
    ? tr("Ручной режим: жмите <b>Следующая фаза →</b>. Кормите <b>watchdog</b> (♥) до обнуления, иначе резерв NE555.",
         "Manual mode: click <b>Next phase →</b>. Feed the <b>watchdog</b> (♥) before it empties, or it fails over to NE555.")
    : tr("Авто режим: <b>Пуск</b> — контроллер крутит цикл сам. <b>Скорость</b> ускоряет время.",
         "Auto mode: press <b>Run</b> and the controller cycles by itself. <b>Speed</b> fast-forwards time.");}

  // ---- paint ----
  function setStatus(){const p=$("status");
    if(!S.powered){p.className="pill off";p.textContent=tr("ПИТАНИЕ ВЫКЛ","POWER OFF");return;}
    if(S.env.air){p.className="pill air";p.textContent=tr("🚨 ВОЗДУШНАЯ ОПАСНОСТЬ","🚨 AIR-RAID ALERT");return;}
    if(S.faulted){p.className="pill fail";p.textContent=tr("СБОЙ — НЕТ HEARTBEAT","FAULT — NO HEARTBEAT");return;}
    if(S.relay==="backup"){p.className="pill fail";p.textContent=tr("РЕЗЕРВ (NE555)","ON BACKUP (NE555)");return;}
    if(S.env.tod==="night"){p.className="pill pause";p.textContent=tr("НОЧЬ — МИГАЮЩИЙ ЖЁЛТЫЙ","NIGHT — FLASHING YELLOW");return;}
    if(S.mode==="auto"&&S.running){p.className="pill run";p.textContent=tr("АВТО · РАБОТА","AUTO · RUNNING");return;}
    p.className="pill pause";p.textContent=S.mode==="auto"?tr("АВТО · ПАУЗА","AUTO · PAUSED"):tr("РУЧНОЙ","MANUAL");}

  function setTrace(id,on){const el=$(id);if(el)el.classList.toggle("live",!!on);}
  function setLamps(r,a,g){const sh=S.powered;
    [["lampRed","sLampRed",r],["lampAmber","sLampAmber",a],["lampGreen","sLampGreen",g]].forEach(x=>{
      $(x[0]).classList.toggle("on",sh&&x[2]);$(x[1]).classList.toggle("on",sh&&x[2]);});
    setTrace("tr-red",sh&&r);setTrace("tr-amber",sh&&a);setTrace("tr-green",sh&&g);}
  function paintLamps(){if(!S.powered){setLamps(false,false,false);return;}
    const m=effMode();
    if(m==="AIR"){setLamps(S.blinkOn,false,false);return;}
    if(m==="NIGHT"){setLamps(false,S.blinkOn,false);return;}
    const st=STATES[S.idx];setLamps(st.red,st.amber,st.green);}
  function paintFsm(){const active=S.powered&&effMode()==="NORMAL";
    document.querySelectorAll(".ph").forEach(p=>p.classList.toggle("cur",active&&+p.dataset.i===S.idx));}

  function hlBox(id,on){const g=$(id);if(g){const r=g.querySelector("rect");if(r)r.classList.toggle("hl",!!on);}}
  function paintCircuit(){const live=S.powered;
    setTrace("rail-vcc",live);setTrace("tr-pir",live);setTrace("tr-common",live);
    $("dot-pwr").setAttribute("fill",live?"#37d67a":"#2a3640");
    const arm=$("relay-arm");arm.setAttribute("x2","498");arm.setAttribute("y2",S.relay==="primary"?"160":"200");
    setTrace("tr-ic1",live&&S.relay==="primary");setTrace("tr-ic2",live&&S.relay==="backup");
    const pb=$("ic-primary").querySelector(".chip-body"),bb=$("ic-backup").querySelector(".chip-body");
    pb.classList.toggle("active",live&&S.relay==="primary");pb.classList.toggle("dim",!live||S.relay==="backup");
    bb.classList.toggle("active",live&&S.relay==="backup");bb.classList.toggle("dim",!live||S.relay==="primary");
    const c=CHIPS[S.selected];$("ic1-name").textContent=c.disp;$("ic1-pkg").textContent=(S.selected==="K561TL1"?"DIP-14 · CMOS":"DIP-8 · bipolar");
    $("dot-wdt").setAttribute("fill",!live?"#2a3640":(S.faulted?"#ff5a5a":"#37d67a"));
    // schematic highlights
    hlBox("s-air",live&&S.env.air);hlBox("b-opto",live&&S.env.air);
    hlBox("s-wind",live&&S.env.wind>=3);
    hlBox("s-rain",live&&S.env.precip!=="none");}

  function paintWdt(){const frac=Math.max(0,Math.min(1,S.wdt/WDT_TIMEOUT)),bar=$("wdtBar");
    bar.style.width=(frac*100)+"%";
    bar.style.background=S.faulted?"var(--danger)":(frac<0.34?"var(--amber)":"var(--ok)");
    if(!S.powered){$("t-wdt").textContent="—";$("t-wdt").className="v";return;}
    $("t-wdt").textContent=S.faulted?tr("разряд — ","drain — ")+S.wdt.toFixed(1)+tr("s до резерва","s to backup"):(S.wdt.toFixed(1)+" / "+WDT_TIMEOUT+" s");
    $("t-wdt").className="v"+(S.faulted?" bad":(frac<0.34?" warn":" good"));}

  function paintTele(){const e=S.env;
    $("t-season").textContent=L(SEASON,e.season);$("t-tod").textContent=L(TOD,e.tod);
    $("t-precip").textContent=L(PRECIP,e.precip);$("t-wind").textContent=windName(e.wind)+" ("+e.wind+")";
    if(!S.powered){["t-eff","t-chip","t-isup","t-acc","t-noise","t-rem"].forEach(id=>{$(id).textContent="—";$(id).className="v";});return;}
    const m=effMode();
    $("t-eff").textContent=m==="AIR"?tr("ВОЗДУШНАЯ ОПАСНОСТЬ","AIR-RAID ALERT"):(m==="NIGHT"?tr("Ночной (мигающий жёлтый)","Night (flashing yellow)"):tr("Нормальный цикл","Normal cycle"));
    $("t-eff").className="v"+(m==="AIR"?" bad":(m==="NIGHT"?" warn":" good"));
    const c=CHIPS[activeChipKey()];
    $("t-chip").textContent=c.disp+(S.relay==="backup"?tr(" (резерв)"," (backup)"):"");
    $("t-chip").className="v"+(S.relay==="backup"?" bad":" good");
    $("t-isup").textContent=c.isup;$("t-acc").textContent=c.acc;$("t-noise").textContent=noiseName(c);
    $("t-noise").className="v"+(c.poor?" warn":" good");
    $("t-rem").textContent=(m!=="NORMAL")?"—":(S.mode==="manual"?tr("ручной","manual"):(S.faulted?tr("стоп","stop"):S.remaining.toFixed(1)+"s"));
    $("t-cyc").textContent=S.cycles;$("t-fo").textContent=S.failovers;
    $("t-mo").textContent=S.motionCount;$("t-ft").textContent=S.falseTriggers;
    $("c-ft-ne").textContent=S.ftByChip.NE555;$("c-ft-k").textContent=S.ftByChip.K561TL1;
    $("c-fo-ne").textContent=S.foByChip.NE555;$("c-fo-k").textContent=S.foByChip.K561TL1;}

  // ---- scene ----
  const SKY={morning:["#ffd9a0","#7ec5e8"],day:["#7ec5e8","#bfe6f5"],evening:["#ff9d6b","#5b3f7a"],night:["#0b1430","#1a2750"]};
  function paintScene(){const e=S.env,sky=SKY[e.tod];
    $("scene").style.background="linear-gradient("+sky[0]+","+sky[1]+")";
    const cel=$("celest");
    if(e.tod==="night"){cel.style.background="#dfe7f5";cel.style.boxShadow="0 0 26px 6px rgba(200,210,230,.5)";cel.style.top="20px";}
    else if(e.tod==="evening"){cel.style.background="#ff8a5a";cel.style.boxShadow="0 0 46px 12px rgba(255,138,90,.5)";cel.style.top="70px";}
    else{cel.style.background="#ffe08a";cel.style.boxShadow="0 0 46px 12px rgba(255,224,138,.55)";cel.style.top="24px";}
    $("ground").style.background=(e.season==="winter"||e.precip==="snow")?"#d7e2ec":
      (e.season==="autumn"?"#5a4326":(e.season==="spring"?"#3d6b2e":"#2c3b2a"));
    $("airBanner").classList.toggle("on",e.air);
    $("sceneTag").textContent=L(SEASON,e.season)+" · "+L(TOD,e.tod)+" · "+L(PRECIP,e.precip)+" · "+tr("ветер ","wind ")+windName(e.wind);}

  const cv=$("weather"),cx=cv.getContext("2d");let parts=[];
  function sizeCanvas(){cv.width=cv.clientWidth;cv.height=cv.clientHeight;}
  function buildParts(){const t=S.env.precip;parts=[];let n=t==="rain"?170:t==="snow"?120:t==="hail"?90:0;
    for(let i=0;i<n;i++)parts.push({x:Math.random()*cv.width,y:Math.random()*cv.height,
      r:t==="snow"?1.6+Math.random()*2:t==="hail"?2+Math.random()*1.5:1,
      v:t==="rain"?6+Math.random()*4:t==="snow"?1+Math.random()*1.2:t==="hail"?10+Math.random()*5:3,
      ph:Math.random()*6.28});}
  function drawWeather(){cx.clearRect(0,0,cv.width,cv.height);const t=S.env.precip;if(t==="none"||!S.powered)return;
    const wind=S.env.wind;
    for(const p of parts){
      if(t==="rain"){cx.strokeStyle="rgba(170,200,255,.55)";cx.lineWidth=1.2;cx.beginPath();
        cx.moveTo(p.x,p.y);cx.lineTo(p.x+wind*1.6,p.y+10);cx.stroke();p.y+=p.v;p.x+=wind*0.8;}
      else if(t==="snow"){cx.fillStyle="rgba(255,255,255,.85)";cx.beginPath();
        cx.arc(p.x+Math.sin(p.ph)*4,p.y,p.r,0,6.28);cx.fill();p.y+=p.v;p.x+=wind*0.5;p.ph+=0.03;}
      else{cx.fillStyle="rgba(220,228,240,.9)";cx.beginPath();cx.arc(p.x,p.y,p.r,0,6.28);cx.fill();p.y+=p.v;p.x+=wind*0.6;}
      if(p.y>cv.height){p.y=-4;p.x=Math.random()*cv.width;}if(p.x>cv.width)p.x=0;if(p.x<0)p.x=cv.width;}}

  function paintAll(){paintLamps();paintFsm();paintCircuit();paintWdt();paintTele();paintScene();setStatus();}

  // ---- FSM logic ----
  function durFor(idx){let d=STATES[idx].dur,k=STATES[idx].key,e=S.env;
    const rush=(e.tod==="morning"||e.tod==="evening");
    if(k==="GREEN"&&rush)d+=10;
    if(e.precip==="rain"&&k==="GREEN")d+=5;
    if(e.precip==="snow"){if(k==="GREEN")d+=8;if(k==="YELLOW")d+=2;if(k==="RED_YELLOW")d+=1;}
    if(e.precip==="hail"&&k==="YELLOW")d+=2;
    if(e.season==="winter"){if(k==="YELLOW")d+=1;if(k==="RED_YELLOW")d+=1;}
    return d;}
  function enter(idx){S.idx=idx;let d=durFor(idx);
    if(STATES[idx].key==="GREEN"&&S.motionPending){const ext=5+Math.round(Math.random()*10);
      d+=ext;S.motionPending=false;log("FSM",tr("зелёный продлён +","green extended +")+ext+"s (PIR)");}
    S.remaining=d;petWatchdog(true);log("FSM","→ "+stLabel(STATES[idx])+" ("+d+"s)");}
  function advance(){let n=(S.idx+1)%STATES.length;if(n===0){S.cycles++;log("FSM",tr("цикл ","cycle ")+S.cycles+tr(" завершён"," complete"));}enter(n);}
  function petWatchdog(silent){if(S.faulted){S.faulted=false;log("OK",tr("heartbeat восстановлен — сбой снят","heartbeat restored — fault cleared"));}
    S.wdt=WDT_TIMEOUT;if(!silent)log("WDT",tr("сброшен, таймер ","reset, timer ")+WDT_TIMEOUT+"s");paintAll();}
  function doFailover(){S.failovers++;S.foByChip[activeChipKey()]++;S.faulted=false;S.relay="backup";S.wdt=WDT_TIMEOUT;
    log("WDT",tr("нет heartbeat ","no heartbeat ")+WDT_TIMEOUT+tr("s → ПЕРЕКЛЮЧЕНИЕ","s → FAILOVER"));
    log("WDT",tr("реле → резерв NE555","relay → backup NE555"));
    log("OK",tr("резервное ядро в работе","backup core online"));enter(S.idx);}
  function triggerFalse(k){S.falseTriggers++;S.ftByChip[k]++;log("PIR",tr("⚠ ложное срабат. (помеха/ветер) на ","⚠ false trigger (noise/wind) on ")+CHIPS[k].disp);}

  // ---- tick ----
  let last=performance.now();
  function tick(now){const real=(now-last)/1000;last=now;
    S.blinkAcc+=real;if(S.blinkAcc>0.5){S.blinkAcc=0;S.blinkOn=!S.blinkOn;if(S.powered&&effMode()!=="NORMAL")paintLamps();}
    drawWeather();
    if(S.powered){const m=effMode();const dt=real*(S.mode==="auto"?S.speed:1);
      if(m==="NORMAL"&&S.env.wind>=3){S.windNoiseAcc+=real;
        const per=CHIPS[activeChipKey()].poor?3:8;
        if(S.windNoiseAcc>per){S.windNoiseAcc=0;
          const prob=(S.env.wind-2)*0.12*(CHIPS[activeChipKey()].poor?2:0.5);
          if(Math.random()<prob){triggerFalse(activeChipKey());paintTele();}}}
      const ticking=S.faulted||(m==="NORMAL"&&S.mode==="auto"&&S.running);
      if(ticking){S.simClock+=dt;
        if(S.faulted){S.wdt-=dt;if(S.wdt<=0)doFailover();}
        else{S.remaining-=dt;if(S.remaining<=0)advance();}
        paintWdt();paintLamps();paintTele();}}
    requestAnimationFrame(tick);}
  requestAnimationFrame(tick);

  // ---- UI wiring ----
  function enableControls(on){["btnReset","btnHeart","btnMotion","btnFault"].forEach(id=>$(id).disabled=!on);
    document.querySelectorAll("#modeSel button,#chipSel button").forEach(b=>b.disabled=!on);syncMode();}
  function syncMode(){const on=S.powered,normal=effMode()==="NORMAL";
    if(S.mode==="manual"){$("btnStep").style.display="";$("btnStep").disabled=!on||S.faulted||!normal;
      $("btnRun").style.display="none";$("speedWrap").style.display="none";}
    else{$("btnStep").style.display="none";$("btnRun").style.display="";$("btnRun").disabled=!on;$("speedWrap").style.display="";}
    updModeHint();}

  $("btnPower").onclick=function(){S.powered=!S.powered;updPower();
    if(S.powered){log("PWR",tr("шина 5V поднята · инициализация","5V rail up · init"));
      log("SYS",tr("ядро ","core ")+CHIPS[S.selected].disp+tr(" · резерв NE555 · WDT 30s"," · backup NE555 · WDT 30s"));
      log("ENV",tr("среда: ","env: ")+L(SEASON,S.env.season)+", "+L(TOD,S.env.tod)+", "+L(PRECIP,S.env.precip)+", "+windName(S.env.wind));
      S.wdt=WDT_TIMEOUT;enableControls(true);}
    else{S.running=false;S.faulted=false;S.relay="primary";S.idx=0;S.remaining=STATES[0].dur;S.wdt=WDT_TIMEOUT;
      updRun();log("PWR",tr("шина обесточена · выходы off","rail down · outputs off"));enableControls(false);}
    paintAll();};

  document.querySelectorAll("#modeSel button").forEach(b=>b.onclick=function(){if(!S.powered)return;
    document.querySelectorAll("#modeSel button").forEach(x=>x.classList.remove("sel"));this.classList.add("sel");
    S.mode=this.dataset.mode;S.running=false;updRun();
    log("SYS",tr("режим → ","mode → ")+(S.mode==="auto"?tr("авто","auto"):tr("ручной","manual")));syncMode();paintAll();});

  $("btnStep").onclick=function(){if(!S.powered||S.faulted||effMode()!=="NORMAL")return;advance();paintAll();};
  $("btnRun").onclick=function(){if(!S.powered)return;S.running=!S.running;updRun();
    log("SYS",tr("секвенсор ","sequencer ")+(S.running?tr("работа","running"):tr("пауза","paused")));setStatus();};
  $("btnReset").onclick=function(){S.running=false;S.faulted=false;S.relay="primary";S.idx=0;S.remaining=STATES[0].dur;
    S.wdt=WDT_TIMEOUT;S.cycles=0;S.failovers=0;S.motionCount=0;S.falseTriggers=0;S.motionPending=false;
    S.foByChip={NE555:0,K561TL1:0};S.ftByChip={NE555:0,K561TL1:0};updRun();
    log("SYS",tr("сброс · реле → основное ","reset · relay → primary ")+CHIPS[S.selected].disp);paintAll();};
  $("btnHeart").onclick=function(){if(!S.powered)return;petWatchdog(false);};
  $("btnMotion").onclick=function(){if(!S.powered)return;const k=activeChipKey(),c=CHIPS[k];
    let prob=(c.poor?0.25:0.05)+S.env.wind*0.04;
    if(c.poor&&Math.random()<prob){triggerFalse(k);}
    else{S.motionCount++;S.motionPending=true;log("PIR",tr("движение (#","motion (#")+S.motionCount+tr(") → запрос зелёного",") → green request"));}
    paintTele();};
  $("btnFault").onclick=function(){if(!S.powered||S.faulted||S.relay==="backup")return;
    if(S.env.air){log("SYS",tr("снимите воздушную опасность","cancel air-raid first"));return;}
    if(S.mode==="auto"&&!S.running){log("SYS",tr("сначала запустите секвенсор","start the sequencer first"));return;}
    S.faulted=true;S.wdt=WDT_TIMEOUT;log("WDT",tr("ядро зависло — heartbeat потерян","core hung — heartbeat lost"));paintAll();};

  document.querySelectorAll("#chipSel button").forEach(b=>b.onclick=function(){if(!S.powered)return;
    document.querySelectorAll("#chipSel button").forEach(x=>x.classList.remove("sel"));this.classList.add("sel");
    S.selected=this.dataset.chip;S.relay="primary";S.faulted=false;S.wdt=WDT_TIMEOUT;
    log("SYS",tr("основное ядро → ","primary core → ")+CHIPS[S.selected].disp);paintAll();});

  $("speed").oninput=function(){S.speed=+this.value;$("speedV").textContent=this.value+"×";};

  document.querySelectorAll(".seg.env").forEach(seg=>{const key=seg.dataset.key;
    seg.querySelectorAll("button").forEach(b=>b.onclick=function(){
      seg.querySelectorAll("button").forEach(x=>x.classList.remove("sel"));this.classList.add("sel");
      S.env[key]=this.dataset.val;if(key==="precip")buildParts();
      const lbl={season:tr("сезон","season"),tod:tr("время суток","time of day"),precip:tr("осадки","precip")}[key];
      log("ENV",lbl+" → "+this.textContent);paintAll();});});

  $("wind").oninput=function(){S.env.wind=+this.value;updWindLab();paintScene();paintTele();paintCircuit();};
  $("wind").onchange=function(){log("ENV",tr("сила ветра → ","wind force → ")+windName(S.env.wind)+" ("+S.env.wind+")");};

  $("btnAir").onclick=function(){S.env.air=!S.env.air;this.classList.toggle("on",S.env.air);updAir();
    if(S.env.air)log("AIR",tr("🚨 ВОЗДУШНАЯ ОПАСНОСТЬ — мигающий красный","🚨 AIR-RAID — flashing red, halt"));
    else{log("AIR",tr("отбой — возврат к штатному режиму","all clear — back to normal"));if(S.powered)enter(0);}
    paintAll();};

  window.addEventListener("sts:lang",function(){buildFsm();updPower();updRun();updAir();updWindLab();syncMode();paintAll();});

  // ---- init ----
  buildFsm();updPower();updRun();updAir();updWindLab();syncMode();
  sizeCanvas();buildParts();window.addEventListener("resize",()=>{sizeCanvas();buildParts();});
  paintAll();log("SYS",tr("станция в ожидании — нажмите «Питание вкл»","station idle — press “Power on”"));
})();
