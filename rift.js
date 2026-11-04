
(function(){
"use strict";
var core,canvas,ctx,images=new Map(),sim,clickCommand=null,lastWall=0,lastUI=0;
var $=function(id){return document.getElementById(id);};
var PATH={
 TOP:[[92,805],[93,135],[805,90]],
 MID:[[92,805],[449,455],[805,90]],
 BOT:[[92,805],[783,802],[805,90]]};
var CC_NAMES={stun:"기절",root:"속박",knockup:"에어본",slow:"둔화",silence:"침묵",suppress:"제압",fear:"공포",charm:"매혹"};
var CC_DISABLE=new Set(["stun","knockup","suppress","fear","charm"]);
var CC_ROOT=new Set(["stun","root","knockup","suppress","fear","charm"]);
var colors={blue:"#63b6ff",red:"#ff7785",neutral:"#d9bd77"};
var campsTemplate=[
{name:"블루 버프",x:280,y:618,hp:1500,at:55},{name:"두꺼비",x:198,y:548,hp:1000,at:67},{name:"늑대",x:315,y:532,hp:950,at:55},
{name:"레드 버프",x:542,y:724,hp:1500,at:55},{name:"칼날부리",x:508,y:625,hp:950,at:55},{name:"돌거북",x:670,y:744,hp:1300,at:67},
{name:"블루 버프",x:622,y:273,hp:1500,at:55},{name:"두꺼비",x:705,y:342,hp:1000,at:67},{name:"늑대",x:580,y:358,hp:950,at:55},
{name:"레드 버프",x:356,y:174,hp:1500,at:55},{name:"칼날부리",x:390,y:276,hp:950,at:55},{name:"돌거북",x:238,y:157,hp:1300,at:67},
{name:"드래곤(모형)",x:676,y:460,hp:4600,at:300},{name:"바론(모형)",x:230,y:426,hp:8000,at:1200}];
function dist(a,b){var dx=a.x-b.x,dy=a.y-b.y;return Math.sqrt(dx*dx+dy*dy);}
function pathLength(lane){var pts=PATH[lane]||PATH.MID,len=0;for(var i=1;i<pts.length;i++)len+=dist({x:pts[i][0],y:pts[i][1]},{x:pts[i-1][0],y:pts[i-1][1]});return len;}
function pointAt(lane,t){
 var pts=PATH[lane]||PATH.MID;
 var total=pathLength(lane),remain=Math.max(0,Math.min(total,t)),last=pts[0];
 for(var i=1;i<pts.length;i++){var a={x:last[0],y:last[1]},b={x:pts[i][0],y:pts[i][1]},seg=dist(a,b);if(remain<=seg)return {x:a.x+(b.x-a.x)*remain/seg,y:a.y+(b.y-a.y)*remain/seg};remain-=seg;last=pts[i];}
 return {x:pts[pts.length-1][0],y:pts[pts.length-1][1]};
}
function fromBase(lane,team,p){return pointAt(lane,team==="blue"?p:pathLength(lane)-p);}
function nextId(){return ++sim.seq;}
function initialState(){
 sim={time:0,running:false,speed:1,units:[],towers:[],camps:[],wards:[],logs:[],selectedId:null,seq:0,waveNumber:0};
 ["TOP","MID","BOT"].forEach(function(lane){
 var len=pathLength(lane);
 [{team:"blue",at:.19},{team:"blue",at:.39},{team:"red",at:.61},{team:"red",at:.81}].forEach(function(o){
 var p=pointAt(lane,len*o.at);sim.towers.push({id:nextId(),type:"tower",team:o.team,name:lane+" 포탑",lane:lane,x:p.x,y:p.y,hp:2100,maxHp:2100,range:103,attack:93,interval:.95,cooldown:0,r:18});
 });
 });
 campsTemplate.forEach(function(c){sim.camps.push({id:nextId(),type:"monster",team:"neutral",name:c.name,x:c.x,y:c.y,hp:c.hp,maxHp:c.hp,range:45,attack:32,interval:1.5,cooldown:0,availableAt:c.at||55,r:c.name.includes("버프")?16:13});});
 log("협곡 실험 준비 완료. 실제 게임 수치와 지형은 근사 모델이야.");
}
function log(message){sim.logs.unshift({time:Math.floor(sim.time),message:message});sim.logs=sim.logs.slice(0,50);}
function teamLabel(team){return team==="blue"?"블루":team==="red"?"레드":"중립";}
function addChampion(id,team,lane,x,y,level){
 var lv=+level||1,c=core.champ(id);
 if(sim.units.filter(function(u){return u.type==="champ";}).length>=10){log("챔피언은 최대 10명까지 배치할 수 있어.");return;}
 var st=c.stats||{},growth=(lv-1)*(.7025+.0175*(lv-1));
 var hp=Math.round((st.hp||650)+(st.hpperlevel||98)*growth),ad=(st.attackdamage||61)+(st.attackdamageperlevel||4.5)*growth;
 var armor=(st.armor||36)+(st.armorperlevel||3)*growth,atkSpeed=(st.attackspeed||.72)*(1+(st.attackspeedperlevel||2)*growth/100);
 var unit={id:nextId(),type:"champ",champId:id,name:c.name,team:team,lane:lane,x:x,y:y,level:lv,hp:hp,maxHp:hp,attack:ad,armor:armor,range:Math.max(22,Math.min(112,(st.attackrange||500)*.16)),interval:Math.max(.45,1/atkSpeed),cooldown:0,speed:Math.max(80,Math.min(150,(st.movespeed||350)*.34)),r:19,cc:[],moveTo:null,targetId:null,deathTime:null};
 sim.units.push(unit);sim.selectedId=unit.id;log(teamLabel(team)+" "+unit.name+" 배치 ("+lane+")");refreshUI();return unit;
}
function makeMinion(team,lane,kind,manualPoint,offset){
 var melee=kind==="melee",progress=offset||0,p=manualPoint||fromBase(lane,team,progress),u={
 id:nextId(),type:"minion",kind:kind,team:team,name:melee?"근접 미니언":"원거리 미니언",lane:lane,x:p.x,y:p.y,
 hp:melee?310:220,maxHp:melee?310:220,attack:melee?18:25,armor:melee?5:0,
 range:melee?22:112,interval:melee?1.2:1.35,cooldown:0,speed:36,r:melee?9:7,
 progress:progress,manual:!!manualPoint,cc:[],deathTime:null};
 sim.units.push(u);return u;
}
function spawnWave(isAutomatic){
 if(sim.units.filter(function(u){return u.type==="minion"&&u.hp>0;}).length>180){log("미니언 과밀: 추가 생성 중단");if(isAutomatic)sim.waveNumber++;return;}
 ["TOP","MID","BOT"].forEach(function(lane){["blue","red"].forEach(function(team){
 for(var i=0;i<6;i++)makeMinion(team,lane,i<3?"melee":"caster",null,-i*17);
 });});
 if(isAutomatic){sim.waveNumber++;log("미니언 웨이브 "+sim.waveNumber+" 자동 생성");}else log("미니언 웨이브 수동 생성 (3라인 × 양 팀 × 6)");
}
function currentCC(u){return (u.cc||[]).filter(function(c){return c.until>sim.time;});}
function immobilized(u){return currentCC(u).some(function(c){return CC_ROOT.has(c.type);});}
function unableToAttack(u){return currentCC(u).some(function(c){return CC_DISABLE.has(c.type);});}
function slowFactor(u){return currentCC(u).some(function(c){return c.type==="slow";})?.5:1;}
function alive(e){return e&&e.hp>0&&(!e.availableAt||sim.time>=e.availableAt);}
function targetById(id){return sim.units.concat(sim.towers,sim.camps).find(function(x){return x.id===id&&alive(x);});}
function allEnemies(u){return sim.units.concat(sim.towers).filter(function(v){return alive(v)&&v.team!==u.team&&v.team!=="neutral";});}
function chooseTarget(u){
 var enemies=allEnemies(u);
 if(u.type==="tower"){
 var creeps=enemies.filter(function(v){return v.type==="minion"&&dist(u,v)<=u.range});
 if(creeps.length)enemies=creeps;
 }
 if(u.type==="minion"){
 var creeps=enemies.filter(function(v){return v.type==="minion"&&dist(u,v)<=u.range});
 if(creeps.length)enemies=creeps;
 }
 var found=enemies.filter(function(v){return dist(u,v)<=u.range+v.r;});
 found.sort(function(a,b){return dist(u,a)-dist(u,b);});
 return found[0]||null;
}
function mitigate(dmg,armor){return Math.max(1,dmg*100/(100+Math.max(-80,armor||0)));}
function attack(u,v){
 if(!alive(u)||!alive(v))return;
 var damage=Math.max(1,Math.round(mitigate(u.attack,v.armor)));
 v.hp=Math.max(0,v.hp-damage);u.cooldown=u.interval;
 if(v.hp===0){
 v.deathTime=sim.time;
 if(v.type==="monster"){var delay=v.name.includes("버프")?300:v.name.includes("드래곤")?300:v.name.includes("바론")?360:135;v.availableAt=sim.time+delay;log(u.name+" → "+v.name+" 처치 (임시 리스폰 "+delay+"초)");}
 else log(u.name+" → "+v.name+" 처치");
 if(v.id===sim.selectedId)refreshUI();
 }
}
function moveToward(u,p,step){var d=dist(u,p);if(d<=step){u.x=p.x;u.y=p.y;return true;}u.x+=(p.x-u.x)*step/d;u.y+=(p.y-u.y)*step/d;return false;}
function updateUnit(u,dt){
 if(!alive(u))return;
 u.cooldown=Math.max(0,(u.cooldown||0)-dt);
 u.cc=(u.cc||[]).filter(function(c){return c.until>sim.time;});
 var moveBlocked=immobilized(u),atkBlocked=unableToAttack(u);
 var target=u.targetId?targetById(u.targetId):null;
 if(target&&target.team===u.team)target=null;
 if(u.type==="minion"&&!u.manual){
 var enemies=chooseTarget(u);
 if(enemies){if(!atkBlocked&&u.cooldown<=0)attack(u,enemies);return;}
 if(!moveBlocked){
 u.progress+=u.speed*slowFactor(u)*dt;
 var p=fromBase(u.lane,u.team,u.progress);
 u.x=p.x;u.y=p.y;
 }
 return;
 }
 if(u.type==="champ"){
 if(target){
 var range=u.range+target.r-2;
 if(dist(u,target)>range&&!moveBlocked)moveToward(u,target,u.speed*slowFactor(u)*dt);
 if(dist(u,target)<=range&&!atkBlocked&&u.cooldown<=0)attack(u,target);
 return;
 }
 if(u.moveTo&&!moveBlocked){
 if(moveToward(u,u.moveTo,u.speed*slowFactor(u)*dt))u.moveTo=null;
 }
 var nearby=chooseTarget(u);
 if(nearby&&!atkBlocked&&u.cooldown<=0)attack(u,nearby);
 return;
 }
 var v=chooseTarget(u);
 if(v&&!atkBlocked&&u.cooldown<=0)attack(u,v);
}
function tick(dt){
 sim.time+=dt;
 while(sim.time+1e-6>=30+sim.waveNumber*30){spawnWave(true);}
 sim.camps.forEach(function(c){if(c.hp<=0&&sim.time>=c.availableAt){c.hp=c.maxHp;c.cooldown=0;log(c.name+" 재생성 (근사)");}});
 var order=sim.units.concat(sim.towers,sim.camps);
 order.forEach(function(u){
 if(u.type==="monster"){
 if(!alive(u))return;
 u.cooldown=Math.max(0,u.cooldown-dt);
 var nearby=sim.units.filter(function(v){return v.type==="champ"&&v.hp>0&&dist(u,v)<u.range+v.r;}).sort(function(a,b){return dist(u,a)-dist(u,b);})[0];
 if(nearby&&u.cooldown<=0)attack(u,nearby);
 }else updateUnit(u,dt);
 });
 sim.units=sim.units.filter(function(u){return u.hp>0||u.deathTime===null||sim.time-u.deathTime<6;});
}
function advance(seconds){
 var left=Math.min(60,Math.max(0,seconds));
 while(left>0){var dt=Math.min(.08,left);tick(dt);left-=dt;}
 refreshUI();
}
function findEntity(x,y){
 var list=sim.units.concat(sim.towers,sim.camps,sim.wards).filter(function(u){return u.hp===undefined||alive(u);});
 list.sort(function(a,b){return dist({x:x,y:y},a)-dist({x:x,y:y},b);});
 var e=list[0];return e&&dist({x:x,y:y},e)<Math.max(e.r||10,21)?e:null;
}
function selected(){return sim.units.concat(sim.towers,sim.camps,sim.wards).find(function(u){return u.id===sim.selectedId;})||null;}
function handleMapClick(e){
 var rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)*canvas.width/rect.width,y=(e.clientY-rect.top)*canvas.height/rect.height;
 var mode=$("mapMode").value,hit=findEntity(x,y);
 if(clickCommand){
 var u=selected(),type=clickCommand;clickCommand=null;
 if(!u||u.type!=="champ"||!alive(u)){log("살아 있는 챔피언을 먼저 선택해.");refreshUI();return;}
 if(type==="move"){u.moveTo={x:x,y:y};u.targetId=null;log(u.name+" 이동 명령");}
 if(type==="attack"){
 if(!hit||hit.team===u.team||hit.type==="ward"){log("적 유닛 또는 정글 몬스터를 클릭해.");refreshUI();return;}
 u.targetId=hit.id;u.moveTo=null;log(u.name+" 공격 대상: "+hit.name);
 }
 refreshUI();return;
 }
 if(mode==="champ"){addChampion($("placeChampion").value,$("placeTeam").value,$("placeLane").value,x,y,+$("placeLevel").value);}
 if(mode==="minion"){var p=makeMinion($("placeTeam").value,$("placeLane").value==="FREE"?"MID":$("placeLane").value,"melee",{x:x,y:y},0);sim.selectedId=p.id;log("미니언 수동 배치");refreshUI();}
 if(mode==="ward"){var w={id:nextId(),type:"ward",team:$("placeTeam").value,name:"와드",x:x,y:y,r:8};sim.wards.push(w);sim.selectedId=w.id;log("와드 배치");refreshUI();}
 if(mode==="select"){sim.selectedId=hit?hit.id:null;refreshUI();}
 if(mode==="erase"&&hit){
 sim.units=sim.units.filter(function(u){return u.id!==hit.id;});
 sim.towers=sim.towers.filter(function(u){return u.id!==hit.id;});
 sim.camps=sim.camps.filter(function(u){return u.id!==hit.id;});
 sim.wards=sim.wards.filter(function(u){return u.id!==hit.id;});
 if(sim.selectedId===hit.id)sim.selectedId=null;log(hit.name+" 삭제");refreshUI();
 }
 if(mode==="cc"){
 if(!hit||!hit.cc){log("CC를 부여할 챔피언 또는 미니언을 클릭해.");refreshUI();return;}
 var t=$("ccType").value,d=Math.max(.5,Math.min(15,+$("ccSeconds").value||2));
 hit.cc.push({type:t,until:sim.time+d});
 log(hit.name+" "+CC_NAMES[t]+" "+d+"초 적용");sim.selectedId=hit.id;refreshUI();
 }
}
function prepImage(id){
 if(images.has(id))return images.get(id);
 var pic=new Image();pic.src=core.icon(id);images.set(id,pic);return pic;
}
function circle(x,y,r,fill,stroke,line){
 ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();
 if(stroke){ctx.lineWidth=line||2;ctx.strokeStyle=stroke;ctx.stroke();}
}
function pathDraw(points,width,color){
 ctx.lineWidth=width;ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle=color;ctx.beginPath();
 points.forEach(function(p,i){i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]);});ctx.stroke();
}
function drawBase(){
 var gradient=ctx.createLinearGradient(0,0,900,900);gradient.addColorStop(0,"#173628");gradient.addColorStop(.47,"#1b4134");gradient.addColorStop(1,"#143025");ctx.fillStyle=gradient;ctx.fillRect(0,0,900,900);
 // River and jungle textures are symbolic, not a traced game map.
 pathDraw([[180,220],[306,355],[457,449],[595,546],[726,661]],100,"#153c51");
 pathDraw([[180,220],[306,355],[457,449],[595,546],[726,661]],67,"#20596d");
 var patches=[[170,300],[247,330],[170,480],[316,200],[401,319],[580,181],[720,289],[744,550],[608,686],[457,754],[264,694],[719,699]];
 patches.forEach(function(p,i){circle(p[0],p[1],i%2?55:40,"#183b2e","#265040",1);circle(p[0]+12,p[1]-8,19,"#214d38");});
 ["TOP","MID","BOT"].forEach(function(lane){pathDraw(PATH[lane],40,"#7f786b");pathDraw(PATH[lane],31,"#545c56");pathDraw(PATH[lane],2,"#a9a89c");});
 circle(95,806,38,"#1a6ba9","#9ed7ff",4);
 circle(806,93,38,"#a93c54","#ff9bad",4);
 ctx.font="bold 15px sans-serif";ctx.textAlign="center";ctx.fillStyle="#e1f7ff";ctx.fillText("BLUE",95,811);
 ctx.fillStyle="#fff1f5";ctx.fillText("RED",806,98);
 ctx.fillStyle="#9dcdac";ctx.font="bold 12px sans-serif";
 ctx.fillText("TOP",437,99);ctx.fillText("MID",457,439);ctx.fillText("BOT",438,818);
}
function drawTowers(){
 sim.towers.forEach(function(u){
 if(u.hp<=0){circle(u.x,u.y,11,"#3d3c42","#777",1);return;}
 var col=colors[u.team];circle(u.x,u.y,21,"#202e39",col,4);
 ctx.beginPath();ctx.moveTo(u.x,u.y-13);ctx.lineTo(u.x+10,u.y+7);ctx.lineTo(u.x-10,u.y+7);ctx.closePath();ctx.fillStyle=col;ctx.fill();
 var ratio=u.hp/u.maxHp;ctx.fillStyle="#0b111c";ctx.fillRect(u.x-19,u.y-29,38,5);ctx.fillStyle=col;ctx.fillRect(u.x-19,u.y-29,38*ratio,5);
 });
}
function drawCamps(){
 sim.camps.forEach(function(u){
 var active=alive(u),col=active?"#d8b97a":"#59656b";
 circle(u.x,u.y,u.r,active?"#675337":"#28363a",col,2);
 ctx.fillStyle=col;ctx.font="11px sans-serif";ctx.textAlign="center";
 ctx.fillText(u.name,u.x,u.y-u.r-8);
 if(!active){ctx.fillText(Math.max(0,Math.ceil(u.availableAt-sim.time))+"초",u.x,u.y+4);}
 else if(u.hp<u.maxHp){ctx.fillStyle="#f8d58d";ctx.fillText(Math.ceil(u.hp),u.x,u.y+4);}
 });
}
function drawUnits(){
 sim.wards.forEach(function(w){circle(w.x,w.y,9,"#17242c",colors[w.team],2);ctx.fillStyle=colors[w.team];ctx.font="bold 15px sans-serif";ctx.textAlign="center";ctx.fillText("✦",w.x,w.y+5);});
 sim.units.forEach(function(u){
 var aliveNow=u.hp>0,col=colors[u.team],selectedUnit=u.id===sim.selectedId;
 if(!aliveNow){circle(u.x,u.y,u.r,"#273137","#59636b",2);ctx.font="12px sans-serif";ctx.fillStyle="#a6adbb";ctx.textAlign="center";ctx.fillText("×",u.x,u.y+4);return;}
 if(u.type==="champ"){
 circle(u.x,u.y,u.r+3,"#0c1723",selectedUnit?"#ffeea0":col,selectedUnit?5:3);
 ctx.save();ctx.beginPath();ctx.arc(u.x,u.y,u.r,0,Math.PI*2);ctx.clip();
 var pic=prepImage(u.champId);
 if(pic.complete&&pic.naturalWidth>0)ctx.drawImage(pic,u.x-u.r,u.y-u.r,u.r*2,u.r*2);
 else{ctx.fillStyle=col;ctx.fillRect(u.x-u.r,u.y-u.r,u.r*2,u.r*2);ctx.fillStyle="#102338";ctx.font="bold 15px sans-serif";ctx.textAlign="center";ctx.fillText(u.name.charAt(0),u.x,u.y+5);}
 ctx.restore();
 }else{
 circle(u.x,u.y,u.r,col,u.kind==="caster"?"#f3f8ff":"#17344c",2);
 if(u.kind==="caster"){ctx.fillStyle="#152138";ctx.fillRect(u.x-2,u.y-2,4,4);}
 }
 var w=u.type==="champ"?42:21;
 ctx.fillStyle="#1a1a20";ctx.fillRect(u.x-w/2,u.y-u.r-11,w,5);
 ctx.fillStyle=u.hp/u.maxHp<.35?"#fa7777":"#90d38e";
 ctx.fillRect(u.x-w/2,u.y-u.r-11,w*Math.max(0,u.hp/u.maxHp),5);
 if(u.type==="champ"){
 ctx.font="bold 11px sans-serif";ctx.fillStyle="#f3f8ff";ctx.textAlign="center";ctx.fillText(u.name+" · "+u.level,u.x,u.y+u.r+15);
 var statuses=currentCC(u);if(statuses.length){ctx.font="bold 11px sans-serif";ctx.fillStyle="#ffe08b";ctx.fillText(statuses.map(function(c){return CC_NAMES[c.type];}).join(","),u.x,u.y-u.r-20);}
 if(u.moveTo){ctx.strokeStyle=col;ctx.lineWidth=1.5;ctx.setLineDash([6,5]);ctx.beginPath();ctx.moveTo(u.x,u.y);ctx.lineTo(u.moveTo.x,u.moveTo.y);ctx.stroke();ctx.setLineDash([]);}
 }
 });
}
function drawRoutesOverlay(){
 if(!sim||!sim.overlay||!sim.overlay.blue||!sim.overlay.red)return;
 ["blue","red"].forEach(function(side){
  var route=sim.overlay[side],points=route.points||[];
  if(!points.length)return;
  ctx.save();
  ctx.lineWidth=5;ctx.strokeStyle=colors[side];ctx.globalAlpha=.85;ctx.setLineDash([13,9]);
  ctx.beginPath();
  points.forEach(function(p,i){if(!i)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});
  ctx.stroke();ctx.setLineDash([]);
  points.forEach(function(p,i){
   circle(p.x,p.y,10,"#162536",colors[side],3);
   ctx.textAlign="center";ctx.font="bold 11px sans-serif";ctx.fillStyle="#ffffff";
   ctx.fillText(String(i+1),p.x,p.y+4);
  });
  ctx.globalAlpha=1;
  ctx.font="bold 13px sans-serif";ctx.textAlign="center";ctx.fillStyle=colors[side];
  var last=points[points.length-1];
  ctx.fillText(side.toUpperCase()+" "+route.arrival+" "+route.lane,last.x,last.y-21);
  ctx.restore();
 });
}
function draw(){
 if(!ctx)return;
 ctx.clearRect(0,0,900,900);drawBase();drawRoutesOverlay();drawCamps();drawTowers();drawUnits();
 var s=selected();if(s){ctx.beginPath();ctx.arc(s.x,s.y,(s.r||15)+8,0,2*Math.PI);ctx.strokeStyle="#ffe99b";ctx.lineWidth=2;ctx.stroke();}
}
function timeString(s){var n=Math.floor(s+0.0001);return String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");}
function refreshUI(){
 if(!sim)return;
 $("gameClock").textContent=timeString(sim.time);
 $("simStats").textContent="챔피언 "+sim.units.filter(function(u){return u.type==="champ"&&u.hp>0;}).length+" / 10 · 미니언 "+sim.units.filter(function(u){return u.type==="minion"&&u.hp>0;}).length+" · 포탑 "+sim.towers.filter(alive).length+" · 캠프 "+sim.camps.filter(alive).length;
 $("playPause").textContent=sim.running?"⏸ 일시정지":"▶ 재생";
 var selectedUnit=selected(),info=$("selectionDetails");
 if(!selectedUnit)info.textContent="지도에서 유닛을 선택해.";
 else{
 var text=selectedUnit.name+" · "+teamLabel(selectedUnit.team);
 if(selectedUnit.hp!==undefined)text+="\nHP "+Math.ceil(selectedUnit.hp)+" / "+Math.ceil(selectedUnit.maxHp);
 if(selectedUnit.type==="champ"){text+="\n레벨 "+selectedUnit.level+" · 기본 공격력(근사) "+selectedUnit.attack.toFixed(1);
 var cc=currentCC(selectedUnit);if(cc.length)text+="\n상태: "+cc.map(function(c){return CC_NAMES[c.type]+" "+(c.until-sim.time).toFixed(1)+"초";}).join(", ");}
 info.textContent=text;info.style.whiteSpace="pre-line";
 }
 $("combatLog").replaceChildren.apply($("combatLog"),sim.logs.map(function(l){var el=document.createElement("div");el.className="log-entry";el.textContent=timeString(l.time)+" · "+l.message;return el;}));
 $("mapStatus").textContent=clickCommand?("다음 클릭: "+(clickCommand==="move"?"이동할 위치":"공격할 적")):("작업: "+$("mapMode").selectedOptions[0].textContent);
}
function refreshChampionList(){
 if(!core)return;
 var root=$("placeChampion"),current=root.value;root.replaceChildren();
 core.champions().forEach(function(c){var opt=document.createElement("option");opt.value=c.id;opt.textContent=c.name;root.append(opt);});
 if(core.champions().some(function(c){return c.id===current;}))root.value=current;
}
function transferDraft(){
 var picks=core.getDraftPicks();if(!picks.length){log("먼저 밴픽에서 챔피언을 선택해.");refreshUI();return;}
 if(sim.units.some(function(u){return u.type==="champ";})&&!confirm("기존 배치된 챔피언을 지우고 현재 밴픽을 배치할까?"))return;
 sim.units=sim.units.filter(function(u){return u.type!=="champ";});
 var n=0;
 picks.forEach(function(p,i){var lane=p.lane==="TOP"?"TOP":p.lane==="MID"?"MID":p.lane==="JUNGLE"?"MID":"BOT";
 var pos=fromBase(lane,p.team,180+(i%5)*18),dx=p.team==="blue"?(-18-i*3):(18+i*3),dy=p.team==="blue"?(11+i*3):(-11-i*3);
 addChampion(p.id,p.team,lane,pos.x+dx,pos.y+dy,1);n++;
 });
 log("현재 세트 "+n+"명 챔피언을 협곡에 배치했어 (정글은 임시 중앙 진입 위치).");refreshUI();
}
function frame(now){
 if(!lastWall)lastWall=now;
 var seconds=Math.min(.5,(now-lastWall)/1000);lastWall=now;
 if(sim&&sim.running){var total=seconds*sim.speed,steps=Math.ceil(total/.08);if(steps){var d=total/steps;for(var i=0;i<steps;i++)tick(d);}}
 draw();
 if(now-lastUI>180){refreshUI();lastUI=now;}
 requestAnimationFrame(frame);
}
function bind(){
 canvas=$("riftCanvas");ctx=canvas.getContext("2d");canvas.addEventListener("click",handleMapClick);
 $("playPause").onclick=function(){sim.running=!sim.running;refreshUI();};
 $("step5").onclick=function(){advance(5);};
 $("step30").onclick=function(){advance(30);};
 $("spawnWave").onclick=function(){spawnWave(false);refreshUI();};
 $("speed").onchange=function(){sim.speed=+$("speed").value;};
 $("transferDraft").onclick=transferDraft;
 $("clearMap").onclick=function(){if(!confirm("협곡 시간·배치·미니언·전투를 전부 초기화할까?"))return;initialState();refreshUI();};
 $("mapMode").onchange=function(){clickCommand=null;refreshUI();};
 $("commandMove").onclick=function(){var u=selected();if(!u||u.type!=="champ"){log("이동할 챔피언을 선택해.");refreshUI();return;}clickCommand="move";$("mapMode").value="select";refreshUI();};
 $("commandAttack").onclick=function(){var u=selected();if(!u||u.type!=="champ"){log("공격할 챔피언을 선택해.");refreshUI();return;}clickCommand="attack";$("mapMode").value="select";refreshUI();};
 $("commandStop").onclick=function(){var u=selected();if(u&&u.type==="champ"){u.moveTo=null;u.targetId=null;log(u.name+" 정지 명령");}clickCommand=null;refreshUI();};
 $("deleteSelected").onclick=function(){var u=selected();if(!u)return;sim.units=sim.units.filter(function(x){return x.id!==u.id;});sim.wards=sim.wards.filter(function(x){return x.id!==u.id;});sim.towers=sim.towers.filter(function(x){return x.id!==u.id;});sim.camps=sim.camps.filter(function(x){return x.id!==u.id;});sim.selectedId=null;refreshUI();};
}
function stageSkirmish(params){
 if(!params||!Array.isArray(params.roster))return {ok:false,reason:"분석한 밴픽을 찾을 수 없어."};
 var lane=["TOP","MID","BOT"].includes(params.lane)?params.lane:"MID";
 var needs=lane==="BOT"?["JUNGLE","ADC","SUPPORT"]:["JUNGLE",lane];
 var blue=needs.map(function(role){return params.roster.find(function(x){return x.team==="blue"&&x.lane===role;});});
 var red=needs.map(function(role){return params.roster.find(function(x){return x.team==="red"&&x.lane===role;});});
 if(blue.concat(red).some(function(x){return !x;}))return {ok:false,reason:"양 팀의 "+lane+" 라이너와 정글러가 모두 필요해."};
 if(sim.units.some(function(u){return u.type==="champ";})&&!confirm("기존 협곡 배치를 초기화하고 교전 실험을 시작할까?"))return {ok:false,reason:"배치 취소됨"};
 initialState();
 var mid={TOP:[445,136],MID:[450,455],BOT:[445,805]}[lane];
 var level=Math.max(1,Math.min(18,+params.level||3));
 var arrival=Math.max(180,+((params.routes||{}).blue||{}).arrivalSec||180,+((params.routes||{}).red||{}).arrivalSec||180);
 sim.time=arrival;
 // Avoid generating all prior lane waves when starting a standalone skirmish at a late timestamp.
 sim.waveNumber=Math.max(0,Math.floor((arrival-30)/30)+1);
 blue.forEach(function(x,i){addChampion(x.id,"blue",lane,mid[0]-88-i*8,mid[1]+(i-1)*28,level);});
 red.forEach(function(x,i){addChampion(x.id,"red",lane,mid[0]+88+i*8,mid[1]+(i-1)*28,level);});
 sim.units.forEach(function(u){
  var foes=sim.units.filter(function(v){return v.type==="champ"&&v.team!==u.team;});
  foes.sort(function(a,b){return dist(u,a)-dist(u,b);});
  u.targetId=foes[0]?foes[0].id:null;
 });
 sim.selectedId=blue.length?sim.units[0].id:null;
 sim.running=false;
 log(lane+" "+(lane==="BOT"?"3대3":"2대2")+" 기본 공격 교전 실험 배치. 재생을 누르면 교전 진행.");
 if(params.routes)sim.overlay=params.routes;
 refreshUI();draw();
 return {ok:true,participants:sim.units.filter(function(u){return u.type==="champ";}).length,level:level,startSec:arrival};
}
window.RiftLab={
 init:function(api){core=api;bind();initialState();refreshChampionList();refreshUI();requestAnimationFrame(frame);},
 refresh:function(){if(ctx)draw();},
 refreshChampions:function(){refreshChampionList();images.clear();},
 showRoutes:function(routes){if(!sim||!routes)return false;sim.overlay=routes;draw();refreshUI();return true;},
 stageSkirmish:stageSkirmish,
 getSituation:function(){return {time:sim.time,champions:sim.units.filter(function(u){return u.type==="champ";}).map(function(u){return {id:u.champId,team:u.team,hp:u.hp,maxHp:u.maxHp,targetId:u.targetId};}),hasRouteOverlay:!!sim.overlay};}
};
})();
