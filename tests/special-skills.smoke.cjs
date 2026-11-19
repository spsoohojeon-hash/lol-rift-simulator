/* node tests/special-skills.smoke.cjs — all tests use fixtures, no network required. */
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,".."),read=f=>fs.readFileSync(path.join(root,f),"utf8");
const window={};
new Function("window",read("damage-core.js"))(window);
const c=window.LeagueDamageCore;
function ranks(id,lv,requested){return c.validateSkillRanks(requested,lv,"ADC",false,id);}
const bare={Q:0,W:0,E:0,R:0};
assert.deepEqual(ranks("Garen",1,{...bare,Q:1}).ranks,{Q:1,W:0,E:0,R:0});
assert.equal(ranks("Garen",5,{Q:3,R:1}).ranks.R,0);
assert.equal(ranks("Garen",6,{Q:3,W:2,R:1}).spent,6);
assert.deepEqual(ranks("Jayce",1,{Q:1}).ranks,{Q:1,W:0,E:0,R:1});
assert.equal(ranks("Jayce",1,{Q:1}).spent,1);
assert.equal(c.rankCap("Jayce","Q",11,"ADC",false),6);
assert.equal(c.rankCap("Jayce","Q",9,"ADC",false),5);
assert.equal(c.rankCap("Udyr","R",15,"ADC",false),5);
assert.equal(c.rankCap("Udyr","R",16,"ADC",false),6);
assert.equal(ranks("Udyr",1,{R:1}).spent,1);
for(const champ of ["Karma","Elise","Nidalee"]){
 assert.equal(ranks(champ,1,{Q:1}).ranks.R,1);
 assert.equal(ranks(champ,1,{Q:1}).spent,1);
 assert.equal(c.rankCap(champ,"R",5,"ADC",false),1);
 assert.equal(c.rankCap(champ,"R",6,"ADC",false),2);
 assert.equal(c.rankCap(champ,"R",16,"ADC",false),4);
 assert.equal(ranks(champ,6,{Q:3,W:2,R:2}).spent,6);
}
assert.equal(c.rankCap("Aphelios","Q",9,"ADC",false),6);
assert.equal(c.rankCap("Aphelios","Q",8,"ADC",false),5);
assert.equal(ranks("Aphelios",1,{Q:1}).ranks.R,0);
assert.equal(ranks("Aphelios",6,{Q:3,W:2,E:1}).ranks.R,1);
assert.equal(ranks("Aphelios",11,{Q:6,W:3,E:2}).ranks.R,2);
assert.equal(ranks("Aphelios",18,{Q:6,W:6,E:6}).ranks.R,3);
assert.equal(ranks("Aphelios",18,{Q:6,W:6,E:6}).spent,18);
const fixture={id:"Aphelios",stats:{hp:600,hpperlevel:102,attackdamage:55,attackdamageperlevel:2.3,armor:26,armorperlevel:4.2,spellblock:30,spellblockperlevel:1.3,attackspeed:.665,attackspeedperlevel:2.1,attackrange:550,movespeed:325}};
const base=c.statBuild(fixture,18,"ADC",false,[],{},{},bare);
const full=c.statBuild(fixture,18,"ADC",false,[],{},{},{Q:6,W:6,E:6,R:3});
assert(Math.abs(full.ad-base.ad-24)<1e-7);
assert.equal(full.specialRankBonus.attackSpeedPct,54);
assert.equal(full.manualPen.armorFlat,27);
const withPen=c.statBuild(fixture,18,"ADC",false,[],{},{lethality:10},{Q:6,W:6,E:6,R:3});
assert.equal(withPen.manualPen.armorFlat,37);
assert(c.SPECIAL_MECHANICS.Kayn.options.includes("다르킨(라아스트)"));
assert(c.SPECIAL_MECHANICS.Kaisa.options.includes("Q 진화"));
assert(c.getSkillSystem("Hwei").kind==="subject");
console.log("PASS: special skill ranks, 1-point innate transforms, Udyr/Jayce limits, Aphelios stats, state tags");
