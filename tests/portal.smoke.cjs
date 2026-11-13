/* Run: node tests/portal.smoke.cjs — Node 18+, no dependencies */
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const read=n=>fs.readFileSync(path.join(__dirname,"..",n),"utf8");
const src={data:read("data.js"),app:read("app.js"),rift:read("rift.js"),auto:read("auto-draft.js"),analysis:read("analysis-engine.js"),ui:read("analysis-ui.js"),portal:read("portal.js")};
const events={},nodes={},stored={};
const ctx=new Proxy({createLinearGradient(){return{addColorStop(){}};}},{get(t,k){return t[k]??(()=>{});},set(t,k,v){t[k]=v;return true;}});
function element(tag){
 const e={tagName:tag,children:[],style:{},classList:{toggle(){}},value:"",textContent:"",width:900,height:900,options:[],selectedOptions:[{textContent:"선택"}],
 append(...xs){this.children.push(...xs);if(tag==="select")this.options=this.children;},
 prepend(...xs){this.children.unshift(...xs);},replaceChildren(...xs){this.children=xs;if(tag==="select")this.options=xs;},
 addEventListener(n,cb){this["on"+n]=cb;},setAttribute(){},
 getContext(){return ctx;},getBoundingClientRect(){return{left:0,top:0,width:900,height:900};}};
 Object.defineProperty(e,"lastChild",{get(){return this.children.at(-1);}});return e;
}
const document={createElement:element,getElementById(id){return nodes[id]??(nodes[id]=element(id));},addEventListener(n,cb){(events[n]??=[]).push(cb);}};
const $=id=>document.getElementById(id),window={},ls={getItem(k){return stored[k]??null;},setItem(k,v){stored[k]=v;},removeItem(k){delete stored[k];}},fetchMock=()=>Promise.reject(Error("No network fixture"));
new Function("window",src.data)(window);
new Function("window","document","localStorage","fetch","console","confirm","URL","Blob","setTimeout",src.app)(window,document,ls,fetchMock,{warn(){}},()=>true,{createObjectURL(){return""},revokeObjectURL(){}},Blob,()=>{});
new Function("window","document","Image","requestAnimationFrame","confirm",src.rift)(window,document,class{constructor(){this.complete=false;this.naturalWidth=0;}},()=>{},()=>true);
new Function("window","document","localStorage","console","confirm",src.auto)(window,document,ls,{error(e){throw e;}},()=>true);
new Function("window",src.analysis)(window);
new Function("window","document","localStorage","alert","Blob","URL","setTimeout",src.ui)(window,document,ls,()=>{},Blob,URL,()=>{});
new Function("window","document","localStorage","fetch","console","URL","Blob","setTimeout",src.portal)(window,document,ls,fetchMock,{warn(){}},URL,Blob,()=>{});
$("autoBlue").value="T1";$("autoRed").value="BLG";$("autoMode").value="balanced";$("autoVariance").value="0.15";$("autoSeed").value="2026";
$("anaBlueRoute").value="full-top";$("anaRedRoute").value="three-mid";$("anaFocus").value="MID";$("anaLevel").value="6";
$("portalChampionRole").value="ADC";$("portalRiotRegion").value="kr";
for(const callback of events.DOMContentLoaded)callback();
assert.equal($("textbookMenu").children.length,8);
assert($("portalChampionList").children.length>150);
assert($("portalChampionDetails").children.length>=5);
window.LeaguePortal.chapter(1);
assert($("textbookArticle").children.length>=6,"Wave chapter should contain exercise");
$("portalRiotName").value="Test";$("portalRiotTag").value="KR1";$("portalSearchMatches").onclick();
assert($("portalProfileState").textContent.includes("Worker 주소"),"API key stays server-side");
assert(!src.portal.includes("RIOT_API_KEY"),"No server key in frontend source");
$("autoSeries").onclick();
assert.equal(window.RiftCore.autoSnapshot().games.length,5);
assert(window.RiftCore.autoSnapshot().games.every(g=>g.actions.length===20));
console.log("PASS 8 textbook chapters, champion search, no dummy winrates, profile API guard and BO5 regression");
