(function(){
  "use strict";
  var tr=window.STS.tr;

  // chip parameters (from config.yaml)
  var CHIP={
    NE555:{cur_uA:10000, acc_us:50, ftRate:0.02, wdFp:0.05, color:"#e0a23a"},
    K561TL1:{cur_uA:0.4, acc_us:5, ftRate:0.0, wdFp:0.0, color:"#36d3b0"}
  };
  var COND={mild:{m:0.5,events:24},harsh:{m:1,events:60},extreme:{m:2.2,events:120}};
  var R=null; // last results

  function rnd(){return Math.random();}
  function simulate(hours,cond){
    var c=COND[cond], steps=Math.min(120,Math.max(24,Math.round(hours/ (hours>1000?80:hours>400?8:hours>100?2:0.4))));
    var out={hours:hours,steps:steps,t:[],ft:{NE555:[],K561TL1:[]},chips:{}};
    // motion/noise events per hour scaled by condition
    var evPerH=c.events/24;
    ["NE555","K561TL1"].forEach(function(name){
      var p=CHIP[name];
      var ftCum=0, failures=0, falsePos=0;
      var ftSeries=[];
      for(var i=0;i<steps;i++){
        var hStart=i/steps*hours, hEnd=(i+1)/steps*hours, dh=hEnd-hStart;
        var events=evPerH*dh;
        // false triggers from noise, amplified by harshness for poor-immunity chip
        var ftHere=events*p.ftRate*c.m;
        // add randomness
        ftHere=ftHere*(0.7+0.6*rnd());
        ftCum+=ftHere;
        ftSeries.push(ftCum);
        // watchdog false-positive failures over interval
        var checks=dh*3600/0.5;
        var fp=checks*(p.wdFp/100)*c.m*0.02;
        if(rnd()<fp) falsePos+=Math.max(1,Math.round(fp));
        out.t.push(hEnd);
      }
      // genuine hangs ~ small constant, same for both; failovers = hangs + falsePos
      var hangs=Math.max(0,Math.round(hours/2000 + rnd()*1.5));
      failures=hangs;
      var failovers=hangs+falsePos;
      var mtbf = failovers>0 ? hours/failovers : hours; // h
      var energyWh = p.cur_uA*1e-6 * 5.0 * hours; // I(A)*V*h
      out.chips[name]={ft:Math.round(ftCum),failures:failures,falsePos:falsePos,failovers:failovers,
        mtbf:mtbf,energyWh:energyWh,acc:p.acc_us,cur:p.cur_uA};
      out.ft[name]=ftSeries;
    });
    // de-dup time axis (we pushed twice); rebuild
    out.t=[];for(var j=0;j<steps;j++)out.t.push((j+1)/steps*hours);
    return out;
  }

  // ---- canvas helpers ----
  function setup(cv){var dpr=window.devicePixelRatio||1;var w=cv.clientWidth||520,h=220;
    cv.width=w*dpr;cv.height=h*dpr;var x=cv.getContext("2d");x.setTransform(dpr,0,0,dpr,0,0);
    return {x:x,w:w,h:h};}
  function clearC(x,w,h){x.clearRect(0,0,w,h);}
  function fmt(n){if(n>=1e6)return (n/1e6).toFixed(1)+"M";if(n>=1e3)return (n/1e3).toFixed(1)+"k";
    if(n>=10)return Math.round(n);if(n>=1)return n.toFixed(1);if(n>0)return n.toFixed(2);return "0";}

  function barLog(cv,vals){ // vals:[{label,val,color}]
    var s=setup(cv),x=s.x,w=s.w,h=s.h,pad=36,bw=70,gap=80;
    clearC(x,w,h);
    var max=Math.max.apply(null,vals.map(function(v){return v.val;})),min=Math.min.apply(null,vals.map(function(v){return v.val;}));
    var lmax=Math.log10(Math.max(max,1)), lmin=Math.log10(Math.max(min,0.1))-0.3;
    x.strokeStyle="#243140";x.lineWidth=1;
    for(var g=0;g<=4;g++){var yy=20+(h-50)*g/4;x.beginPath();x.moveTo(40,yy);x.lineTo(w-12,yy);x.stroke();}
    var bx=70;
    vals.forEach(function(v){
      var lv=Math.log10(Math.max(v.val,0.1));
      var frac=(lv-lmin)/(lmax-lmin); if(frac<0.02)frac=0.02; if(frac>1)frac=1;
      var bh=(h-50)*frac, by=20+(h-50)-bh;
      x.fillStyle=v.color;x.fillRect(bx,by,bw,bh);
      x.fillStyle="#e7eef6";x.font="600 13px ui-monospace,Consolas,monospace";x.textAlign="center";
      x.fillText(fmt(v.val),bx+bw/2,by-7);
      x.fillStyle="#9fb4c6";x.font="12px 'Segoe UI',system-ui,Arial,sans-serif";
      x.fillText(v.label,bx+bw/2,h-14);
      bx+=bw+gap;
    });
  }
  function barLin(cv,vals){
    var s=setup(cv),x=s.x,w=s.w,h=s.h,bw=70,gap=80;
    clearC(x,w,h);
    var max=Math.max.apply(null,vals.map(function(v){return v.val;}))||1;max*=1.2;
    x.strokeStyle="#243140";x.lineWidth=1;
    for(var g=0;g<=4;g++){var yy=20+(h-50)*g/4;x.beginPath();x.moveTo(40,yy);x.lineTo(w-12,yy);x.stroke();}
    var bx=70;
    vals.forEach(function(v){
      var bh=(h-50)*(v.val/max), by=20+(h-50)-bh;
      x.fillStyle=v.color;x.fillRect(bx,by,bw,bh);
      x.fillStyle="#e7eef6";x.font="600 13px ui-monospace,Consolas,monospace";x.textAlign="center";
      x.fillText(fmt(v.val),bx+bw/2,by-7);
      x.fillStyle="#9fb4c6";x.font="12px 'Segoe UI',system-ui,Arial,sans-serif";
      x.fillText(v.label,bx+bw/2,h-14);
      bx+=bw+gap;
    });
  }
  function lines(cv,t,series){ // series:[{data,color}]
    var s=setup(cv),x=s.x,w=s.w,h=s.h,padL=44,padB=28,padT=14,padR=12;
    clearC(x,w,h);
    var max=0;series.forEach(function(se){se.data.forEach(function(v){if(v>max)max=v;});});max=Math.max(max,1)*1.1;
    var tmax=t[t.length-1]||1;
    x.strokeStyle="#243140";x.lineWidth=1;
    for(var g=0;g<=4;g++){var yy=padT+(h-padT-padB)*g/4;x.beginPath();x.moveTo(padL,yy);x.lineTo(w-padR,yy);x.stroke();
      x.fillStyle="#6b7d8c";x.font="10px ui-monospace,Consolas,monospace";x.textAlign="right";
      x.fillText(fmt(max*(1-g/4)),padL-6,yy+3);}
    x.fillStyle="#6b7d8c";x.textAlign="center";
    x.fillText("0 h",padL,h-8);x.fillText(fmt(tmax)+" h",w-padR-10,h-8);
    series.forEach(function(se){
      x.strokeStyle=se.color;x.lineWidth=2;x.beginPath();
      se.data.forEach(function(v,i){
        var xx=padL+(w-padL-padR)*(t[i]/tmax), yy=padT+(h-padT-padB)*(1-v/max);
        if(i===0)x.moveTo(xx,yy);else x.lineTo(xx,yy);});
      x.stroke();
    });
  }

  function render(){
    if(!R)return;
    var ne=R.chips.NE555,k=R.chips.K561TL1;
    document.getElementById("k-mtbf-ne").textContent=fmt(ne.mtbf)+" h";
    document.getElementById("k-mtbf-k").textContent=fmt(k.mtbf)+" h";
    document.getElementById("k-pow-ne").textContent=fmt(ne.energyWh)+" Wh";
    document.getElementById("k-pow-k").textContent=(k.energyWh<1?(k.energyWh*1000).toFixed(2)+" mWh":fmt(k.energyWh)+" Wh");
    barLog(document.getElementById("c-cur"),[{label:"NE555",val:ne.cur,color:CHIP.NE555.color},{label:"К561ТЛ1",val:k.cur,color:CHIP.K561TL1.color}]);
    barLin(document.getElementById("c-acc"),[{label:"NE555",val:ne.acc,color:CHIP.NE555.color},{label:"К561ТЛ1",val:k.acc,color:CHIP.K561TL1.color}]);
    lines(document.getElementById("c-ft"),R.t,[{data:R.ft.NE555,color:CHIP.NE555.color},{data:R.ft.K561TL1,color:CHIP.K561TL1.color}]);
    barLin(document.getElementById("c-fail"),[
      {label:"NE555",val:ne.failovers,color:CHIP.NE555.color},
      {label:"К561ТЛ1",val:k.failovers,color:CHIP.K561TL1.color}]);
    // summary table
    var rows=[
      [tr("Ток потребления","Supply current"),fmt(ne.cur)+" µA",fmt(k.cur)+" µA","K561TL1"],
      [tr("Точность переключ.","Switching accuracy"),ne.acc+" µs",k.acc+" µs","K561TL1"],
      [tr("Ложные срабат.","False triggers"),ne.ft,k.ft,"K561TL1"],
      [tr("Ложные тревоги WDT","WDT false positives"),ne.falsePos,k.falsePos,"K561TL1"],
      [tr("Переключений на резерв","Failovers"),ne.failovers,k.failovers, ne.failovers<=k.failovers?"NE555":"K561TL1"],
      [tr("MTBF","MTBF"),fmt(ne.mtbf)+" h",fmt(k.mtbf)+" h", k.mtbf>=ne.mtbf?"K561TL1":"NE555"],
      [tr("Энергия","Energy"),fmt(ne.energyWh)+" Wh",(k.energyWh<1?(k.energyWh*1000).toFixed(2)+" mWh":fmt(k.energyWh)+" Wh"),"K561TL1"]
    ];
    var tb=document.getElementById("sumBody");tb.innerHTML="";
    rows.forEach(function(r){var tr_=document.createElement("tr");
      tr_.innerHTML="<td>"+r[0]+"</td><td class='mono'>"+r[1]+"</td><td class='mono'>"+r[2]+"</td><td class='mono win'>"+(r[3]==="K561TL1"?"К561ТЛ1":"NE555")+"</td>";
      tb.appendChild(tr_);});
    var kWins=rows.filter(function(r){return r[3]==="K561TL1";}).length;
    document.getElementById("rec").innerHTML="<b>К561ТЛ1 (CMOS)</b> "+
      tr("выигрывает по "+kWins+" из "+rows.length+" метрик — рекомендован как основное ядро. NE555 остаётся резервом (высокий выходной ток).",
         "wins "+kWins+" of "+rows.length+" metrics — recommended as the primary core. NE555 remains the backup (high output drive).");
    var d=document.getElementById("dur"), c=document.getElementById("cond");
    document.getElementById("runInfo").textContent=tr("период ","period ")+R.hours+" h · "+R.steps+tr(" точек"," points");
  }

  function run(){var hours=+document.getElementById("dur").value, cond=document.getElementById("cond").value;
    R=simulate(hours,cond);render();}

  document.getElementById("btnRun").onclick=run;
  window.addEventListener("sts:lang",function(){if(R)render();});
  window.addEventListener("resize",function(){if(R)render();});
  run();
})();
