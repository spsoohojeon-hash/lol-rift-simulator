/* LEAGUE LAB v0.7: all champion item/skill/quest/target damage laboratory.
 * No skill result is shown unless a patch-verified formula or explicit custom formula exists.
 */
(function(){
"use strict";
let core,calculator,selectedId="Aphelios",version="16.22.1",details=null,itemMap={},catalog=[],items=[],ranks={Q:0,W:0,E:0,R:0},selectedItemSearch="",questBoot=null;
const $=id=>document.getElementById(id);
const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;};
const num=(id,fallback=0)=>{const x=Number($(id).value);return Number.isFinite(x)?x:fallback;};
const setText=(id,text)=>{$(id).textContent=String(text);};
const fmt=n=>Number.isFinite(+n)?Number(n).toLocaleString("ko-KR",{maximumFractionDigits:1}):"—";
const attribute=(n,k,v)=>n.setAttribute(k,v);
const statVersion=()=>{
 try{const c=core.champions()[0];const m=core.icon(c.id).match(/\/cdn\/([^/]+)\/img\//);return m?.[1]||"16.22.1";}catch(e){return"16.22.1";}
};
const currentChampion=()=>core.champions().find(c=>c.id===selectedId)||null;
const role=()=>$("damageRole").value||"MID";
const quest=()=>$("damageQuest").checked;
const level=()=>Math.round(num("damageLevel",6));
const itemIds=()=>items.filter(Boolean).concat(questBoot&&quest()&&role()==="ADC"?[questBoot]:[]);
const maxRanks=()=>{
 if(details?.spells?.length>=4)return details.spells.slice(0,4).map(s=>s.maxrank||5);
 return [5,5,5,3];
};
function currentSkillValidation(){return calculator.validateSkillRanks(ranks,level(),role(),quest(),selectedId);}
function capsLevel(){
 const top=role()==="TOP"&&quest(),cap=top?20:18;
 const e=$("damageLevel");e.max=cap;e.value=calculator.normalizeLevel(e.value,role(),quest());
 setText("damageQuestNote",calculator.QUEST[role()].description+(top?" · 19·20레벨 능력치 성장값은 근사 외삽이야.":""));
}
function clampRankInLevel(){
 const validation=currentSkillValidation();const legalPoints=Math.min(18,level());
 for(const k of calculator.ABILITIES){
  ranks[k]=Math.min(Math.max(0,ranks[k]||0),k==="R"?3:5);
 }
 while(calculator.ABILITIES.reduce((s,k)=>s+ranks[k],0)>legalPoints){
  const next=calculator.ABILITIES.find(k=>ranks[k]>0);
  if(!next)break;ranks[next]--;
 }
 if(!["Jayce","Elise","Nidalee","Karma","Udyr"].includes(selectedId)){
  const rMax=level()<6?0:level()<11?1:level()<16?2:3;
  ranks.R=Math.min(ranks.R,rMax);
 }
 return validation;
}
function bonus(){
 return {bonusAD:num("damageExtraAD"),ap:num("damageExtraAP"),health:0+num("damageExtraHP"),armorPenPct:num("damageArmorPen"),lethality:num("damageLethality"),magicPenPct:num("damageMagicPen"),magicPenFlat:num("damageMagicFlat")};
}
function target(){
 return {hp:Math.max(1,num("damageTargetHP",1800)),maxHp:Math.max(1,num("damageTargetMaxHP",1800)),armor:num("damageTargetArmor",100),mr:num("damageTargetMR",70)};
}
function stats(){
 return calculator.statBuild(currentChampion(),level(),role(),quest(),itemIds(),itemMap,bonus());
}
function infoLabel(text,cls=""){return node("div",cls||"damage-info",text);}
function resultCard(title,res,caption,source){
 const box=node("div","damage-result-card");
 box.append(node("strong","",title));
 if(!res){box.append(node("p","damage-result-empty",caption||"검증된 자동 피해 공식 없음"));return box;}
 const grid=node("div","damage-result-values");
 for(const [label,v] of [["기본 피해",fmt(res.raw)],["최종 피해",fmt(res.post)],["피해 후 체력",fmt(res.hpLeft)]]){
  const x=node("div","");x.append(node("small","",label),node("strong","",v));grid.append(x);
 }
 box.append(grid);
 const status=node("div","sub",(res.lethal?"처치 가능 · ":"")+"피해 유형: "+({physical:"물리",magic:"마법",true:"고정"}[res.type]||res.type)+(res.hpPercent!=null?" · 대상 현재 HP의 "+res.hpPercent.toFixed(1)+"%":""));
 box.append(status);
 if(caption)box.append(node("div","damage-result-note",caption));
 if(source){
  const a=node("a","portal-external","해당 공식의 출처");a.href=source;a.target="_blank";a.rel="noopener noreferrer";box.append(a);
 }
 return box;
}
function autoEquation(skill,rank,s,t){
 return rank?calculator.verifiedAbility(selectedId,skill,rank,s,t):null;
}
function renderRanks(){
 const root=$("damageRanks");root.replaceChildren();
 const cap=maxRanks();
 const v=currentSkillValidation(),points=calculator.ABILITIES.reduce((a,k)=>a+ranks[k],0);
 const top=node("p","sub","스킬 포인트 "+points+" / "+Math.min(level(),18)+" · 선택한 레벨에 맞춰 랭크를 조절할 수 있어.");
 root.append(top);
 for(let i=0;i<calculator.ABILITIES.length;i++){
  const key=calculator.ABILITIES[i],rank=ranks[key]||0,max=cap[i]||((key==="R")?3:5);
  const title=details?.spells?.[i]?.name||key+" 스킬",line=node("div","damage-rank-row");
  line.append(node("span","damage-rank-name",key+" · "+title));
  const controls=node("span","damage-rank-buttons");
  const minus=node("button","small","−"),plus=node("button","small","+");
  minus.disabled=rank<=0;minus.onclick=()=>{ranks[key]=Math.max(0,rank-1);render();};
  const spent=calculator.ABILITIES.reduce((a,k)=>a+(ranks[k]||0),0);
  const special=["Jayce","Elise","Nidalee","Karma","Udyr"].includes(selectedId);
  const maxByLevel=key==="R"&&!special?(level()<6?0:level()<11?1:level()<16?2:3):
   special?max:key==="R"?max:Math.floor((level()+1)/2);
  plus.disabled=rank>=max||rank>=maxByLevel||spent>=Math.min(18,level());
  plus.onclick=()=>{ranks[key]=Math.min(max,rank+1);render();};
  controls.append(minus,node("strong","",rank+" / "+max),plus);
  line.append(controls);root.append(line);
 }
 setText("damageSkillWarnings",v.warnings.length?v.warnings.join(" · "):
 "일반 스킬 배분 규칙을 참고해 조절해. 형태 전환·특수 스킬 챔피언은 실제 툴팁과 다를 수 있어.");
}
function renderChampionSelect(){
 const root=$("damageChampion"),list=core.champions().slice().sort((a,b)=>a.name.localeCompare(b.name,"ko"));
 root.replaceChildren();
 for(const c of list){const o=node("option","",c.name);o.value=c.id;root.append(o);}
 if(!list.some(x=>x.id===selectedId))selectedId=list[0]?.id||"";
 root.value=selectedId;
 version=statVersion();setText("damagePatch","Data Dragon "+version+" · 공식 스킬 계산 적용은 검증된 일부 공식에 한함");
}
function itemOption(itemId){
 const d=itemMap[String(itemId)]||{},button=node("button","damage-item-choice");
 const img=node("img");img.src="https://ddragon.leagueoflegends.com/cdn/"+version+"/img/item/"+itemId+".png";img.alt="";
 button.append(img,node("span","",d.name||"아이템 "+itemId));
 button.onclick=()=>addItem(String(itemId));return button;
}
function isBoot(id){
 const d=itemMap[String(id)];return d?.tags?.includes("Boots")===true||/신발|장화|구두|발걸음|장갑화/.test(d?.name||"");
}
function hasQuestBoot(){return quest()&&role()==="ADC";}
function addItem(id){
 if(items.includes(id)||questBoot===id){setText("damageItemHint","같은 아이템 중복 장착은 지원하지 않아.");return;}
 if(hasQuestBoot()&&isBoot(id)){
  if(questBoot){setText("damageItemHint","전용 신발 슬롯이 이미 가득 찼어.");return;}
  questBoot=id;setText("damageItemHint","신발이 퀘스트 슬롯으로 이동했어.");render();return;
 }
 if(items.length>=6){setText("damageItemHint","일반 아이템 6칸이 가득 찼어.");return;}
 items.push(id);setText("damageItemHint","");render();
}
function renderItems(){
 const root=$("damageItemCatalog"),q=$("damageItemSearch").value.trim().toLowerCase();root.replaceChildren();
 let displayed=0;
 for(const item of catalog){
  if(q&&!(item.name+" "+item.id).toLowerCase().includes(q))continue;
  if(displayed++>=40)break;
  root.append(itemOption(item.id));
 }
 if(!displayed)root.append(node("p","sub","아이템 정보를 불러오는 중이거나 검색 결과가 없어."));
 const slots=$("damageEquipped");slots.replaceChildren();
 if(!hasQuestBoot()&&questBoot){
  if(items.length<6)items.push(questBoot);
  else setText("damageItemHint","원딜 퀘스트 해제로 신발 전용 슬롯의 장비가 해제됐어.");
  questBoot=null;
 }
 if(hasQuestBoot()&&!questBoot){
  const bootIndex=items.findIndex(isBoot);
  if(bootIndex>=0)questBoot=items.splice(bootIndex,1)[0];
 }
 const max=hasQuestBoot()?7:6;
 for(let i=0;i<max;i++){
  const id=i===6?questBoot:items[i],area=node("div","damage-item-slot");
  if(id){
   const d=itemMap[id]||{};const image=node("img");image.src="https://ddragon.leagueoflegends.com/cdn/"+version+"/img/item/"+id+".png";image.alt=d.name||id;
   area.append(image,node("span","",d.name||id));
   const remove=node("button","small","×");remove.title="제거";remove.onclick=()=>{if(i===6)questBoot=null;else items.splice(i,1);render();};area.append(remove);
  }else area.append(node("span","sub",i===6?"퀘스트 신발 슬롯":"아이템 "+(i+1)));
  slots.append(area);
 }
}
async function loadChampionDetails(){
 const id=selectedId,patch=version;details=null;render();
 try{
  const response=await fetch("https://ddragon.leagueoflegends.com/cdn/"+patch+"/data/ko_KR/champion/"+encodeURIComponent(id)+".json");
  if(!response.ok)throw Error("HTTP "+response.status);
  const data=(await response.json()).data?.[id];
  if(id!==selectedId)return;
  details=data||null;
 }catch(e){if(id===selectedId)details=null;}
 if(id===selectedId)render();
}
async function loadItems(){
 try{
 const v=statVersion();version=v;
 const response=await fetch("https://ddragon.leagueoflegends.com/cdn/"+v+"/data/ko_KR/item.json");
 if(!response.ok)throw Error("HTTP "+response.status);
 const raw=(await response.json()).data||{};
 itemMap=raw;
 catalog=Object.entries(raw).filter(([id,item])=>
  item?.maps?.["11"]&&item?.gold?.purchasable&&!item?.hideFromAll&&
  item.gold.total>0&&/^\d{4,6}$/.test(id)&&
  !["22","32","67"].includes(id.slice(0,2))&&item.name)
  .map(([id,item])=>({id,name:item.name,price:item.gold.total}))
  .sort((a,b)=>b.price-a.price||a.name.localeCompare(b.name,"ko"));
 }catch(e){console.warn("Item catalog offline",e);}
 render();
}
function renderDetailList(){
 const root=$("damageAbilityDetail");root.replaceChildren();
 for(let i=0;i<4;i++){
  const k=calculator.ABILITIES[i],skill=details?.spells?.[i];
  const x=node("div","damage-ability-line");
  x.append(node("strong","",k+" · "+(skill?.name||"스킬 설명 로딩 중")));
  const desc=(skill?.description||"").replace(/<[^>]*>/g," ").replace(/\{\{[^}]+\}\}/g,"(게임 내 수치)").replace(/\s+/g," ").trim();
  if(desc)x.append(node("p","sub",desc));
  const verified=calculator.VERIFIED[selectedId]?.[k];
  x.append(node("div","damage-verified-note",verified?
   "공식 26.22 피해식 확인됨: "+verified.name:"자동 피해 공식 미검증 · 수동 피해식 입력 가능"));
  root.append(x);
 }
}
function render(){
 if(!core||!calculator)return;
 capsLevel();clampRankInLevel();
 renderRanks();renderItems();
 const champ=currentChampion(),s=stats(),t=target();
 const h=$("damageChampionHeader");h.replaceChildren();
 if(champ){
  const img=node("img");img.src=core.icon(champ.id);img.alt=champ.name;
  h.append(img,node("strong","",champ.name+" · Lv."+s.level+" "+role()+(quest()?" · 퀘스트 완료":"")));
 }
 if(!champ?.stats||!Number.isFinite(Number(champ.stats.hp))){
  $("damageStatSummary").replaceChildren(node("p","damage-result-empty","공식 Data Dragon 능력치를 불러오지 못했어. 임의 수치로 표시하지 않아."));
  $("damageResults").replaceChildren(node("p","damage-result-empty","공식 챔피언 기본 능력치 연결 후 데미지 계산을 사용할 수 있어."));
  $("damageCustomResult").replaceChildren(node("p","damage-result-empty","공식 챔피언 스탯 로딩 후 활성화돼."));
  renderDetailList();return;
 }
 const summary=$("damageStatSummary");summary.replaceChildren();
 for(const [title,val] of [["총 공격력",s.ad],["추가 AD",s.bonusAD],["주문력",s.ap],["최대 체력",s.hp],["방어력",s.armor],["마저",s.mr],["공격속도",s.attackSpeed],["치명타 확률",s.critChance+"%"]]){
  const b=node("div","damage-stat");b.append(node("small","",title),node("strong","",typeof val==="string"&&val.endsWith("%")?val:fmt(val)));summary.append(b);
 }
 const results=$("damageResults");results.replaceChildren();
 results.append(resultCard("일반 기본 공격",calculator.autoAttack(s,t,{crit:$("damageCrit").checked}),
  "방어력 적용 후 1회 피해 · 스킬/아이템 고유 효과 미반영"));
 for(const k of calculator.ABILITIES){
  const v=autoEquation(k,ranks[k]||0,s,t);
  results.append(resultCard(k+" 스킬 ("+(ranks[k]||0)+"레벨)",v,
   ranks[k]===0?"스킬을 먼저 올려야 해.":v?"공식 패치 노트로 확인된 한 번의 피해만 반영":"검증된 26.22 자동 피해 공식이 없어. 아래 직접 공식 입력을 이용해.",v?.source));
 }
 const custom=calculator.customAbility({
  enabled:$("damageCustomEnabled").checked,spell:$("damageCustomSpell").value,type:$("damageCustomType").value,
  base:num("damageCustomBase"),totalAD:num("damageCustomTotalAD"),bonusAD:num("damageCustomBonusAD"),ap:num("damageCustomAP"),
  targetMaxHPPct:num("damageCustomMaxHP"),targetMissingHPPct:num("damageCustomMissingHP")
 },ranks[$("damageCustomSpell").value]||0,s,t);
 const cr=$("damageCustomResult");cr.replaceChildren();
 cr.append(resultCard("직접 입력한 스킬 공식",custom,custom?"직접 입력한 수치이며 검증된 공식이라는 의미는 아냐.":"직접 피해식 계산을 활성화하면 결과가 보여."));
 renderDetailList();
}
function resetSelected(id){
 if(!core.champions().some(x=>x.id===id))return;
 selectedId=id;details=null;ranks={Q:1,W:0,E:0,R:0};
 $("damageChampion").value=id;
 loadChampionDetails();
}
function exportSettings(){
 const values={champion:selectedId,patch:version,level:level(),role:role(),quest:quest(),ranks:{...ranks},items:items.slice(),questBoot:questBoot,target:target(),additionalStats:bonus(),
  warning:"Riot Data Dragon structured stats + patch verified few skills; not game-accurate all ability calculator"};
 const blob=new Blob([JSON.stringify(values,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=node("a");a.href=url;a.download="league-lab-damage-"+selectedId+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),500);
}
function attachListeners(){
 $("damageChampion").onchange=e=>resetSelected(e.target.value);
 const controls=["damageRole","damageLevel","damageQuest","damageExtraAD","damageExtraAP","damageExtraHP",
  "damageArmorPen","damageLethality","damageMagicPen","damageMagicFlat","damageTargetHP","damageTargetMaxHP","damageTargetArmor",
  "damageTargetMR","damageCrit","damageCustomSpell","damageCustomType","damageCustomBase","damageCustomTotalAD","damageCustomBonusAD",
  "damageCustomAP","damageCustomMaxHP","damageCustomMissingHP","damageCustomEnabled"];
 controls.forEach(id=>$(id).addEventListener("change",()=>render()));
 $("damageItemSearch").oninput=()=>renderItems();
 $("damageExport").onclick=exportSettings;
}
function init(){
 core=window.RiftCore;calculator=window.LeagueDamageCore;if(!core||!calculator)return;
 renderChampionSelect();attachListeners();
 $("tabDamage").onclick=()=>core.switchTab("damage");
 resetSelected(core.champions().some(c=>c.id==="Aphelios")?"Aphelios":core.champions()[0]?.id);
 loadItems();
 window.LeagueDamageLab={
  refreshChampions:function(){const id=selectedId;renderChampionSelect();if(core.champions().some(c=>c.id===id))resetSelected(id);loadItems();},
  open:function(id){core.switchTab("damage");if(id&&selectedId!==id)resetSelected(id);else render();},
  getState:function(){return {champion:selectedId,level:level(),role:role(),quest:quest(),ranks:{...ranks},items:items.slice(),questBoot:questBoot,stats:stats(),target:target()};},
  setChampion:resetSelected
 };
 render();
}
document.addEventListener("DOMContentLoaded",init);
})();
