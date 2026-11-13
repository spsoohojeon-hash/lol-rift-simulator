/* LEAGUE LAB v0.7 — deterministic, limited stat and single-hit damage model.
 * Riot Data Dragon provides base stats and item flat modifiers, but NOT authoritative
 * per-champion skill formulas or item passive scripts. Never silently invent formulas.
 * Patch-specific formulas are explicitly versioned, sourced and limited to ONE hit.
 */
(function(root){
"use strict";
const PATCH="26.22";
const QUEST={
 TOP:{label:"탑",maxLevel:20,description:"완료: 최대 레벨 20, +600 경험치, 이후 경험치 보너스 및 강화 텔레포트 (데미지에 직접 적용되지 않음)."},
 JUNGLE:{label:"정글",maxLevel:18,description:"완료: 펫 진화, 강화 강타 및 정글/강가 이동속도 증가 (여기서는 스킬·강타 추가 피해 제외)."},
 MID:{label:"미드",maxLevel:18,description:"완료: 2단계 신발 자동 업그레이드 및 +8% 추가 공격력·주문력 (신발 업그레이드 효과는 수동 선택 필요)."},
 ADC:{label:"원딜",maxLevel:18,description:"완료: +300골드, 미니언·처치 추가 골드, 신발 전용 슬롯 개방. 인벤토리 최대 6개 + 신발 슬롯 1개."},
 SUPPORT:{label:"서포터",maxLevel:18,description:"완료: 제어 와드 전용 슬롯, 와드 가격 인하 및 서포터 아이템 효과 (직접 피해는 별도 검증 필요)."}
};
const ABILITIES=["Q","W","E","R"];
const norm=(n,low=0,high=1e9)=>Math.max(low,Math.min(high,Number.isFinite(Number(n))?Number(n):low));
function statGrowth(level){const n=norm(level,1,20)-1;return n*(0.7025+0.0175*n);}
function normalizeLevel(level,role,quest){
 const cap=role==="TOP"&&quest?20:18;return Math.round(norm(level,1,cap));
}
function sumItemStats(items,dict){
 const result={},ids=[];
 for(const id of (Array.isArray(items)?items:[]).slice(0,7)){
  const item=dict&&dict[String(id)];if(!item)continue;
  ids.push(String(id));
  for(const [k,v] of Object.entries(item.stats||{})){
   if(Number.isFinite(Number(v)))result[k]=(result[k]||0)+Number(v);
  }
 }
 return {stats:result,itemIds:ids};
}
function statBuild(champion,level,role,quest,items,dict,manual){
 const base=champion?.stats||{},lv=normalizeLevel(level,role,quest),g=statGrowth(lv);
 const eq=sumItemStats(items,dict),item=eq.stats,extra=manual||{};
 const value=(k,def)=>Number.isFinite(+base[k])?+base[k]:def;
 const hp=value("hp",600)+value("hpperlevel",95)*g+(item.FlatHPPoolMod||0)+norm(extra.health);
 const baseAD=value("attackdamage",60)+value("attackdamageperlevel",3)*g;
 const itemAD=(item.FlatPhysicalDamageMod||0)+norm(extra.bonusAD);
 const itemAP=(item.FlatMagicDamageMod||0)+norm(extra.ap);
 // Mid quest 26.11+ gives 8% bonus AD and AP (not 8% total AD).
 const bonusAD=itemAD*(role==="MID"&&quest?1.08:1);
 const AP=itemAP*(role==="MID"&&quest?1.08:1);
 const armor=value("armor",30)+value("armorperlevel",3)*g+(item.FlatArmorMod||0)+norm(extra.armor);
 const mr=value("spellblock",30)+value("spellblockperlevel",1.3)*g+(item.FlatSpellBlockMod||0)+norm(extra.mr);
 const totalAD=baseAD+bonusAD;
 const rawAS=value("attackspeed",0.65)*(1+value("attackspeedperlevel",2)*g/100+(item.PercentAttackSpeedMod||0)+norm(extra.attackSpeedPct,0,400)/100);
 const attackRange=value("attackrange",175);
 return {
  patch:PATCH,level:lv,role,quest:!!quest,questDescription:(QUEST[role]||QUEST.TOP).description,
  hp:hp,ad:totalAD,baseAD,bonusAD,ap:AP,armor,mr,attackRange,
  attackSpeed:Math.max(.05,rawAS),critChance:norm((item.FlatCritChanceMod||0)*100+norm(extra.critChance),0,100),
  moveSpeed:value("movespeed",335)+(item.FlatMovementSpeedMod||0),
  items:eq.itemIds,itemData:item,
  manualPen:{armorPercent:norm(extra.armorPenPct+(item.PercentArmorPenetrationMod||0)*100,0,100),magicPercent:norm(extra.magicPenPct+(item.PercentMagicPenetrationMod||0)*100,0,100),armorFlat:norm(extra.lethality+(item.FlatArmorPenetrationMod||0),0,150),magicFlat:norm(extra.magicPenFlat+(item.FlatMagicPenetrationMod||0),0,150)},
  assumptions:[
   "챔피언 기본 능력치 및 아이템 구조화 수치는 Riot Data Dragon 기준",
   "아이템 고유 효과, 스택, 사용 효과, 스킬 적중 횟수, 룬 추가 피해는 자동 계산하지 않음",
   lv>18?"19·20레벨 스탯은 표준 성장 계수 외삽값이며 실제 게임 수치와 차이 날 수 있음":null
  ].filter(Boolean)
 };
}
function validateSkillRanks(ranks,level,role,quest,championId){
 const lv=normalizeLevel(level,role,quest),rs=ABILITIES.map(k=>Math.floor(norm(ranks?.[k],0,6)));
 const championsWithLevelOneR=new Set(["Jayce","Elise","Nidalee","Karma","Udyr"]);
 const special=championsWithLevelOneR.has(championId);
 const caps=special?(championId==="Udyr"?[6,6,6,6]:[5,5,5,3]):[5,5,5,3];
 const result={},warnings=[];
 rs.forEach((v,i)=>{result[ABILITIES[i]]=Math.min(v,caps[i]);if(v>caps[i])warnings.push(ABILITIES[i]+" 최대 랭크 초과");});
 if(rs.reduce((s,v)=>s+v,0)>Math.min(18,lv))warnings.push("레벨에 비해 사용한 스킬 포인트가 많음");
 if(!special&&result.R>Math.max(0,Math.floor((lv-1)/5)))warnings.push("궁극기 랭크는 일반적으로 6·11·16레벨에 해금");
 return {ranks:result,warnings,spent:rs.reduce((s,v)=>s+v,0),available:Math.min(18,lv)};
}
function safeResist(resist,percentPen=0,flatPen=0){
 const amount=norm(resist,-999,10000);
 // Flat reduction cannot remove negative resist and penetration is not applied to negative values.
 if(amount<=0)return amount;
 return Math.max(0,amount*(1-norm(percentPen,0,100)/100)-norm(flatPen,0,1000));
}
function damage(raw,type,target,pen){
 const input=norm(raw,0,1e8),t=target||{},p=pen||{};
 const resist=type==="physical"?safeResist(t.armor,p.armorPercent,p.armorFlat):
               type==="magic"?safeResist(t.mr,p.magicPercent,p.magicFlat):0;
 const multiplier=type==="true"?1:resist>=0?100/(100+resist):2-100/(100-resist);
 const value=input*multiplier;
 return {raw:input,type,post:Math.round(value*10)/10,effectiveResist:resist,
  hpLeft:Math.max(0,norm(t.hp,0,1e9)-value),
  hpPercent:norm(t.hp,0,1e9)>0?Math.min(100,value/norm(t.hp,1,1e9)*100):null,
  lethal:value>=norm(t.hp,0,1e9)&&norm(t.hp,0,1e9)>0
 };
}
function autoAttack(stats,target,options){
 const crit=!!options?.crit,raw=stats.ad*(crit?2:1);
 return {...damage(raw,"physical",target,stats.manualPen),name:crit?"치명타 평타 (기본 ×2)":"일반 평타",notes:"온힛/온어택·치명타 피해량 변경·방어 효과·아이템 고유 효과 제외"};
}
const VERIFIED={
 Yasuo:{Q:{name:"강철 폭풍 1회 적중",type:"physical",base:[20,45,70,95,120],totalAD:1,source:"https://www.leagueoflegends.com/en-us/news/game-updates/league-of-legends-patch-26-22-notes/"}},
 Maokai:{Q:{name:"덤불 주먹 1회 적중",type:"magic",base:[75,120,165,210,255],targetMaxHP:[.025,.03,.035,.04,.045],ap:.5,source:"https://www.leagueoflegends.com/en-us/news/game-updates/league-of-legends-patch-26-22-notes/"}},
 Thresh:{R:{name:"영혼 감옥의 첫 벽",type:"magic",base:[200,350,500],ap:1,source:"https://www.leagueoflegends.com/en-us/news/game-updates/league-of-legends-patch-26-22-notes/"}},
 Smolder:{W:{name:"에취! 폭발 피해 (직격 별도)",type:"physical",base:[25,50,75,100,125],bonusAD:.5,ap:.8,source:"https://www.leagueoflegends.com/en-us/news/game-updates/league-of-legends-patch-26-22-notes/"}},
 Viktor:{R:{name:"혼돈의 폭풍 첫 적중 (지속 피해 별도)",type:"magic",base:[100,175,250],ap:.6,source:"https://www.leagueoflegends.com/en-us/news/game-updates/league-of-legends-patch-26-22-notes/"}}
};
function formulaDamage(formula,rank,stats,target){
 if(!formula||rank<1)return null;
 const idx=Math.min((formula.base||[0]).length-1,Math.max(0,rank-1));
 const val=key=>Array.isArray(formula[key])?Number(formula[key][idx]??0):Number(formula[key]||0);
 const raw=val("base")+val("totalAD")*stats.ad+val("bonusAD")*stats.bonusAD+
   val("ap")*stats.ap+val("ownMaxHP")*stats.hp+val("targetMaxHP")*norm(target.maxHp??target.hp)+
   val("targetMissingHP")*Math.max(0,norm(target.maxHp??target.hp)-norm(target.hp));
 return {...damage(Math.max(0,raw),formula.type||"physical",target,stats.manualPen),name:formula.name||"스킬 피해",rank,source:formula.source||null};
}
function verifiedAbility(championId,spell,rank,stats,target){
 return formulaDamage(VERIFIED[championId]?.[spell],rank,stats,target);
}
function customAbility(formula,rank,stats,target){
 if(!formula||!formula.enabled)return null;
 const base=norm(formula.base,0,100000);
 const f={
  name:"사용자 지정 "+formula.spell+" 1회 적중",type:formula.type,
  base:[base],totalAD:norm(formula.totalAD,0,10),bonusAD:norm(formula.bonusAD,0,10),
  ap:norm(formula.ap,0,10),targetMaxHP:norm(formula.targetMaxHPPct,0,100)/100,
  targetMissingHP:norm(formula.targetMissingHPPct,0,100)/100
 };
 return formulaDamage(f,1,stats,target);
}
const api={PATCH,QUEST,ABILITIES,VERIFIED,statGrowth,normalizeLevel,sumItemStats,statBuild,validateSkillRanks,damage,autoAttack,verifiedAbility,customAbility};
root.LeagueDamageCore=Object.freeze(api);
})(typeof window!=="undefined"?window:globalThis);
