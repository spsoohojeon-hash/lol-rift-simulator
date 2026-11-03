/* node tests/auto-draft.smoke.cjs — Node 18+, no dependencies */
const fs=require("node:fs");
const path=require("node:path");
const assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
const sources=["data.js","app.js","rift.js","auto-draft.js"].map(name=>fs.readFileSync(path.join(root,name),"utf8"));
function run(blue,red,length,seed){
 const events={},nodes={},store={};
 const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get(t,k){return t[k]??(()=>{})},set(t,k,v){t[k]=v;return true;}});
 function element(){
  const e={children:[],style:{},value:"",textContent:"",classList:{toggle(){}},selectedOptions:[{textContent:"mock"}],width:900,height:900,
  append(...x){this.children.push(...x);},replaceChildren(...x){this.children=x;},addEventListener(n,f){this["on"+n]=f;},
  getContext(){return ctx;},getBoundingClientRect(){return{left:0,top:0,width:900,height:900};}};
  Object.defineProperty(e,"lastChild",{get(){return this.children.at(-1);}});return e;
 }
 const document={createElement:element,getElementById(id){return nodes[id]??(nodes[id]=element());},addEventListener(n,fn){(events[n]??=[]).push(fn);}};
 const $=id=>document.getElementById(id),window={};
 const localStorage={getItem(k){return store[k]||null;},setItem(k,v){store[k]=v;}};
 new Function("window",sources[0])(window);
 new Function("window","document","localStorage","fetch","console","confirm","URL","Blob","setTimeout",sources[1])(window,document,localStorage,()=>Promise.reject(Error("offline")),{warn(){}},()=>true,{createObjectURL:()=>"",revokeObjectURL(){}},class{},()=>{});
 new Function("window","document","Image","requestAnimationFrame","confirm",sources[2])(window,document,class{constructor(){this.complete=false;this.naturalWidth=0;}},()=>{},()=>true);
 new Function("window","document","localStorage","console","confirm",sources[3])(window,document,localStorage,{error(){throw Error("auto draft exception");}},()=>true);
 $("autoBlue").value=blue;$("autoRed").value=red;$("autoMode").value="balanced";$("autoVariance").value="0.15";$("autoSeed").value=seed;$("seriesLength").value=length;
 for(const fn of events.DOMContentLoaded)fn();
 window.RiftCore.autoSetSeries(length);
 $("autoSeries").onclick();
 return window.RiftCore.autoSnapshot();
}
function verify(s,length){
 assert.equal(s.games.length,length,"All games generated");
 const prior=new Set();
 for(const [i,g] of s.games.entries()){
  assert.equal(g.actions.length,20,"G"+(i+1)+" has a full draft");
  const picks=g.actions.filter(a=>a.type==="pick"),bans=g.actions.filter(a=>a.type==="ban");
  assert.equal(picks.length,10);assert.equal(bans.length,10);
  assert(g.actions.every(a=>typeof a.reason==="string"&&a.reason.length>0),"Every action has an explanation");
  for(const p of picks){assert(!prior.has(p.id),"Fearless duplicate "+p.id);prior.add(p.id);}
  for(const team of ["blue","red"]){
   const chosen=picks.filter(a=>a.team===team),roles=chosen.map((p,j)=>g.roles[team][j]);
   assert.equal(new Set(roles).size,5,"Unique roles for "+team);assert.equal(chosen.length,5);
  }
 }
 assert.equal(prior.size,10*length);
}
const a=run("T1","BLG",5,2026),b=run("T1","BLG",5,2026);
verify(a,5);verify(run("GEN","TES",3,1352),3);
assert.deepEqual(a.games,b.games,"Same seed reproduces a BO5");
console.log("PASS BO5 BO3 Fearless role uniqueness action reasons deterministic seeds");
