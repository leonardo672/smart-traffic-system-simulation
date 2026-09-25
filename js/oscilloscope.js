(function(){
  "use strict";
  var tr=window.STS.tr;

  // chip jitter: real spec 50µs vs 5µs. Scale for visibility on a ~2Hz clock.
  var CHIP={NE555:{jit_us:50, jitAmp:0.10, color:"#7fb8ff"}, K561TL1:{jit_us:5, jitAmp:0.012, color:"#7fb8ff"}};
  var STATES=[ // key,dur,r,y,g
    {k:"RED",d:30,r:1,y:0,g:0},{k:"RY",d:2,r:1,y:1,g:0},{k:"GREEN",d:25,r:0,y:0,g:1},{k:"YEL",d:3,r:0,y:1,g:0}];
  var ST_LABEL={RED:["Красный","Red"],RY:["Кр+жёлт","R+Y"],GREEN:["Зелёный","Green"],YEL:["Жёлтый","Yellow"]};

  var S={running:true,chip:"K561TL1",tb:4,spd:3,t:0,clkPeriod:0.5};

  // phase at sim-time tau (seconds), cycle of STATES
  var CYCLE=STATES.reduce(function(a,s){return a+s.d;},0);
  function phaseAt(tau){var x=((tau%CYCLE)+CYCLE)%CYCLE;
    for(var i=0;i<STATES.length;i++){if(x<STATES[i].d)return STATES[i];x-=STATES[i].d;}return STATES[0];}
  // smooth pseudo-noise for jitter (deterministic in tau)
  function noise(tau){return Math.sin(tau*37.1)+Math.sin(tau*71.7)+Math.sin(tau*113.3);}
  function clkAt(tau){var amp=CHIP[S.chip].jitAmp;
    var ph=tau/S.clkPeriod + amp*noise(tau);
    return (Math.sin(ph*Math.PI*2)>=0)?1:0;}

  function setup(cv,hCss){var dpr=window.devicePixelRatio||1;var w=cv.clientWidth||820,h=hCss;
    cv.width=w*dpr;cv.height=h*dpr;var x=cv.getContext("2d");x.setTransform(dpr,0,0,dpr,0,0);return {x:x,w:w,h:h};}

  var scope=document.getElementById("scope"), eye=document.getElementById("eye");

  function drawScope(){
    var s=setup(scope,420),x=s.x,w=s.w,h=s.h;
    x.clearRect(0,0,w,h);
    // graticule
    x.strokeStyle="#10202a";x.lineWidth=1;
    for(var gx=0;gx<=10;gx++){var xx=w*gx/10;x.beginPath();x.moveTo(xx,0);x.lineTo(xx,h);x.stroke();}
    for(var gy=0;gy<=8;gy++){var yy=h*gy/8;x.beginPath();x.moveTo(0,yy);x.lineTo(w,yy);x.stroke();}
    // 4 lanes: R,Y,G,CLK
    var lanes=[
      {name:"R",col:"#ff4136",f:function(tau){return phaseAt(tau).r;}},
      {name:"Y",col:"#ffb300",f:function(tau){return phaseAt(tau).y;}},
      {name:"G",col:"#2ecc71",f:function(tau){return phaseAt(tau).g;}},
      {name:"CLK",col:CHIP[S.chip].color,f:clkAt}
    ];
    var laneH=h/4, amp=laneH*0.32, t0=S.t-S.tb, t1=S.t;
    var N=w; // one sample per pixel
    lanes.forEach(function(L,li){
      var midY=laneH*li+laneH/2;
      // baseline label
      x.fillStyle="#5f7585";x.font="11px ui-monospace,Consolas,monospace";x.textAlign="left";
      x.fillText(L.name,6,laneH*li+14);
      x.strokeStyle=L.col;x.lineWidth=1.8;x.beginPath();
      for(var i=0;i<=N;i++){
        var tau=t0+(t1-t0)*i/N;
        var v=L.f(tau);
        var px=i, py=midY - (v?amp:-amp);
        if(i===0)x.moveTo(px,py);else x.lineTo(px,py);
      }
      x.stroke();
      // lane separator
      x.strokeStyle="#1a2a34";x.lineWidth=1;x.beginPath();x.moveTo(0,laneH*(li+1));x.lineTo(w,laneH*(li+1));x.stroke();
    });
    // time axis labels
    x.fillStyle="#5f7585";x.textAlign="right";x.fillText(S.tb.toFixed(0)+" s →",w-6,h-6);
  }

  function drawEye(){
    var s=setup(eye,160),x=s.x,w=s.w,h=s.h;
    x.clearRect(0,0,w,h);
    x.strokeStyle="#10202a";for(var g=0;g<=4;g++){var xx=w*g/4;x.beginPath();x.moveTo(xx,0);x.lineTo(xx,h);x.stroke();}
    var amp=CHIP[S.chip].jitAmp, col=CHIP[S.chip].color;
    var midX=w/2, sweeps=40;
    x.lineWidth=1;
    for(var k=0;k<sweeps;k++){
      // each sweep: a rising edge with random offset ~ jitter
      var off=(Math.random()*2-1)*amp*w*0.9;
      x.strokeStyle=col; x.globalAlpha=0.25;
      x.beginPath();
      x.moveTo(0,h*0.78);
      x.lineTo(midX+off-4,h*0.78);
      x.lineTo(midX+off+4,h*0.22);
      x.lineTo(w,h*0.22);
      x.stroke();
    }
    x.globalAlpha=1;
    // jitter band markers
    x.strokeStyle="#ffd98a";x.setLineDash([4,4]);x.lineWidth=1;
    var bw=amp*w*0.9;
    x.beginPath();x.moveTo(midX-bw,0);x.lineTo(midX-bw,h);x.moveTo(midX+bw,0);x.lineTo(midX+bw,h);x.stroke();
    x.setLineDash([]);
    x.fillStyle="#ffd98a";x.font="11px ui-monospace,Consolas,monospace";x.textAlign="center";
    x.fillText("± "+CHIP[S.chip].jit_us+" µs",midX,14);
  }

  function updMeas(){
    document.getElementById("m-chip").textContent=(S.chip==="K561TL1"?"К561ТЛ1 (CMOS)":"NE555 (bipolar)");
    var f=1/S.clkPeriod;
    document.getElementById("m-freq").textContent=f.toFixed(2)+" Hz";
    document.getElementById("m-per").textContent=(S.clkPeriod*1000).toFixed(0)+" ms";
    document.getElementById("m-jit").innerHTML="± "+CHIP[S.chip].jit_us+" µs "+
      "<span style='color:"+(S.chip==="K561TL1"?"var(--ok)":"var(--amber)")+"'>("+(S.chip==="K561TL1"?tr("отлично","excellent"):tr("высокий","high"))+")</span>";
    document.getElementById("m-jit").className="v "+(S.chip==="K561TL1"?"good":"warn");
    var p=phaseAt(S.t);
    document.getElementById("m-phase").textContent=ST_LABEL[p.k][window.STS.lang==="ru"?0:1];
  }

  var last=performance.now();
  function frame(now){var dt=(now-last)/1000;last=now;
    if(S.running)S.t+=dt*S.spd;
    drawScope();updMeas();
    requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
  // eye redraws periodically (jitter animation)
  setInterval(drawEye,90);

  // controls
  document.getElementById("btnRun").onclick=function(){S.running=!S.running;
    this.innerHTML=S.running?tr("⏸ Пауза","⏸ Pause"):tr("▶ Пуск","▶ Run");};
  document.querySelectorAll("#chipSel button").forEach(function(b){b.onclick=function(){
    document.querySelectorAll("#chipSel button").forEach(function(x){x.classList.remove("sel");});
    this.classList.add("sel");S.chip=this.dataset.chip;drawEye();updMeas();};});
  document.getElementById("tb").onchange=function(){S.tb=+this.value;};
  document.getElementById("spd").onchange=function(){S.spd=+this.value;};
  window.addEventListener("sts:lang",function(){
    document.getElementById("btnRun").innerHTML=S.running?tr("⏸ Пауза","⏸ Pause"):tr("▶ Пуск","▶ Run");updMeas();});
  window.addEventListener("resize",function(){drawScope();drawEye();});

  drawEye();updMeas();
})();
