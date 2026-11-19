# LEAGUE LAB API gateway — Cloudflare Workers

이 폴더는 Riot 공식 API를 서버에서 안전하게 호출하기 위한 **배포 준비 코드**야. 현재 GitHub에 업로드된 코드만으로는 작동하지 않아. 라이엇 키와 Worker 배포가 별도로 필요해.

## 구현 상태

| 엔드포인트 | 기능 | 외부 전제조건 |
|---|---|---|
| GET \`/api/health\` | 서버 상태 및 Riot 키 설정 여부 | Worker 배포 |
| GET \`/api/riot/player?name=...&tag=...&region=kr&queue=solo&count=10\` | Riot ID → PUUID, 솔로·자유 랭크 최근 5/10경기, 티어·LP, 경기별 KDA 및 평균 승률·KDA | 유효한 Riot API 키 |
| GET \`/api/riot/live?name=...&tag=...&region=kr\` | 공개 가능한 현재 게임 챔피언 구성 | 유효한 Riot API 키, 게임 진행 중 |
| GET \`/api/stats/champion?key=523&role=ADC&region=kr\` | 별도 데이터셋에서 검증된 통계 로드 | 집계 데이터 KV 바인딩 |

이 서버는 **RSO 로그인 서비스를 제공하지 않아**. Riot Sign On은 승인된 프로덕션 앱에 발급된 별도 RSO 클라이언트로만 개발할 수 있어. 브라우저에 Riot 비밀번호를 입력받거나 클라이언트 시크릿을 노출하는 코드를 넣지 말 것.

### 로컬 개발 및 배포

Node.js와 Wrangler를 설치한 뒤:

\`\`\`bash
cd worker
npx wrangler login
npx wrangler secret put RIOT_API_KEY
npx wrangler deploy
\`\`\`

브라우저 사이트의 **전적·인게임 → API 연결 설정**에 Worker의 HTTPS 배포 주소를 넣어. API 키를 거기에 입력하면 안 돼.

개발 키는 24시간마다 만료되며 공개 서비스에 사용하면 안 돼. 공개 사이트에 배포하기 전 다음이 필요해:

1. Riot Developer Portal에 제품 등록 및 Production Key 신청·승인.
2. API 키는 Cloudflare Secret으로만 보관하고, 키 로테이션 절차 확보.
3. Cloudflare WAF·Rate Limiting 설정 및 업스트림 429 대응. Origin 제한은 인증이나 DDoS 방어가 아님.
4. Terms of Service/Privacy Policy 및 데이터 삭제·보관 정책 공개.
5. 실제 사용 사례와 데이터 권한에 대한 Riot Developer Policy 검토.
6. Riot 계정 직접 로그인은 별도 RSO 승인 이후 OAuth 2.0 Authorization Code + PKCE/비밀 보호 서버 구조로 개발.

### 보안과 프라이버시

- \`X-Riot-Token\`은 Worker에서 Riot API 호출 시에만 사용하고 브라우저로 전달하지 않아.
- 기본 전적 조회는 공개된 **랭크 솔로(큐 420)** 최근 5경기만 조회한다. 커스텀 게임 데이터는 제외한다.
- 인게임 화면은 팀별 챔피언만 노출하고, 상대 플레이어 전적·숨겨진 정보·실시간 전투 상태·상대 스펠 쿨타임 등을 보여주지 않는다.
- 개인정보 관련 추가 기능은 별도의 동의·보관 정책을 정한 뒤 구현해.
- Worker에 캐시·로그 정책을 실제 배포 기준으로 검토해야 해. 현재 코드는 인증된 사용자의 개인 데이터 영구 저장을 구현하지 않는다.

## 자체 집계 통계 — KV 데이터 계약

LOL.PS의 승률 데이터를 무단 스크래핑하거나 그대로 대량 복제하지 않아. 직접 수집한 허용된 경기 기록 또는 적법한 라이선스의 데이터만 사용할 것. 수집 경로·샘플 크기·패치·집계 시간을 명시하고 신뢰구간/최소 표본 기준을 정한 뒤 공개하는 게 좋아.

Cloudflare KV를 바인딩하면 key는 \`champion:kr:ADC:523\` 같은 형식이야. **다음은 필드 구조 예시이며 실제 값이나 승률을 의미하지 않아:**

\`\`\`json
{
  "patch": "<검증된 패치>",
  "updatedAt": "<ISO 8601 집계 시각>",
  "region": "KR",
  "rankRange": "<랭크 필터>",
  "sampleSize": 0,
  "winRate": null,
  "runes": [],
  "builds": [],
  "counters": [],
  "favorable": []
}
\`\`\`

통계 원본 데이터 없이 실제 수치가 없는 상태를 유지하는 것이 맞아. \`sampleSize=0\` 또는 필수 메타데이터가 빠진 항목은 빈 데이터로 처리되도록 서버를 작성했어.

룬 레코드: \`{name, winRate, games}\`. 빌드: \`{items:[itemId,...], winRate, games}\`. 카운터/역카운터: \`{championKey, winRate, games}\` — 모두 **해당 챔피언을 플레이했을 때 승률**을 0~1 소수 범위로 표현해. 표본이 적을 때 잘못된 결론이 나오지 않도록 수집 단계에서 제외하거나 주의 표기를 해야 해.

## 출처
- https://developer.riotgames.com/docs/lol
- https://developer.riotgames.com/docs/portal
- https://support-developer.riotgames.com/hc/en-us/articles/22801670382739-RSO-Riot-Sign-On


## 전적 API 연결 실전 순서

1. https://developer.riotgames.com 에서 계정으로 로그인하여 개발용 API 키를 확보한다. **개발 키는 약 24시간 후 만료되어 테스트에만 적합**하다.
2. 로컬 터미널에서 저장소를 클론하거나 GitHub ZIP을 내려받아 \`worker\` 폴더로 이동한다.
3. Cloudflare에 로그인하고 다음 명령을 실행한다.

\`\`\`bash
cd worker
npx wrangler login
npx wrangler deploy
npx wrangler secret put RIOT_API_KEY
\`\`\`

4. 위 명령은 Secret 값을 **터미널에서 직접 입력**하게 한다. 이를 GitHub, 브라우저, ChatGPT 대화 또는 \`wrangler.toml\`에 붙여넣지 마.
5. 출력된 Worker URL에 다음 엔드포인트로 연결을 확인한다.

\`\`\`bash
curl "https://<your-worker>.workers.dev/api/health"
# Expected:
# {"status":"ready","service":"League Lab API","riotConfigured":true}
\`\`\`

6. LEAGUE LAB 사이트에서 **전적·인게임 → API 연결 설정**을 열고 Worker URL **주소만** 넣는다. **API 상태 확인**을 눌러 Secret 등록 여부를 확인한 뒤 Riot ID를 검색한다.

예시 요청 — 실제 Riot ID로 바꿔서 사용:

\`\`\`text
GET /api/riot/player?name=Sample&tag=KR1&region=kr&queue=solo&count=10
GET /api/riot/player?name=Sample&tag=KR1&region=kr&queue=flex&count=5
GET /api/riot/live?name=Sample&tag=KR1&region=kr
\`\`\`

최신 **LEAGUE-V4 /entries/by-puuid/{puuid}**를 사용하며 구형 \`summoner.id\` 필드가 없더라도 랭크 조회가 된다. 전적 목록은 MATCH-V5, 현재 게임은 SPECTATOR-V5로 조회한다.

API 상태 조회는 **Secret이 존재하는지**만 알려준다. 실제 유효 여부는 전적 검색 결과로 판단해. Riot 서버가 403을 반환하면 키 만료·허용되지 않는 애플리케이션·권한 문제를 확인해야 해. **공개 운영용으로 개발 키를 사용하지 말 것.**

### 자동화된 테스트

리포지토리 루트에서 실행:

\`\`\`bash
node worker/tests/riot-api.smoke.cjs
\`\`\`

이 테스트는 **실제 Riot API를 호출하지 않고** 테스트 응답을 사용한다. PUUID로 티어·전적을 찾는 흐름, KDA 요약, 게임 미진행, API 키 누락, 잘못된 입력과 CORS 검사를 검증한다.

### 운영 전에 체크할 항목

- Riot Production API 신청 및 승인. 공개 서비스에 개발 키를 사용하지 말 것.
- Cloudflare WAF와 요율 제한(Rate Limiting) 실제 설정. Origin 화이트리스트만으로는 남용을 막지 못함.
- 데이터 저장 및 개인정보 정책, 서비스 약관, 데이터 표본 기준 점검.
- 계정 로그인(RSO)은 이 Worker에 아직 없음. Riot에서 Production 및 RSO 승인을 받은 후 별도 개발.
