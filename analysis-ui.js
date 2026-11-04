/* Rift Lab v0.5 analysis UI. Data is model output, not measured win-rate. */
(function(){
"use strict";
let core, engine, model=null;
const $=id=>document.getElementById(id);
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e;};
const ROLE_LABEL={TOP:"탑",MID:"미드",BOT:"바텀"};
function options(){
 return {blueRoute:$("anaBlueRoute").value||"full-top",redRoute:$("anaRedRoute").value||"full-bot",lane:$("anaFocus").value||"MID",level:Number($("anaLevel").value)||3,startSec:55};
}
function save(){
 try{localStorage.setItem("riftlab-operations-v1",JSON.stringify(options()));}catch(e){}
}
function restore(){
 try{
 const o=JSON.parse(localStorage.getItem("riftlab-operations-v1")||"null");
 if(!o)return;
 ["anaBlueRoute","anaRedRoute","anaFocus","anaLevel"].forEach((id,i)=>{
 const v=[o.blueRoute,o.redRoute,o.lane,o.level][i],e=$(id);
 if([...e.options].some(x=>String(x.value)===String(v)))e.value=v;
 });
 }catch(e){}
}
function roster(){return core.getDraftPicks();}
function renderLanes(rows,champions){
 const root=$("anaLanes");root.replaceChildren();
 for(const l of rows){
  const item=el("div","analysis-item"),head=el("div","analysis-row");
  head.append(el("strong","",ROLE_LABEL[l.lane]+" 라인"),el("span","value",l.ready?(l.diff>0?"+":"")+l.diff:"—"));
  item.append(head);
  item.append(el("div","analysis-sub",l.verdict));
  if(l.ready){
   let meter=el("div","analysis-meter"),blue=el("div","bar"),red=el("div","zero");
   // symmetric visual mapping: positive means more blue pressure, never a probability.
   const left=Math.max(15,Math.min(85,50+l.diff*1.1));
   blue.style.width=left+"%";red.style.width=(100-left)+"%";
   meter.append(blue,red);item.append(meter);
   const name=x=>x.map(z=>(champions.find(c=>c.id===z.id)||{name:z.id}).name).join(" / ");
   item.append(el("div","analysis-sub","블루 "+name(l.blue)+" vs 레드 "+name(l.red)));
  }
  item.append(el("div","analysis-note",l.notes[0]||""));
  root.append(item);
 }
}
function renderRoutes(routes,champs){
 const root=$("anaRoutes");root.replaceChildren();
 for(const side of ["blue","red"]){
  const r=routes[side],item=el("div","analysis-item");
  const head=el("div","analysis-row");head.append(el("strong","",side==="blue"?"블루 정글":"레드 정글"),el("span","value",r.arrival));
  item.append(head);item.append(el("div","analysis-sub",(r.jungler?(champs.find(c=>c.id===r.jungler.id)||{name:r.jungler.id}).name:"정글 픽 없음")+" · "+r.label));
  const timeline=el("ol","analysis-timeline");
  for(const point of r.timeline)timeline.append(el("li","",point.name+" · "+point.label));
  item.append(timeline);item.append(el("div","analysis-note",r.comments[0]));
  item.append(el("div","analysis-note","모델 합류 가치 지수 "+r.score+"/100 · 실제 갱킹 성공률 아님"));
  root.append(item);
 }
}
function renderFight(fight,champs,focus){
 const root=$("anaFight");root.replaceChildren();
 root.append(el("p","analysis-sub",ROLE_LABEL[focus]+" "+(focus==="BOT"?"3대3":"2대2")+" · 초급 전투 모델"));
 for(const side of ["blue","red"]){
  const f=fight[side],item=el("div","analysis-item");
  const title=el("div","analysis-row");title.append(el("strong","",side==="blue"?"블루":"레드"),el("span","value","지수 "+f.rawIndex));
  item.append(title);
  const names=f.participants.map(x=>(champs.find(c=>c.id===x.id)||{name:x.id}).name).join(" / ");
  item.append(el("div","analysis-sub",names||"픽 미완성"));
  item.append(el("div","analysis-note","레벨 "+f.level+" · 가상 유효 체력 "+f.hp+" · 기본 공격 DPS "+f.dps));
  item.append(el("div","analysis-note","진입 태그 "+f.engage+" · 보호 태그 "+f.peel));
  root.append(item);
 }
 root.append(el("p","analysis-score",fight.verdict));
 root.append(el("p","analysis-note","QWER·아이템·스킬 쿨다운·보호막을 제외한 비교 지수이며 승패 확률이 아니야."));
}
function refresh(){
 if(!core||!engine)return null;
 const picks=roster(),list=core.champions(),o=options();
 model=engine.analyze(picks,list,o);
 renderLanes(model.lanes,list);renderRoutes(model.routes,list);renderFight(model.fight,list,model.focus);
 const notes=$("anaNotes");notes.replaceChildren();
 for(const a of model.assumptions)notes.append(el("p","analysis-note","• "+a));
 const missing=10-picks.length;
 if(missing>0)notes.prepend(el("p","analysis-note","현재 선택된 챔피언 "+picks.length+"/10명 · "+missing+"명 미선택. 완성된 드래프트와 다르게 일부 분석이 중립 처리될 수 있어."));
 return model;
}
function currentModel(){return refresh();}
function toRift(onlyRoutes){
 const m=currentModel();if(!m||m.coverage===0){alert("먼저 밴픽 화면에서 챔피언을 선택해.");return;}
 core.switchTab("rift");
 if(onlyRoutes){
  if(window.RiftLab&&window.RiftLab.showRoutes)window.RiftLab.showRoutes(m.routes);
  return;
 }
 if(!m.fight.ready){alert("선택한 라인의 양 팀 정글러·라이너 픽을 모두 지정해.");return;}
 if(window.RiftLab&&window.RiftLab.stageSkirmish){
  const result=window.RiftLab.stageSkirmish({roster:m.roster,lane:m.focus,level:m.level,routes:m.routes});
  if(result&&result.ok){if(window.RiftLab.showRoutes)window.RiftLab.showRoutes(m.routes);}
  else if(result&&!result.ok)alert(result.reason||"교전 배치에 실패했어.");
 }
}
function exportJson(){
 const m=currentModel();if(!m)return;
 const payload=JSON.stringify({generator:"RiftLab v0.5 experimental analysis",generatedAt:new Date().toISOString(),model:m},null,2);
 const blob=new Blob([payload],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="riftlab-operations.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function init(){
 if(!window.RiftCore||!window.RiftAnalytics)return;
 core=window.RiftCore;engine=window.RiftAnalytics;
 restore();
 $("tabAnalysis").onclick=()=>{core.switchTab("analysis");refresh();};
 ["anaBlueRoute","anaRedRoute","anaFocus","anaLevel"].forEach(id=>$(id).onchange=()=>{save();refresh();});
 $("anaRefresh").onclick=refresh;
 $("anaShowMap").onclick=()=>toRift(true);
 $("anaStageFight").onclick=()=>toRift(false);
 $("anaExport").onclick=exportJson;
 if(window.MutationObserver){
  const observer=new MutationObserver(()=>refresh());
  observer.observe($("gameTabs"),{childList:true});
 }
 window.RiftOperations={refresh:refresh,model:()=>model};
 refresh();
}
document.addEventListener("DOMContentLoaded",init);
})();
