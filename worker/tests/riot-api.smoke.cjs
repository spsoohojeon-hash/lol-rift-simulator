/* Run from repo root: node worker/tests/riot-api.smoke.cjs
 * No Riot API key, external network, or Cloudflare account needed.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const workerSource=fs.readFileSync(path.resolve(__dirname,"../index.js"),"utf8");
let called=[];
const origFetch=globalThis.fetch;
globalThis.fetch=async function(url,opts){
 const u=new URL(url),p=u.pathname,params=u.searchParams;
 called.push({path:p,url:u.href,token:opts?.headers?.["X-Riot-Token"]});
 assert.equal(opts?.headers?.["X-Riot-Token"],"TEST_ONLY_SECRET","Server must attach the key to Riot requests");
 if(p.includes("/accounts/by-riot-id/"))return Response.json({puuid:"PUUID_FIXTURE",gameName:"Tester",tagLine:"KR1"});
 if(p.includes("/summoners/by-puuid/"))return Response.json({summonerLevel:245}); // 2026 response lacks summoner.id
 if(p.includes("/league/v4/entries/by-puuid/"))return Response.json([
  {queueType:"RANKED_SOLO_5x5",tier:"DIAMOND",rank:"III",leaguePoints:74,wins:88,losses:70}
 ]);
 if(p.includes("/matches/by-puuid/")){
  assert(["420","440"].includes(params.get("queue")));
  return Response.json(["KR_111111","KR_222222"]);
 }
 if(p.includes("/matches/KR_")){
  const win=p.endsWith("KR_111111");
  return Response.json({info:{queueId:420,gameDuration:1825,participants:[
   {puuid:"PUUID_FIXTURE",championId:22,championName:"Ashe",win,
    kills:win?9:2,deaths:win?3:7,assists:win?11:4,totalMinionsKilled:175,neutralMinionsKilled:6,
    teamPosition:"BOTTOM"}
  ]}});
 }
 if(p.includes("/active-games/by-summoner/"))return new Response(null,{status:404});
 throw Error("Unexpected Riot URL: "+u);
};
(async()=>{
 const {default:worker}=await import("data:text/javascript;base64,"+Buffer.from(workerSource).toString("base64"));
 const base="https://league-lab.test";
 const req=(path,origin="https://spsoohojeon-hash.github.io")=>new Request(base+path,{headers:{Origin:origin}});
 const env={RIOT_API_KEY:"TEST_ONLY_SECRET"};
 const health=await worker.fetch(req("/api/health"),env),healthJson=await health.json();
 assert.equal(health.status,200);assert.equal(healthJson.riotConfigured,true);
 const search=await worker.fetch(req("/api/riot/player?name=Tester&tag=KR1&region=kr&queue=solo&count=10"),env),body=await search.json();
 assert.equal(search.status,200);
 assert.equal(body.player.level,245);
 assert.equal(body.player.rank[0].tier,"DIAMOND");
 assert.equal(body.matches.length,2);
 assert.equal(body.summary.games,2);
 assert.equal(body.summary.wins,1);assert.equal(body.summary.losses,1);
 assert.equal(body.summary.winRate,0.5);
 assert(!JSON.stringify(body).includes("TEST_ONLY_SECRET"));
 assert(called.some(x=>x.path.includes("/league/v4/entries/by-puuid/")));
 assert(!called.some(x=>x.path.includes("entries/by-summoner/")));
 const live=await worker.fetch(req("/api/riot/live?name=Tester&tag=KR1&region=kr"),env);
 assert.equal((await live.json()).active,false);
 const invalid=await worker.fetch(req("/api/riot/player?name=Tester&tag=KR1&region=kr&queue=foo&count=10"),env);
 assert.equal(invalid.status,400);
 const noKey=await worker.fetch(req("/api/riot/player?name=Tester&tag=KR1"),{});
 assert.equal(noKey.status,503);
 const forbidden=await worker.fetch(req("/api/health","https://not-allowed.example"),env);
 assert.equal(forbidden.status,403);
 console.log("PASS Riot ID → PUUID → rank + 10-match interface, summary, live 404, key and CORS guards.");
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{globalThis.fetch=origFetch;});
