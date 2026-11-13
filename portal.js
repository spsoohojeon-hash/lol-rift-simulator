/* LEAGUE LAB v0.6: interactive textbook + official static champion profiles + optional Riot proxy views.
 * No unsupported statistical values are fabricated.
 */
(function(){
"use strict";
let core=null,chosen=null,version=null,allRunes=null,allItems=null,profileBusy=false,chapterIndex=0;
const $=id=>document.getElementById(id);
const el=(tag,cls,txt)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(txt!==undefined)node.textContent=String(txt);return node;};
const chapters=[
{title:"01 · 롤의 승리 조건",topic:"게임의 목적은 킬이 아니라 넥서스",text:[
 "롤에서 골드와 경험치는 목표가 아니라 넥서스를 부수기 위한 수단이야. 킬의 가치는 이후 포탑·오브젝트·시야·웨이브를 얼마나 가져오는지에 따라 달라져.",
 "교전이 끝났을 때 승리 팀도 체력이 부족하고 웨이브가 없으면 바로 오브젝트를 가져가기 어려워. 교전 전 라인 상태를 확인해야 하는 이유야."],
scenario:"미드에서 2명을 잡았지만 바텀 미니언이 상대 포탑에 닿지 못했어. 교전 후 가장 먼저 확인할 건?",
choices:["킬 수가 더 높은지","라인 웨이브·생존 인원·오브젝트 시간","상대의 전체 승률"],
answer:1,why:"전환할 수 있는 이득은 생존 인원과 웨이브, 위치, 오브젝트 출현 시간에 좌우돼."},
{title:"02 · 라인과 웨이브",topic:"프리징, 슬로우 푸시, 크래시, 바운스",text:[
 "웨이브를 밀거나 당기는 목적은 CS만이 아니야. 상대가 라인에 머무는 시간, 합류 가능성, 갱킹 위험과 귀환 타이밍까지 바꿔.",
 "프리징은 미니언 수와 체력을 조절해 특정 위치에서 균형을 유지하는 기술이야. 슬로우 푸시는 웨이브를 쌓아 큰 웨이브가 상대 포탑에 도착하도록 만들지.",
 "아래 실습은 개념을 이해하기 위한 애니메이션이야. 실제 미니언 AI·어그로·공격 주기를 재현한 계산은 아니야."],
wave:true,scenario:"상대 정글이 바텀에 보였고, 큰 웨이브가 곧 적 포탑에 도착해. 미드는 무엇을 고려할 수 있을까?",
choices:["웨이브를 정리하고 먼저 움직일 시간","무조건 미드에 남아 경험치만 받기","상대 정글 위치를 무시하기"],
answer:0,why:"큰 웨이브를 밀어넣으면 상대에게 처리할 의무가 생겨 합류나 귀환의 여유를 만들 수 있어."},
{title:"03 · 라인 주도권과 템포",topic:"선택의 속도보다 먼저 움직일 권리",text:[
 "라인 주도권은 단순 킬 압박이 아니야. 미니언을 정리하고 먼저 이동할 수 있는가가 핵심이야.",
 "가속은 빠른 압박과 연속 선택으로 스노우볼을 굴리는 운영, 브레이크는 상대의 연속 행동을 끊고 더 좋은 시점을 기다리는 운영으로 설명할 수 있어.",
 "이 분류는 고정 챔피언 등급표가 아니야. 상대 조합과 성장 구간에 따라 한 챔피언의 역할은 바뀔 수 있어."],
scenario:"상대가 첫 전령을 먼저 준비하고 네 팀은 사이드 웨이브를 크게 확보했어. 가능한 판단은?",
choices:["아무 조건 없이 전령에서 싸우기","시야·합류 가능성을 보고 교환하거나 한타 선택","상대가 전령을 치면 무조건 게임 종료"],
answer:1,why:"주도권과 템포는 여러 자원을 동시에 비교해서 선택하는 문제야."},
{title:"04 · 정글 운영",topic:"캠프, 동선, 턴, 역갱과 합류",text:[
 "정글 동선은 정해진 최적 루트 하나가 있는 게 아니야. 라인 위치, 교전 강도, 다음 오브젝트, 적 정글 정보로 경로를 수정하는 과정이야.",
 "풀캠프가 항상 옳지도, 3캠프 갱킹이 항상 옳지도 않아. 갱킹 성공 가능성뿐 아니라 캠프 손실과 상대 정글의 반대편 선택을 함께 봐야 해.",
 "기존 정글 분석 실험실에서 경로별 합류 시각을 비교해 볼 수 있어."],
scenario:"적 정글이 탑에 나타났고, 넌 바텀에 있어. 봇듀오가 우선 합류할 수 있다면?",
choices:["반대편 캠프·오브젝트·갱킹 창구를 평가","무조건 탑까지 달려가기","상대 위치 정보를 무시하기"],
answer:0,why:"상대의 위치가 확인되면 교환할 수 있는 반대편 자원과 합류 조건을 검토할 수 있어."},
{title:"05 · 시야와 정보전",topic:"보이지 않는 정보를 아는 척하지 않기",text:[
 "와드는 적의 위치를 확인하는 수단이지만 언제·어디를 지나갈지를 판단해야 효율적이야. 라인 주도권이 없으면 와드를 지키기도 어려워.",
 "상대 정글의 마지막 확인 위치와 캠프 생성 순서로 가능성을 추정할 수는 있지만, 보이지 않은 것을 확정 정보로 취급해서는 안 돼."],
scenario:"상대 정글의 마지막 위치는 40초 전 탑이야. 지금 가장 정확한 해석은?",
choices:["현재도 탑에 있다고 확정","여러 동선 가능성을 열어 둔다","이미 집에 갔다고 확정"],
answer:1,why:"시간이 지나면 위치 정보의 신뢰도는 떨어져. 추적한 정보와 추정값을 분리해야 해."},
{title:"06 · 오브젝트 교환",topic:"드래곤, 전령, 바론을 자원으로 바라보기",text:[
 "오브젝트는 항상 먼저 치는 것이 좋지 않아. 주변 라인 웨이브, 체력·마나, 강타, 적의 합류 타이밍과 시야를 확인해야 해.",
 "사이드 포탑과 대형 오브젝트를 맞바꾸는 선택도 상황에 따라 합리적일 수 있어. 손익은 시간과 다음 턴을 포함해서 판단해."],
scenario:"용이 나오기 20초 전, 봇 웨이브가 아군 포탑으로 밀려와. 중요한 행동은?",
choices:["웨이브와 합류를 정리해 시야 확보","용 타이머가 보이자마자 무조건 들어가기","스펠 보유 여부는 상관없음"],
answer:0,why:"오브젝트 싸움의 준비는 등장 전에 시작돼. 라인 처리와 시야 진입 권한이 중요해."},
{title:"07 · 한타와 진형",topic:"정면 한타, 진입, 받아치기, 포킹",text:[
 "한타는 화력만 높은 팀이 이기는 게 아니야. 진입 수단, 딜러 사거리, CC 분배, 포지션과 시야에 따라 유효한 공격 기회가 달라져.",
 "아펠리오스처럼 화력을 지속해서 넣어야 하는 챔피언과 카이사처럼 아군 CC에 연계 진입할 수 있는 챔피언은 승리 조건이 다를 수 있어.",
 "전투 엔진에서는 아직 QWER과 아이템 계산이 미구현이므로 기본 교전 시뮬레이션은 기술 설명 보조로만 활용해야 해."],
scenario:"상대에 다이버가 많고 아군은 장거리 원딜 중심이야. 더 중요한 변수는?",
choices:["우리 팀 원딜의 이름만 보기","아군 보호 CC와 상대 진입 경로","무조건 먼저 돌진"],
answer:1,why:"딜러가 안전하게 공격할 시간을 보장하는 것이 조합의 승리 조건일 수 있어."},
{title:"08 · 밴픽과 승리 조건",topic:"상성 하나보다 팀 전체의 구조",text:[
 "픽의 강함은 개인 승률 하나로 결정되지 않아. 탑·정글 2대2, 미드 주도권, 바텀 3대3, 오브젝트 전투를 함께 판단해야 해.",
 "피어리스 밴픽에서는 이전 세트에 사용한 챔피언이 사라지므로 다음 세트의 챔피언 풀까지 고려한 선택이 중요해.",
 "자동 밴픽의 팀별 선택은 가상 휴리스틱이야. 실제 팀이 그 챔피언을 고를 확률로 해석하면 안 돼."],
scenario:"피어리스 BO5에서 1세트에 핵심 챔피언 5개를 사용했어. 다음 세트 계획은?",
choices:["이전 세트 챔피언 재사용","남은 챔피언 풀과 상대 픽을 다시 설계","무조건 같은 5개 픽"],
answer:1,why:"피어리스에서 이미 사용한 픽은 다음 세트에서 사용할 수 없기 때문에 장기적 챔피언 풀 관리가 필요해."}
];
function getVersion(){
 try{const raw=core.icon(core.champions()[0].id);return (/\/cdn\/([^/]+)\/img\//.exec(raw)||[])[1]||null;}catch(e){return null;}
}
function title(tag,text){return el(tag,"",text);}
function clear(node){node.replaceChildren();}
function chooseChapter(index){
 chapterIndex=index;
 const chapter=chapters[index],root=$("textbookArticle");clear(root);
 root.append(el("div","portal-eyebrow","운영 교과서 / "+String(index+1).padStart(2,"0")),el("h2","",chapter.topic));
 for(const paragraph of chapter.text)root.append(el("p","portal-copy",paragraph));
 if(chapter.wave)appendWaveExercise(root);
 const lab=el("div","portal-study-lab");lab.append(el("h3","","실전 판단 문제"),el("p","",chapter.scenario));
 const choices=el("div","portal-answers"),result=el("p","portal-answer-result","");
 chapter.choices.forEach((option,i)=>{
  const b=el("button","",String(i+1)+". "+option);
  b.onclick=()=>{result.textContent=(i===chapter.answer?"정답 · ":"다시 생각해 볼 선택 · ")+chapter.why;result.style.color=i===chapter.answer?"#96d5b1":"#f1c88e";};
  choices.append(b);
 });
 lab.append(choices,result);root.append(lab);
 const jump=el("button","primary","관련 협곡 실험 열기");
 jump.onclick=()=>core.switchTab(index===7?"draft":index===3?"analysis":"rift");
 root.append(jump);
 for(const [i,item] of [...$("textbookMenu").children].entries()){item.classList.toggle("active",i===index);}
}
function appendWaveExercise(root){
 const wrap=el("section","portal-wave-lab");wrap.append(el("h3","","실습 · 미니언 웨이브의 위치와 수량"));
 const modes=el("div","portal-wave-controls");
 const describe=el("div","portal-wave-description","");
 const step=el("input");step.type="range";step.min="0";step.max="100";step.value="30";step.step="1";step.setAttribute("aria-label","시간 경과와 미니언 이동 실습");
 const select=el("select");[["freeze","프리징"],["slow","슬로우 푸시"],["crash","크래시"]].forEach(([v,txt])=>{const o=el("option","",txt);o.value=v;select.append(o);});select.value="freeze";
 const stage=el("div","portal-wave-stage");const blue=[],red=[];
 const track=el("div","portal-wave-track");
 const bTower=el("div","portal-wave-tower blue","B"),rTower=el("div","portal-wave-tower red","R");
 track.append(bTower,rTower);
 for(let i=0;i<10;i++){const b=el("div","portal-wave-dot blue"),r=el("div","portal-wave-dot red");track.append(b,r);blue.push(b);red.push(r);}
 stage.append(track);
 function render(){
  const mode=select.value,t=Number(step.value)/100;
  const counts={freeze:[4,6],slow:[7,3],crash:[8,2]}[mode];
  const bases={freeze:[31,42],slow:[26,66],crash:[61,82]}[mode];
  blue.forEach((b,i)=>{b.hidden=i>=counts[0];b.style.left=(bases[0]+t*(mode==="freeze"?2:mode==="slow"?18:19)-(i%4)*3)+"%";b.style.top=(38+(i%3)*13)+"%";});
  red.forEach((r,i)=>{r.hidden=i>=counts[1];r.style.left=(bases[1]-t*(mode==="freeze"?1:mode==="slow"?12:5)+(i%4)*3)+"%";r.style.top=(35+(i%3)*15)+"%";});
  describe.textContent=({freeze:"프리징: 상대 미니언을 조금 더 남겨 아군 쪽에 웨이브를 유지하는 개념.",slow:"슬로우 푸시: 아군 웨이브를 쌓아 전진시키는 개념.",crash:"크래시: 큰 웨이브를 상대 포탑에 밀어 넣는 개념."})[mode]+" (개념 애니메이션, 실제 미니언 피해 계산 아님)";
 }
 select.onchange=render;step.oninput=render;
 modes.append(select,step);wrap.append(modes,stage,describe);root.append(wrap);render();
}
function initTextbook(){
 const nav=$("textbookMenu");clear(nav);
 chapters.forEach((ch,i)=>{const b=el("button","portal-chapter",ch.title);b.onclick=()=>chooseChapter(i);nav.append(b);});
 $("textbookToSimulator").onclick=()=>core.switchTab("rift");
 chooseChapter(0);
}
function image(src,alt,cls){const x=document.createElement("img");x.src=src;x.alt=alt||"";if(cls)x.className=cls;x.loading="lazy";x.onerror=()=>{x.style.display="none";};return x;}
function badge(label){return el("span","pill unknown",label);}
function availability(label,description){
 const block=el("div","portal-empty-stat"),h=el("strong","",label),p=el("div","sub",description||"통계 데이터가 연결되지 않았어.");
 block.append(h,p);return block;
}
function siteLink(c){
 return c.key&&/^\d+$/.test(String(c.key))?"https://lol.ps/champ/"+c.key:"https://lol.ps/statistics";
}
function visibleChampions(){
 const term=$("portalChampionSearch").value.trim().toLowerCase();
 return core.champions().filter(c=>(c.name+" "+c.id).toLowerCase().includes(term));
}
function drawChampList(){
 if(!core)return;
 const list=$("portalChampionList");clear(list);
 for(const c of visibleChampions()){
  const b=el("button","portal-champion-choice"+(chosen===c.id?" active":""),"");
  b.append(image(core.icon(c.id),c.name),el("span","",c.name));b.onclick=()=>selectChampion(c.id);list.append(b);
 }
 if(!list.children.length)list.append(el("div","sub","검색 결과가 없어."));
}
function statGrid(c){
 const t=el("div","portal-stat-grid");
 const base=c.stats||{},fields=[["체력",base.hp],["공격력",base.attackdamage],["공격 사거리",base.attackrange],["이동속도",base.movespeed]];
 fields.forEach(([label,num])=>{const box=el("div","portal-stat-box");box.append(el("div","sub",label),el("strong","",num??"—"));t.append(box);});
 return t;
}
async function loadExtra(c){
 const v=getVersion();if(!v)return;
 const uri="https://ddragon.leagueoflegends.com/cdn/"+encodeURIComponent(v)+"/data/ko_KR/champion/"+encodeURIComponent(c.id)+".json";
 try{
 const response=await fetch(uri);if(!response.ok)throw Error("Champion HTTP "+response.status);
 const payload=await response.json();if(chosen!==c.id)return;
 const data=payload.data&&payload.data[c.id];if(!data)return;
 const slot=$("portalChampionSpells");if(!slot)return;slot.replaceChildren();
 slot.append(el("h3","","스킬"));
 const spells=[{name:data.passive?.name||"패시브",description:data.passive?.description||"",image:data.passive?.image?.full||null,passive:true},...(data.spells||[]).map(x=>({...x,passive:false}))];
 spells.forEach((sp,i)=>{
  const card=el("div","portal-spell");
  const url=sp.passive?"https://ddragon.leagueoflegends.com/cdn/"+v+"/img/passive/"+sp.image:
    "https://ddragon.leagueoflegends.com/cdn/"+v+"/img/spell/"+sp.image?.full;
  if(sp.image||(sp.image&&sp.image.full))card.append(image(url,sp.name));
  const txt=el("div");txt.append(el("strong","",["P","Q","W","E","R"][i]+" · "+sp.name));
  const stripped=String(sp.description||"").replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim();
  txt.append(el("div","sub",stripped));card.append(txt);slot.append(card);
 });
 }catch(err){const e=$("portalChampionSpells");if(e)e.replaceChildren(el("p","sub","스킬 설명을 불러오지 못했어. 인터넷 연결을 확인해."));}
}
async function ensureStatic(){
 const v=getVersion();if(!v)return;
 const base="https://ddragon.leagueoflegends.com/cdn/"+v+"/data/ko_KR/";
 try{
  const [run,item]=await Promise.all([fetch(base+"runesReforged.json"),fetch(base+"item.json")]);
  if(run.ok)allRunes=await run.json();
  if(item.ok)allItems=(await item.json()).data;
 }catch(e){console.warn("Optional rune/item catalog unavailable",e);}
}
function renderExtras(c,container){
 const r=el("section","portal-champion-section");r.append(el("h3","","룬 정보"));
 r.append(availability("추천 룬 승률 —","실제 룬 조합별 표본·승률은 집계 데이터 API를 연결한 뒤 표시할 거야."));
 const trees=el("div","portal-rune-list");
 if(allRunes){for(const tree of allRunes){
  const box=el("div","portal-rune-group");box.append(el("strong","",tree.name));
  for(const rune of (tree.slots?.[0]?.runes||[])){const mini=el("div","portal-rune");mini.append(image("https://ddragon.leagueoflegends.com/cdn/img/"+rune.icon,rune.name),el("span","",rune.name));box.append(mini);}
  trees.append(box);
 }}
 else trees.append(el("p","sub","핵심 룬 카탈로그를 불러오는 중이야."));
 r.append(trees);container.append(r);
 const it=el("section","portal-champion-section");it.append(el("h3","","아이템 빌드"));
 it.append(availability("코어 아이템·빌드 승률 —","현재 추천 빌드 통계가 없어. 아래에는 챔피언별 추천이 아닌 일반 아이템 카탈로그를 표시해."));
 const catalog=el("div","portal-item-list");
 if(allItems){const items=Object.entries(allItems).filter(([id,x])=>x.maps?.["11"]&&x.gold?.purchasable&&x.gold.total>=2300&&!x.hideFromAll&&/^\d+$/.test(id)).slice(0,16);
  for(const [id,x] of items){const card=el("div","portal-item");card.append(image("https://ddragon.leagueoflegends.com/cdn/"+getVersion()+"/img/item/"+id+".png",x.name),el("span","",x.name));catalog.append(card);}
 }else catalog.append(el("p","sub","아이템 데이터 로딩 중"));
 it.append(catalog);container.append(it);
 const counter=el("section","portal-champion-section");counter.append(el("h3","","카운터 및 역카운터"));
 counter.append(availability("불리한 상대 / 유리한 상대 —","포지션별 상대 승률, 경기 수, 표본 기간이 포함된 데이터 연결이 필요해."));
 counter.append(el("p","sub","카운터는 챔피언 전체가 아니라 같은 포지션의 매치업으로 계산해야 정확해. 승률과 표본수를 함께 보여줄 계획이야."));
 container.append(counter);
}
async function selectChampion(id){
 chosen=id;drawChampList();
 const c=core.champions().find(x=>x.id===id);if(!c)return;
 const root=$("portalChampionDetails");clear(root);
 const head=el("div","portal-champion-head");head.append(image(core.icon(c.id),c.name));
 const meta=el("div");meta.append(el("div","portal-eyebrow",c.id),el("h2","",c.name));
 meta.append(badge("공식 기본 정보 · Data Dragon"));
 head.append(meta);root.append(head,statGrid(c));
 const external=el("a","portal-external","LOL.PS에서 현재 빌드·룬·카운터 통계 보기");
 external.href=siteLink(c);external.target="_blank";external.rel="noopener noreferrer";root.append(external);
 const spells=el("section","portal-champion-section");spells.id="portalChampionSpells";spells.append(el("p","sub","스킬 정보를 불러오는 중..."));root.append(spells);
 renderExtras(c,root);loadExtra(c);
}
function initChampions(){
 $("portalChampionSearch").oninput=drawChampList;
 $("portalChampionRole").onchange=()=>{if(chosen)selectChampion(chosen);};
 $("portalChampionRefresh").onclick=()=>{drawChampList();if(chosen)selectChampion(chosen);};
 drawChampList();
 const first=core.champions().find(c=>c.id==="Aphelios")||core.champions()[0];if(first)selectChampion(first.id);
 ensureStatic().then(()=>{if(chosen)selectChampion(chosen);});
}
const setState=(text)=>{$("portalProfileState").textContent=text;};
function apiBase(){
 let s=localStorage.getItem("riftlab-portal-api")||"";
 try{const u=new URL(s);if(u.protocol!=="https:"&&!((u.hostname==="localhost"||u.hostname==="127.0.0.1")&&u.protocol==="http:"))return "";return u.origin+u.pathname.replace(/\/+$/,"");}catch(e){return "";}
}
function updateApiStatus(){$("portalApiStatus").textContent=apiBase()?"API 주소 설정됨 (가동 여부 미확인)":"API 서버 미연결";}
function makeLine(str){return el("div","portal-result-line",str);}
function renderProfile(data,kind){
 const root=$("portalProfileResults");clear(root);
 if(kind==="live"){
  root.append(el("h2","","진행 중인 게임"));
  if(!data.active){root.append(el("p","sub","현재 진행 중인 게임이 확인되지 않았어."));return;}
  root.append(makeLine("게임 모드 "+(data.gameMode||"—")+" · 소환사별 상세 통계는 제공하지 않아."));
  for(const team of ["blue","red"]){const ps=(data.players||[]).filter(p=>p.team===team);root.append(el("h3","",team==="blue"?"블루 팀":"레드 팀"));root.append(makeLine(ps.map(x=>x.championName||"챔피언 #"+x.championId).join(" · ")||"정보 없음"));}
  return;
 }
 const p=data.player||{};root.append(el("h2","",(p.gameName||"플레이어")+"#"+(p.tagLine||"")));
 const info=el("div","portal-profile-grid");
 info.append(makeLine("소환사 레벨 "+(p.level??"—")));
 for(const q of (p.rank||[])){info.append(makeLine((q.queueType||"랭크")+" · "+q.tier+" "+q.rank+" "+q.leaguePoints+" LP · "+q.wins+"승 "+q.losses+"패"));}
 root.append(info,el("h3","","최근 랭크 경기"));
 if(!data.matches?.length){root.append(el("p","sub","표시할 최근 랭크 경기 데이터가 없어."));return;}
 for(const m of data.matches){const card=el("div","portal-match "+(m.win?"win":"loss"));
  card.append(el("strong","",m.win?"승리":"패배"),makeLine((m.championName||"챔피언 #"+m.championId)+" · "+m.kills+"/"+m.deaths+"/"+m.assists+" · "+Math.floor(m.durationSeconds/60)+"분 · "+(m.mode||"랭크")),makeLine("CS "+(m.cs??"—")+" · 포지션 "+(m.position||"—")));
  root.append(card);}
}
async function searchProfile(kind){
 if(profileBusy)return;
 const base=apiBase();if(!base){setState("Cloudflare Worker 주소를 먼저 설정해. API 키를 화면에 입력해서는 안 돼.");$("portalApiConfig").hidden=false;return;}
 const name=$("portalRiotName").value.trim(),tag=$("portalRiotTag").value.trim();
 if(!name||!tag||name.length>32||tag.length>12){setState("Riot ID의 이름과 #태그를 입력해.");return;}
 profileBusy=true;setState("조회 중...");
 try{
  const q=new URLSearchParams({name,tag,region:$("portalRiotRegion").value});
  const url=base+"/api/riot/"+(kind==="live"?"live":"player")+"?"+q.toString();
  const res=await fetch(url,{headers:{Accept:"application/json"}});
  const body=await res.json().catch(()=>({}));
  if(!res.ok)throw Error(body.message||("API 응답 "+res.status));
  renderProfile(body,kind);setState("조회 완료. 사용자가 허용한 범위와 공식 API의 공개 데이터를 표시해.");
 }catch(e){setState("조회 실패: "+e.message+" · Worker 키/도메인/요청 제한을 확인해.");}
 finally{profileBusy=false;}
}
function initProfile(){
 const saved=apiBase();$("portalWorkerUrl").value=saved;
 updateApiStatus();
 $("portalApiSettings").onclick=()=>{$("portalApiConfig").hidden=!$("portalApiConfig").hidden;};
 $("portalSaveWorker").onclick=()=>{
  const value=$("portalWorkerUrl").value.trim();
  if(!value){localStorage.removeItem("riftlab-portal-api");updateApiStatus();return;}
  try{const u=new URL(value);if(u.protocol!=="https:"&&!((u.hostname==="localhost"||u.hostname==="127.0.0.1")&&u.protocol==="http:"))throw Error("HTTPS 주소만 허용");localStorage.setItem("riftlab-portal-api",u.origin+u.pathname.replace(/\/+$/,""));updateApiStatus();setState("Worker 주소 저장. 정상 가동 및 Riot API 승인 여부는 실제 조회로 확인해야 해.");}catch(e){setState("올바른 HTTPS Worker 주소를 입력해.");}
 };
 $("portalSearchMatches").onclick=()=>searchProfile("matches");
 $("portalSearchLive").onclick=()=>searchProfile("live");
}
function init(){
 if(!window.RiftCore)return;
 core=window.RiftCore;
 $("tabTextbook").onclick=()=>core.switchTab("textbook");
 $("tabChampions").onclick=()=>core.switchTab("champions");
 $("tabProfile").onclick=()=>core.switchTab("profile");
 initTextbook();initChampions();initProfile();
}
document.addEventListener("DOMContentLoaded",init);
})();
