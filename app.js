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
  document.body.classList.toggle("month-fit", name==="month");
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
$("printBtn").onclick=()=>window.print();
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


// Beim Öffnen der App immer auf den aktuellen Monat springen
// und den heutigen Tag sichtbar hervorheben.
function openCurrentDayOnStart(){
  const today=new Date();
  currentYear=today.getFullYear();
  currentMonth=today.getMonth();

  if(document.getElementById("yearSelect")) {
    document.getElementById("yearSelect").value=currentYear;
  }

  if(typeof renderAll==="function") renderAll();
  else {
    if(typeof renderYear==="function") renderYear();
    if(typeof renderMonth==="function") renderMonth();
  }

  if(typeof showView==="function") showView("month");
  else document.body.classList.add("month-fit");

  setTimeout(()=>{
    const el=document.querySelector(`[data-date="${iso(today)}"]`);
    if(el) el.scrollIntoView({behavior:"auto",block:"center"});
  },80);
}
window.addEventListener("load", openCurrentDayOnStart);
