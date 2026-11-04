/* Rift Lab v0.5 – deterministic teaching model, NOT a Riot-backed matchup or win-rate prediction.
 * Configurable champion archetype estimates. Missing champion traits are neutral, not fabricated.
 * Exports window.RiftAnalytics for UI and node smoke tests.
 */
(function(root){
"use strict";
const ROLES=["TOP","JUNGLE","MID","ADC","SUPPORT"];
const LANES=["TOP","MID","BOT"];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const TRAITS={
 // values: early / wave / engage / peel / scaling / clear; all are rough [-3,+3] editor estimates.
 Jayce:[3,2,0,0,0,0],Olaf:[3,0,2,0,0,2],Ambessa:[2,1,2,0,1,0],Rumble:[2,3,1,0,1,0],
 Gnar:[1,1,2,1,1,0],KSante:[0,0,2,2,2,0],Gwen:[-1,1,1,0,3,0],Sion:[0,1,2,2,1,0],
 Ornn:[-1,0,3,2,3,0],Renekton:[3,1,2,0,-1,0],Camille:[0,0,2,0,2,0],Jax:[0,0,2,0,3,0],
 Poppy:[2,0,2,3,0,1],Gragas:[0,2,2,2,1,2],Fiora:[1,0,0,0,3,0],
 Vi:[2,1,3,0,0,2],Nocturne:[0,1,3,0,2,3],JarvanIV:[2,0,3,1,0,2],
 LeeSin:[3,0,3,1,-1,2],Qiyana:[2,0,3,0,0,1],XinZhao:[3,0,2,0,0,2],
 Sejuani:[-1,0,3,2,1,2],Viego:[1,0,1,0,2,2],Trundle:[2,0,1,0,1,2],
 Skarner:[0,0,3,2,1,1],Maokai:[0,0,3,3,1,1],Taliyah:[1,2,1,1,1,2],
 Orianna:[0,3,2,2,3,0],Syndra:[2,2,2,0,1,0],Cassiopeia:[0,2,1,0,3,0],
 Ryze:[1,2,1,0,2,0],Ahri:[1,2,3,0,1,0],Azir:[-1,3,1,1,3,0],
 Galio:[0,2,3,2,1,0],Viktor:[0,3,0,1,3,0],Anivia:[0,3,1,2,3,0],
 Akali:[1,0,2,0,2,0],Sylas:[1,1,2,0,2,0],Lissandra:[0,2,3,2,1,0],
 Ezreal:[1,0,0,1,2,0],Lucian:[3,2,0,0,0,0],Caitlyn:[3,3,1,0,1,0],
 Kalista:[3,2,1,0,0,0],Varus:[2,2,2,0,2,0],Jhin:[1,2,2,0,1,0],
 Sivir:[-1,3,0,1,3,0],Xayah:[0,2,1,3,3,0],Kaisa:[-1,1,1,0,3,0],
 Zeri:[-2,1,1,0,3,0],Aphelios:[-2,2,0,0,3,0],Jinx:[-1,2,0,0,3,0],
 MissFortune:[2,2,1,0,1,0],Ziggs:[0,3,0,1,2,0],Yunara:[0,1,0,0,2,0],
 Alistar:[2,0,3,2,1,0],Nautilus:[2,0,3,1,0,0],Lulu:[-1,1,1,3,3,0],
 Renata:[-1,1,2,3,3,0],Milio:[-1,0,0,3,3,0],Rakan:[1,1,3,2,1,0],
 Karma:[2,2,1,2,1,0],Bard:[0,0,2,2,2,0],Braum:[0,0,2,3,1,0],
 Leona:[2,0,3,1,0,0],Thresh:[1,0,3,3,1,0],Lux:[1,2,2,1,1,0],
 Nami:[1,1,2,3,1,0],Janna:[-1,1,1,3,2,0],Rell:[1,0,3,2,1,0]
};
const LANE_ROLES={TOP:["TOP"],MID:["MID"],BOT:["ADC","SUPPORT"]};
const CAMP_POS={
 blue:{Blue:[280,618],Gromp:[198,548],Wolves:[315,532],Raptors:[508,625],Red:[542,724],Krugs:[670,744]},
 red:{Blue:[622,273],Gromp:[705,342],Wolves:[580,358],Raptors:[390,276],Red:[356,174],Krugs:[238,157]}
};
const ROUTE={
 "full-top":{label:"6캠프 → 탑",sequence:["Blue","Gromp","Wolves","Raptors","Red","Krugs"],lane:"TOP"},
 "full-bot":{label:"6캠프 → 바텀",sequence:["Red","Krugs","Raptors","Wolves","Blue","Gromp"],lane:"BOT"},
 "three-top":{label:"3캠프 → 탑",sequence:["Blue","Gromp","Red"],lane:"TOP"},
 "three-mid":{label:"3캠프 → 미드",sequence:["Red","Raptors","Blue"],lane:"MID"},
 "three-bot":{label:"3캠프 → 바텀",sequence:["Red","Krugs","Blue"],lane:"BOT"}
};
function trait(id){return TRAITS[id]||[0,0,0,0,0,0];}
function champ(id,list){
 if(!id)return null;
 return (Array.isArray(list)?list:[]).find(x=>x.id===id)||{id:id,name:id,stats:null};
}
function validRoster(roster){
 const src=Array.isArray(roster)?roster:[];
 return src.filter(x=>x&&["red","blue"].includes(x.team)&&ROLES.includes(x.lane)&&typeof x.id==="string");
}
function get(roster,team,role){return roster.find(x=>x.team===team&&x.lane===role)||null;}
function pressureValue(entry,list){
 if(!entry)return 0;
 const t=trait(entry.id),stats=(champ(entry.id,list)||{}).stats||{};
 // These are directional coaching heuristics; range does not imply a proven matchup.
 const range=Number.isFinite(+stats.attackrange)?clamp((+stats.attackrange-175)/475,0,1):0;
 return t[0]*2.8+t[1]*3.2+range*3.4+(t[3]>.5?0.8:0);
}
function laneModel(lane,roster,list){
 const roles=LANE_ROLES[lane];
 const b=roles.map(r=>get(roster,"blue",r)),r=roles.map(x=>get(roster,"red",x));
 const ready=b.every(Boolean)&&r.every(Boolean);
 if(!ready)return {lane:lane,ready:false,blue:b.filter(Boolean),red:r.filter(Boolean),diff:null,verdict:"픽 미완성",notes:["해당 라인의 양 팀 픽이 모두 있어야 비교할 수 있어."]};
 const blueScore=b.reduce((s,e)=>s+pressureValue(e,list),0);
 const redScore=r.reduce((s,e)=>s+pressureValue(e,list),0);
 // Larger support impact in bot duo; no percent/win-rate terminology.
 const diff=clamp(Math.round((blueScore-redScore)*10)/10,-30,30);
 const verdict=Math.abs(diff)<4?"초반 주도권 비슷":diff>0?"블루가 먼저 움직일 가능성":"레드가 먼저 움직일 가능성";
 const abs=Math.abs(diff);
 const confidence=[...b,...r].filter(x=>TRAITS[x.id]).length/(b.length+r.length);
 const notes=[
 "상성 추정 점수 "+(diff>0?"+":"")+diff+" (블루−레드, 승률 아님)",
 "초반 견제·라인 클리어·공격 사거리만 반영. 선수 숙련도·실제 스킬 피해·정글 개입은 제외.",
 confidence<1?"일부 챔피언에 추정 특징값이 없어 보수적으로 계산됨.":"모든 챔피언에 잠정 특징값이 있음."
 ];
 return {lane:lane,ready:true,blue:b,red:r,blueScore:+blueScore.toFixed(1),redScore:+redScore.toFixed(1),diff:diff,verdict:verdict,confidence:confidence,notes:notes,strength:abs<4?"균형":abs<9?"약함":"뚜렷함"};
}
function timeText(s){
 const n=Math.floor(Math.max(0,s)+1e-6);return String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");
}
function routeModel(team,jungler,routeKey,roster,list,startSec){
 const route=ROUTE[routeKey]||ROUTE["full-top"];
 const t=trait(jungler&&jungler.id),clear=t[5]||0;
 const baseClear=clamp(25-2*clear,17,31);
 let sec=clamp(+startSec||95,75,125),prev=null;
 const timeline=[];
 const points=[];
 for(let i=0;i<route.sequence.length;i++){
  const name=route.sequence[i],xy=CAMP_POS[team][name];
  const travel=prev?clamp(Math.round(Math.hypot(xy[0]-prev[0],xy[1]-prev[1])/22),5,18):0;
  sec+=travel;
  const begin=sec;
  sec+=baseClear;
  timeline.push({name:name,start:+begin.toFixed(1),finish:+sec.toFixed(1),label:timeText(begin)+"–"+timeText(sec)});
  points.push({x:xy[0],y:xy[1],name:name});
  prev=xy;
 }
 const lanePos={TOP:[430,130],MID:[450,450],BOT:[640,765]}[route.lane];
 const travel=prev?clamp(Math.round(Math.hypot(lanePos[0]-prev[0],lanePos[1]-prev[1])/23),7,26):17;
 const arrival=Math.round(sec+travel+4);
 const own=roster.filter(x=>x.team===team&&LANE_ROLES[route.lane].includes(x.lane));
 const hasSetup=own.reduce((score,x)=>score+trait(x.id)[2]+trait(x.id)[3]*.4,0);
 const lane=laneModel(route.lane,roster,list);
 // Lane priority is useful for neutral-objective movement but can mean pushing too far for a gank.
 const pressure=lane.ready?(team==="blue"?lane.diff:-lane.diff):0;
 const info=lane.ready?pressure>4?"라인 주도권 우위: 강가 시야·합류는 수월하지만 라인이 밀려 적 갱킹 각도는 좁을 수 있음":pressure<-4?"라인 주도권 열세: 아군 보호와 역갱이 필요할 수 있음":"라인이 비슷하게 출발할 수 있음":"픽이 미완성이라 라인 주도권을 확정할 수 없음";
 const windowScore=clamp(Math.round(50+hasSetup*3+pressure*.65-(arrival-190)*.12),15,85);
 return {team:team,jungler:jungler||null,route:routeKey,label:route.label,lane:route.lane,arrivalSec:arrival,arrival:timeText(arrival),score:windowScore,pressure:+pressure.toFixed(1),comments:[info,"합류 가치 지수 "+windowScore+"/100은 비교용 점수일 뿐 갱킹 성공률이 아님."],timeline:timeline,points:points};
}
function teamSkirmish(roster,team,lane,level,list){
 const roles=lane==="BOT"?["JUNGLE","ADC","SUPPORT"]:["JUNGLE",lane];
 const rs=roles.map(x=>get(roster,team,x)).filter(Boolean);
 const targetLevel=Math.max(1,Math.min(18,+level||3));
 let hp=0,dps=0,engage=0,peel=0,coverage=0;
 for(const x of rs){
  const stats=(champ(x.id,list)||{}).stats||{},t=trait(x.id);
  coverage+=TRAITS[x.id]?1:0;
  const growth=(targetLevel-1)*(.7025+.0175*(targetLevel-1));
  const baseHp=(+stats.hp||650)+(+stats.hpperlevel||95)*growth;
  const ad=(+stats.attackdamage||62)+(+stats.attackdamageperlevel||3.5)*growth;
  const aspd=(+stats.attackspeed||.7)*(1+(+stats.attackspeedperlevel||2)*growth/100);
  const armor=(+stats.armor||32)+(+stats.armorperlevel||3)*growth;
  hp+=baseHp*(1+armor/130);dps+=ad*aspd;
  engage+=t[2];peel+=t[3];
 }
 // Not a win probability: no spells, positioning, cooldowns or items.
 const index=rs.length?Math.round(hp/80+dps*.45+engage*4+peel*2):0;
 return {team:team,level:targetLevel,participants:rs,engage:engage,peel:peel,rawIndex:index,hp:Math.round(hp),dps:Math.round(dps),coverage:rs.length?coverage/rs.length:0};
}
function analyze(roster,champions,opts){
 const list=Array.isArray(champions)?champions:[];
 const r=validRoster(roster);
 const options=opts||{},blueRoute=options.blueRoute||"full-top",redRoute=options.redRoute||"full-bot";
 const focus=LANES.includes(options.lane)?options.lane:"MID";
 const level=Math.max(1,Math.min(18,+options.level||3));
 const lanes=LANES.map(x=>laneModel(x,r,list));
 const routes={
  blue:routeModel("blue",get(r,"blue","JUNGLE"),blueRoute,r,list,options.startSec),
  red:routeModel("red",get(r,"red","JUNGLE"),redRoute,r,list,options.startSec)
 };
 const fight={blue:teamSkirmish(r,"blue",focus,level,list),red:teamSkirmish(r,"red",focus,level,list)};
 fight.diff=fight.blue.rawIndex-fight.red.rawIndex;
 fight.ready=fight.blue.participants.length===(focus==="BOT"?3:2)&&fight.red.participants.length===(focus==="BOT"?3:2);
 fight.verdict=!fight.ready?"양 팀 참가 챔피언 부족":Math.abs(fight.diff)<8?"양 팀의 모형 기본 교전 지수가 비슷":"모형 기준 "+(fight.diff>0?"블루":"레드")+" 기본 교전 지수가 높음";
 return {version:"0.5",roster:r,lanes:lanes,routes:routes,fight:fight,focus:focus,level:level,coverage: r.length,hasData: r.length>0,
  assumptions:["경기 승률/실제 상성 통계가 아니라 잠정 챔피언 특성·기본 능력치·경로 거리를 활용한 교육용 비교 모델","정글 캠프 처리 시간·이동 시간은 패치별 검증값이 아닌 고정 근사치","QWER·아이템·룬·소환사 주문·실제 와드·팀 콜 및 선수 폼은 계산하지 않음"]};
}
root.RiftAnalytics=Object.freeze({analyze:analyze,ROUTES:ROUTE,LANES:LANES,TRAITS:TRAITS,timeText:timeText,routeModel:routeModel,laneModel:laneModel});
})(typeof window!=="undefined"?window:globalThis);
