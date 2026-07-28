# Budget Balance 구현 계획 (기존 프로젝트 마이그레이션)

기획서 "항목별 생활비 관리 서비스"를 기준으로, 현재 [budget-balance](../) 코드베이스를
**앱인토스 미니앱 + Supabase 백엔드**로 마이그레이션하는 계획이다.

- **대상**: 새 프로젝트가 아니라 이 저장소를 개조한다. `src/lib/` 순수 로직과 TDS 프레젠테이션
  계층은 최대한 재사용한다.
- **백엔드**: 자체 서버 대신 **Supabase**(Postgres + RLS + Edge Functions)를 쓴다.
- **인증**: 토스 로그인(`appLogin`) → 서버에서 `userKey` 확보 → Supabase 세션 발급.
- 이 문서는 **계획만** 담는다. 코드는 포함하지 않는다(스키마·설정 예시는 제외).

---

## 1. 현황 요약

현재 코드는 기획서와 목적이 같은 앱이지만, 저장 구조·입력 항목·상태 기준이 다르다.

**재사용하는 것**

| 영역 | 현재 자산 |
| --- | --- |
| 계산 로직 | [calculations.ts](../src/lib/calculations.ts) — 사용률·상태·항목 통계·월 요약 |
| 도메인 규칙 | [category.ts](../src/lib/category.ts) / [expense.ts](../src/lib/expense.ts) / [month.ts](../src/lib/month.ts) |
| 포맷·날짜 | [format.ts](../src/lib/format.ts) / [date.ts](../src/lib/date.ts) |
| UI 컴포넌트 | `SummaryCard` `CategoryCard` `CategoryList` `AmountField` `StatusBadge` `MonthSelector` `ConfirmDialog` 등 |
| 훅 | `useEscapeKey` `useBodyScrollLock` `useDeferredClose` `useSheetMaxHeight` `useAutoFocus` |
| 테스트 | `src/lib/*.test.ts` 116개 (일부 폐기·수정) |
| 3계층 구조 | 순수 로직 / 상태 / 표현 분리 — 그대로 유지한다 |

**기획서와 어긋나 반드시 바꿔야 하는 것**

| # | 항목 | 현재 | 기획서 | 근거 |
| --- | --- | --- | --- | --- |
| G1 | 데이터 원본 | `localStorage`만, 로그인 없음 | 토스 로그인 + 서버 DB, 로컬은 캐시 | §10, §13 데이터 유지 |
| G2 | 최초 설정 | "기본 예산으로 생성" 버튼 하나 | 항목 선택 → 예산 입력 → 총합 실시간 → 최종 확인 | §5.1, §13 최초 설정 |
| G3 | 결제수단 | 지출 등록 필수 입력 (신용/체크) | 받지 않는다 | §4.4 |
| G4 | 예산 상태 | 4단계 (60/80/100) | 5단계 (70/90/100/초과) | §7.6 |
| G5 | 예상 잔액 | 일 평균 기반 `projection()` 표시 | 일일·주간 사용 가능 금액은 MVP 제외 | §4.1, §11 |
| G6 | 항목 상세 | 없음 | 별도 화면 (항목별 지출 내역) | §6, §7.7 |
| G7 | 실행 취소 | 없음 | 지출 등록 직후 실행 취소 | §7.4, §11 |
| G8 | 사전 안내 | 없음 | 등록 전 소진/초과 안내, 예산 하향 시 초과 안내 | §7.4, §7.8 |
| G9 | 메모·날짜 | 타입엔 있으나 입력 UI 없음 | 둘 다 선택 입력 | §7.4 |
| G10 | 아이콘 | 없음 | 항목 아이콘 (선택) | §7.1, §9.2 |
| G11 | 새 달 진입 | "기본 예산 생성 / 지난달 복사" 2택 | 3택 (그대로 / 항목만 복사 / 새로 설정) | §5.3 |
| G12 | 앱인토스 | `@apps-in-toss/*`가 전이 의존성으로만 존재, 설정 파일 없음 | 미니앱으로 빌드·배포 | §12 1단계 |
| G13 | 기본 항목 | 개인용 7개 (`평일 데이트` 등) | 기획서 추천 9개 | §5.1 1단계 |

**용어 정리** — 기획서는 "1회 사용 목표 금액", 코드는 `targetExpenseAmount`("목표 1회 지출액")다.
데이터 모델 필드명을 기획서의 `targetAmountPerUse`로 통일하고 UI 문구도 맞춘다.

---

## 2. 필요한 화면

기획서 §6의 9개 화면을 기준으로 한다.

| # | 화면 | 상태 | 비고 |
| --- | --- | --- | --- |
| S1 | 로그인 | 신규 | 토스 로그인 진입. 세션이 있으면 건너뛴다 |
| S2 | 온보딩 ① 항목 선택 | 신규 | 추천 항목 9개 다중 선택 + 직접 추가 |
| S3 | 온보딩 ② 항목별 예산 설정 | 신규 | 항목마다 월 예산 · 1회 목표 금액(선택), 하단에 총합 실시간 |
| S4 | 온보딩 ③ 최종 확인 | 신규 | 항목·예산 표 + 총생활비, "이대로 시작하기" |
| S5 | 홈 | 개조 | 월 선택 · 전체 카드 · 항목 카드 목록 |
| S6 | 지출 추가 | 개조 | 하단 시트. 결제수단 제거, 메모·날짜 추가 |
| S7 | 항목 상세 | 신규 | 항목 통계 + 그 달 지출 내역 + 지출 수정·삭제 |
| S8 | 항목 추가/수정 | 개조 | 기존 `CategoryAddSheet`/`CategoryEditSheet`에 아이콘 추가 |
| S9 | 지난달 보기 | 개조 | 홈의 월 이동으로 통합. 지난달은 배지로 구분 |
| S10 | 설정·데이터 관리 | 개조 | 로그아웃 추가, 이번 달 초기화 유지 |

새 달에 데이터가 없을 때 뜨는 **월 시작 선택**(§5.3의 3택)은 홈 화면 안의 빈 상태로 처리한다.

---

## 3. 라우팅 구조

현재 라우터가 없고 `App.tsx`가 단일 대시보드다. S7(항목 상세)과 온보딩 3단계가 생기면서
라우터가 필요하다.

- **`react-router-dom` v6 + `HashRouter`를 쓴다.**
  앱인토스는 빌드 결과를 `https://{appName}.apps.tossmini.com` 에 정적 호스팅한다.
  `BrowserRouter`는 서버의 SPA fallback 설정에 의존하지만 `HashRouter`는 의존하지 않으므로,
  배포 환경 확인 전까지 안전한 쪽을 택한다. (배포 후 fallback이 확인되면 전환 가능 —
  전환 비용은 라우터 컴포넌트 한 줄이다.)

```
/                     → 진입 게이트. 세션·온보딩 여부로 리다이렉트
/login                → S1
/onboarding/categories→ S2
/onboarding/budgets   → S3
/onboarding/confirm   → S4
/home?month=YYYY-MM   → S5 / S9  (month 없으면 이번 달)
/category/:id         → S7
/settings             → S10
```

- 지출 추가(S6), 항목 추가·수정(S8), 확인 다이얼로그는 **라우트가 아니라 오버레이**다.
  현재대로 TDS `BottomSheet` / `ConfirmDialog`를 쓰고 열림 상태는 지역 상태로 둔다.
  (WebView 뒤로가기 제스처와의 상호작용은 검증 과제 V4 참고.)
- 진입 게이트 규칙: 세션 없음 → `/login`, 세션 있고 **이번 달 항목 0개 + 과거 데이터 없음** →
  `/onboarding/categories`, 그 외 → `/home`.
- 온보딩 3단계 사이의 입력값은 라우트 파라미터가 아니라 온보딩 전용 상태(§6)로 넘긴다.

---

## 4. 데이터 모델

### 4.1 서버 (Supabase / Postgres)

기획서 §9를 그대로 따른다. 모든 금액은 **정수 원 단위**(`integer`).

**`users`**

| 컬럼 | 타입 | 비고 |
| --- | --- | --- |
| `id` | uuid PK | 앱 내부 사용자 식별자 |
| `toss_user_key` | text UNIQUE NOT NULL | 토스 `userKey` (앱 스코프 식별자) |
| `created_at` / `updated_at` | timestamptz | |

**`monthly_plans`** — 기획서 §9.1

| 컬럼 | 타입 | 비고 |
| --- | --- | --- |
| `id` | uuid PK | |
| `user_id` | uuid FK → users | |
| `year_month` | text NOT NULL | `"YYYY-MM"` |
| `created_at` / `updated_at` | timestamptz | |

- `UNIQUE (user_id, year_month)`
- **`total_budget` 컬럼을 두지 않는다.** 기획서 §9.1 원칙대로 항목 예산 합계로 계산한다.
  성능이 문제되면 캐시 컬럼이 아니라 **뷰**로 노출한다(기준 데이터는 항상 `categories.budget`).

**`categories`** — 기획서 §9.2

| 컬럼 | 타입 | 비고 |
| --- | --- | --- |
| `id` | uuid PK | |
| `monthly_plan_id` | uuid FK → monthly_plans ON DELETE CASCADE | |
| `name` | text NOT NULL | 길이 제한 (예: 20자) |
| `icon` | text NULL | 아이콘 키 |
| `budget` | integer NOT NULL CHECK (> 0) | §7.2 "0원보다 큰 월 예산" |
| `target_amount_per_use` | integer NULL CHECK (> 0) | 선택 |
| `sort_order` | integer NOT NULL | |
| `seed_key` | text NULL | 추천 항목 출처 추적 (현 코드의 `seedKey` 계승) |
| `created_at` / `updated_at` | timestamptz | |

- `UNIQUE (monthly_plan_id, name)` — §7.1 "동일한 월에 같은 이름의 항목" 검증을 DB에서도 보장.

**`expenses`** — 기획서 §9.3

| 컬럼 | 타입 | 비고 |
| --- | --- | --- |
| `id` | uuid PK | |
| `user_id` | uuid FK → users | RLS 단순화를 위해 비정규화 (기획서 §9.3에 명시된 필드) |
| `category_id` | uuid FK → categories ON DELETE CASCADE | §7.9 항목 삭제 시 지출 동반 삭제 |
| `amount` | integer NOT NULL CHECK (> 0) | |
| `spent_at` | date NOT NULL | |
| `memo` | text NULL | |
| `created_at` / `updated_at` | timestamptz | |

**RLS** — 4개 테이블 모두 활성화. 정책은 `auth.jwt() ->> 'sub'` 가 가리키는 `users.id` 기준으로
select/insert/update/delete를 제한한다. `expenses`는 `user_id` 직접 비교, `categories`는
`monthly_plans` 조인으로 소유권을 확인한다. **RLS 없이 배포하지 않는다** — publishable key만으로
전체 테이블이 열린다.

### 4.2 클라이언트 타입

[types.ts](../src/types.ts)를 개편한다.

- **삭제**: `PaymentMethod`, `Expense.paymentMethod`, `NewExpenseInput.paymentMethod`,
  `Prefs.lastPaymentMethod`, `BudgetStore`(localStorage 루트 구조)
- **변경**: `BudgetCategory.monthlyBudget` → `budget`, `targetExpenseAmount` → `targetAmountPerUse`,
  `icon?: string` 추가 / `Expense.date` → `spentAt`
- **추가**: `MonthlyPlan`(id, yearMonth), `AuthUser`, 온보딩 입력 타입(`OnboardingDraft`)
- `MonthlyBudgetData`는 화면이 쓰는 조립 타입으로 유지한다
  (`{ yearMonth, planId, categories, expenses }`).

### 4.3 로컬 저장 (캐시 전용)

기획서 §10의 로컬 저장 목록만 둔다.

- 최근 조회한 월 / 최근 선택한 항목 / 작성 중인 입력값 / 서버 데이터 캐시
- 캐시 키는 **사용자별로 분리**한다. `budget-balance:cache:v2:{userId}`.
  기존 `budget-balance:data:v1`는 다른 사용자의 데이터가 섞일 수 있으므로 재사용하지 않고,
  앱 시작 시 **삭제만** 한다(마이그레이션하지 않는다 — 개인 로컬 데이터이고 서버에 사용자가 없다).
- [storage.ts](../src/lib/storage.ts)의 방어적 정규화(`sanitize*`)는 캐시 검증에 그대로 재사용한다.

---

## 5. API 목록

Supabase를 쓰므로 API는 두 종류다.

### 5.1 Edge Function (서버 로직이 꼭 필요한 것만)

| 함수 | 입력 | 동작 |
| --- | --- | --- |
| `auth-toss-login` | `{ authorizationCode, referrer }` | 토스 OAuth2 토큰 교환 → `login-me`로 `userKey` 조회 → `users` upsert → **Supabase 세션(JWT) 발급** → 클라이언트에 반환 |
| `copy-previous-month` | `{ fromYearMonth, toYearMonth, mode }` | 지난달 항목 복사. 단일 트랜잭션으로 plan + categories 생성 |

- 토스 API BaseURL `https://apps-in-toss-api.toss.im`,
  `POST /api-partner/v1/apps-in-toss/user/oauth2/generate-token` →
  `GET /api-partner/v1/apps-in-toss/user/oauth2/login-me`.
- `authorizationCode`는 **10분 · 1회용**이고 access/refresh token은 **서버에만** 둔다.
  클라이언트에는 Supabase 세션만 내려간다.
- `copy-previous-month`를 함수로 두는 이유: 항목 N개 생성이 부분 실패하면 §13 "월별 데이터가
  섞이지 않는다"가 깨진다. 클라이언트 다중 insert로 처리하지 않는다.

### 5.2 PostgREST 직접 호출 (`@supabase/supabase-js`)

| 용도 | 호출 |
| --- | --- |
| 월 계획 조회 | `monthly_plans` select + `categories`, `expenses` 중첩 select (`year_month` 기준) |
| 월 계획 생성 | `monthly_plans` insert |
| 항목 CRUD | `categories` insert / update / delete |
| 항목 순서 변경 | `categories` upsert (변경된 행의 `sort_order`만) |
| 지출 CRUD | `expenses` insert / update / delete |

- 화면 하나가 필요로 하는 데이터는 **한 번의 중첩 select**로 가져온다(홈 진입 = 1 라운드트립).
- 클라이언트는 `supabase.ts` 한 곳에서만 SDK를 부르고, 나머지는 `src/api/` 의 얇은 함수를 쓴다.
  컴포넌트가 `supabase`를 직접 import 하지 않는다 — 현재 코드가 `localStorage`를 컴포넌트에서
  건드리지 않는 것과 같은 규칙이다.

---

## 6. 상태 관리 방식

현재는 `BudgetContext` 하나가 전체 저장소를 들고 `useEffect`로 localStorage에 동기 저장한다.
서버가 원본이 되면 이 구조로는 로딩·실패·재검증·낙관적 업데이트를 감당할 수 없다.

**서버 상태는 [TanStack Query](https://tanstack.com/query)(`@tanstack/react-query`)로 옮긴다.**

이유: 기획서가 요구하는 "지출 저장 즉시 전 항목 재계산"(§7.4)과 "등록 직후 실행 취소"(§7.4)는
**낙관적 업데이트 + 롤백**이 정석이고, 그걸 직접 만들면 컨텍스트에 캐시·인플라이트·롤백 로직이
쌓인다. `localStorage` 퍼시스터를 붙이면 §10의 "로컬 = 캐시" 요구도 그대로 충족된다.

계층 재정의:

| 계층 | 담당 |
| --- | --- |
| `src/lib/` (순수) | 계산·검증·상태 전이. **React·네트워크 없음.** 지금과 동일하며 테스트가 있는 유일한 계층 |
| `src/api/` (신규) | Supabase 호출 + 행 ↔ 도메인 타입 매핑. 순수 로직을 부르지 않는다 |
| `src/queries/` (신규) | `useMonthPlan`, `useAddExpense` 등 쿼리/뮤테이션 훅. 낙관적 업데이트와 롤백이 여기 |
| `src/context/` | `AuthContext`(세션·userId), `MonthContext`(현재 조회 월), `OnboardingContext`(온보딩 3단계 임시 입력) |
| `src/components/` | 지금과 동일. 계산도 네트워크도 하지 않는다 |

- **`BudgetContext`는 해체한다.** 도메인 액션은 뮤테이션 훅으로, `currentMonth`는 `MonthContext`로,
  `prefs`는 `usePrefs` 훅으로 나눈다. 다만 각 액션이 `src/lib/`의 순수 전이를 부르는
  **현재 규칙은 그대로 유지한다** — 뮤테이션 훅 안에 도메인 규칙을 인라인하지 않는다.
- 온보딩은 서버에 아무것도 쓰지 않은 상태로 3화면을 오가므로 서버 상태가 아니다.
  `OnboardingContext`에 모으고, S4의 "이대로 시작하기"에서 **한 번에** 커밋한다.

---

## 7. 계산 유틸리티

기획서 §8의 8개 공식은 대부분 이미 구현돼 있다. 바꿀 것만 적는다.

| 함수 | 위치 | 조치 |
| --- | --- | --- |
| `computeUsageRate` | calculations.ts | 유지. 예산 0 + 지출 있음 → `100 + used` 규칙도 유지 |
| `statusFromUsageRate` | calculations.ts | **수정** — 5단계로 |
| `categoryStats` | calculations.ts | 필드명 변경(`budget`, `targetAmountPerUse`) 외 로직 유지 |
| `allCategoryStats` | calculations.ts | 유지 |
| `monthlySummary` | calculations.ts | **수정** — `usedByMethod` 제거 |
| `projection` / `Projection` | calculations.ts | **삭제** (G5) |
| `sortByOrder` `createCategory` `moveCategoryToIndex` | category.ts | 유지 |
| `buildNewCategoryInput` `buildCategoryEditPatch` | category.ts | 아이콘 필드 추가, 예산 > 0 검증 |
| `createExpense` `applyExpenseInput` `sortExpensesByRecency` | expense.ts | 결제수단 제거 |
| `createSeededMonth` `copyBudgetFrom` `findPreviousMonthWithData` `removeMonth` | month.ts | 유지. `copyBudgetFrom`의 "새 id 발급 + 지출 미복사"가 §5.3 그대로다 |
| `formatCurrency` `formatThousands` `toAmountDigits` `formatPercent` | format.ts | 유지 |
| `daysInMonth` `isCurrentMonth` | date.ts | `projection` 삭제 후에도 쓰이면 유지, 아니면 제거 |

**신규 순수 함수**

| 함수 | 역할 | 기획서 |
| --- | --- | --- |
| `totalBudget(categories)` | 항목 예산 합계 = 총생활비 | §8.1 |
| `previewExpenseImpact(stats, amount)` | 등록 전 결과 미리보기 → `{ remaining, over }` | §7.4 소진/초과 안내 |
| `previewBudgetChange(stats, nextBudget)` | 예산 하향 시 초과 여부 | §7.8 |
| `buildOnboardingPlan(draft)` | 온보딩 입력 → 생성 요청 값 검증·정규화 | §5.1 |
| `remainingUseCount(remaining, target)` | `max(0, floor(...))` — 현재 `categoryStats` 안에 인라인된 것을 분리 | §8.8 |

**상태 5단계 (G4)** — `BudgetStatus`를 `"normal" | "caution" | "warning" | "exhausted" | "over"`로
바꾸고 임계값을 기획서 §7.6에 맞춘다. `STATUS_LABEL`도 기획서 문구로 교체한다
(`아직 충분히 남았어요` / `예산을 많이 사용했어요` / `예산이 얼마 남지 않았어요` /
`이번 달 예산을 모두 사용했어요` / `예산을 초과했어요`).

| 사용률 | 상태 |
| --- | --- |
| 0 ≤ r < 70 | `normal` |
| 70 ≤ r < 90 | `caution` |
| 90 ≤ r < 100 | `warning` |
| r == 100 | `exhausted` |
| r > 100 | `over` |

`exhausted`가 **정확히 100**인 점에 주의한다. `statusTheme.ts`에 색 매핑 1개를 추가하고,
§7.6대로 색 단독으로 구분하지 않고 문구를 함께 표시한다(현재 `StatusBadge`가 이미 그렇다).

---

## 8. 앱인토스 연동 범위

| 항목 | 내용 |
| --- | --- |
| 직접 의존성 추가 | `@apps-in-toss/web-framework` (현재는 `@toss/tds-mobile-ait`를 통한 **전이 의존성**일 뿐이라 `package.json`에 없다) |
| 초기화 | `npx ait init` — **`granite.config.ts`를 만들어 주지 않는다.** `.gitignore`에 `.granite`를 넣고 npm 스크립트를 갈아엎은 뒤 대화형 프롬프트로 들어간다. 설정 파일은 직접 쓴다 |
| 설정 파일 | `granite.config.ts` — `appName`(콘솔 등록명), `brand`(displayName/primaryColor/icon), `web.commands.dev = "vite"`, `web.commands.build = "vite build"`, `web.port = 5173`, `permissions: []`, `outdir: "dist"`. `tsconfig.node.json`의 `include`에 넣어 `tsc -b`가 검사하게 한다 |
| npm 스크립트 | `ait init`이 `dev`/`build`를 `granite dev`/`ait build`로 덮어쓰지만 **되돌린다.** `npm run build`는 `tsc -b && vite build`(유일한 정적 검사)로 유지하고, 미니앱 경로는 `dev:ait`(`granite dev`) / `build:ait`(`ait build`) / `deploy`(`ait deploy`)로 따로 둔다 |
| 쓰는 브리지 API | `appLogin()` 하나. 그 외 권한(카메라·연락처·위치·결제)은 쓰지 않으므로 `permissions`는 비운다 |
| 이미 되어 있는 것 | `TDSMobileAITProvider`가 [App.tsx](../src/App.tsx) 최상단에 있고, 토스 앱 밖에서는 try/catch로 기본값 폴백한다 |
| 배포 | `npm run build` → 콘솔에 번들 업로드 → 토스앱 테스트 → 출시 요청 |
| 허용 도메인 | Supabase Authentication → URL Configuration 에 `https://{appName}.apps.tossmini.com` 과 `https://{appName}.private-apps.tossmini.com` 등록 |

**`appLogin` 타입 — V1 확인 완료(2026-07-28), 문제 없다.** `@apps-in-toss/web-framework@2.10.7`
(= npm `latest`)를 직접 의존성으로 설치하고 `tsc -b --force`로 확인한 결과:

```ts
import { appLogin } from '@apps-in-toss/web-framework';
// () => Promise<{ authorizationCode: string; referrer: "DEFAULT" | "SANDBOX" }>
```

계획 초안이 걱정한 "배럴에 `appLogin`이 없다"는 **RN용 `dist/index.d.ts`를 본 것**이었다.
웹 진입점은 그 파일이 아니다 — `exports["."].types`가 `dist-web/index.d.ts`를 가리키고,
그게 `@apps-in-toss/web-bridge`(→ `dist/index.d.ts` → `export * from './bridge'` →
`appLogin`)로 이어져 타입이 정상적으로 잡힌다. **모듈 선언 보강 파일도, 래퍼도 필요 없다.**

다만 `web-bridge`의 `bridge.d.ts`는 `export *` 충돌(TS2308)이 수십 건 있다. 이 저장소는
`skipLibCheck: true`라 묻히지만, **`skipLibCheck`를 끄면 빌드가 깨진다** — 끄지 말 것.

---

## 9. 컴포넌트 구조

```
src/
├─ main.tsx                    QueryClientProvider + Router + TDS provider
├─ App.tsx                     라우트 정의만 (현재의 Dashboard는 pages/HomePage로 이동)
├─ supabase.ts                 (신규) 클라이언트 1개
├─ api/                        (신규) auth.ts / plans.ts / categories.ts / expenses.ts
├─ queries/                    (신규) useMonthPlan / useAddExpense / useUpdateExpense /
│                              useDeleteExpense / useCategoryMutations / useCopyPreviousMonth
├─ context/                    AuthContext / MonthContext / OnboardingContext
│                              (BudgetContext.tsx 는 삭제)
├─ lib/                        기존 유지 + 신규 순수 함수 (§7)
├─ hooks/                      기존 5개 유지 + usePrefs / useUndoToast
├─ pages/                      (신규)
│  ├─ LoginPage.tsx
│  ├─ onboarding/CategorySelectPage.tsx / BudgetSetupPage.tsx / ConfirmPage.tsx
│  ├─ HomePage.tsx             현재 Dashboard 개조
│  ├─ CategoryDetailPage.tsx   (신규 S7)
│  └─ SettingsPage.tsx         현재 SettingsModal 개조
└─ components/                  도메인별 하위 폴더 (아래 §9.1)
   ├─ common/
   ├─ month/
   ├─ category/
   ├─ expense/
   └─ onboarding/
```

### 9.1 `components/` 하위 폴더

화면이 1개에서 9개로 늘면 `components/` 평면 나열은 잡동사니가 된다. 도메인별 폴더로 나눈다.

| 폴더 | 파일 | 상태 |
| --- | --- | --- |
| `common/` | `AmountField` `StatusBadge` `statusTheme` `ConfirmDialog` | 유지 |
| `month/` | `MonthSelector` `SummaryCard` | 유지 (`SummaryCard`는 6단계에서 문구·정보 우선순위 개조) |
| `category/` | `CategoryList` `CategoryCard` `CategoryAddSheet` `CategoryEditSheet` | 유지 |
| | `IconPicker` — 항목 아이콘 | 신규 |
| `expense/` | `RecentExpenses` | 유지 |
| | `QuickExpenseForm` — 결제수단 제거, 메모·날짜 입력, 초과 안내 | 개조 |
| | `UndoSnackbar` — 등록 직후 실행 취소 | 신규 |
| `onboarding/` | `CategoryPickerGrid` — 추천 항목 선택 | 신규 |
| | `TotalBudgetFooter` — 하단 총합 | 신규 |

규칙 세 가지:

- **분리 축은 여전히 계층이다.** 이 폴더는 도메인 응집만을 위한 것이고, [CLAUDE.md](../CLAUDE.md)의
  3계층(순수 로직 / 상태 / 표현) 규칙은 그대로다. 폴더가 생겼다고 계산 로직이나 API 호출이
  `components/category/` 안으로 들어오지 않는다 — 순수 로직은 `src/lib/`, 서버 호출은
  `src/api/`·`src/queries/`에만 있다. **FSD(feature-sliced design)로 가지 않는다**: 이 앱의
  애그리게이트는 사실상 `MonthlyBudgetData` 하나(`allCategoryStats` / `monthlySummary`가 항목과
  지출을 함께 받고, 항목 삭제가 지출을 동반 삭제한다)라 항목·지출을 독립 엔티티로 자르면
  경계를 넘는 import가 상시화된다.
- **`common/`은 도메인을 모르는 것만 담는다.** 예산·항목·지출 개념이 들어가는 순간 도메인 폴더로
  간다. `statusTheme.ts`는 상태 색 매핑 한 곳이라는 CLAUDE.md 규칙이 그대로 유효하다.
- **폴더 간 import는 자유롭게 둔다.** 강제할 린터가 없다(ESLint 설정 자체가 없고 `npm run build`의
  tsc가 유일한 정적 검사다). 지킬 수 없는 규칙을 문서에만 적지 않는다.

**이동 시점** — 파일을 옮기는 커밋은 **5단계 직전에 따로 하나** 둔다(이동 + import 경로 수정만,
내용 변경 없음). 1~4단계는 계산 로직·인증·데이터 계층이라 `components/`를 거의 건드리지 않고,
새 컴포넌트가 쏟아지는 건 5단계부터다. 로직 변경과 파일 이동을 같은 커밋에 섞지 않는다.

**기존 UI 규칙은 그대로 지킨다** — [CLAUDE.md](../CLAUDE.md)에 적힌 TDS 사용 규칙(색은 `adaptive`
에서만, 금액 입력은 `AmountField`, 오버레이는 TDS `BottomSheet`/`ConfirmDialog`, 아이콘 이름은
TDS가 참조하는 것만, `.app-shell`의 `translateZ(0)` containing block, 항목 제스처는
`CategoryList` 한 곳이 관리)이 전부 유효하다. 라우터 도입으로 `SettingsModal`이 페이지가 되면
`createPortal` + `z-index` 제약은 사라지므로 그때 CLAUDE.md에서 해당 문단을 정리한다.

---

## 10. 구현 순서

각 단계는 `npm test` + `npm run build`(tsc strict) 통과가 완료 기준이다.
**단계마다 커밋한다.**

### 0단계 — 준비
- `docs/` 추가, 브랜치 생성.
- `@apps-in-toss/web-framework` 직접 설치, `npx ait init`, `granite.config.ts` 작성.
- 검증 과제 V1(=`appLogin` import) 확인.
- Supabase 프로젝트 생성, `.env`(`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`),
  `.gitignore`에 `.env` 추가.

### 1단계 — 계산 로직 (기획서 §12 3단계)
UI·서버와 무관하게 순수 함수부터 끝낸다. 여기서 회귀를 다 잡아야 이후 단계가 안전하다.
- `BudgetStatus` 5단계 + 임계값 교체, `STATUS_LABEL` 문구 교체.
- `projection` / `Projection` / `usedByMethod` 삭제, `PaymentMethod` 전부 제거.
- 필드명 변경(`budget`, `targetAmountPerUse`, `spentAt`) 전파.
- 신규 순수 함수 5개(§7) 작성.
- 테스트 갱신·추가. **이 단계에서 테스트 수가 줄었다가 다시 늘어난다.**

### 2단계 — 스키마와 RLS
- 4개 테이블 + 제약 + 인덱스 + RLS 정책.
- 마이그레이션 파일을 `supabase/migrations/`에 두고 버전 관리한다.
- 정책 검증: 다른 사용자 토큰으로 조회·수정이 **실패**하는지 직접 확인.

### 3단계 — 인증 (기획서 §12 4단계)
- Edge Function `auth-toss-login` 구현 → **검증 과제 V2(mTLS)가 여기서 결판난다.**
- 클라이언트 `AuthContext` + `LoginPage` + 진입 게이트 + 로그아웃.
- 완료 기준: 로그인 → 새로고침 → 세션 유지 → 로그아웃 → 다시 로그인 시 **같은 사용자**.

### 4단계 — 데이터 계층
- `src/api/` + `src/queries/` 작성, `BudgetContext` 해체.
- 홈 화면을 **기존 UI 그대로** 서버 데이터로 구동한다(화면 변경 없음).
- localStorage 퍼시스터 연결, 구 키(`budget-balance:data:v1`) 삭제 로직.
- 완료 기준: 앱 재실행·기기 변경 후 로그인하면 데이터가 복구된다(§13 데이터 유지).

### 5단계 — 최초 설정 화면 (기획서 §12 5단계, G2)
- **먼저 `components/` 하위 폴더 이동을 별도 커밋으로 끝낸다**(§9.1). 이동 + import 경로만.
- 라우터 도입, `OnboardingContext`, S2~S4 3화면.
- 추천 항목 9개를 기획서 §5.1대로 교체(G13).
- 총합 실시간 표시, 최소 1개 항목 검증, 최종 확인 후 일괄 커밋.

### 6단계 — 홈 화면 정리 (기획서 §12 6단계)
- 전체 생활비 카드를 §7.3 문구·정보 우선순위에 맞춘다(예상 잔액 제거).
- 항목 카드 정보 우선순위 §4.2 적용(남은 금액 최상단).
- 지난달은 조회 전용 표시(S9).

### 7단계 — 지출 기능 (기획서 §12 7단계)
- `QuickExpenseForm` 개조: 결제수단 제거(G3), 메모·날짜 입력(G9).
- 등록 전 소진/초과 안내(G8), 완료 문구, **실행 취소**(G7).
- 항목 상세 화면 S7(G6)과 거기서의 지출 수정·삭제.

### 8단계 — 항목 관리 (기획서 §12 8단계)
- 아이콘 선택(G10), 이름 중복·길이 검증, 예산 하향 시 초과 안내(§7.8).
- 삭제 시 "지출 N건도 함께 삭제" 확인(§7.9).
- 순서 변경은 기존 드래그 정렬을 서버 반영으로만 바꾼다.

### 9단계 — 월별 기능 (기획서 §12 9단계)
- 새 달 진입 3택(G11) + `copy-previous-month` Edge Function 연결.
- 월별 데이터 분리 검증.

### 10단계 — 마무리
- 전체 테스트, 실기기 테스트(`--host`), 콘솔 업로드.
- [CLAUDE.md](../CLAUDE.md) / [README.md](../README.md) 를 바뀐 구조로 갱신.
  (현재 두 문서는 "서버·DB·로그인 없음"을 전제로 쓰여 있어 **전면 수정 대상**이다.)

---

## 11. 테스트 항목

### 단위 (Vitest, `environment: "node"` 유지)

- **계산** — 사용률, 상태 5단계 **경계값(69/70/89/90/99/100/101)**, 항목 남은 금액,
  전체 남은 금액, 추가 이용 가능 횟수(`max(0, floor(...))`), 예산 0 + 지출 있음.
- **총생활비** — 항목 추가/수정/삭제 시 합계가 항상 항목 예산 합과 일치.
- **지출** — 생성·수정·삭제 후 재계산, 초과 지출 등록 허용, 최신순 정렬.
- **항목** — 이름 빈 값·중복·길이 검증, 예산 0 이하 거부, 순서 이동(no-op 시 동일 참조).
- **월** — `copyBudgetFrom`이 지출을 복사하지 않고 새 id를 발급하는지, 월 키 검증.
- **미리보기** — `previewExpenseImpact` / `previewBudgetChange`의 소진·초과 판정.
- **정규화** — 캐시 sanitizer가 손상 데이터에서 예외를 던지지 않는지.

### 통합 (수동 또는 e2e)

- 로그인 → 온보딩 → 홈 진입 전체 흐름.
- 지출 등록 → 실행 취소 → 잔액 원복.
- 항목 삭제 시 지출 동반 삭제(DB CASCADE 포함).
- **월별 데이터 분리** — 7월 지출이 8월에 보이지 않는다.
- **RLS** — 다른 사용자 데이터 접근 차단.
- **데이터 복구** — 앱 데이터 삭제 후 재로그인 시 복구.
- 오프라인/네트워크 실패 시 뮤테이션 롤백.

### 컴포넌트 테스트
현재 jsdom·Testing Library 설정이 없다. 온보딩 3화면은 검증 로직이 순수 함수로 빠져 있으므로
MVP에서는 도입하지 않는다. 필요해지면 그때 설정부터 추가한다.

---

## 12. 검증 과제 (먼저 확인해야 진행 가능)

| # | 내용 | 막히면 |
| --- | --- | --- |
| ~~**V1**~~ | ~~`appLogin`의 **타입 선언**이 배럴에 연결돼 있는가~~ **해결됨(0단계).** 2.10.7 웹 진입점(`dist-web/index.d.ts`)에서 타입이 정상적으로 잡힌다 — §8 참고 | (해당 없음) |
| **V2** | **토스 토큰 교환은 mTLS 클라이언트 인증서를 요구**한다. Supabase Edge Functions(Deno)에서 클라이언트 인증서를 붙일 수 있는가 | 불가하면 **토큰 교환 전용 최소 Node 프록시**(Fly.io/Railway 등)를 하나 띄우고, 그 결과로 Supabase JWT를 발급한다. Supabase는 DB·RLS만 담당 |
| **V3** | Edge Function에서 Supabase 세션 JWT를 직접 서명·발급하는 방식이 프로젝트 설정으로 허용되는가 | 대안: `signInWithPassword` 없이 쓰는 커스텀 토큰 경로 또는 프록시 서버가 발급 |
| **V4** | 토스 WebView의 뒤로가기 제스처와 `HashRouter` + BottomSheet 조합이 충돌하지 않는가 | `setIosSwipeGestureEnabled` 등으로 제어 |
| **V5** | `getAnonymousKey()`(앱별 사용자 해시)로 로그인을 대체할 수 있는가 | 클라이언트가 보내는 해시는 위조 가능해 RLS 근거로 못 쓴다. **V2가 완전히 막혔을 때만** 검토하고, 그 경우에도 서버 검증 경로가 필요하다 |

**V2가 이 계획의 최대 리스크다.** 3단계 진입 전에 먼저 결론을 내고, 결과에 따라 §5.1을
"Edge Function" 또는 "외부 프록시 + Edge Function"으로 확정한다.

---

## 13. 검수 조건 매핑 (기획서 §13)

| 기획서 검수 조건 | 담당 단계 |
| --- | --- |
| 총생활비 직접 입력 화면이 없다 | 5단계 (그리고 애초에 만들지 않는다) |
| 항목 → 예산 순서로 설정, 합계 실시간 표시, 최소 1개 검증 | 5단계 |
| 총생활비 = 항목 예산 합계 (항상) | 1단계 + 2단계(캐시 컬럼 미도입) |
| 금액·항목만으로 지출 등록 | 7단계 |
| 지출 등록·수정·삭제 즉시 전 값 재계산 | 4단계(낙관적 업데이트) + 1단계(계산) |
| 예산 초과 지출 안내 후 등록 | 7단계 |
| 1회 목표 금액 선택 설정 / 미설정 시 횟수 미표시 | 1단계 + 6단계 |
| 월별 데이터 미혼재 | 2단계(스키마) + 9단계 |
| 지난달 항목·예산 복사, 지출 미복사 | 9단계 |
| 서버 저장 / 재실행·기기 변경 후 복구 / 로컬만 원본으로 쓰지 않음 | 3~4단계 |
