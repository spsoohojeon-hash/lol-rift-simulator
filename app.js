
(function(){
"use strict";
var DATA=window.LOL_DATA, lanes=DATA.lanes;
var STEPS=[
{type:"ban",team:"blue"},{type:"ban",team:"red"},{type:"ban",team:"blue"},{type:"ban",team:"red"},{type:"ban",team:"blue"},{type:"ban",team:"red"},
{type:"pick",team:"blue"},{type:"pick",team:"red"},{type:"pick",team:"red"},{type:"pick",team:"blue"},{type:"pick",team:"blue"},{type:"pick",team:"red"},
{type:"ban",team:"red"},{type:"ban",team:"blue"},{type:"ban",team:"red"},{type:"ban",team:"blue"},
{type:"pick",team:"red"},{type:"pick",team:"blue"},{type:"pick",team:"blue"},{type:"pick",team:"red"}];
var $=function(id){return document.getElementById(id);};
var champions=DATA.fallback.map(function(c){return {id:c.id,name:c.name,english:c.id,image:c.id+".png"};});
var version="16.21.1";
var searchTerm="",roleFilter="ALL";
function emptyGame(){return {actions:[],roles:{blue:{},red:{}}};}
function defaults(){return {seriesLength:5,currentIndex:0,games:[emptyGame()],overrides:{}};}
var state=defaults();
try {var load=JSON.parse(localStorage.getItem("riftlab-draft-v3")||"null");if(load&&Array.isArray(load.games)&&load.games.length&&load.games.length<=5&&[3,5].includes(+load.seriesLength)){state=load;state.overrides=state.overrides||{};state.currentIndex=Math.min(state.games.length-1,Math.max(0,+state.currentIndex||0));}}catch(e){}
function save(){try{localStorage.setItem("riftlab-draft-v3",JSON.stringify(state));}catch(e){}}
function icon(id){var c=champions.find(function(x){return x.id===id;});return "https://ddragon.leagueoflegends.com/cdn/"+version+"/img/champion/"+encodeURIComponent(c?c.image:id+".png");}
function champ(id){return champions.find(function(x){return x.id===id;})||{id:id,name:id,english:id};}
function getClass(id,lane){
 var key=id+"|"+lane,manual=state.overrides[key];
 if(manual)return manual;
 var cats=DATA.reference[lane]||{};
 for(var t of ["accel","flex","brake","growth","tank"]){if((cats[t]||[]).includes(id))return t;}
 return "unknown";
}
function classify(id,lane){var type=getClass(id,lane);return DATA.categories[type]||"미확인";}
function imageEl(id){var img=document.createElement("img");img.src=icon(id);img.alt=champ(id).name;img.loading="lazy";img.onerror=function(){img.style.visibility="hidden";};return img;}
function renderPill(id,lane){var span=document.createElement("span"),cat=getClass(id,lane);span.className="pill "+cat;span.textContent=classify(id,lane);return span;}
function currentGame(){return state.games[state.currentIndex];}
function picks(game,team){return game.actions.filter(function(a){return a.type==="pick"&&a.team===team;}).map(function(a){return a.id;});}
function bans(game,team){return game.actions.filter(function(a){return a.type==="ban"&&a.team===team;}).map(function(a){return a.id;});}
function previousLocks(){return new Set(state.games.slice(0,state.currentIndex).flatMap(function(g){return g.actions.filter(function(a){return a.type==="pick";}).map(function(a){return a.id;});}));}
function usedThisGame(){return new Set(currentGame().actions.map(function(x){return x.id;}));}
function isCurrentGame(){return state.currentIndex===state.games.length-1;}
function draftComplete(){return currentGame().actions.length===STEPS.length;}
function isUnavailable(id){return previousLocks().has(id)||usedThisGame().has(id);}
function createText(tag,cls,content){var n=document.createElement(tag);if(cls)n.className=cls;n.textContent=content;return n;}
function setMsg(str){$("pickHint").textContent=str;}
function perform(id){
 if(!isCurrentGame()){setMsg("과거 세트는 열람만 가능해");return;}
 var g=currentGame(),step=STEPS[g.actions.length];
 if(!step||isUnavailable(id))return;
 g.actions.push({type:step.type,team:step.team,id:id});
 save();renderDraft();
}
function slotCard(team,id,index,finished){
 var slot=createText("div","slot","");
 if(!id){slot.append(createText("div","portrait-placeholder",String(index+1)));slot.append(createText("div","slot-info",""));slot.lastChild.append(createText("div","slot-name","픽 "+(index+1)));slot.lastChild.append(createText("div","slot-meta","미선택"));return slot;}
 slot.append(imageEl(id));
 var info=createText("div","slot-info","");info.append(createText("div","slot-name",champ(id).name));
 var roleSelect=document.createElement("select");roleSelect.title="챔피언 라인 지정";
 var active=currentGame().roles[team][index]||lanes[index];
 lanes.forEach(function(l){var option=document.createElement("option");option.value=l;option.textContent=l;option.selected=active===l;roleSelect.append(option);});
 roleSelect.disabled=!isCurrentGame()||!finished;
 roleSelect.onchange=function(){currentGame().roles[team][index]=roleSelect.value;save();renderDraft();};
 info.append(roleSelect);
 var tag=createText("div","slot-meta","");
 tag.append(renderPill(id,active));info.append(tag);slot.append(info);
 return slot;
}
function renderTeam(team){
 var g=currentGame(), ids=picks(g,team),root=$(team+"Slots");root.replaceChildren();
 for(var i=0;i<5;i++)root.append(slotCard(team,ids[i],i,draftComplete()));
 var banroot=$(team+"Bans");banroot.replaceChildren();
 bans(g,team).forEach(function(id){var x=createText("div","ban-chip","");x.append(imageEl(id));x.append(createText("span","",champ(id).name));banroot.append(x);});
 $(team+"Count").textContent=ids.length+"/5 픽 · "+bans(g,team).length+"/5 밴";
}
function renderGameTabs(){
 var g=$("gameTabs");g.replaceChildren();
 for(var i=0;i<state.seriesLength;i++){(function(n){
 var b=createText("button",n===state.currentIndex?"on":"","G"+(n+1));b.disabled=n>=state.games.length;
 b.onclick=function(){state.currentIndex=n;save();renderDraft();};g.append(b);
 })(i);}
 $("seriesLength").value=String(state.seriesLength);
 var nxt=$("nextGame");
 nxt.disabled=!draftComplete()||!isCurrentGame()||state.games.length>=state.seriesLength;
}
function renderStatus(){
 var g=currentGame(),step=STEPS[g.actions.length];
 $("phaseLabel").textContent="게임 "+(state.currentIndex+1)+" / "+state.seriesLength+" · "+g.actions.length+"/20";
 if(!step){
 $("turnLabel").textContent="밴픽 완료";
 setMsg(isCurrentGame()?"라인을 정리한 뒤 다음 세트로 진행하거나 협곡으로 이동해.":"지난 세트 기록을 보고 있어.");
 }else{
 $("turnLabel").textContent=(step.team==="blue"?"BLUE":"RED")+" "+(step.type==="ban"?"BAN":"PICK");
 setMsg(isCurrentGame()?"현재 "+(g.actions.length+1)+"번째 순서 · 챔피언을 클릭하면 즉시 확정돼.":"지난 세트 기록 (읽기 전용)");
 }
 var history=$("draftLog");history.replaceChildren();
 g.actions.slice(-7).forEach(function(a,i){var p=createText("div","history-item",(a.team==="blue"?"B":"R")+(a.type==="pick"?" 픽 ":" 밴 ")+champ(a.id).name);history.append(p);});
 $("undoDraft").disabled=g.actions.length===0||!isCurrentGame();
}
function renderComposition(){
 var g=currentGame(),root=$("composition");root.replaceChildren();
 ["blue","red"].forEach(function(team){
 var labels={accel:0,flex:0,brake:0,growth:0,tank:0,unknown:0};
 picks(g,team).forEach(function(id,i){var type=getClass(id,g.roles[team][i]||lanes[i]);labels[type]++;});
 var wrap=document.createElement("div");wrap.style.textAlign="left";wrap.append(createText("div","sub",team==="blue"?"BLUE":"RED"));
 ["accel","flex","brake","growth","tank","unknown"].forEach(function(type){
 if(!labels[type])return;
 var line=createText("div","metric-row",""),tag=createText("span","pill "+type,DATA.categories[type]),num=createText("strong","",String(labels[type]));line.append(tag,num);wrap.append(line);
 });root.append(wrap);
 });
}
function categoryForFilter(c){
 if(roleFilter==="ALL")return true;
 var ref=DATA.reference[roleFilter]||{};
 return Object.keys(ref).some(function(k){return ref[k].includes(c.id);})||state.overrides[c.id+"|"+roleFilter]!==undefined;
}
function renderCatalog(){
 var root=$("championGrid");root.replaceChildren();
 var unavailable=usedThisGame(),fearless=previousLocks(),count=0;
 var list=champions.filter(function(c){return (c.name+" "+c.english+" "+c.id).toLowerCase().includes(searchTerm)&&categoryForFilter(c);});
 list.forEach(function(c){
 var locked=unavailable.has(c.id)||fearless.has(c.id),b=document.createElement("button");
 b.className="champ"+(locked?" locked":"");b.disabled=locked||draftComplete()||!isCurrentGame();
 b.title=locked?(fearless.has(c.id)?"이전 세트 사용: 피어리스 잠금":"이번 세트 밴 또는 픽됨"):c.name+" 선택";
 b.append(imageEl(c.id));
 b.append(createText("span","nm",c.name));
 if(roleFilter!=="ALL")b.append(renderPill(c.id,roleFilter));
 else b.append(createText("span","type",locked?"사용 불가":"선택 가능"));
 b.onclick=function(){perform(c.id);};
 root.append(b);count++;
 });
 $("catalogCount").textContent="챔피언 "+champions.length+"명 · 검색 결과 "+count+"명 · 피어리스 잠금 "+fearless.size+"명"+(roleFilter==="ALL"?"":" (라인 필터는 확인된 목록만 표시)");
}
function renderCategoryControls(){
 var dropdown=$("categoryChampion"),current=dropdown.value;dropdown.replaceChildren();
 champions.forEach(function(c){var o=document.createElement("option");o.value=c.id;o.textContent=c.name;dropdown.append(o);});
 if(champions.some(function(c){return c.id===current;}))dropdown.value=current;
 updateCategoryChoice();
 var root=$("categorySummary");root.replaceChildren();
 Object.keys(DATA.reference).forEach(function(l){
 var div=createText("div","",""),head=createText("strong","",l+" · ");div.append(head);
 ["accel","flex","brake","growth","tank"].forEach(function(type){
 var arr=DATA.reference[l][type];if(arr.length){
 var span=createText("span","chip",DATA.categories[type]+": "+arr.map(function(id){return champ(id).name;}).join(", "));div.append(span);
 }});root.append(div);
 });
 root.append(createText("p","sub","※ 이 목록은 검증 완료한 공식 티어표가 아니며, 추측이 많은 기존 자동 태그를 제거한 잠정 전사야. 사용자 수동 변경은 해당 브라우저에 저장돼."));
}
function updateCategoryChoice(){$("categoryChoice").value=getClass($("categoryChampion").value,$("categoryLane").value);}
function renderDraft(){renderGameTabs();renderTeam("blue");renderTeam("red");renderStatus();renderComposition();renderCatalog();}
function exportJson(name,obj){var blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);}
function eventHandlers(){
 $("tabDraft").onclick=function(){switchTab("draft");};
 $("tabRift").onclick=function(){switchTab("rift");};
 $("seriesLength").onchange=function(){var n=+$("seriesLength").value;if(state.games.some(function(g){return g.actions.length>0;})){if(!confirm("현재 밴픽 기록을 지우고 BO"+n+"로 시작할까?")){$("seriesLength").value=String(state.seriesLength);return;}}state=defaults();state.seriesLength=n;save();renderDraft();};
 $("nextGame").onclick=function(){if(!draftComplete()||state.games.length>=state.seriesLength||!isCurrentGame())return;state.games.push(emptyGame());state.currentIndex=state.games.length-1;save();renderDraft();};
 $("undoDraft").onclick=function(){if(!isCurrentGame())return;currentGame().actions.pop();save();renderDraft();};
 $("resetSeries").onclick=function(){if(!confirm("모든 세트 밴픽 기록을 초기화할까? (수동 분류는 보존)"))return;var previous=state.overrides,n=state.seriesLength;state=defaults();state.overrides=previous;state.seriesLength=n;save();renderDraft();};
 $("exportDraft").onclick=function(){exportJson("riftlab-fearless-draft.json",state);};
 $("champSearch").oninput=function(){searchTerm=this.value.trim().toLowerCase();renderCatalog();};
 $("roleFilter").onchange=function(){roleFilter=this.value;renderCatalog();};
 $("categoryChampion").onchange=updateCategoryChoice;
 $("categoryLane").onchange=updateCategoryChoice;
 $("saveCategory").onclick=function(){var key=$("categoryChampion").value+"|"+$("categoryLane").value;state.overrides[key]=$("categoryChoice").value;save();renderDraft();setMsg("분류 수정 저장: "+champ($("categoryChampion").value).name);};
}
function switchTab(which){
 $("draftView").classList.toggle("active",which==="draft");
 $("riftView").classList.toggle("active",which==="rift");
 $("tabDraft").classList.toggle("active",which==="draft");
 $("tabRift").classList.toggle("active",which==="rift");
 if(which==="rift"&&window.RiftLab)window.RiftLab.refresh();
}
async function fetchChampions(){
 try{
 var vres=await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
 if(!vres.ok)throw Error("Versions HTTP "+vres.status);
 var versions=await vres.json();version=versions[0];
 var res=await fetch("https://ddragon.leagueoflegends.com/cdn/"+version+"/data/ko_KR/champion.json");
 if(!res.ok)throw Error("Champions HTTP "+res.status);
 var list=await res.json();
 champions=Object.values(list.data).map(function(x){return {id:x.id,name:x.name,english:x.id,image:x.image.full,stats:x.stats||null,tags:x.tags||[]};}).sort(function(a,b){return a.name.localeCompare(b.name,"ko");});
 renderDraft();renderCategoryControls();if(window.RiftLab)window.RiftLab.refreshChampions();
 }catch(e){console.warn("Data Dragon unavailable, using fallback list",e);$("catalogCount").textContent="오프라인 명단 사용 · 이미지 일부 제한"; }
}
function init(){
 eventHandlers();
 window.RiftCore={champ:function(id){return champ(id);},icon:icon,champions:function(){return champions;},getDraftPicks:function(){var g=currentGame();return ["blue","red"].flatMap(function(team){return picks(g,team).map(function(id,i){return {id:id,team:team,lane:g.roles[team][i]||lanes[i]};});});},draftComplete:draftComplete,switchTab:switchTab};
 renderDraft();renderCategoryControls();if(window.RiftLab)window.RiftLab.init(window.RiftCore);
 fetchChampions();
}
document.addEventListener("DOMContentLoaded",init);
})();
