/**
 * LEAGUE LAB optional Riot gateway for Cloudflare Workers.
 *
 * NO Riot API keys or RSO secrets must be committed here.
 * Endpoints:
 * GET /api/health
 * GET /api/riot/player?name=<gameName>&tag=<tagLine>&region=kr&queue=solo&count=10
 * GET /api/riot/live?name=<gameName>&tag=<tagLine>&region=kr
 * GET /api/stats/champion?key=<championKey>&role=TOP&region=kr
 *
 * This is a prototype. Before public production, set up Cloudflare bot/rate limiting,
 * Riot API production approval, Terms & Privacy, and custom-match opt-in protections.
 */
const SHARDS={
 kr:{platform:"kr",regional:"asia"},
 jp1:{platform:"jp1",regional:"asia"},
 na1:{platform:"na1",regional:"americas"},
 euw1:{platform:"euw1",regional:"europe"}
};
const ROLES=new Set(["TOP","JUNGLE","MID","ADC","SUPPORT"]);
function json(body,status=200,origin="",ttl=0){
 const headers=new Headers({"Content-Type":"application/json; charset=utf-8","X-Content-Type-Options":"nosniff","Cache-Control":ttl>0?"public, max-age="+ttl:"no-store"});
 if(origin){headers.set("Access-Control-Allow-Origin",origin);headers.set("Vary","Origin");headers.set("Access-Control-Allow-Methods","GET, OPTIONS");headers.set("Access-Control-Allow-Headers","Content-Type");}
 return new Response(JSON.stringify(body),{status,headers});
}
function originAllowed(request,env){
 const origin=request.headers.get("Origin");
 if(!origin)return ""; // same-origin fetch or server-side use.
 const allowed=new Set(["https://spsoohojeon-hash.github.io","http://localhost:8787","http://127.0.0.1:8787"]);
 const extras=String(env.ALLOWED_ORIGINS||"").split(",").map(x=>x.trim()).filter(Boolean);
 for(const x of extras)allowed.add(x);
 return allowed.has(origin)?origin:null;
}
function err(status,message,origin){return json({error:true,message},status,origin);}
async function riotFetch(url,key){
 const controller=new AbortController();
 const stop=setTimeout(()=>controller.abort(),9000);
 try{
 const response=await fetch(url,{headers:{"X-Riot-Token":key,Accept:"application/json"},signal:controller.signal});
 if(response.status===404)return null;
 if(!response.ok){
  if(response.status===429)throw Object.assign(new Error("Riot API 요청 한도에 도달했어."),{status:429});
  if(response.status===403||response.status===401)throw Object.assign(new Error("Riot API 키가 유효하지 않거나 만료됐어."),{status:503});
  throw Object.assign(new Error("Riot API 응답 오류 "+response.status),{status:502});
 }
 return await response.json();
 }finally{clearTimeout(stop);}
}
const enc=s=>encodeURIComponent(String(s));
async function getAccount(name,tag,shard,key){
 const uri="https://"+shard.regional+".api.riotgames.com/riot/account/v1/accounts/by-riot-id/"+enc(name)+"/"+enc(tag);
 return await riotFetch(uri,key);
}
async function getPlayer(name,tag,shard,key,queue,count){
 const account=await getAccount(name,tag,shard,key);
 if(!account?.puuid)return {found:false};
 const puuid=account.puuid;
 const platform="https://"+shard.platform+".api.riotgames.com";
 const regional="https://"+shard.regional+".api.riotgames.com";
 // Riot's 2026 LEAGUE-V4 endpoint supports direct PUUID lookups.
 // Do NOT depend on Summoner-V4 returning an encrypted summoner ID.
 const [summoner,rankData,ids]=await Promise.all([
  riotFetch(platform+"/lol/summoner/v4/summoners/by-puuid/"+enc(puuid),key).catch(()=>null),
  riotFetch(platform+"/lol/league/v4/entries/by-puuid/"+enc(puuid),key),
  riotFetch(regional+"/lol/match/v5/matches/by-puuid/"+enc(puuid)+
    "/ids?start=0&count="+count+"&queue="+queue,key)
 ]);
 const rank=(Array.isArray(rankData)?rankData:[])
  .filter(x=>["RANKED_SOLO_5x5","RANKED_FLEX_SR"].includes(x.queueType))
  .map(x=>({
    queueType:x.queueType,tier:x.tier||"UNRANKED",rank:x.rank||"",
    leaguePoints:Number(x.leaguePoints)||0,wins:Number(x.wins)||0,losses:Number(x.losses)||0
  }));
 const matches=[];
 // Keep a small sequential request budget for prototype/dev keys.
 for(const matchId of (Array.isArray(ids)?ids.slice(0,count):[])){
  if(!/^[A-Z0-9_]{6,40}$/.test(matchId))continue;
  const m=await riotFetch(regional+"/lol/match/v5/matches/"+enc(matchId),key);
  if(!m?.info||m.info.queueId!==queue)continue;
  const p=(m.info.participants||[]).find(x=>x.puuid===puuid);
  if(!p)continue;
  matches.push({
   id:matchId,championId:p.championId,championName:p.championName,
   win:!!p.win,kills:Number(p.kills)||0,deaths:Number(p.deaths)||0,
   assists:Number(p.assists)||0,
   cs:(Number(p.totalMinionsKilled)||0)+(Number(p.neutralMinionsKilled)||0),
   durationSeconds:Number(m.info.gameDuration)||0,
   position:p.teamPosition||p.individualPosition||"",
   visionScore:Number(p.visionScore)||0,goldEarned:Number(p.goldEarned)||0,
   totalDamageDealtToChampions:Number(p.totalDamageDealtToChampions)||0,
   items:[p.item0,p.item1,p.item2,p.item3,p.item4,p.item5,p.item6]
     .map(x=>Number(x)||0).filter(x=>x>0),
   summonerSpells:[Number(p.summoner1Id)||0,Number(p.summoner2Id)||0],
   mode:queue===420?"랭크 솔로":"자유 랭크",
   gameStartTimestamp:m.info.gameStartTimestamp||null
  });
 }
 const wins=matches.filter(x=>x.win).length;
 const total=matches.length;
 return {
  found:true,
  player:{gameName:account.gameName,tagLine:account.tagLine,level:summoner?.summonerLevel??null,rank},
  queue:queue===420?"solo":"flex",
  summary:{games:total,wins,losses:total-wins,winRate:total?wins/total:null,
   kills:total?+(matches.reduce((a,x)=>a+x.kills,0)/total).toFixed(2):null,
   deaths:total?+(matches.reduce((a,x)=>a+x.deaths,0)/total).toFixed(2):null,
   assists:total?+(matches.reduce((a,x)=>a+x.assists,0)/total).toFixed(2):null
  },
  matches
 };
}
async function getLive(name,tag,shard,key){
 const account=await getAccount(name,tag,shard,key);
 if(!account?.puuid)return {found:false,active:false};
 const url="https://"+shard.platform+".api.riotgames.com/lol/spectator/v5/active-games/by-summoner/"+enc(account.puuid);
 const live=await riotFetch(url,key);
 if(!live)return {active:false};
 const participants=Array.isArray(live.participants)?live.participants:[];
 // Only in-game champion picks; never show hidden identities or opponent win rates/scouting.
 return {active:true,gameMode:live.gameMode,players:participants.map(p=>({team:p.teamId===100?"blue":"red",championId:p.championId}))};
}
async function getStats(url,env){
 const key=url.searchParams.get("key")||"",role=(url.searchParams.get("role")||"TOP").toUpperCase(),region=(url.searchParams.get("region")||"kr").toLowerCase();
 if(!/^\d{1,6}$/.test(key)||!ROLES.has(role)||!SHARDS[region])return {status:400,body:{message:"잘못된 챔피언·포지션 또는 서버"}};
 if(!env.CHAMPION_STATS_KV)return {status:200,body:{status:"unavailable",message:"승률 집계 데이터베이스가 연결되지 않았어."}};
 const record=await env.CHAMPION_STATS_KV.get("champion:"+region+":"+role+":"+key,"json");
 if(!record||!record.patch||!record.sampleSize||!record.updatedAt)return {status:200,body:{status:"unavailable",message:"검증된 통계 표본이 없어."}};
 return {status:200,body:{status:"ready",...record}};
}
export default {
 async fetch(request,env){
  const origin=originAllowed(request,env);
  if(origin===null)return err(403,"허용되지 않은 출처야.","");
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":origin||"","Access-Control-Allow-Methods":"GET, OPTIONS","Access-Control-Allow-Headers":"Content-Type","Access-Control-Max-Age":"600"}});
  if(request.method!=="GET")return err(405,"GET 요청만 사용할 수 있어.",origin);
  const url=new URL(request.url);
  if(url.pathname==="/api/health")return json({status:"ready",service:"League Lab API",riotConfigured:!!env.RIOT_API_KEY},200,origin,5);
  if(url.pathname==="/api/stats/champion"){const result=await getStats(url,env);return json(result.body,result.status,origin,30);}
  if(!["/api/riot/player","/api/riot/live"].includes(url.pathname))return err(404,"찾을 수 없는 API 경로야.",origin);
  if(!env.RIOT_API_KEY)return err(503,"RIOT_API_KEY 서버 Secret이 아직 설정되지 않았어.",origin);
  // Optional Cloudflare Rate Limiting binding; add WAF/rate limits before public production.
  if(env.RATE_LIMITER?.limit){
   const ip=request.headers.get("CF-Connecting-IP")||"unknown";
   const limit=await env.RATE_LIMITER.limit({key:ip});
   if(!limit.success)return err(429,"잠시 후 다시 검색해.",origin);
  }
  const shard=SHARDS[(url.searchParams.get("region")||"kr").toLowerCase()];
  const name=(url.searchParams.get("name")||"").trim(),tag=(url.searchParams.get("tag")||"").trim();
  if(!shard||name.length<1||name.length>32||tag.length<1||tag.length>12||/[\u0000-\u001f]/.test(name+tag))return err(400,"Riot ID·서버 입력을 확인해.",origin);
  try{
   const path=url.pathname;
   const key=env.RIOT_API_KEY;
   const q=(url.searchParams.get("queue")||"solo").toLowerCase();
   const countRaw=url.searchParams.get("count")||"10";
   const count=/^(5|10)$/.test(countRaw)?Number(countRaw):null;
   if(path.endsWith("/player")&&(!["solo","flex"].includes(q)||!count))
    return err(400,"랭크 종류(solo/flex) 또는 조회 개수(5/10)를 확인해.",origin);
   const data=path.endsWith("/live")
    ?await getLive(name,tag,shard,key)
    :await getPlayer(name,tag,shard,key,q==="solo"?420:440,count);
   if(data.found===false)return err(404,"Riot ID를 찾을 수 없어.",origin);
   return json(data,200,origin,path.endsWith("/live")?10:30);
  }catch(e){return err(e.status||502,e.status===429||e.status===503?e.message:"Riot API 조회 중 오류가 발생했어.",origin);}
 }
};