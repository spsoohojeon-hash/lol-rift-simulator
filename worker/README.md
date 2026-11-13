# LEAGUE LAB API gateway — Cloudflare Workers

이 폴더는 Riot 공식 API를 서버에서 안전하게 호출하기 위한 **배포 준비 코드**야. 현재 GitHub에 업로드된 코드만으로는 작동하지 않아. 라이엇 키와 Worker 배포가 별도로 필요해.

## 구현 상태

| 엔드포인트 | 기능 | 외부 전제조건 |
|---|---|---|
| GET \`/api/health\` | 서버 상태 및 Riot 키 설정 여부 | Worker 배포 |
| GET \`/api/riot/player?name=...&tag=...&region=kr\` | Riot ID → PUUID, 최근 솔로 랭크 5경기, 랭크 | 유효한 Riot API 키 |
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
