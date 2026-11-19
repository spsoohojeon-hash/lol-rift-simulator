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

// Skill-point rules are independent from ability damage scripts. As of 26.22:
// - Aphelios purchases Q/W/E *stats*, ultimate improves automatically.
// - Jayce's R transform is innate, while Q/W/E can reach six ranks.
// - Elise/Nidalee/Karma begin with a free rank of R; rank 2/3/4 costs a
//   skill point at level 6/11/16.
// - Udyr has four basic abilities and unlocks rank six only at level 16.
const SPECIAL_SKILLS=Object.freeze({
 Aphelios:{kind:"stat",name:"능력치 투자 / 5무기",max:{Q:6,W:6,E:6,R:3},labels:{Q:"추가 공격력",W:"추가 공격속도",E:"물리 관통력",R:"월광포화"},freeR:"ultimate",
  note:"Q/W/E는 스킬 피해 레벨이 아닌 능력치 투자. 무기 Q와 궁극기는 별도로 변화하며, W는 무기 교체·E는 다음 무기를 알려줘."},
 Jayce:{kind:"transform",name:"무기 변환",max:{Q:6,W:6,E:6,R:1},freeR:"transform",
  note:"Q/W/E 각각 6랭크. R은 1레벨부터 자동 사용하며 스킬 포인트를 쓰지 않아. 캐논/해머 양쪽 스킬은 동일한 랭크를 공유해."},
 Udyr:{kind:"four-basics",name:"네 가지 기본 태세",max:{Q:6,W:6,E:6,R:6},
  note:"우디르는 궁극기가 없으며 R도 기본 스킬. 4개 스킬은 16레벨부터 6랭크까지 투자할 수 있어."},
 Elise:{kind:"transform",name:"인간 / 거미 형태",max:{Q:5,W:5,E:5,R:4},freeR:"first",
  note:"R 변신이 1레벨부터 1랭크로 주어져. R의 추가 3랭크는 6·11·16레벨에 스킬 포인트로 투자해. Q/W/E는 두 형태에서 서로 다른 스킬이야."},
 Nidalee:{kind:"transform",name:"인간 / 쿠거 형태",max:{Q:5,W:5,E:5,R:4},freeR:"first",
  note:"R 변신이 1레벨부터 1랭크로 주어져. R의 추가 3랭크는 6·11·16레벨에 스킬 포인트로 투자해. 쿠거 스킬은 인간형 Q/W/E 랭크의 영향을 받아."},
 Karma:{kind:"empower",name:"만트라 강화",max:{Q:5,W:5,E:5,R:4},freeR:"first",
  note:"만트라 R은 1레벨부터 1랭크로 주어져. R의 추가 3랭크는 6·11·16레벨에 투자해. 강화 Q/W/E는 별도 피해식 검증이 필요해."},
 Hwei:{kind:"subject",name:"주제별 주문 선택",max:{Q:5,W:5,E:5,R:3},
  note:"Q·W·E 각각에서 3개 후속 주문을 선택할 수 있어. QQ/QW/QE 등의 실제 주문 피해는 별도 공식이 검증되어야 계산해."}
});
const SPECIAL_MECHANICS=Object.freeze({
 Aphelios:{label:"무기 순서 / 탄약",type:"select",options:["만월총","절단검","중력포","화염포","반월검"],description:"주무기 선택만 기록. 보조무기·탄약 소모와 무기별 Q/R 계산은 미구현."},
 Jayce:{label:"현재 형태",type:"select",options:["캐논","해머"],description:"현재 변신 형태 기록. 형태별 방어력·사거리·온힛 효과는 피해량 계산에 적용되지 않아."},
 Elise:{label:"현재 형태",type:"select",options:["인간","거미"],description:"형태별 Q/W/E가 다르고 스킬별 피해 계산도 별도로 검증해야 해."},
 Nidalee:{label:"현재 형태",type:"select",options:["인간","쿠거"],description:"사냥 표식과 거리에 따른 강화 피해는 미구현."},
 Karma:{label:"만트라 강화",type:"select",options:["미사용","강화 Q","강화 W","강화 E"],description:"강화 상태 메모용. 강화 스킬의 추가 피해나 보호막은 적용하지 않아."},
 Hwei:{label:"주문 조합",type:"select",options:["QQ","QW","QE","WQ","WW","WE","EQ","EW","EE","R"],description:"상황별 주문 조합 표시 전용. 기본 Q/W/E 랭크만 사용하며 조합별 정확한 피해식은 별도로 검증해야 해."},
 Kaisa:{label:"스킬 진화",type:"select",options:["미진화","Q 진화","W 진화","E 진화","복수 진화"],description:"추가 AD/AP/공격속도 조건에 따른 진화 여부를 메모해. 진화 피해식 자동 적용 전까지 결과는 기초 피해만 반영."},
 Khazix:{label:"궁극기 진화 선택",type:"select",options:["진화 없음","Q 진화","W 진화","E 진화","R 진화","복수 진화"],description:"진화 선택은 6·11·16레벨 및 일부 특별 상황에 따라 제한됨. 이 입력은 상태 메모만 하고 자동 효과를 추가하지 않아."},
 Kayn:{label:"변신",type:"select",options:["미변신","다르킨(라아스트)","그림자 암살자"],description:"변신 전후 스킬 계수와 고유 효과가 다름. 미검증 상태에서는 자동 수치를 추가하지 않아."},
 Viktor:{label:"진화 선택",type:"select",options:["미진화","Q 진화","W 진화","E 진화","R 진화","복수 진화"],description:"진화에 필요한 중첩과 스킬 효과는 별도 판정. 미구현 피해는 계산하지 않아."},
 Syndra:{label:"초월 중첩",type:"number",description:"스킬 강화 임계값을 구분하기 위한 표시용. 실제 강화 수치는 자동 적용되지 않아."},
 Smolder:{label:"스몰더 중첩",type:"number",description:"중첩에 따른 스킬 효과·처형 피해는 자동 계산하지 않아."},
 AurelionSol:{label:"별가루",type:"number",description:"별가루에 따른 능력 강화는 미구현."},
 Veigar:{label:"사악 중첩",type:"number",description:"중첩에 따른 주문력 증가는 자동 계산하지 않아. 추가 주문력 필드를 직접 조절할 수 있어."},
 Nasus:{label:"Q 중첩",type:"number",description:"Q 고유 중첩 피해는 자동 계산하지 않아."},
 Senna:{label:"안개 중첩",type:"number",description:"영혼으로 얻는 능력치 변화는 자동 계산하지 않아."},
 Kindred:{label:"표식 중첩",type:"number",description:"표식에 따른 스킬·사거리 강화는 자동 계산하지 않아."},
 Bard:{label:"종 수집",type:"number",description:"종에 따른 이동 속도·피해 강화는 자동 계산하지 않아."},
 Belveth:{label:"라벤더 중첩",type:"number",description:"중첩에 따른 공격 속도 등은 자동 계산하지 않아."},
 Rengar:{label:"야성 중첩",type:"number",description:"야성/강화 스킬과 추가 효과는 자동 계산하지 않아."},
 Gnar:{label:"분노",type:"number",description:"미니/메가 나르 변신과 스킬 수치 변화는 자동 계산하지 않아."},
 Ornn:{label:"아군 아이템 업그레이드",type:"number",description:"아이템 강화와 본인 보너스 능력치는 검증된 효과가 있을 때만 적용."}
});
function getSkillSystem(id){
 const special=SPECIAL_SKILLS[id];
 return special||{kind:"standard",name:"일반 스킬 배분",max:{Q:5,W:5,E:5,R:3},freeR:null,note:"Q/W/E 최대 5랭크, 궁극기 R은 6·11·16레벨에 투자 가능."};
}
function automaticR(id,lv){
 const system=getSkillSystem(id);
 if(system.freeR==="transform")return 1;
 if(system.freeR==="ultimate")return lv>=16?3:lv>=11?2:lv>=6?1:0;
 return 0;
}
function minRank(id,key,lv){
 if(key!=="R")return 0;
 return getSkillSystem(id).freeR==="first"?1:automaticR(id,lv);
}
function rankCap(id,key,level,role,quest){
 const lv=normalizeLevel(level,role,quest),system=getSkillSystem(id);
 const m=system.max[key]||0;
 if(key==="R"&&["transform","ultimate"].includes(system.freeR))return automaticR(id,lv);
 if(key==="R"&&system.kind==="four-basics")return Math.min(m,lv>=16?6:Math.min(5,Math.floor((lv+1)/2)));
 if(key==="R"&&system.freeR==="first")return lv>=16?4:lv>=11?3:lv>=6?2:1;
 if(key==="R")return lv>=16?Math.min(m,3):lv>=11?Math.min(m,2):lv>=6?Math.min(m,1):0;
 if(id==="Aphelios"){const steps=[1,2,3,5,7,9];return Math.min(m,steps.filter(step=>lv>=step).length);}
 if(id==="Udyr"&&m===6)return lv>=16?6:Math.min(5,Math.floor((lv+1)/2));
 return Math.min(m,Math.max(1,Math.floor((lv+1)/2)));
}
function rankPointCost(id,skill,r){
 const system=getSkillSystem(id);
 if(skill==="R"&&["transform","ultimate"].includes(system.freeR))return 0;
 if(skill==="R"&&system.freeR==="first")return Math.max(0,r-1);
 return r;
}
function skillPointsUsed(id,ranks){return ABILITIES.reduce((sum,key)=>sum+rankPointCost(id,key,Number(ranks?.[key])||0),0);}
function normalizeSkillRanks(ranks,level,role,quest,championId){
 const id=championId||"",lv=normalizeLevel(level,role,quest),data={};
 for(const key of ABILITIES){
  const min=minRank(id,key,lv),max=rankCap(id,key,lv,role,quest);
  data[key]=Math.max(min,Math.min(max,Math.floor(norm(ranks?.[key],0,99))));
 }
 const budget=Math.min(lv,18),order=["E","W","Q","R"];
 while(skillPointsUsed(id,data)>budget){
  const key=order.find(k=>data[k]>minRank(id,k,lv));
  if(!key)break;
  data[key]--;
 }
 return data;
}

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
function statBuild(champion,level,role,quest,items,dict,manual,ranks){
 const base=champion?.stats||{},lv=normalizeLevel(level,role,quest),g=statGrowth(lv);
 const eq=sumItemStats(items,dict),item=eq.stats,extra=manual||{};
 const value=(k,def)=>Number.isFinite(+base[k])?+base[k]:def;
 const hp=value("hp",600)+value("hpperlevel",95)*g+(item.FlatHPPoolMod||0)+norm(extra.health);
 const baseAD=value("attackdamage",60)+value("attackdamageperlevel",3)*g;
 const apheliosRank=champion?.id==="Aphelios"?normalizeSkillRanks(ranks,lv,role,quest,"Aphelios"):{Q:0,W:0,E:0};
 const apheliosBonusAD=4*(apheliosRank.Q||0);
 const apheliosBonusAS=.075*(apheliosRank.W||0);
 const apheliosLethality=4.5*(apheliosRank.E||0);
 const itemAD=(item.FlatPhysicalDamageMod||0)+norm(extra.bonusAD)+apheliosBonusAD;
 const itemAP=(item.FlatMagicDamageMod||0)+norm(extra.ap);
 // Mid quest 26.11+ gives 8% bonus AD and AP (not 8% total AD).
 const bonusAD=itemAD*(role==="MID"&&quest?1.08:1);
 const AP=itemAP*(role==="MID"&&quest?1.08:1);
 const armor=value("armor",30)+value("armorperlevel",3)*g+(item.FlatArmorMod||0)+norm(extra.armor);
 const mr=value("spellblock",30)+value("spellblockperlevel",1.3)*g+(item.FlatSpellBlockMod||0)+norm(extra.mr);
 const totalAD=baseAD+bonusAD;
 const rawAS=value("attackspeed",0.65)*(1+value("attackspeedperlevel",2)*g/100+(item.PercentAttackSpeedMod||0)+norm(extra.attackSpeedPct,0,400)/100+apheliosBonusAS);
 const attackRange=value("attackrange",175);
 return {
  patch:PATCH,level:lv,role,quest:!!quest,questDescription:(QUEST[role]||QUEST.TOP).description,
  hp:hp,ad:totalAD,baseAD,bonusAD,ap:AP,armor,mr,attackRange,
  attackSpeed:Math.max(.05,rawAS),critChance:norm((item.FlatCritChanceMod||0)*100+norm(extra.critChance),0,100),
  moveSpeed:value("movespeed",335)+(item.FlatMovementSpeedMod||0),
  items:eq.itemIds,itemData:item,specialRankBonus:champion?.id==="Aphelios"?{ad:apheliosBonusAD,attackSpeedPct:apheliosBonusAS*100,lethality:apheliosLethality}:null,
  manualPen:{armorPercent:norm(extra.armorPenPct+(item.PercentArmorPenetrationMod||0)*100,0,100),magicPercent:norm(extra.magicPenPct+(item.PercentMagicPenetrationMod||0)*100,0,100),armorFlat:norm(extra.lethality+(item.FlatArmorPenetrationMod||0)+apheliosLethality,0,150),magicFlat:norm(extra.magicPenFlat+(item.FlatMagicPenetrationMod||0),0,150)},
  assumptions:[
   "챔피언 기본 능력치 및 아이템 구조화 수치는 Riot Data Dragon 기준",
   "아이템 고유 효과, 스택, 사용 효과, 스킬 적중 횟수, 룬 추가 피해는 자동 계산하지 않음",
   lv>18?"19·20레벨 스탯은 표준 성장 계수 외삽값이며 실제 게임 수치와 차이 날 수 있음":null
  ].filter(Boolean)
 };
}
function validateSkillRanks(ranks,level,role,quest,championId){
 const id=championId||"",lv=normalizeLevel(level,role,quest),system=getSkillSystem(id);
 const given=Object.fromEntries(ABILITIES.map(k=>[k,Math.floor(norm(ranks?.[k],0,99))]));
 const normalized=normalizeSkillRanks(given,lv,role,quest,id);
 const warnings=[];
 for(const k of ABILITIES){
  if(given[k]!==normalized[k])warnings.push(k+"의 랭크를 "+normalized[k]+"로 조정해야 해.");
 }
 const used=skillPointsUsed(id,normalized),available=Math.min(18,lv);
 return {ranks:normalized,warnings,spent:used,available,remaining:Math.max(0,available-used),
  system:system,rankCaps:Object.fromEntries(ABILITIES.map(k=>[k,rankCap(id,k,lv,role,quest)]))};
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
 if(!formula||!formula.enabled||rank<1)return null;
 const base=norm(formula.base,0,100000);
 const f={
  name:"사용자 지정 "+formula.spell+" 1회 적중",type:formula.type,
  base:[base],totalAD:norm(formula.totalAD,0,10),bonusAD:norm(formula.bonusAD,0,10),
  ap:norm(formula.ap,0,10),targetMaxHP:norm(formula.targetMaxHPPct,0,100)/100,
  targetMissingHP:norm(formula.targetMissingHPPct,0,100)/100
 };
 return formulaDamage(f,1,stats,target);
}
const api={PATCH,QUEST,ABILITIES,VERIFIED,SPECIAL_SKILLS,SPECIAL_MECHANICS,getSkillSystem,automaticR,minRank,rankCap,skillPointsUsed,normalizeSkillRanks,statGrowth,normalizeLevel,sumItemStats,statBuild,validateSkillRanks,damage,autoAttack,verifiedAbility,customAbility};
root.LeagueDamageCore=Object.freeze(api);
})(typeof window!=="undefined"?window:globalThis);
