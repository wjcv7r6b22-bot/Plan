const cycle=["F","S","S","N","N","-","-","X","F","F","S","S","N","N","-","-","X","F","F","S","S","S","-","-","X","X","F","F","N","N","N","-","-","FB","FB"];
const offsets={B:0,C:7,D:14,E:21,A:28};
const groups=["A","B","C","D","E"];
const epoch=new Date(2027,0,1,12);
const monthNames=["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const weekdays=["Mo","Di","Mi","Do","Fr","Sa","So"];
const shiftNames={F:"Frühdienst",S:"Spätdienst",N:"Nachtdienst","-":"Strichfrei – Einspringen möglich",X:"X-Frei – definitiv frei",FB:"Fortbildung"};
const shiftShort={F:"F",S:"S",N:"N","-":"-",X:"X",FB:"FB"};
const shiftTimes={F:"06:00–14:00",S:"14:00–22:00",N:"22:00–06:00","-":"","X":"","FB":""};

let currentYear=new Date().getFullYear();
let currentMonth=new Date().getMonth();
let selectedGroup=localStorage.getItem("dienstplan.group")||"ALL";

const $=id=>document.getElementById(id);

function dayDiff(a,b){
  const ua=Date.UTC(a.getFullYear(),a.getMonth(),a.getDate());
  const ub=Date.UTC(b.getFullYear(),b.getMonth(),b.getDate());
  return Math.floor((ua-ub)/86400000);
}
function duty(g,d){
  let i=(dayDiff(d,epoch)+offsets[g])%35;
  if(i<0)i+=35;
  return cycle[i];
}
function duties(d){return Object.fromEntries(groups.map(g=>[g,duty(g,d)]));}
function dayParts(d){
  const ds=duties(d),work=[];
  ["F","S","N"].forEach(s=>groups.forEach(g=>{if(ds[g]===s)work.push(g)}));
  return {
    ds,work,
    dash:groups.filter(g=>ds[g]==="-"),
    x:groups.filter(g=>ds[g]==="X"),
    fb:groups.filter(g=>ds[g]==="FB")
  };
}
function iso(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function sameDay(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}
function mondayIndex(jsDay){return (jsDay+6)%7;}

function allStatusHtml(p){
  return `${p.dash.length?`<div class="status dash">${p.dash.map(g=>`${g}: -`).join("   ")}</div>`:""}${p.x.length?`<div class="status x">${p.x.map(g=>`${g}: X`).join("   ")}</div>`:""}${p.fb.length?`<div class="status fb">${p.fb.map(g=>`${g}: FB`).join("   ")}</div>`:""}`;
}

function singleGroupHtml(g,d){
  const s=duty(g,d);
  if(s==="F"||s==="S"||s==="N"){
    return `<div class="single-shift shift-${s}">${shiftShort[s]}</div>`;
  }
  if(s==="-") return `<div class="status dash single-status">-</div>`;
  if(s==="X") return `<div class="status x single-status">X</div>`;
  if(s==="FB") return `<div class="status fb single-status">FB</div>`;
  return "";
}

function dayCell(d){
  const p=dayParts(d),today=new Date(),w=mondayIndex(d.getDay());
  const isSpecific=selectedGroup!=="ALL";
  const myDuty=isSpecific?duty(selectedGroup,d):null;
  const workingSelected=isSpecific&&["F","S","N"].includes(myDuty);
  let body=isSpecific
    ? singleGroupHtml(selectedGroup,d)
    : `<div class="work">${p.work.join(" ")}</div>${allStatusHtml(p)}`;

  return `<div class="day ${w>4?"weekend":""} ${sameDay(d,today)?"today":""} ${workingSelected?"mine-day":""} ${isSpecific?"single-group-day":""}" data-date="${iso(d)}">
    <div class="num">${d.getDate()}</div>${body}
  </div>`;
}

function monthHtml(year,month,large=false){
  const first=new Date(year,month,1,12);
  const count=new Date(year,month+1,0,12).getDate();
  const start=mondayIndex(first.getDay());
  let cells="";
  for(let i=0;i<start;i++)cells+='<div class="day empty"></div>';
  for(let n=1;n<=count;n++)cells+=dayCell(new Date(year,month,n,12));
  const used=start+count, remainder=used%7;
  if(remainder) for(let i=remainder;i<7;i++) cells+='<div class="day empty"></div>';
  return `${large?"":`<h3>${monthNames[month]} ${year}</h3>`}<div class="weekdays">${weekdays.map(w=>`<div>${w}</div>`).join("")}</div><div class="days">${cells}</div>`;
}

function renderYear(){
  const cal=$("calendar");cal.innerHTML="";
  for(let m=0;m<12;m++){
    const el=document.createElement("section");
    el.className="month";
    el.innerHTML=monthHtml(currentYear,m);
    cal.appendChild(el);
  }
  bindDays();
}
function renderMonth(){
  currentMonth=Math.max(0,Math.min(11,currentMonth));
  $("monthTitle").textContent=`${monthNames[currentMonth]} ${currentYear}`;
  $("monthCalendar").innerHTML=monthHtml(currentYear,currentMonth,true);
  bindDays();
}
function renderMine(){
  let html="";
  if(selectedGroup==="ALL"){
    $("mineTitle").textContent="Alle Dienstgruppen";
    $("mineSubtitle").textContent="Tagesübersicht aller Dienstgruppen im gewählten Jahr.";
    for(let m=0;m<12;m++){
      const max=new Date(currentYear,m+1,0).getDate();
      for(let n=1;n<=max;n++){
        const d=new Date(currentYear,m,n,12),p=dayParts(d);
        html+=`<div class="mine-item" data-date="${iso(d)}">
          <div class="date">${d.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"})}</div>
          <div class="desc">Dienst: ${p.work.join(" ")||"–"}</div>
          <span class="badge all-badge">ALLE</span>
        </div>`;
      }
    }
  } else {
    $("mineTitle").textContent=`Dienstgruppe ${selectedGroup}`;
    $("mineSubtitle").textContent="Nur die Dienste und freien Tage der gewählten Dienstgruppe.";
    for(let m=0;m<12;m++){
      const max=new Date(currentYear,m+1,0).getDate();
      for(let n=1;n<=max;n++){
        const d=new Date(currentYear,m,n,12),s=duty(selectedGroup,d);
        const badge=s==="-"?"dash":s;
        html+=`<div class="mine-item" data-date="${iso(d)}">
          <div class="date">${d.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"})}</div>
          <div class="desc">${shiftNames[s]}</div>
          <span class="badge ${badge}">${shiftShort[s]}</span>
        </div>`;
      }
    }
  }
  $("mineList").innerHTML=html;
  document.querySelectorAll(".mine-item").forEach(x=>x.onclick=()=>openDay(new Date(x.dataset.date+"T12:00:00")));
}
function renderSummary(d=new Date()){
  const p=dayParts(d);
  if(selectedGroup==="ALL"){
    $("summary").innerHTML=`<strong>${d.toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"})}</strong>
      <span>Ansicht: <b>Alle Dienstgruppen</b></span>
      <span>Dienst Früh → Spät → Nacht: <b>${p.work.join(" ")||"–"}</b></span>`;
  }else{
    const s=duty(selectedGroup,d);
    $("summary").innerHTML=`<strong>${d.toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"})}</strong>\n      <span><b>${shiftNames[s]}</b></span>`;
  }
}
function bindDays(){
  document.querySelectorAll(".day[data-date]").forEach(x=>x.onclick=()=>openDay(new Date(x.dataset.date+"T12:00:00")));
}
function openDay(d){
  const ds=duties(d);
  let rows;
  if(selectedGroup==="ALL"){
    rows=groups.map(g=>`<div class="detail-row"><div class="detail-group">${g}</div><div class="detail-shift">${shiftNames[ds[g]]}${shiftTimes[ds[g]]?` · ${shiftTimes[ds[g]]} Uhr`:""}</div></div>`).join("");
  }else{
    const s=ds[selectedGroup];
    rows=`<div class="detail-row"><div class="detail-shift">${shiftNames[s]}</div></div>`;
  }
  $("modalContent").innerHTML=`<h2>${d.toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}</h2>${rows}`;
  $("dayModal").hidden=false;
  renderSummary(d);
}
function renderAll(){
  $("yearSelect").value=currentYear;
  $("groupSelect").value=selectedGroup;
  renderYear();
  renderMonth();
  renderMine();
  renderSummary();
}
function showView(name){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.view===name));
  $(`${name}View`).classList.add("active");
}

for(let y=2020;y<=2055;y++){
  const o=document.createElement("option");
  o.value=y;o.textContent=y;
  $("yearSelect").appendChild(o);
}
$("yearSelect").value=currentYear;
$("groupSelect").value=selectedGroup;

$("yearSelect").onchange=e=>{currentYear=+e.target.value;renderAll();};
$("prevYear").onclick=()=>{currentYear--;renderAll();};
$("nextYear").onclick=()=>{currentYear++;renderAll();};
$("groupSelect").onchange=e=>{
  selectedGroup=e.target.value;
  localStorage.setItem("dienstplan.group",selectedGroup);
  renderAll();
};
$("prevMonth").onclick=()=>{
  if(currentMonth===0){currentMonth=11;currentYear--;}else currentMonth--;
  renderAll();showView("month");
};
$("nextMonth").onclick=()=>{
  if(currentMonth===11){currentMonth=0;currentYear++;}else currentMonth++;
  renderAll();showView("month");
};
$("todayBtn").onclick=()=>{
  const d=new Date();currentYear=d.getFullYear();currentMonth=d.getMonth();
  renderAll();showView("month");
};
$("goDate").onclick=()=>{
  if(!$("dateSearch").value)return;
  const d=new Date($("dateSearch").value+"T12:00:00");
  currentYear=d.getFullYear();currentMonth=d.getMonth();
  renderAll();showView("month");
  setTimeout(()=>document.querySelector(`[data-date="${iso(d)}"]`)?.scrollIntoView({behavior:"smooth",block:"center"}),50);
  openDay(d);
};

$("closeModal").onclick=()=>$("dayModal").hidden=true;
$("dayModal").onclick=e=>{if(e.target===$("dayModal"))$("dayModal").hidden=true;};
document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>showView(t.dataset.view));

if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
renderAll();


// "Als App nutzen" nur im Browser anzeigen.
// Wenn die PWA vom Home-Bildschirm/Startbildschirm gestartet wurde, verschwindet der Reiter.
function isInstalledApp(){
  return window.matchMedia("(display-mode: standalone)").matches ||
         window.matchMedia("(display-mode: fullscreen)").matches ||
         window.navigator.standalone === true;
}
function updateInstallTab(){
  const tab=document.getElementById("installTab");
  const view=document.getElementById("installView");
  const installed=isInstalledApp();
  if(tab) tab.hidden=installed;
  if(view && installed) view.hidden=true;
  if(installed && tab?.classList.contains("active")) showView("year");
}

let deferredInstallPrompt=null;
window.addEventListener("beforeinstallprompt",e=>{
  e.preventDefault();
  deferredInstallPrompt=e;
  const btn=document.getElementById("androidInstallBtn");
  if(btn) btn.hidden=false;
});
document.addEventListener("DOMContentLoaded",()=>{
  updateInstallTab();
  const btn=document.getElementById("androidInstallBtn");
  if(btn) btn.onclick=async()=>{
    if(!deferredInstallPrompt)return;
    deferredInstallPrompt.prompt();
    try{await deferredInstallPrompt.userChoice}catch{}
    deferredInstallPrompt=null;
    btn.hidden=true;
  };
});
window.matchMedia("(display-mode: standalone)").addEventListener?.("change",updateInstallTab);

function openCurrentDayOnStart(){
  const today=new Date();
  currentYear=today.getFullYear();
  currentMonth=today.getMonth();
  if(document.getElementById("yearSelect")) document.getElementById("yearSelect").value=currentYear;
  if(typeof renderAll==="function") renderAll();
  if(typeof showView==="function") showView("month");
  setTimeout(()=>{
    const el=document.querySelector(`[data-date="${iso(today)}"]`);
    if(el) el.scrollIntoView({behavior:"auto",block:"center"});
  },60);
}
window.addEventListener("load",openCurrentDayOnStart);


// ===== Dienstplan als Bild teilen =====
function shareCanvasForMonth(year, month, group){
  const W=1800, H=2050;
  const canvas=document.createElement("canvas");
  canvas.width=W; canvas.height=H;
  const ctx=canvas.getContext("2d");

  const navy="#173b63", pale="#d9eaf7", line="#cbd5df", red="#c62828",
        blue="#315e8a", gray="#666666", green="#2f7342", orange="#9a5b00";

  ctx.fillStyle="#ffffff"; ctx.fillRect(0,0,W,H);
  ctx.fillStyle=navy; ctx.fillRect(0,0,W,170);

  ctx.fillStyle="#ffffff";
  ctx.font="bold 72px system-ui,-apple-system,sans-serif";
  ctx.fillText("Dienstplan",70,105);
  ctx.font="34px system-ui,-apple-system,sans-serif";
  ctx.fillText(group==="ALL" ? "Alle Dienstgruppen" : `Dienstgruppe ${group}`,70,150);

  ctx.fillStyle=pale; ctx.fillRect(55,205,W-110,105);
  ctx.fillStyle=navy; ctx.textAlign="center";
  ctx.font="bold 54px system-ui,-apple-system,sans-serif";
  ctx.fillText(`${monthNames[month]} ${year}`,W/2,275);

  const gridX=55, gridY=330, gridW=W-110, headerH=72, rows=6, cols=7;
  const cellW=gridW/cols, cellH=(H-gridY-245-headerH)/rows;

  const wds=["Mo","Di","Mi","Do","Fr","Sa","So"];
  ctx.fillStyle="#eef2f5"; ctx.fillRect(gridX,gridY,gridW,headerH);
  ctx.fillStyle="#222"; ctx.font="bold 31px system-ui,-apple-system,sans-serif";
  wds.forEach((w,i)=>ctx.fillText(w,gridX+i*cellW+cellW/2,gridY+47));

  const first=new Date(year,month,1,12);
  const count=new Date(year,month+1,0,12).getDate();
  const start=mondayIndex(first.getDay());

  ctx.textAlign="left";
  for(let slot=0;slot<rows*cols;slot++){
    const r=Math.floor(slot/7), c=slot%7;
    const x=gridX+c*cellW, y=gridY+headerH+r*cellH;
    ctx.fillStyle=c>=5?"#fbfbfc":"#fff"; ctx.fillRect(x,y,cellW,cellH);
    ctx.strokeStyle=line; ctx.lineWidth=2; ctx.strokeRect(x,y,cellW,cellH);

    const day=slot-start+1;
    if(day<1||day>count) continue;
    const d=new Date(year,month,day,12);
    ctx.fillStyle="#1c1c1c"; ctx.font="bold 32px system-ui,-apple-system,sans-serif";
    ctx.fillText(String(day),x+12,y+38);

    if(group==="ALL"){
      const p=dayParts(d);
      ctx.textAlign="center";
      ctx.fillStyle="#111"; ctx.font="bold 38px system-ui,-apple-system,sans-serif";
      ctx.fillText(p.work.join(" "),x+cellW/2,y+88);

      let yy=y+126;
      if(p.dash.length){
        ctx.fillStyle=gray; ctx.font="bold 23px system-ui,-apple-system,sans-serif";
        ctx.fillText(p.dash.map(g=>`${g}: -`).join("  "),x+cellW/2,yy); yy+=34;
      }
      if(p.x.length){
        ctx.fillStyle=red; ctx.font="bold 23px system-ui,-apple-system,sans-serif";
        ctx.fillText(p.x.map(g=>`${g}: X`).join("  "),x+cellW/2,yy); yy+=34;
      }
      if(p.fb.length){
        ctx.fillStyle=blue; ctx.font="bold 23px system-ui,-apple-system,sans-serif";
        ctx.fillText(p.fb.map(g=>`${g}: FB`).join("  "),x+cellW/2,yy);
      }
      ctx.textAlign="left";
    }else{
      const s=duty(group,d);
      ctx.textAlign="center";
      ctx.font="bold 52px system-ui,-apple-system,sans-serif";
      if(s==="F"){ctx.fillStyle="#111111";ctx.fillText("F",x+cellW/2,y+112)}
      else if(s==="S"){ctx.fillStyle="#111111";ctx.fillText("S",x+cellW/2,y+112)}
      else if(s==="N"){ctx.fillStyle="#111111";ctx.fillText("N",x+cellW/2,y+112)}
      else if(s==="X"){ctx.fillStyle=red;ctx.fillText("X",x+cellW/2,y+112)}
      else if(s==="-"){ctx.fillStyle=gray;ctx.fillText("-",x+cellW/2,y+112)}
      else if(s==="FB"){ctx.fillStyle=blue;ctx.font="bold 42px system-ui,-apple-system,sans-serif";ctx.fillText("FB",x+cellW/2,y+112)}
      ctx.textAlign="left";
    }
  }

  ctx.fillStyle="#7b858f";
  ctx.textAlign="center";
  ctx.font="24px system-ui,-apple-system,sans-serif";
  
  // Kompakte Erklärung für Empfänger des verschickten Plans
  const legendY=H-60;
  ctx.fillStyle="#f4f7fa";
  ctx.fillRect(55, legendY-150, W-110, 125);
  ctx.strokeStyle="#d9e1e8";
  ctx.lineWidth=2;
  ctx.strokeRect(55, legendY-150, W-110, 125);

  ctx.textAlign="left";
  ctx.fillStyle="#173b63";
  ctx.font="bold 24px system-ui,-apple-system,sans-serif";
  ctx.fillText("Kurzübersicht",75,legendY-116);

  ctx.font="21px system-ui,-apple-system,sans-serif";
  ctx.fillStyle="#37424d";
  ctx.fillText("F = Frühdienst 06:00–14:00   ·   S = Spätdienst 14:00–22:00   ·   N = Nachtdienst 22:00–06:00",75,legendY-78);
  ctx.fillText("FB = Fortbildung   ·   – = frei / Einspringen möglich   ·   X = gesichertes Frei",75,legendY-42);

  ctx.fillStyle="#7b858f";
  ctx.textAlign="center";
  ctx.font="20px system-ui,-apple-system,sans-serif";
  ctx.fillText("Dienstplan",W/2,H-10);
  return canvas;
}

function canvasBlob(canvas){
  return new Promise(resolve=>canvas.toBlob(resolve,"image/png",1));
}

async function createShareFile(){
  const year=Number($("shareYear").value);
  const month=Number($("shareMonth").value);
  const group=$("shareGroup").value;
  const canvas=shareCanvasForMonth(year,month,group);
  const blob=await canvasBlob(canvas);
  const label=group==="ALL"?"Alle_Dienstgruppen":`Dienstgruppe_${group}`;
  return new File([blob],`Dienstplan_${year}_${String(month+1).padStart(2,"0")}_${label}.png`,{type:"image/png"});
}

function setupSharePlan(){
  const yearSel=$("shareYear"), monthSel=$("shareMonth");
  if(!yearSel || yearSel.options.length) return;
  for(let y=2020;y<=2055;y++){
    const o=document.createElement("option");o.value=y;o.textContent=y;yearSel.appendChild(o);
  }
  monthNames.forEach((m,i)=>{
    const o=document.createElement("option");o.value=i;o.textContent=m;monthSel.appendChild(o);
  });
}

$("sharePlanBtn").onclick=()=>{
  setupSharePlan();
  $("shareYear").value=currentYear;
  $("shareMonth").value=currentMonth;
  $("shareGroup").value=selectedGroup;
  $("shareStatus").textContent="";
  $("shareModal").hidden=false;
};

$("closeShareModal").onclick=()=>{$("shareModal").hidden=true};
$("shareModal").onclick=e=>{if(e.target===$("shareModal"))$("shareModal").hidden=true};

$("shareImageBtn").onclick=async()=>{
  const status=$("shareStatus");
  try{
    status.textContent="Bild wird erstellt …";
    const file=await createShareFile();
    const year=$("shareYear").value, month=Number($("shareMonth").value), group=$("shareGroup").value;
    const title=`Dienstplan ${monthNames[month]} ${year}`;
    const text=group==="ALL"?"Dienstplan – alle Dienstgruppen":`Dienstplan – Dienstgruppe ${group}`;

    if(navigator.canShare && navigator.canShare({files:[file]})){
      await navigator.share({title,text,files:[file]});
      status.textContent="";
    }else if(navigator.share){
      await navigator.share({title,text,url:location.href});
      status.textContent="Dein Browser kann das Bild nicht direkt teilen. Nutze „Bild speichern“.";
    }else{
      status.textContent="Teilen wird hier nicht unterstützt. Nutze „Bild speichern“.";
    }
  }catch(err){
    if(err?.name!=="AbortError") status.textContent="Teilen war nicht möglich. Nutze „Bild speichern“.";
    else status.textContent="";
  }
};

$("saveImageBtn").onclick=async()=>{
  const status=$("shareStatus");
  status.textContent="Bild wird erstellt …";
  const file=await createShareFile();
  const url=URL.createObjectURL(file);
  const a=document.createElement("a");a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  status.textContent="Bild wurde erstellt.";
};


// ===== V11 install gate + PDF range =====
let deferredInstallPromptV11=null;
function installedV11(){return matchMedia("(display-mode: standalone)").matches||matchMedia("(display-mode: fullscreen)").matches||navigator.standalone===true}
function applyInstallV11(){
 const installed=installedV11();document.body.classList.toggle("installed-app",installed);document.body.classList.toggle("browser-install-only",!installed);
 const g=$("installGate");if(g)g.hidden=installed;
 if(!installed){const ua=navigator.userAgent||"",ios=/iPhone|iPad|iPod/i.test(ua)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1),android=/Android/i.test(ua);$("iosInstallGuide").hidden=!ios;$("androidInstallGuide").hidden=!android;$("genericInstallGuide").hidden=ios||android}
}
addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstallPromptV11=e;const b=$("directInstallBtn");if(b)b.hidden=false});
document.addEventListener("DOMContentLoaded",()=>{
 applyInstallV11();
 const ib=$("directInstallBtn");if(ib)ib.onclick=async()=>{if(!deferredInstallPromptV11)return;deferredInstallPromptV11.prompt();await deferredInstallPromptV11.userChoice;deferredInstallPromptV11=null;ib.hidden=true};
 $("sharePlanTop").onclick=openShareV11;$("todayTop").onclick=()=>{$("todayBtn").click();scrollTo({top:0,behavior:"smooth"})};
 if(installedV11()){const d=new Date();currentYear=d.getFullYear();currentMonth=d.getMonth();renderAll();showView("month");setTimeout(()=>scrollTo(0,0),20)}
});
addEventListener("appinstalled",()=>location.reload());

function setupShareV11(){
 const y=$("shareYearV11"),f=$("shareFromMonth"),t=$("shareToMonth");if(y.options.length)return;
 for(let n=2020;n<=2055;n++){const o=document.createElement("option");o.value=n;o.textContent=n;y.appendChild(o)}
 monthNames.forEach((n,i)=>{[f,t].forEach(s=>{const o=document.createElement("option");o.value=i;o.textContent=n;s.appendChild(o)})})
}
function openShareV11(){setupShareV11();$("shareYearV11").value=currentYear;$("shareFromMonth").value=currentMonth;$("shareToMonth").value=currentMonth;$("shareGroupV11").value=selectedGroup;$("shareStatusV11").textContent="";$("shareModalV11").hidden=false}
$("closeShareV11").onclick=()=>$("shareModalV11").hidden=true;
$("shareModalV11").onclick=e=>{if(e.target===$("shareModalV11"))$("shareModalV11").hidden=true};

function b64bytes(url){const b=atob(url.split(",")[1]),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
function ab(s){return new TextEncoder().encode(s)}
function cat(a){let n=0;a.forEach(x=>n+=x.length);const u=new Uint8Array(n);let p=0;a.forEach(x=>{u.set(x,p);p+=x.length});return u}
function makePdf(imgs){
 const o=[null],add=x=>(o.push(x),o.length-1),catalog=add(null),pages=add(null),pids=[];
 imgs.forEach((im,k)=>{const iid=add({t:"img",d:im.d,w:im.w,h:im.h}),stream=ab(`q\n842 0 0 595 0 0 cm\n/I${k} Do\nQ\n`),sid=add({t:"stream",d:stream}),pid=add(`<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /I${k} ${iid} 0 R >> >> /Contents ${sid} 0 R >>`);pids.push(pid)});
 o[catalog]=`<< /Type /Catalog /Pages ${pages} 0 R >>`;o[pages]=`<< /Type /Pages /Kids [${pids.map(x=>x+" 0 R").join(" ")}] /Count ${pids.length} >>`;
 const parts=[ab("%PDF-1.4\n")],off=[0];let pos=parts[0].length;
 for(let i=1;i<o.length;i++){off[i]=pos;let b,x=o[i];if(typeof x==="string")b=ab(`${i} 0 obj\n${x}\nendobj\n`);else if(x.t==="img")b=cat([ab(`${i} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${x.w} /Height ${x.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${x.d.length} >>\nstream\n`),x.d,ab("\nendstream\nendobj\n")]);else b=cat([ab(`${i} 0 obj\n<< /Length ${x.d.length} >>\nstream\n`),x.d,ab("\nendstream\nendobj\n")]);parts.push(b);pos+=b.length}
 let xr=`xref\n0 ${o.length}\n0000000000 65535 f \n`;for(let i=1;i<o.length;i++)xr+=String(off[i]).padStart(10,"0")+" 00000 n \n";xr+=`trailer\n<< /Size ${o.length} /Root ${catalog} 0 R >>\nstartxref\n${pos}\n%%EOF`;parts.push(ab(xr));return cat(parts)
}
async function rangePdfV11(){
 const y=+$("shareYearV11").value,g=$("shareGroupV11").value,a=Math.min(+$("shareFromMonth").value,+$("shareToMonth").value),b=Math.max(+$("shareFromMonth").value,+$("shareToMonth").value),imgs=[];
 for(let m=a;m<=b;m++){const c=shareCanvasForMonth(y,m,g);imgs.push({d:b64bytes(c.toDataURL("image/jpeg",.92)),w:c.width,h:c.height})}
 const label=g==="ALL"?"Alle_Dienstgruppen":`Dienstgruppe_${g}`;return new File([makePdf(imgs)],`Dienstplan_${y}_${String(a+1).padStart(2,"0")}-${String(b+1).padStart(2,"0")}_${label}.pdf`,{type:"application/pdf"})
}
$("sharePdfBtn").onclick=async()=>{const s=$("shareStatusV11");try{s.textContent="PDF wird erstellt …";const f=await rangePdfV11();if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({title:"Dienstpläne",files:[f]});s.textContent=""}else s.textContent="Direktes Teilen nicht möglich. Nutze „PDF speichern“."}catch(e){if(e?.name!=="AbortError")s.textContent="PDF konnte nicht geteilt werden.";else s.textContent=""}};
$("savePdfBtn").onclick=async()=>{const s=$("shareStatusV11");s.textContent="PDF wird erstellt …";const f=await rangePdfV11(),u=URL.createObjectURL(f),a=document.createElement("a");a.href=u;a.download=f.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1200);s.textContent="PDF wurde erstellt."};


// ===== V14: Jahresansicht startet beim aktuellen Monat =====
function focusCurrentMonthInYear(){
  const now=new Date();

  // Beim Wechsel auf "Jahr" immer das aktuelle Jahr anzeigen.
  currentYear=now.getFullYear();
  if(document.getElementById("yearSelect")){
    document.getElementById("yearSelect").value=currentYear;
  }

  if(typeof renderYear==="function") renderYear();
  if(typeof renderSummary==="function") renderSummary(now);

  setTimeout(()=>{
    const month=document.querySelector(`#yearView .month[data-month="${now.getMonth()}"]`);
    const today=document.querySelector(`#yearView [data-date="${iso(now)}"]`);

    // Aktuellen Monat oben in den sichtbaren Bereich bringen.
    (month||today)?.scrollIntoView({
      behavior:"auto",
      block:"start"
    });
  },60);
}

document.addEventListener("DOMContentLoaded",()=>{
  const yearTab=document.querySelector('.tab[data-view="year"]');
  if(yearTab){
    yearTab.addEventListener("click",()=>{
      setTimeout(focusCurrentMonthInYear,0);
    });
  }
});
