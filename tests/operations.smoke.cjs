/* node tests/operations.smoke.cjs — no network/dependencies required */
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
const source=n=>fs.readFileSync(path.join(root,n),"utf8");
const analytics={};
new Function("window",source("analysis-engine.js"))(analytics);
const roles=["TOP","JUNGLE","MID","ADC","SUPPORT"];
const blue=["Jayce","Vi","Orianna","Caitlyn","Lux"],red=["KSante","Nocturne","Syndra","Ezreal","Braum"];
const roster=blue.map((id,i)=>({id,team:"blue",lane:roles[i]})).concat(red.map((id,i)=>({id,team:"red",lane:roles[i]})));
const model=analytics.RiftAnalytics.analyze(roster,[],{blueRoute:"full-top",redRoute:"three-mid",lane:"BOT",level:6});
assert(model.lanes.every(l=>l.ready),"all lanes should be complete");
assert(model.routes.blue.timeline.length===6,"full clear must have six camps");
assert(model.routes.red.timeline.length===3,"three-camp route must have three camps");
assert(model.routes.red.arrivalSec<model.routes.blue.arrivalSec,"three-camp arrival must be earlier");
assert(model.routes.blue.arrivalSec>=165 && model.routes.blue.arrivalSec<=250,"2026 six camp window roughly plausible");
assert(model.routes.red.arrivalSec>=110 && model.routes.red.arrivalSec<=220,"2026 short path roughly plausible");
assert(model.fight.ready,"3v3 battle should be ready");
assert(model.fight.blue.participants.length===3&&model.fight.red.participants.length===3);
const repeat=analytics.RiftAnalytics.analyze(roster,[],{blueRoute:"full-top",redRoute:"three-mid",lane:"BOT",level:6});
assert.deepEqual(model,repeat,"same inputs must yield same model");
const absent=analytics.RiftAnalytics.analyze(roster.filter(x=>!(x.team==="red"&&x.lane==="MID")),[],{lane:"MID",level:3});
assert(!absent.lanes.find(x=>x.lane==="MID").ready,"no invented complete lane for missing champion");
assert(!absent.fight.ready,"no completed 2v2 if a participant is missing");

const handlers={},els={},ctx=new Proxy({createLinearGradient(){return{addColorStop(){}}}},{get(o,k){return o[k]??(()=>{})},set(o,k,v){o[k]=v;return true}});
function element(tag){
 const e={tagName:tag,children:[],style:{},value:"",textContent:"",classList:{toggle(){}},selectedOptions:[{textContent:"mode"}],width:900,height:900,
 append(...x){this.children.push(...x)},replaceChildren(...x){this.children=x},addEventListener(n,cb){this["on"+n]=cb},
 getContext(){return ctx},getBoundingClientRect(){return{left:0,top:0,width:900,height:900}}};
 Object.defineProperty(e,"lastChild",{get(){return this.children.at(-1)}});return e;
}
const document={getElementById(id){return els[id]??(els[id]=element(id))},createElement:element,addEventListener(n,fn){handlers[n]=fn}},$=id=>document.getElementById(id),window={};
new Function("window",source("data.js"))(window);
new Function("window","document","localStorage","fetch","console","confirm","URL","Blob","setTimeout",source("app.js"))(window,document,{getItem(){return null},setItem(){}},()=>Promise.reject(Error("offline")),{warn(){}},()=>true,{createObjectURL(){return ""},revokeObjectURL(){}},class{},()=>{});
new Function("window","document","Image","requestAnimationFrame","confirm",source("rift.js"))(window,document,class{constructor(){this.complete=false;this.naturalWidth=0}},()=>{},()=>true);
handlers.DOMContentLoaded();
$("step30").onclick();
assert($("simStats").textContent.includes("미니언 36"),"first minion wave should spawn at 0:30");
$("clearMap").onclick();
const result=window.RiftLab.stageSkirmish({roster,lane:"MID",level:6,routes:model.routes});
assert(result.ok&&result.participants===4,"2v2 must transfer four champions");
assert(window.RiftLab.showRoutes(model.routes),"route overlay must render");
const start=window.RiftLab.getSituation().champions.reduce((sum,x)=>sum+x.hp,0);
$("step30").onclick();
const finish=window.RiftLab.getSituation().champions.reduce((sum,x)=>sum+x.hp,0);
assert(finish<start,"auto-attack experiment must deal damage");
const bot=window.RiftLab.stageSkirmish({roster,lane:"BOT",level:3,routes:model.routes});
assert(bot.ok&&bot.participants===6,"3v3 must transfer six champions");
console.log("PASS: 2026 operations model, routes, missing picks, 0:30 minions, 2v2/3v3, auto attacks.");
