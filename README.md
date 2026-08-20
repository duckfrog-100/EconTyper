# EconTyper

영어 필사(타자 연습) 기반 단어 학습 앱. Next.js 14 App Router + TypeScript + Tailwind CSS, 브라우저 localStorage 기반 MVP.

## 주요 기능

- 필사 연습 (Practice)
- 사전 검색 (glossary/dictionary, context fingerprint + ranking)
- 단어 저장 (SavedWord v2)
  - 저장소 key: `chagok.savedWords.v2`
- 단어장 (/vocabulary): 검색·정렬·품사 필터·뜻 수정·CSV import/export·삭제
- 복습 (/review): 플래시카드 + SRS 일정
- 타자 속도 게임 (/game): 30초·60초·120초 제한 시간 영어 문장 입력

## 타자 속도 게임 동작

- 지원 시간: 30초 / 60초 / 120초
- 정적 영어 문장(직접 작성 60개)을 무작위로 출제, 큐 소진 시 자동으로 새 문장 배치를 이어 붙임
- **WPM**: `(총 입력 문자 / 5) / 경과 분` (Practice와 동일 공식)
- **정확도**: `맞은 문자 / 총 입력 문자 × 100` (입력 0이면 0)
- **점수**: WPM × 정확도² 반영 × 콤보 보너스(상한 20) — 오타는 정확도 제곱으로 강하게 보정
- **콤보**: 문장을 오타 없이 완료할 때만 +1, 오타가 있었던 문장은 콤보 초기화
- duration(30/60/120초)별 개인 최고 기록을 저장
- 최근 결과는 최대 20개 보관 (최신이 앞, 같은 id 중복 저장 방지)
- 저장소 key: `chagok.speedGame.v1`
- 서버 랭킹·계정·온라인 대전·게임 중간 종료는 미지원

## 복습 MVP 동작

### 데이터 모델
- **SavedWord**와 **ReviewState**는 분리된 저장소를 사용한다.
  - SavedWord: `chagok.savedWords.v2`
  - ReviewState: `chagok.reviewStates.v1` (key: savedWordId)

### ReviewState lazy sync
- SavedWord 저장 순간 ReviewState를 함께 쓰지 않는다.
- /vocabulary 또는 /review 진입 시 `prepareReviewSession`이 누락된 ReviewState를 자동 생성한다 (lazy sync).
- 기존 ReviewState의 id와 일정은 유지되며 중복 생성·ID 변경이 없다.
- CSV import로 추가된 단어도 페이지 진입 시 동일하게 자동 생성된다.

### 복습 일정
- 신규 저장 단어는 다음 날(다음 로컬 자정)부터 복습에 표시된다.
- 평가별 다음 일정
  - 모름(again): 즉시 (nextReviewAt = now, 다음 /review 진입 시 재출제)
  - 헷갈림(hard): 다음 날
  - 알고 있음(good): 3 → 7 → 14 → 30일
- 하루 복습 한도: 20개 (`DEFAULT_DAILY_REVIEW_LIMIT`)

### 세션 정책
- 같은 세션 안에서 again(모름) 단어는 즉시 재출제하지 않는다.
- 세션 저장/재개는 미지원 (새로고침 시 세션 초기화).
- 완료 화면은 현재 세션의 results와 최신 reviewStates만으로 요약을 계산한다.

### 데이터 생명주기
- SavedWord 삭제 성공 시 해당 id의 ReviewState orphan을 함께 정리한다 (비치명적, 실패해도 단어 삭제는 유지).
- Preference는 단어 삭제 시 유지되며 삭제하지 않는다.
- 다음 /review 또는 /vocabulary 진입 시 `prepareReviewSession`이 누락/잔여 state를 다시 정리한다.

### 미지원
- ReviewEvent 저장소, 장기 통계, 연속 학습일, 최근 7일 분석, 그래프는 미지원.

## 릴리스 및 개발

### 로컬 실행
```bash
npm install
npm run dev
```

### 테스트 / 빌드
```bash
npm test        # Vitest 전체 테스트
npm run lint    # ESLint
npm run build   # Next.js 프로덕션 빌드
npm run start   # 빌드 결과 실행
```

### 환경변수
- 별도 환경변수 없이 동작 (외부 사전/번역 API 키는 설정하지 않는 초기 MVP)

### 저장소 key 요약
- `chagok.savedWords.v2` — 단어장
- `chagok.reviewStates.v1` — 복습 상태
- `chagok.speedGame.v1` — 타자 게임 기록
- `chagok.sessionWords.*` — 필사 세션(sessionStorage)

### 배포 전 체크리스트
- [ ] `npm test` / `npm run lint` / `npm run build` 통과
- [ ] 실기기 QA (Chrome, Edge, Android Chrome, iPhone Safari)
- [ ] 개인정보처리방침·이용약관 링크 확인
- [ ] 404/오류 화면 확인

### 지원 브라우저
- 최신 Chrome, Edge, Safari, Firefox (코어 기능 기준)

### 알려진 한계
- 데이터는 브라우저 로컬 저장소에만 보관 (계정·클라우드 동기화 없음)
- 필사 세션은 세션 저장소라 탭/브라우저 종료 시 초기화
- 실기기(모바일) QA는 배포 전 확인 권장
