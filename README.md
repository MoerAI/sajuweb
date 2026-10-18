# 결 — 나를 읽는 시간

PRD `saju_web_PRD_v1.0.md`를 바탕으로 만든 한국어 사주 웹 개발 체험입니다.
ULW 실행 계획과 PRD 게이트 추적표: [`.omo/plans/sajuweb-ulw.md`](.omo/plans/sajuweb-ulw.md).
실행 증거: [`docs/verification.md`](docs/verification.md). 단위/통합 24개, 브라우저 10개 통과.

## 실행

Node.js 22.13 이상이 필요합니다. 이 작업 환경은 Node.js 24.14.0이며 Bun은 설치되어 있지 않습니다.

```sh
npm ci
npm run dev
```

`http://127.0.0.1:3000`에서 실행됩니다. Vite는 프런트 변경을 갱신합니다.
서버 코드를 변경하면 프로세스를 다시 시작하세요.

```sh
npm run check
npm test
npm run build
npm start
```

브라우저 검증은 실행 중인 서버를 대상으로 합니다.

```sh
npx playwright install chromium
npm run test:e2e
```

## 현재 구현

- React/Vite 반응형 홈, 목적별 10개 상품 목록·상세, 입력 재확인, 원국, 초안 리포트, 궁합, 서재, 계산/개인정보/환불 안내.
- `lunar-javascript@1.7.7` 고정과 lockfile. MIT 원문은 `THIRD_PARTY_NOTICES.md`.
- authoritative Node/Express API. 시간대는 Luxon + Node IANA tzdb이며 실행 버전을 DTO에 기록.
- dual-context: 연·월주는 절대 시각을 UTC+8로 변환해 계산하고, 일·시주는 현지 민간시계로 계산. 십성과 지장간 관계는 canonical 일간으로 재산출.
- 시간 미상은 시주 null. 24시간의 시간 경계와 실제 절입 전후를 비교해 연·월·일 후보 공통 사실만 확정.
- 역사 offset/DST, gap 거절, fold의 명시적 offset 선택. 양력/날짜/연도/시간대/대운 분기 입력 검증.
- P01~P04 무료 개발 체험. P02 대상 연도 snapshot과 12개 양력 월의 실제 절입 분할, P03 6개월 캘린더, P04 대칭 합충 사실·상대 정보 권한 확인.
- 모든 개인화 본문에 fact/rule 참조. 전통 해석과 생활 가이드 구분. registry는 **미검수 초안**이며 승인된 규칙으로 가장하지 않음.
- P05~P10 상품별 질문·목차·제한과 공개 게이트. P07의 차단·연락 거부·폭력 분기는 공개 게이트 전에 무료 안전 안내.
- 숫자 0/1 명시 선택 시 대운 **기술 미리보기**. 준비구간 null 간지 + 본대운 10개. 연도 라벨과 연도차+1 나이를 표시하고 정밀 현지 시작일은 null.
- 게스트 HttpOnly/SameSite 세션, 24시간 TTL, 멱등 요청 충돌 검사, 세션별 소유권, 저장 동의, 연쇄 삭제, 개인정보 없는 소개 요약 7일 공유·즉시 철회.
- 입력/원국/질문 원문을 분석 도구·AI에 보내지 않음. API no-store, 개인 페이지 noindex, cross-origin 쓰기 차단.
- 읽기 모드·글자 크기·목차·인쇄/PDF·계산 안내 질문. 자유형 AI 상담은 제공하지 않음.

## 상용 출시 아님

PRD는 단계별 승인 후 출시하도록 정의합니다. 다음은 외부 선행 조건이 없어 현재 **완료하지 않았고, 유료 기능은 API에서도 503으로 차단**합니다.

1. 제품 책임자의 D01~D07 결정과 계산 시계/학파 정책 확정.
2. 지역별 독립 역서 gold fixture와 명리 전문가 승인. 현재 테스트는 업스트림 회귀·어댑터 계약 검증이지 독립적인 정확성 보증이 아닙니다.
3. 규칙 출처·궁합 관계표·한국어 카피 검수와 P05~P10 심층 리포트. 영어 현지화.
4. 결제사업자 계약/서명 secret, 실제 가격·환불 정책, 주문·웹훅·이용권·환불·구매 복원.
5. 계정 인증, 암호화 영구 DB, 백업·삭제 운영, 장기 공유와 다중 인스턴스. 현재는 **프로세스 메모리 저장**으로 서버 재시작 시 모든 결과와 공유가 삭제됩니다.
6. AI 공급자·모델·학습/보관·국외이전 정책. 현재 narrator는 결정론적 템플릿이며 외부 LLM 호출 없음.
7. 관리자 승인/감사 UI, 실제 고객지원 채널, 운영 로그·경보, 명시 부하 환경에서 p95 성능 측정, 다중 브라우저/스크린리더 감사.
8. 28일 실제 수요/매출/환불 검증과 인기 배지. 현재 홈은 편집 추천만 표시합니다.

### 개발 지원 매트릭스

| 항목 | 범위 |
|---|---|
| 입력 역법 | 양력만. 한국 음력·진태양시 비활성 |
| 출생 연도 | 1950~2026, 미래 날짜 거절 |
| 시간대 | Asia/Seoul, Asia/Shanghai, America/New_York |
| 기본 일주 / 대운 sect | 2 / 2, 별개 필드 |
| 연간 대상 | 1950~2030, 입력 출생 연도와 구분 |
| 공개 승인 | 개발 전용. 위 범위도 지역 전체 gold fixture 미승인 |

## 구조

```text
shared/catalog.js        10개 상품과 공개 상태
server/engine.js         검증·시간대·dual-context·DTO·월 경계·관계 사실
server/reports.js        초안 규칙·상품 구성·근거 검증·안전 분기
server/app.js            세션 권한·API·멱등성·TTL·삭제·공유·출시 게이트
server/index.js          로컬 서버·개발/빌드 서빙
src/main.tsx             한국어 사용자 여정
src/style.css            모바일/데스크톱·읽기·인쇄
tests/                  엔진·콘텐츠·API 회귀
e2e/                    실제 브라우저 사용자 여정
```

## 의존성 출처와 공급망

원본: https://github.com/6tail/lunar-javascript

PRD 지정 commit `4c45a59f79b856125516f31aefa8295035c16afd`와 npm 1.7.7 소스의 SHA-256 일치를 확인했습니다.
업데이트는 경계·시간대 회귀 검증 후에만 반영하세요. 설치 무결성 해시는 `package-lock.json`에 보존합니다.

```sh
npm audit
npm run sbom
```

SBOM은 CycloneDX JSON을 표준 출력으로 내보냅니다. 배포 파이프라인에서 해당 빌드의 아티팩트로 보관하세요.
