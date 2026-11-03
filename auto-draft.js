
/* Rift Lab auto-draft v0.4
   Historical anchors: Worlds 2026 patch 26.20, 73 drafts recorded by Nov 3.
   All scores are simulation heuristics, NOT empirical team or match probabilities.
   20-action draft and Fearless legality are enforced by RiftCore.
*/
(function(){
"use strict";
var core, busy=false, lastDecision=null;
var $=function(id){return document.getElementById(id);};
var ROLES=["TOP","JUNGLE","MID","ADC","SUPPORT"];
var KEYS=["accel","flex","brake","growth","tank"];
var TEAM={
 GEN:{name:"Gen.G",region:"LCK",flavor:"라인 유연성과 안정적인 후반 설계",
    focus:{TOP:["Ambessa","KSante","Rumble","Gwen","Gnar","Sion"],JUNGLE:["Qiyana","Vi","Nocturne","LeeSin","JarvanIV","XinZhao"],MID:["Orianna","Ryze","Syndra","Viktor","Azir","Cassiopeia"],ADC:["Ezreal","Lucian","Kalista","Varus","Zeri","Sivir"],SUPPORT:["Milio","Rakan","Renata","Alistar","Lulu","Braum"]},bans:["Orianna","Cassiopeia","Vi","Nocturne","Qiyana","Renata"]},
 T1:{name:"T1",region:"LCK",flavor:"정글 선픽과 다양한 후속 교전 선택",
    focus:{TOP:["Jayce","Ambessa","Gwen","KSante","Rumble","Gnar"],JUNGLE:["Vi","XinZhao","LeeSin","JarvanIV","Nocturne","Qiyana"],MID:["Ryze","Anivia","Orianna","Galio","Azir","Syndra"],ADC:["Jhin","Caitlyn","Ezreal","Varus","Kalista","Lucian"],SUPPORT:["Bard","Karma","Lux","Alistar","Nautilus","Seraphine"]},bans:["Cassiopeia","Orianna","Varus","Nautilus","Poppy","Nocturne"]},
 HLE:{name:"Hanwha Life Esports",region:"LCK",flavor:"상체 개인기와 정글-바텀의 연계",
    focus:{TOP:["Jayce","Rumble","Ambessa","Gwen","Fiora","KSante"],JUNGLE:["Vi","JarvanIV","Nocturne","LeeSin","Trundle","XinZhao"],MID:["Akali","Aurora","Ryze","Syndra","Orianna","Sylas"],ADC:["Jhin","Ezreal","Ziggs","Yunara","Caitlyn","Kalista"],SUPPORT:["Bard","Rakan","Lulu","Pyke","Milio","Alistar"]},bans:["Ezreal","Nocturne","Cassiopeia","Orianna","Renata","Jayce"]},
 DK:{name:"Dplus Kia",region:"LCK",flavor:"정글-솔로라인 결합과 선명한 5대5 설계",
    focus:{TOP:["KSante","Gnar","Jayce","Ambessa","Rumble","Sion"],JUNGLE:["JarvanIV","XinZhao","Vi","LeeSin","Qiyana","Trundle"],MID:["Viktor","Syndra","Ahri","Cassiopeia","Orianna","Ryze"],ADC:["Sivir","Jhin","Caitlyn","Ziggs","Kaisa","Ezreal"],SUPPORT:["Karma","Bard","Lulu","Alistar","Nautilus","Milio"]},bans:["Nocturne","Orianna","Varus","Bard","Nautilus","Poppy"]},
 BLG:{name:"Bilibili Gaming",region:"LPL",flavor:"강한 사이드 옵션과 중후반 팀파이트",
    focus:{TOP:["Jax","Gnar","Camille","KSante","Rumble","Ambessa"],JUNGLE:["Vi","LeeSin","JarvanIV","XinZhao","Nocturne","Qiyana"],MID:["Syndra","Orianna","Akali","Cassiopeia","Ahri","Ryze"],ADC:["Ezreal","Varus","Kalista","Jhin","Caitlyn","Kaisa"],SUPPORT:["Nautilus","Alistar","Renata","Rakan","Lulu","Braum"]},bans:["Nocturne","Cassiopeia","Vi","Jayce","Orianna","Renata"]},
 TES:{name:"TOP Esports",region:"LPL",flavor:"초중반 교전 템포와 바텀 대응",
    focus:{TOP:["Rumble","Ambessa","KSante","Gnar","Jayce","Renekton"],JUNGLE:["LeeSin","Qiyana","JarvanIV","Vi","Nocturne","XinZhao"],MID:["Syndra","Akali","Orianna","Ahri","Ryze","Viktor"],ADC:["Ezreal","Lucian","Jhin","Kalista","Varus","Caitlyn"],SUPPORT:["Nautilus","Alistar","Rakan","Renata","Milio","Leona"]},bans:["Nocturne","Vi","Cassiopeia","Renata","Olaf","Orianna"]},
 IG:{name:"Invictus Gaming",region:"LPL",flavor:"전투 진입과 주도권 전환을 중시하는 가정",
    focus:{TOP:["Ambessa","Rumble","Jayce","KSante","Gnar","Renekton"],JUNGLE:["JarvanIV","LeeSin","Vi","Qiyana","XinZhao","Nocturne"],MID:["Orianna","Syndra","Akali","Galio","Ahri","Viktor"],ADC:["Ezreal","Jhin","Kalista","Varus","Lucian","Sivir"],SUPPORT:["Alistar","Nautilus","Renata","Lulu","Bard","Rakan"]},bans:["Nocturne","Cassiopeia","Vi","Renata","Qiyana","Olaf"]},
 AL:{name:"Anyone's Legend",region:"LPL",flavor:"균형형 드래프트와 정글 운영 옵션",
    focus:{TOP:["Gnar","KSante","Rumble","Jayce","Renekton","Sion"],JUNGLE:["Nocturne","JarvanIV","LeeSin","Vi","XinZhao","Qiyana"],MID:["Syndra","Orianna","Cassiopeia","Viktor","Galio","Ryze"],ADC:["Ezreal","Jhin","Varus","Sivir","Kalista","Caitlyn"],SUPPORT:["Alistar","Nautilus","Lulu","Renata","Braum","Karma"]},bans:["Nocturne","Vi","Orianna","Renata","Cassiopeia","Qiyana"]}
};
// These are curator-added priority weights, not measured 2026 draft frequencies.
// Actual known high-frequency observations are separately stored in empirical arrays.
var POOLS={
 TOP:["Rumble","KSante","Ambessa","Olaf","Jayce","Gnar","Renekton","Gwen","Camille","Jax","Sion","Ornn","Gragas","Kennen","Fiora","Poppy","Aatrox","Gangplank","Aurora","Kled"],
 JUNGLE:["LeeSin","JarvanIV","Qiyana","Vi","Nocturne","XinZhao","Trundle","Poppy","Sejuani","Wukong","Skarner","Graves","Viego","Nidalee","Maokai","RekSai","Taliyah","Zac","Wukong","Elise"],
 MID:["Syndra","Orianna","Cassiopeia","Akali","Viktor","Ryze","Ahri","Galio","Anivia","Azir","Taliyah","Sylas","Aurora","TwistedFate","Lissandra","Vex","Hwei","LeBlanc","Zoe","Veigar","Malzahar"],
 ADC:["Ezreal","Jhin","Kalista","Lucian","Varus","Caitlyn","Sivir","Xayah","Kaisa","Zeri","Aphelios","Jinx","Yunara","MissFortune","Ashe","Ziggs","Corki","Draven","Twitch","Tristana","Smolder"],
 SUPPORT:["Alistar","Nautilus","Lulu","Renata","Milio","Rakan","Karma","Bard","Braum","Leona","Thresh","Seraphine","Lux","Nami","Poppy","Rell","Pyke","Janna","Soraka","Blitzcrank","Yuumi"]
};
var TOP_PICKS={LeeSin:24,Ezreal:22,JarvanIV:21,Rumble:21,Alistar:20,Syndra:19,KSante:19,Ambessa:19,Nautilus:19,Lulu:19,Orianna:18,Qiyana:17,Jhin:16,Kalista:15,Renata:15,Vi:14,Cassiopeia:12,Jayce:12,Akali:12};
var TOP_BANS={Nocturne:53,Vi:42,Cassiopeia:38,Renata:36,Olaf:32,Qiyana:28,Syndra:25,Akali:25,Jayce:24,Orianna:20,Ezreal:19,JarvanIV:18,Rumble:17,LeeSin:16};
var PAIRS=[
 ["JarvanIV","Orianna",16,"돌진·광역 궁극기 연계"],
 ["Nocturne","Galio",15,"글로벌 합류"],
 ["Nocturne","Orianna",10,"진입 후 광역 연계"],
 ["Vi","Ahri",13,"지정 대상 진입과 후속 포착"],
 ["Vi","Orianna",10,"이니시와 광역 피해"],
 ["Lucian","Nami",18,"바텀 짧은 교전"],
 ["Caitlyn","Lux",19,"바텀 사거리·속박 연계"],
 ["Xayah","Rakan",18,"바텀 듀오 시너지"],
 ["Kalista","Renata",10,"공격적 바텀 교전"],
 ["Jhin","Nautilus",12,"원거리 후속 CC"],
 ["Jhin","Alistar",11,"진입 후 장거리 후속"],
 ["Ezreal","Karma",11,"바텀 견제/라인 안정"],
 ["Rumble","JarvanIV",14,"지역 제한·광역 전투"],
 ["Yasuo","Diana",15,"광역 에어본 연계"],
 ["Aphelios","Milio",13,"원딜 중심 보호"],
 ["Jinx","Lulu",14,"성장형 원딜 보호"],
 ["Kaisa","Nautilus",11,"고정 CC 진입 연계"],
 ["Kalista","Alistar",11,"바텀 돌입 시너지"],
 ["Ziggs","Pyke",9,"바텀 푸시·압박"],
 ["Sivir","Karma",10,"라인 푸시 및 이속"]
];
var PROFILES={
 tempo:new Set(["Jayce","Olaf","LeeSin","Qiyana","Vi","JarvanIV","Rumble","Ambessa","Lucian","Kalista","Caitlyn","Renekton","Syndra","Nautilus","Alistar","Pantheon"]),
 control:new Set(["Poppy","Braum","Renata","Lissandra","Galio","Anivia","Xayah","Janna","Orianna","Gragas","Alistar","Maokai","Viktor","Karma"]),
 scaling:new Set(["Azir","Orianna","Viktor","Sivir","Zeri","Aphelios","Jinx","Kaisa","Smolder","Gwen","Kayle","Cassiopeia","Xayah","KogMaw","Lulu","Milio"])
};
var DIVE=new Set(["Nocturne","Vi","JarvanIV","LeeSin","Akali","Alistar","Nautilus","Rakan","Ambessa","Qiyana"]);
var ANTI=new Set(["Poppy","Braum","Xayah","Renata","Lissandra","Gragas","Alistar","Janna","Galio"]);
var VARIANCE=0.15;
function readConfig(){
 return {blue:$("autoBlue").value,red:$("autoRed").value,mode:$("autoMode").value,variance:+$("autoVariance").value,seed:Math.max(1,Math.floor(+$("autoSeed").value||2026))};
}
function saveConfig(){try{localStorage.setItem("riftlab-auto-v1",JSON.stringify(readConfig()));}catch(e){}}
function loadConfig(){try{var v=JSON.parse(localStorage.getItem("riftlab-auto-v1")||"null");if(!v)return; if(TEAM[v.blue])$("autoBlue").value=v.blue;if(TEAM[v.red])$("autoRed").value=v.red;if(["balanced","tempo","control","scaling"].includes(v.mode))$("autoMode").value=v.mode;if([0,.15,.35,.65].includes(+v.variance))$("autoVariance").value=String(+v.variance);if(v.seed)$("autoSeed").value=v.seed;}catch(e){}}
function hashFloat(str){
 var h=2166136261>>>0;for(var i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}
 h^=h>>>16;h=Math.imul(h,2246822507);h^=h>>>13;return ((h>>>0)/4294967295);
}
function noise(cfg,game,step,id){
 return (hashFloat(cfg.seed+"|"+game+"|"+step+"|"+id)*2-1)*cfg.variance*33;
}
function info(s){$("autoSummary").textContent=s;}
function metaWeight(id,mode){
 var p=TOP_PICKS[id]||0,b=TOP_BANS[id]||0;
 var a=(p/24)*16+(b/53)*13;
 if(mode==="lck")a*=.85;
 return a;
}
function friendlyRoster(snapshot,team){
 var g=snapshot.games[snapshot.currentIndex],all=g.actions.filter(function(x){return x.type==="pick"&&x.team===team;});
 return all.map(function(a,i){return {id:a.id,role:g.roles[team][i]||a.role||ROLES[i]};});
}
function assignedRoles(snapshot,team){
 return new Set(friendlyRoster(snapshot,team).map(function(x){return x.role;}));
}
function existsChampion(id){
 return core.champions().some(function(c){return c.id===id;});
}
function available(snapshot,id){return !snapshot.locked.includes(id)&&!snapshot.used.includes(id)&&existsChampion(id);}
function synergy(id,ally){
 var total=0,names=[];
 PAIRS.forEach(function(pair){
 if((pair[0]===id&&ally.some(function(x){return x.id===pair[1];}))||(pair[1]===id&&ally.some(function(x){return x.id===pair[0];}))){total+=pair[2];names.push(pair[3]);}
 });
 return {score:total,names:names};
}
function profilePriority(profile,role,id){
 var a=profile.focus[role]||[],i=a.indexOf(id);
 return i<0?0:Math.max(0,33-i*5);
}
function allyRolePriority(role,stepIndex){
 var first=stepIndex<12;
 if(first){return {TOP:0,JUNGLE:6,MID:1,ADC:7,SUPPORT:5}[role];}
 return {TOP:8,JUNGLE:1,MID:7,ADC:2,SUPPORT:2}[role];
}
function modeBonus(cfg,id,role,snapshot,team){
 var color=core.classifyChampion?core.classifyChampion(id,role):"unknown";
 var enemy=friendlyRoster(snapshot,team==="blue"?"red":"blue");
 var enemyAccel=enemy.filter(function(x){return core.classifyChampion&&core.classifyChampion(x.id,x.role)==="accel";}).length;
 var sourceBonus=0;
 if(cfg.mode==="tempo"&&color==="accel")sourceBonus+=8;
 if(cfg.mode==="control"&&color==="brake")sourceBonus+=8;
 if(cfg.mode==="scaling"&&color==="growth")sourceBonus+=8;
 if(color==="flex"){
   if(cfg.mode==="control"&&enemyAccel>=2)sourceBonus+=5;
   if(cfg.mode==="tempo"&&enemyAccel<2)sourceBonus+=5;
 }
 // Color categories are a provisional video transcription, so they are a small bonus.
 if(cfg.mode!=="balanced")return (PROFILES[cfg.mode].has(id)?12:0)+sourceBonus;
 var x=TEAM[cfg[team]];
 return (x.region==="LPL"&&PROFILES.tempo.has(id)?4:0)
   +(x.region==="LCK"&&(PROFILES.control.has(id)||PROFILES.scaling.has(id))?3:0);
}
function pickCandidate(snapshot,cfg,step){
 var team=step.team,opp=team==="blue"?"red":"blue",ally=friendlyRoster(snapshot,team),enemy=friendlyRoster(snapshot,opp);
 var activeRoles=assignedRoles(snapshot,team);
 var slots=ROLES.filter(function(role){return !activeRoles.has(role);});
 if(!slots.length){ // Happens only with manually changed duplicate roles.
  slots=ROLES.filter(function(role){return ally.filter(function(x){return x.role===role;}).length===0;});
 }
 if(!slots.length)slots=ROLES;
 var choices=[],profile=TEAM[cfg[team]],g=snapshot.currentIndex,actionIndex=snapshot.games[g].actions.length;
 slots.forEach(function(role){
 var basePool=POOLS[role].concat(profile.focus[role]||[]),unique=[...new Set(basePool)];
 unique.forEach(function(id,i){
 if(!available(snapshot,id))return;
 var pair=synergy(id,ally);
 var counter=enemy.some(function(x){return DIVE.has(x.id);})&&ANTI.has(id)?10:0;
 var teamScore=profilePriority(profile,role,id);
 var meta=metaWeight(id,cfg.mode);
 var heuristic=Math.max(0,24-i*1.15);
 var score=meta+teamScore+heuristic+allyRolePriority(role,actionIndex)+modeBonus(cfg,id,role,snapshot,team)+pair.score+counter+noise(cfg,g,actionIndex,id);
 var reasons=[];
 if(meta>18)reasons.push("월즈 26.20 자주 등장한 선택지");
 if(teamScore>=22)reasons.push(profile.name+"의 모델 선호 풀");
 if(pair.names.length)reasons.push("조합: "+pair.names[0]);
 if(counter)reasons.push("상대 진입 조합에 대응");
 if(cfg.mode!=="balanced"&&PROFILES[cfg.mode].has(id))reasons.push("선택한 전술 모드");
 if(!reasons.length)reasons.push(role+" 빈자리 보완 및 피어리스 풀 관리");
 choices.push({id:id,role:role,score:score,reason:reasons.slice(0,2).join(" · ")});
 });
 });
 choices.sort(function(a,b){return b.score-a.score||(a.id<b.id?-1:1);});
 return choices[0]||null;
}
function banCandidate(snapshot,cfg,step){
 var team=step.team,opp=team==="blue"?"red":"blue",oppP=TEAM[cfg[opp]],self=TEAM[cfg[team]],g=snapshot.currentIndex,n=snapshot.games[g].actions.length;
 var oppUsed=assignedRoles(snapshot,opp);
 var pool=[...new Set(Object.keys(TOP_BANS).concat(Object.keys(TOP_PICKS),oppP.bans,self.bans,...ROLES.flatMap(function(r){return oppP.focus[r].concat(POOLS[r]);})))];
 var cand=[];
 pool.forEach(function(id){
 if(!available(snapshot,id))return;
 var oppose=0,oppRole="";
 ROLES.forEach(function(role){
 if(oppUsed.has(role))return;
 var pref=profilePriority(oppP,role,id);
 if(pref>oppose){oppose=pref;oppRole=role;}
 });
 var selfValue=0;
 ROLES.forEach(function(role){if(assignedRoles(snapshot,team).has(role))return;selfValue=Math.max(selfValue,profilePriority(self,role,id));});
 var global=(TOP_BANS[id]||0)/53*30+(TOP_PICKS[id]||0)/24*6;
 var theirBanIdx=oppP.bans.indexOf(id),ownBanIdx=self.bans.indexOf(id);
 var defensive=ownBanIdx<0?0:Math.max(0,17-2*ownBanIdx);
 var threat=oppose*1.12,deny=oppose?oppRole+"에서 상대의 선호 픽 견제":"월즈 공통 고우선순위 견제";
 var score=global+threat+defensive-selfValue*.30+noise(cfg,g,n,id);
 if(theirBanIdx>=0)score+=4;
 var description=oppose>16?deny:"월즈 26.20 높은 픽·밴 존재감";
 if(defensive>=12)description+=" · 팀의 과거 밴 성향 반영";
 cand.push({id:id,role:null,score:score,reason:description});
 });
 cand.sort(function(a,b){return b.score-a.score||(a.id<b.id?-1:1);});
 return cand[0]||null;
}
function choose(snapshot,cfg){
 if(!snapshot.step)return null;
 return snapshot.step.type==="ban"?banCandidate(snapshot,cfg,snapshot.step):pickCandidate(snapshot,cfg,snapshot.step);
}
function simulateOne(quiet){
 var cfg=readConfig(),snapshot=core.autoSnapshot();
 if(!snapshot.isActive||snapshot.complete){info(snapshot.complete?"현재 세트가 끝났어. 다음 세트로 넘기거나 전체 시리즈 자동 생성을 선택해.":"지난 세트는 읽기 전용이야. 최신 세트로 이동해.");return false;}
 var choice=choose(snapshot,cfg);
 if(!choice){info("사용 가능한 챔피언을 찾지 못했어. 피어리스 잠금이나 역할 지정을 확인해.");return false;}
 var done=core.autoApply(choice.id,{role:choice.role,reason:choice.reason,source:"worlds-2026-26.20-heuristic"},!!quiet);
 if(done)lastDecision={action:snapshot.step,choice:choice,cfg:cfg};
 return !!done;
}
function finish(){core.autoCommit();updateSummary();}
function autoGame(){
 if(busy)return;busy=true;saveConfig();
 try{
 var count=0;
 while(count<20&&!core.autoSnapshot().complete){
   if(!simulateOne(true))break;
   count++;
 }
 finish();
 }catch(err){console.error(err);info("자동 밴픽 오류: "+err.message);}
 finally{busy=false;}
}
function autoSeries(){
 if(busy)return;busy=true;saveConfig();
 try{
 var runs=0;
 while(runs<5){
   var snap=core.autoSnapshot();
   if(!snap.isActive){info("가장 최근 세트를 선택해야 자동 생성할 수 있어.");break;}
   var stepCount=0;
   while(!snap.complete&&stepCount<20){
    if(!simulateOne(true))break;
    stepCount++;snap=core.autoSnapshot();
   }
   if(!snap.complete)break;
   if(snap.gameCount>=snap.seriesLength)break;
   if(!core.autoNextGame(true))break;
   runs++;
 }
 finish();
 }catch(err){console.error(err);info("시리즈 생성 오류: "+err.message);}
 finally{busy=false;}
}
function elem(tag,cls,content){
 var x=document.createElement(tag);if(cls)x.className=cls;if(content!==undefined)x.textContent=String(content);return x;
}
function appendLine(root,text,highlight){
 var d=elem("div",highlight?"trace-highlight":"",text);root.append(d);
}
function composeText(draft,cfg){
 var game=draft.games[draft.currentIndex];
 var wrapper=elem("div","");
 wrapper.append(elem("div","","모델: "+TEAM[cfg.blue].name+" (BLUE) vs "+TEAM[cfg.red].name+" (RED) · 세트 "+(draft.currentIndex+1)+"/"+draft.seriesLength));
 wrapper.append(elem("div","notes","완료된 세트 "+draft.games.filter(function(g){return g.actions.length===20;}).length+"개 · 승패는 예측하지 않음 · 아래 선택 근거는 모델의 설명"));
 var grid=elem("div","split");
 ["blue","red"].forEach(function(side){
 var team=elem("div","");
 var heading=elem("strong","",TEAM[cfg[side]].name+" · "+TEAM[cfg[side]].region);team.append(heading);
 var picks=game.actions.filter(function(a){return a.type==="pick"&&a.team===side;});
 var bans=game.actions.filter(function(a){return a.type==="ban"&&a.team===side;});
 var p=elem("div","pick-row");picks.forEach(function(a,i){var pill=elem("span","",((game.roles[side][i]||a.role||ROLES[i])+" ")+core.champ(a.id).name);p.append(pill);});
 team.append(p);team.append(elem("div","notes","밴: "+(bans.length?bans.map(function(a){return core.champ(a.id).name;}).join(", "):"없음")));
 grid.append(team);
 });wrapper.append(grid);
 var notes=elem("div","trace");
 game.actions.slice(-7).forEach(function(a){
 var key=a.team==="blue"?"BLUE":"RED";
 notes.append(elem("div","",key+" "+(a.type==="ban"?"BAN":"PICK")+" "+core.champ(a.id).name+(a.role?" · "+a.role:"")+(a.reason?" — "+a.reason:" (직접 선택)")));
 });
 if(game.actions.length)wrapper.append(notes);
 return wrapper;
}
function updateSummary(){
 if(!core)return;
 var cfg=readConfig(),snap=core.autoSnapshot(),node=$("autoSummary");node.replaceChildren(composeText(snap,cfg));
}
function bind(){
 if(!window.RiftCore){info("밴픽 엔진 연결을 찾을 수 없어.");return;}
 core=window.RiftCore;loadConfig();
 ["autoBlue","autoRed","autoMode","autoVariance","autoSeed"].forEach(function(id){$(id).addEventListener("change",function(){saveConfig();updateSummary();});});
 $("autoOne").onclick=function(){if(busy)return;saveConfig();if(simulateOne(false))updateSummary();};
 $("autoGame").onclick=autoGame;
 $("autoSeries").onclick=autoSeries;
 $("autoReset").onclick=function(){
  if(!confirm("현재 밴픽 기록을 초기화하고 새 "+$("seriesLength").value+" 시리즈를 시작할까?"))return;
  core.autoSetSeries(+$("seriesLength").value);lastDecision=null;updateSummary();
 };
 var observer=window.MutationObserver&&new MutationObserver(function(){updateSummary();});
 if(observer){observer.observe($("gameTabs"),{childList:true});}
 updateSummary();
}
document.addEventListener("DOMContentLoaded",bind);
})();
