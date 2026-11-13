/* node tests/damage.smoke.cjs (Node 18+, no external modules) */
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const read=n=>fs.readFileSync(path.join(__dirname,"..",n),"utf8");
const win={};
new Function("window",read("damage-core.js"))(win);
const core=win.LeagueDamageCore;
const data={stats:{hp:600,hpperlevel:100,attackdamage:60,attackdamageperlevel:3,armor:30,armorperlevel:3,spellblock:30,spellblockperlevel:1,attackspeed:.7,attackspeedperlevel:2,attackrange:550,movespeed:340}};
const items={"1001":{name:"Boots",tags:["Boots"],stats:{FlatMovementSpeedMod:25}},"3072":{name:"AD",stats:{FlatPhysicalDamageMod:40,FlatHPPoolMod:300}},"3089":{name:"AP",stats:{FlatMagicDamageMod:100}}};
assert.equal(core.statGrowth(1),0);
assert.equal(core.statGrowth(18),17);
assert.equal(core.normalizeLevel(20,"TOP",false),18);
assert.equal(core.normalizeLevel(20,"TOP",true),20);
assert.equal(core.normalizeLevel(20,"MID",true),18);
const mid=core.statBuild(data,11,"MID",true,["3072","3089"],items,{bonusAD:10,ap:20});
const ordinary=core.statBuild(data,11,"MID",false,["3072","3089"],items,{bonusAD:10,ap:20});
assert.equal(Number((mid.bonusAD/ordinary.bonusAD).toFixed(2)),1.08);
assert.equal(Number((mid.ap/ordinary.ap).toFixed(2)),1.08);
assert.equal(mid.items.length,2);
assert.equal(core.damage(200,"physical",{hp:1000,armor:100}).post,100);
assert.equal(core.damage(200,"magic",{hp:1000,mr:100}).post,100);
assert.equal(core.damage(100,"true",{hp:1000,armor:1000,mr:1000}).post,100);
assert.equal(core.damage(100,"physical",{hp:1000,armor:-50}).post,133.3);
assert.equal(core.damage(100,"physical",{hp:1000,armor:100},{armorFlat:50}).post,66.7);
assert.equal(core.autoAttack({ad:100,manualPen:{}},{hp:100,armor:0}).lethal,true);
assert.equal(core.autoAttack({ad:100,manualPen:{}},{hp:1000,armor:0},{crit:true}).post,200);
const sourceData={...mid,ap:100,ad:200,bonusAD:50,manualPen:{}};
const dummy={hp:1500,maxHp:4000,armor:100,mr:50};
const yasuo=core.verifiedAbility("Yasuo","Q",5,sourceData,dummy);
assert.equal(yasuo.raw,320);assert.equal(yasuo.post,160);
const mao=core.verifiedAbility("Maokai","Q",1,sourceData,dummy);
assert.equal(mao.raw,225); // 75 + 2.5% of MAX 4000 + 50% AP 100 = 225
assert.equal(mao.post,150);
const viktor=core.verifiedAbility("Viktor","R",1,sourceData,dummy);
assert.equal(viktor.raw,160);
assert.equal(core.verifiedAbility("Aphelios","Q",5,sourceData,dummy),null);
assert.equal(core.verifiedAbility("Yasuo","Q",0,sourceData,dummy),null);
const userFormula={enabled:true,spell:"Q",type:"magic",base:100,ap:.5,targetMaxHPPct:5};
assert.equal(core.customAbility(userFormula,1,sourceData,dummy).raw,350);
assert.equal(core.customAbility(userFormula,0,sourceData,dummy),null);
const ranks=core.validateSkillRanks({Q:5,W:5,E:5,R:3},6,"MID",false,"Yasuo");
assert(ranks.warnings.length>0);
assert.equal(ranks.available,6);
console.log("PASS: all-champion level model, 2026 role quests, item stats, resistances, verified formulas and unknown-skill guard");

// Integration smoke: offline DOM fixture + mock item and champion detail data.
const callbacks={},ids={};
function makeElement(tag){
 const e={tagName:tag,children:[],options:[],style:{},value:"",checked:false,textContent:"",className:"",
 append(...xs){this.children.push(...xs);if(tag==="select")this.options=this.children;},
 replaceChildren(...xs){this.children=xs;if(tag==="select")this.options=xs;},
 addEventListener(name,fn){this["on"+name]=fn;},setAttribute(name,value){this[name]=value;}};
 return e;
}
const document={
 createElement:makeElement,
 getElementById(id){return ids[id]??(ids[id]=makeElement(id));},
 addEventListener(n,fn){(callbacks[n]??=[]).push(fn);}
};
const $=id=>document.getElementById(id);
const fakeCore={champions:()=>[{id:"Yasuo",name:"야스오",stats:data.stats},{id:"Aphelios",name:"아펠리오스",stats:data.stats}],
 icon:id=>"https://ddragon.leagueoflegends.com/cdn/16.22.1/img/champion/"+id+".png",
 switchTab(){}};
win.RiftCore=fakeCore;
const fixtureItems={
 "1001":{name:"장화",maps:{"11":true},gold:{purchasable:true,total:300},tags:["Boots"],stats:{FlatMovementSpeedMod:25}},
 "3072":{name:"검",maps:{"11":true},gold:{purchasable:true,total:3000},stats:{FlatPhysicalDamageMod:40}}
};
async function fetchMock(uri){
 const url=String(uri);let payload;
 if(url.endsWith("item.json"))payload={data:fixtureItems};
 else if(url.includes("/champion/")){const id=url.split("/").at(-1).replace(".json","");
  payload={data:{[id]:{spells:[{name:"Q",maxrank:5},{name:"W",maxrank:5},{name:"E",maxrank:5},{name:"R",maxrank:3}]}}};}
 else throw Error("Unexpected request "+url);
 return {ok:true,json:async()=>payload};
}
new Function("window","document","fetch","console","Blob","URL","setTimeout",read("damage-ui.js"))(win,document,fetchMock,{warn(){}},Blob,URL,setTimeout);
const defaults={damageRole:"MID",damageLevel:"6",damageTargetHP:"1800",damageTargetMaxHP:"2500",damageTargetArmor:"100",damageTargetMR:"70",damageCustomType:"magic",damageCustomSpell:"Q",damageCustomBase:"100",damageCustomTotalAD:"0",damageCustomBonusAD:"0",damageCustomAP:"0",damageCustomMaxHP:"0",damageCustomMissingHP:"0",damageExtraAD:"0",damageExtraAP:"0",damageExtraHP:"0",damageArmorPen:"0",damageLethality:"0",damageMagicPen:"0",damageMagicFlat:"0"};
for(const [id,value] of Object.entries(defaults))$(id).value=value;
(async()=>{
 for(const cb of callbacks.DOMContentLoaded)cb();
 await Promise.resolve();await Promise.resolve();await Promise.resolve();await Promise.resolve();
 const ui=win.LeagueDamageLab;
 assert(ui,"damage UI connected");
 assert($("damageChampion").children.length===2,"all fixture champions included");
 ui.setChampion("Yasuo");await Promise.resolve();await Promise.resolve();
 assert.equal(ui.getState().champion,"Yasuo");
 $("damageRole").value="ADC";$("damageQuest").checked=true;$("damageQuest").onchange();
 $("damageItemSearch").value="장화";$("damageItemSearch").oninput();
 assert.equal($("damageItemCatalog").children.length,1);
 $("damageItemCatalog").children[0].onclick();
 assert.equal(ui.getState().questBoot,"1001");
 assert.equal($("damageEquipped").children.length,7);
 $("damageQuest").checked=false;$("damageQuest").onchange();
 assert.equal(ui.getState().questBoot,null);
 assert(ui.getState().items.includes("1001"));
 console.log("PASS: all-champion selection, ADC quest extra boots slot, item rollback");
})().catch(e=>{console.error(e);process.exitCode=1;});
