const cycle=["F","S","S","N","N","-","-","X","F","F","S","S","N","N","-","-","X","F","F","S","S","S","-","-","X","X","F","F","N","N","N","-","-","FB","FB"];
const offsets={B:0,C:7,D:14,E:21,A:28};
const groups=["A","B","C","D","E"];
const epoch=new Date(2027,0,1);
const monthNames=["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const weekdays=["Mo","Di","Mi","Do","Fr","Sa","So"];
const shiftNames={F:"Frühdienst",S:"Spätdienst",N:"Nachtdienst","-":"Strichfrei – Einspringen möglich",X:"X-Frei – definitiv frei",FB:"Fortbildung"};
let currentYear=new Date().getFullYear();
let currentMonth=new Date().getMonth();
let selectedGroup="B";

const $=id=>document.getElementById(id);
function dayDiff(a,b){const ua=Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()), ub=Date.UTC(b.getFullYear(),b.getMonth(),b.getDate());return Math.floor((ua-ub)/86400000)}
function duty(g,d){let i=(dayDiff(d,epoch)+offsets[g])%35;if(i<0)i+=35;return cycle[i]}
function duties(d){return Object.fromEntries(groups.map(g=>[g,duty(g,d)]))}
function dayParts(d){const ds=duties(d),work=[];["F","S","N"].forEach(s=>groups.forEach(g=>{if(ds[g]===s)work.push(g)}));return {ds,work,dash:groups.filter(g=>ds[g]==="-"),x:groups.filter(g=>ds[g]==="X"),fb:groups.filter(g=>ds[g]==="FB")}}
function iso(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function sameDay(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate()}
function mondayIndex(jsDay){return (jsDay+6)%7}
function statusHtml(p){return `${p.dash.length?`<div class="status dash">${p.dash.map(g=>`${g}: -`).join("   ")}</div>`:""}${p.x.length?`<div class="status x">${p.x.map(g=>`${g}: X`).join("   ")}</div>`:""}${p.fb.length?`<div class="status fb">${p.fb.map(g=>`${g}: FB`).join("   ")}</div>`:""}`}
function dayCell(d,large=false){const p=dayParts(d),today=new Date(),w=mondayIndex(d.getDay()),mine=duty(selectedGroup,d);return `<div class="day ${w>4?"weekend":""} ${sameDay(d,today)?"today":""} ${["F","S","N"].includes(mine)?"mine-day":""}" data-date="${iso(d)}"><div class="num">${d.getDate()}</div><div class="work">${p.work.join(" ")}</div>${statusHtml(p)}</div>`}
function monthHtml(year,month,large=false){const first=new Date(year,month,1),days=new Date(year,month+1,0).getDate(),start=mondayIndex(first.getDay());let cells="";for(let i=0;i<start;i++)cells+='<div class="day empty"></div>';for(let n=1;n<=days;n++)cells+=dayCell(new Date(year,month,n),large);while((start+days)%7!==0){cells+='<div class="day empty"></div>';daysPlus=0;break}return `${large?"":`<h3>${monthNames[month]} ${year}</h3>`}<div class="weekdays">${weekdays.map(w=>`<div>${w}</div>`).join("")}</div><div class="days">${cells}</div>`}
function renderYear(){const cal=$("calendar");cal.innerHTML="";for(let m=0;m<12;m++){const el=document.createElement("section");el.className="month";el.innerHTML=monthHtml(currentYear,m);cal.appendChild(el)}bindDays()}
function renderMonth(){currentMonth=Math.max(0,Math.min(11,currentMonth));$("monthTitle").textContent=`${monthNames[currentMonth]} ${currentYear}`;$("monthCalendar").innerHTML=monthHtml(currentYear,currentMonth,true);bindDays()}
function renderMine(){$("mineTitle").textContent=`Dienstgruppe ${selectedGroup}`;let html="";for(let m=0;m<12;m++){const max=new Date(currentYear,m+1,0).getDate();for(let n=1;n<=max;n++){const d=new Date(currentYear,m,n),s=duty(selectedGroup,d);let badge=s==="-"?"dash":s;html+=`<div class="mine-item" data-date="${iso(d)}"><div class="date">${d.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"})}</div><div class="desc">${shiftNames[s]}</div><span class="badge ${badge}">${s}</span></div>`}}$("mineList").innerHTML=html;document.querySelectorAll(".mine-item").forEach(x=>x.onclick=()=>openDay(new Date(x.dataset.date+"T12:00:00")))}
function renderSummary(d=new Date()){const s=duty(selectedGroup,d),p=dayParts(d);$("summary").innerHTML=`<strong>${d.toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"})}</strong><span>Gruppe ${selectedGroup}: <b>${shiftNames[s]}</b></span><span>Dienst: <b>${p.work.join(" ")||"–"}</b></span>`}
function bindDays(){document.querySelectorAll(".day[data-date]").forEach(x=>x.onclick=()=>openDay(new Date(x.dataset.date+"T12:00:00")))}
function openDay(d){const ds=duties(d);$("modalContent").innerHTML=`<h2>${d.toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}</h2>${groups.map(g=>`<div class="detail-row"><div class="detail-group">${g}</div><div class="detail-shift">${shiftNames[ds[g]]}</div></div>`).join("")}`;$("dayModal").hidden=false;renderSummary(d)}
function renderAll(){$("yearSelect").value=currentYear;renderYear();renderMonth();renderMine();renderSummary()}
function showView(name){document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.view===name));$(`${name}View`).classList.add("active")}
for(let y=2020;y<=2045;y++){const o=document.createElement("option");o.value=y;o.textContent=y;$("yearSelect").appendChild(o)}
$("yearSelect").value=currentYear;
$("yearSelect").onchange=e=>{currentYear=+e.target.value;renderAll()};
$("prevYear").onclick=()=>{currentYear--;renderAll()};$("nextYear").onclick=()=>{currentYear++;renderAll()};
$("groupSelect").onchange=e=>{selectedGroup=e.target.value;renderAll()};
$("prevMonth").onclick=()=>{if(currentMonth===0){currentMonth=11;currentYear--}else currentMonth--;renderAll();showView("month")};
$("nextMonth").onclick=()=>{if(currentMonth===11){currentMonth=0;currentYear++}else currentMonth++;renderAll();showView("month")};
$("todayBtn").onclick=()=>{const d=new Date();currentYear=d.getFullYear();currentMonth=d.getMonth();renderAll();showView("month")};
$("goDate").onclick=()=>{if(!$("dateSearch").value)return;const d=new Date($("dateSearch").value+"T12:00:00");currentYear=d.getFullYear();currentMonth=d.getMonth();renderAll();showView("month");setTimeout(()=>document.querySelector(`[data-date="${iso(d)}"]`)?.scrollIntoView({behavior:"smooth",block:"center"}),50);openDay(d)};
$("printBtn").onclick=()=>window.print();
$("closeModal").onclick=()=>$("dayModal").hidden=true;$("dayModal").onclick=e=>{if(e.target===$("dayModal"))$("dayModal").hidden=true};
document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>showView(t.dataset.view));
if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
renderAll();
