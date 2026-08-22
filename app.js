const cycle=["F","S","S","N","N","-","-","X","F","F","S","S","N","N","-","-","X","F","F","S","S","S","-","-","X","X","F","F","N","N","N","-","-","FB","FB"];
const offsets={B:0,C:7,D:14,E:21,A:28};
const groups=["A","B","C","D","E"];
const epoch=new Date(2027,0,1,12);
const monthNames=["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const weekdays=["Mo","Di","Mi","Do","Fr","Sa","So"];
const shiftNames={F:"Frühdienst",S:"Spätdienst",N:"Nachtdienst","-":"Strichfrei – Einspringen möglich",X:"X-Frei – definitiv frei",FB:"Fortbildung"};
const shiftShort={F:"Früh",S:"Spät",N:"Nacht","-":"-",X:"X",FB:"FB"};
const shiftTimes={F:"06:00–14:00",S:"14:00–22:00",N:"22:00–06:00","-":"",X:"",FB:""};
const $=id=>document.getElementById(id);

let selectedGroup=localStorage.getItem("dp.group")||"B";
let currentYear=new Date().getFullYear();
let currentMonth=new Date().getMonth();
let mineFilter="all";
let selectedDate=null;
let notes=JSON.parse(localStorage.getItem("dp.notes")||"{}");
let prefs=JSON.parse(localStorage.getItem("dp.prefs")||'{"showTimes":true,"showHolidays":true}');

function dayDiff(a,b){const ua=Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()),ub=Date.UTC(b.getFullYear(),b.getMonth(),b.getDate());return Math.floor((ua-ub)/86400000)}
function duty(g,d){let i=(dayDiff(d,epoch)+offsets[g])%35;if(i<0)i+=35;return cycle[i]}
function duties(d){return Object.fromEntries(groups.map(g=>[g,duty(g,d)]))}
function dayParts(d){const ds=duties(d),work=[];["F","S","N"].forEach(s=>groups.forEach(g=>{if(ds[g]===s)work.push(g)}));return {ds,work,dash:groups.filter(g=>ds[g]==="-"),x:groups.filter(g=>ds[g]==="X"),fb:groups.filter(g=>ds[g]==="FB")}}
function iso(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function sameDay(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate()}
function mondayIndex(jsDay){return (jsDay+6)%7}
function escapeHtml(v){return String(v||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function dateDE(d,opts={weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"}){return d.toLocaleDateString("de-DE",opts)}

function easterSunday(year){
  const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3);
  const h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
  const month=Math.floor((h+l-7*m+114)/31)-1,day=((h+l-7*m+114)%31)+1;
  return new Date(year,month,day,12);
}
function holidaysNRW(year){
  const e=easterSunday(year), map={};
  const put=(d,n)=>map[iso(d)]=n;
  put(new Date(year,0,1,12),"Neujahr");
  put(addDays(e,-2),"Karfreitag");
  put(addDays(e,1),"Ostermontag");
  put(new Date(year,4,1,12),"Tag der Arbeit");
  put(addDays(e,39),"Christi Himmelfahrt");
  put(addDays(e,50),"Pfingstmontag");
  put(addDays(e,60),"Fronleichnam");
  put(new Date(year,9,3,12),"Tag der Deutschen Einheit");
  put(new Date(year,10,1,12),"Allerheiligen");
  put(new Date(year,11,25,12),"1. Weihnachtstag");
  put(new Date(year,11,26,12),"2. Weihnachtstag");
  return map;
}
function holidayName(d){return prefs.showHolidays ? holidaysNRW(d.getFullYear())[iso(d)]||"" : ""}

function statusHtml(p){
  return `${p.dash.length?`<div class="status dash">${p.dash.map(g=>`${g}: -`).join("   ")}</div>`:""}${p.x.length?`<div class="status x">${p.x.map(g=>`${g}: X`).join("   ")}</div>`:""}${p.fb.length?`<div class="status fb">${p.fb.map(g=>`${g}: FB`).join("   ")}</div>`:""}`;
}
function dayCell(d){
  const p=dayParts(d),today=new Date(),w=mondayIndex(d.getDay()),mine=duty(selectedGroup,d),h=holidayName(d),note=notes[iso(d)];
  return `<div class="day ${w>4?"weekend":""} ${sameDay(d,today)?"today":""} ${["F","S","N"].includes(mine)?"mine-day":""} ${h?"holiday":""}" data-date="${iso(d)}">
    <div class="num">${d.getDate()}</div>${h?`<span class="holiday-dot" title="${h}"></span>`:""}
    <div class="work">${p.work.join(" ")}</div>${statusHtml(p)}${note?`<span class="note-mark" title="${escapeHtml(note.title)}">●</span>`:""}
  </div>`;
}
function monthHtml(year,month,large=false){
  const first=new Date(year,month,1,12),count=new Date(year,month+1,0).getDate(),start=mondayIndex(first.getDay());
  let cells="";
  for(let i=0;i<start;i++)cells+='<div class="day empty"></div>';
  for(let n=1;n<=count;n++)cells+=dayCell(new Date(year,month,n,12));
  const rem=(start+count)%7;if(rem)for(let i=rem;i<7;i++)cells+='<div class="day empty"></div>';
  return `${large?"":`<h3>${monthNames[month]} ${year}</h3>`}<div class="weekdays">${weekdays.map(w=>`<div>${w}</div>`).join("")}</div><div class="days">${cells}</div>`;
}
function bindDays(){document.querySelectorAll(".day[data-date],.next-day[data-date]").forEach(x=>x.onclick=()=>openDay(new Date(x.dataset.date+"T12:00:00")))}

function renderHome(){
  const d=new Date(),s=duty(selectedGroup,d),h=holidayName(d),n=notes[iso(d)];
  $("todayHero").innerHTML=`<div class="hero-date">${dateDE(d)}</div>
    <div class="hero-main"><div><div class="hero-group">Dienstgruppe ${selectedGroup}</div><div class="hero-shift hero-status ${s==="-"?"dash":s}">${shiftNames[s]}</div></div><div>${h?`<div class="holiday-name">${h}</div>`:""}</div></div>
    ${prefs.showTimes&&shiftTimes[s]?`<div class="hero-time">${shiftTimes[s]} Uhr</div>`:""}${n?`<div class="personal-tag">${escapeHtml(n.title)}</div>`:""}`;

  const nextX=findNext(d,x=>duty(selectedGroup,x)==="X",90);
  const nextWork=findNext(d,x=>["F","S","N"].includes(duty(selectedGroup,x)),30);
  const nextFreeBlock=findNext(d,x=>duty(selectedGroup,x)==="X"||duty(selectedGroup,x)==="-",30);
  $("quickStats").innerHTML=`
    <div class="quick-card card"><div class="kicker">Nächstes X-Frei</div><div class="value">${nextX?relativeLabel(d,nextX):"–"}</div></div>
    <div class="quick-card card"><div class="kicker">Nächster Dienst</div><div class="value">${nextWork?`${shiftShort[duty(selectedGroup,nextWork)]} · ${relativeLabel(d,nextWork)}`:"–"}</div></div>
    <div class="quick-card card"><div class="kicker">Nächster freier Tag</div><div class="value">${nextFreeBlock?relativeLabel(d,nextFreeBlock):"–"}</div></div>`;

  let html="";
  for(let i=0;i<7;i++){const x=addDays(d,i),ss=duty(selectedGroup,x);html+=`<div class="next-day ${ss} ${i===0?"today":""}" data-date="${iso(x)}"><div class="dow">${dateDE(x,{weekday:"short"})}</div><div class="date">${dateDE(x,{day:"2-digit",month:"2-digit"})}</div><div class="shift">${shiftShort[ss]}</div></div>`}
  $("nextDays").innerHTML=html;bindDays();
}
function findNext(from,pred,max){for(let i=1;i<=max;i++){const d=addDays(from,i);if(pred(d))return d}return null}
function relativeLabel(from,to){const n=dayDiff(to,from);return n===1?"morgen":`in ${n} Tagen`}

function renderYear(){const cal=$("calendar");cal.innerHTML="";for(let m=0;m<12;m++){const el=document.createElement("section");el.className="month";el.innerHTML=monthHtml(currentYear,m);cal.appendChild(el)}bindDays()}
function renderMonth(){$("monthTitle").textContent=`${monthNames[currentMonth]} ${currentYear}`;$("monthCalendar").innerHTML=monthHtml(currentYear,currentMonth,true);bindDays()}
function renderMine(){
  $("mineTitle").textContent=`Dienstgruppe ${selectedGroup}`;
  let html="";
  for(let m=0;m<12;m++){const max=new Date(currentYear,m+1,0).getDate();for(let n=1;n<=max;n++){
    const d=new Date(currentYear,m,n,12),s=duty(selectedGroup,d);if(mineFilter!=="all"&&s!==mineFilter)continue;
    const note=notes[iso(d)],h=holidayName(d),badge=s==="-"?"dash":s;
    html+=`<div class="mine-item" data-date="${iso(d)}"><div class="date">${dateDE(d,{weekday:"short",day:"2-digit",month:"2-digit"})}</div>
      <div class="desc">${shiftNames[s]} ${prefs.showTimes&&shiftTimes[s]?`· ${shiftTimes[s]}`:""} ${h?`<span class="personal-tag">${h}</span>`:""} ${note?`<span class="personal-tag">${escapeHtml(note.title)}</span>`:""}</div><span class="badge ${badge}">${s}</span></div>`;
  }}
  $("mineList").innerHTML=html;document.querySelectorAll(".mine-item").forEach(x=>x.onclick=()=>openDay(new Date(x.dataset.date+"T12:00:00")));
}
function renderAll(){
  document.querySelectorAll(".group-select").forEach(s=>s.value=selectedGroup);
  $("yearSelect").value=currentYear;$("showTimes").checked=!!prefs.showTimes;$("showHolidays").checked=!!prefs.showHolidays;
  renderHome();renderYear();renderMonth();renderMine();
}
function setGroup(g){selectedGroup=g;localStorage.setItem("dp.group",g);renderAll()}

function openDay(d){
  selectedDate=d;const ds=duties(d),h=holidayName(d),note=notes[iso(d)]||{title:"",text:""};
  $("modalContent").innerHTML=`<h2>${dateDE(d,{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}</h2>${h?`<div class="holiday-name">${h}</div>`:""}
    ${groups.map(g=>`<div class="detail-row"><div class="detail-group">${g}</div><div class="detail-shift">${shiftNames[ds[g]]}</div><div class="detail-time">${prefs.showTimes?shiftTimes[ds[g]]:""}</div></div>`).join("")}`;
  $("noteTitle").value=note.title||"";$("noteText").value=note.text||"";$("deleteNote").style.visibility=notes[iso(d)]?"visible":"hidden";$("dayModal").hidden=false;
}
function saveNotes(){localStorage.setItem("dp.notes",JSON.stringify(notes))}
function savePrefs(){localStorage.setItem("dp.prefs",JSON.stringify(prefs))}
function showView(name){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.view===name));
  $(`${name}View`).classList.add("active");
}

function download(name,type,text){
  const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportICS(){
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Dienstplan//DE","CALSCALE:GREGORIAN","METHOD:PUBLISH"];
  for(let m=0;m<12;m++){const max=new Date(currentYear,m+1,0).getDate();for(let n=1;n<=max;n++){const d=new Date(currentYear,m,n,12),s=duty(selectedGroup,d);if(!["F","S","N","FB"].includes(s))continue;
    const y=d.getFullYear(),mm=String(d.getMonth()+1).padStart(2,"0"),dd=String(d.getDate()).padStart(2,"0"),stamp=`${y}${mm}${dd}`;
    let start,end,summary;
    if(s==="F"){start="060000";end="140000";summary=`Frühdienst – Gruppe ${selectedGroup}`}
    if(s==="S"){start="140000";end="220000";summary=`Spätdienst – Gruppe ${selectedGroup}`}
    if(s==="N"){start="220000";end="060000";summary=`Nachtdienst – Gruppe ${selectedGroup}`}
    if(s==="FB"){lines.push("BEGIN:VEVENT",`UID:${stamp}-${selectedGroup}-FB@dienstplan`,`DTSTART;VALUE=DATE:${stamp}`,`DTEND;VALUE=DATE:${iso(addDays(d,1)).replaceAll("-","")}`,`SUMMARY:Fortbildung – Gruppe ${selectedGroup}`,"END:VEVENT");continue}
    const endDate=s==="N"?addDays(d,1):d,ey=endDate.getFullYear(),em=String(endDate.getMonth()+1).padStart(2,"0"),ed=String(endDate.getDate()).padStart(2,"0");
    lines.push("BEGIN:VEVENT",`UID:${stamp}-${selectedGroup}-${s}@dienstplan`,`DTSTART;TZID=Europe/Berlin:${stamp}T${start}`,`DTEND;TZID=Europe/Berlin:${ey}${em}${ed}T${end}`,`SUMMARY:${summary}`,"END:VEVENT");
  }}
  lines.push("END:VCALENDAR");download(`Dienstplan_${selectedGroup}_${currentYear}.ics`,"text/calendar;charset=utf-8",lines.join("\r\n"));
}

for(let y=2020;y<=2055;y++){const o=document.createElement("option");o.value=y;o.textContent=y;$("yearSelect").appendChild(o)}
document.querySelectorAll(".group-select").forEach(s=>s.onchange=e=>setGroup(e.target.value));
$("yearSelect").onchange=e=>{currentYear=+e.target.value;renderAll()};
$("prevYear").onclick=()=>{currentYear--;renderAll()};$("nextYear").onclick=()=>{currentYear++;renderAll()};
$("prevMonth").onclick=()=>{if(currentMonth===0){currentMonth=11;currentYear--}else currentMonth--;renderAll();showView("month")};
$("nextMonth").onclick=()=>{if(currentMonth===11){currentMonth=0;currentYear++}else currentMonth++;renderAll();showView("month")};
$("homeToMonth").onclick=()=>{const d=new Date();currentYear=d.getFullYear();currentMonth=d.getMonth();renderAll();showView("month")};
$("todayBtn").onclick=()=>{const d=new Date();currentYear=d.getFullYear();currentMonth=d.getMonth();renderAll();showView("month")};
$("goDate").onclick=()=>{if(!$("dateSearch").value)return;const d=new Date($("dateSearch").value+"T12:00:00");currentYear=d.getFullYear();currentMonth=d.getMonth();renderAll();showView("month");setTimeout(()=>document.querySelector(`[data-date="${iso(d)}"]`)?.scrollIntoView({behavior:"smooth",block:"center"}),50);openDay(d)};
$("printBtn").onclick=()=>window.print();
$("closeModal").onclick=()=>$("dayModal").hidden=true;$("dayModal").onclick=e=>{if(e.target===$("dayModal"))$("dayModal").hidden=true};
$("saveNote").onclick=()=>{if(!selectedDate)return;const key=iso(selectedDate),title=$("noteTitle").value.trim(),text=$("noteText").value.trim();if(title||text)notes[key]={title:title||"Notiz",text};else delete notes[key];saveNotes();$("dayModal").hidden=true;renderAll()};
$("deleteNote").onclick=()=>{if(!selectedDate)return;delete notes[iso(selectedDate)];saveNotes();$("dayModal").hidden=true;renderAll()};
document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>showView(t.dataset.view));
document.querySelectorAll(".filter").forEach(b=>b.onclick=()=>{mineFilter=b.dataset.filter;document.querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x===b));renderMine()});
$("showTimes").onchange=e=>{prefs.showTimes=e.target.checked;savePrefs();renderAll()};
$("showHolidays").onchange=e=>{prefs.showHolidays=e.target.checked;savePrefs();renderAll()};
$("exportIcs").onclick=exportICS;
$("exportData").onclick=()=>download("Dienstplan_Sicherung.json","application/json;charset=utf-8",JSON.stringify({version:1,notes,prefs,selectedGroup},null,2));
$("importData").onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{const d=JSON.parse(await f.text());if(d.notes)notes=d.notes;if(d.prefs)prefs=d.prefs;if(groups.includes(d.selectedGroup))selectedGroup=d.selectedGroup;saveNotes();savePrefs();localStorage.setItem("dp.group",selectedGroup);renderAll();alert("Sicherung importiert.")}catch{alert("Die Datei konnte nicht importiert werden.")}e.target.value=""};
$("shareApp").onclick=async()=>{const data={title:"Dienstplan",text:"Dienstplan-App",url:location.href};if(navigator.share){try{await navigator.share(data)}catch{}}else{await navigator.clipboard?.writeText(location.href);alert("Link kopiert.")}};
$("themeBtn").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("dp.dark",document.body.classList.contains("dark")?"1":"0")};
if(localStorage.getItem("dp.dark")==="1")document.body.classList.add("dark");
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
renderAll();
