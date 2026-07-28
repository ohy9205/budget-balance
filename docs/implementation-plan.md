# Budget Balance 구현 계획 (기존 프로젝트 마이그레이션)

기획서 "항목별 생활비 관리 서비스"를 기준으로, 현재 [budget-balance](../) 코드베이스를
**앱인토스 미니앱**으로 마이그레이션하는 계획이다.

- **대상**: 새 프로젝트가 아니라 이 저장소를 개조한다. [src/lib/](../src/lib/) 순수 로직과 TDS
  프레젠테이션 계층은 최대한 재사용한다.
- **저장**: 서버를 두지 않는다. `@apps-in-toss/web-framework`의 **`Storage`**(기기 로컬 KV)에
  저장하고, 토스 앱 밖에서는 `localStorage`로 떨어진다.
- **인증**: 없다. 기기 하나 = 사용자 하나로 본다.
- 이 문서는 **계획만** 담는다. 코드는 포함하지 않는다.

> **2026-07-28 방향 전환.** 초안은 Supabase(Postgres + RLS + Edge Functions) + 토스 로그인
> (`appLogin`)이었다. 로컬 저장으로 바꾸면서 **기획서 §13의 "서버에 저장 / 기기 변경 후 복구"를
> 의도적으로 포기**했다(사용자 결정). 그 대신 최대 리스크였던 검증 과제 V2(mTLS)·V3(JWT 발급)이
> 사라지고, 스키마·인증·API 계층 세 단계가 통째로 없어졌다.
>
> Supabase는 **설치도, 코드 작성도 하지 않은 상태**에서 접었다. 남아 있는 흔적은
> [.env](../.env)의 환경변수 2개와 [src/vite-env.d.ts](../src/vite-env.d.ts)의 그 타입뿐이며,
> 지우지 않고 그냥 쓰지 않는다.

---

## 1. 현황 요약

현재 코드는 기획서와 목적이 같은 앱이지만, 입력 항목·상태 기준·최초 설정 흐름이 다르다.

**재사용하는 것**

| 영역 | 현재 자산 |
| --- | --- |
| 계산 로직 | [calculations.ts](../src/lib/calculations.ts) — 사용률·상태·항목 통계·월 요약 |
| 도메인 규칙 | [category.ts](../src/lib/category.ts) / [expense.ts](../src/lib/expense.ts) / [month.ts](../src/lib/month.ts) / [onboarding.ts](../src/lib/onboarding.ts) |
| 포맷·날짜 | [format.ts](../src/lib/format.ts) / [date.ts](../src/lib/date.ts) |
| 방어적 정규화 | [storage.ts](../src/lib/storage.ts)의 `sanitize*` — 저장 백엔드가 바뀌어도 그대로 쓴다 |
| UI 컴포넌트 | `SummaryCard` `CategoryCard` `CategoryList` `AmountField` `StatusBadge` `MonthSelector` `ConfirmDialog` 등 |
| 훅 | `useDeferredClose` `useSheetMaxHeight` `useAutoFocus` (`useEscapeKey`·`useBodyScrollLock`은 3단계에서 사용처가 사라져 삭제) |
| 테스트 | `src/lib/*.test.ts` 136개 |
| 3계층 구조 | 순수 로직 / 상태 / 표현 분리 — 그대로 유지한다 |

**기획서와 어긋나 바꿔야 하는 것**

| # | 항목 | 현재 | 기획서 | 상태 |
| --- | --- | --- | --- | --- |
| G1 | 데이터 원본 | 브라우저 `localStorage` | (서버) | **방향 전환** — 앱인토스 `Storage`. 서버는 두지 않는다 |
| G2 | 최초 설정 | "기본 예산으로 생성" 버튼 하나 | 항목 선택 → 예산 입력 → 총합 실시간 → 최종 확인 | **완료(4단계)** |
| G3 | 결제수단 | 지출 등록 필수 입력 | 받지 않는다 | **완료(1단계)** |
| G4 | 예산 상태 | 4단계 (60/80/100) | 5단계 (70/90/100/초과) | **완료(1단계)** |
| G5 | 예상 잔액 | 일 평균 기반 `projection()` | MVP 제외 | **완료(1단계)** |
| G6 | 항목 상세 | 없음 | 별도 화면 (항목별 지출 내역) | 6단계 |
| G7 | 실행 취소 | 없음 | 지출 등록 직후 실행 취소 | 6단계 |
| G8 | 사전 안내 | 없음 | 등록 전 소진/초과 안내, 예산 하향 시 초과 안내 | 6단계·7단계 (계산은 1단계 완료) |
| G9 | 메모·날짜 | 타입엔 있으나 입력 UI 없음 | 둘 다 선택 입력 | 6단계 |
| G10 | 아이콘 | 없음 | 항목 아이콘 (선택) | 7단계 (타입·검증은 1단계 완료) |
| G11 | 새 달 진입 | 2택 | 3택 (그대로 / 항목만 복사 / 새로 설정) | 8단계 |
| G12 | 앱인토스 | 설정 파일 없음 | 미니앱으로 빌드·배포 | **완료(0단계)** |
| G13 | 기본 항목 | 개인용 7개 (`평일 데이트` 등) | 기획서 추천 9개 | **완료(4단계)** — 목록은 추정, 4단계 항 참고 |

**용어** — 기획서의 `targetAmountPerUse`("1회 사용 목표 금액")로 통일했다(1단계 완료).

---

## 2. 필요한 화면

기획서 §6을 기준으로 하되 **로그인 화면(S1)은 없다.**

| # | 화면 | 상태 | 비고 |
| --- | --- | --- | --- |
| S2 | 온보딩 ① 항목 선택 | 신규 | 추천 항목 9개 다중 선택 + 직접 추가 |
| S3 | 온보딩 ② 항목별 예산 설정 | 신규 | 항목마다 월 예산 · 1회 목표 금액(선택), 하단에 총합 실시간 |
| S4 | 온보딩 ③ 최종 확인 | 신규 | 항목·예산 표 + 총생활비, "이대로 시작하기" |
| S5 | 홈 | 개조 | 월 선택 · 전체 카드 · 항목 카드 목록 |
| S6 | 지출 추가 | 개조 | 하단 시트. 메모·날짜 추가, 초과 안내 |
| S7 | 항목 상세 | 신규 | 항목 통계 + 그 달 지출 내역 + 지출 수정·삭제 |
| S8 | 항목 추가/수정 | 개조 | 기존 시트에 아이콘 추가 |
| S9 | 지난달 보기 | 개조 | 홈의 월 이동으로 통합. 지난달은 배지로 구분 |
| S10 | 설정·데이터 관리 | 개조 | 이번 달 초기화 유지 (로그아웃 없음) |

새 달에 데이터가 없을 때 뜨는 **월 시작 선택**(§5.3의 3택)은 홈 화면 안의 빈 상태로 처리한다.

---

## 3. 라우팅 구조

현재 라우터가 없고 [App.tsx](../src/App.tsx)가 단일 대시보드다. S7(항목 상세)과 온보딩 3단계가
생기면서 라우터가 필요하다. **인증이 없어져도 이 판단은 그대로다.**

- **`react-router-dom` v7 + `HashRouter`를 쓴다.** 앱인토스는 빌드 결과를
  `https://{appName}.apps.tossmini.com` 에 정적 호스팅한다. `BrowserRouter`는 서버의 SPA fallback
  설정에 의존하지만 `HashRouter`는 의존하지 않으므로 안전한 쪽을 택한다.

```
/                     → 진입 게이트. 온보딩 완료 여부로 리다이렉트
/onboarding/categories→ S2
/onboarding/budgets   → S3
/onboarding/confirm   → S4
/home                 → S5 / S9  (보고 있는 월은 BudgetContext가 들고 있다)
/category/:id         → S7
/settings             → S10
```

- 지출 추가(S6), 항목 추가·수정(S8), 확인 다이얼로그는 **라우트가 아니라 오버레이**다.
  TDS `BottomSheet` / `ConfirmDialog`를 쓰고 열림 상태는 지역 상태로 둔다.
- 진입 게이트 규칙: **저장된 월이 하나도 없으면** `/onboarding/categories`, 그 외 `/home`.
  저장소 읽기가 비동기이므로 **읽기 전에는 게이트 판단을 하지 않는다**(§6 참고).
- 온보딩 3단계 사이의 입력값은 라우트 파라미터가 아니라 `OnboardingContext`(§6)로 넘긴다.

---

## 4. 데이터 모델

### 4.1 저장 구조

기기 로컬에 **문자열 하나**로 저장한다. 현재 `BudgetStore`를 `JSON.stringify` 하는 구조를
그대로 쓴다.

| 키 | 내용 |
| --- | --- |
| `budget-balance:data:v2` | `BudgetStore` — `{ version, months: Record<"YYYY-MM", MonthlyBudgetData> }` |
| `budget-balance:prefs:v1` | `Prefs` — 최근 선택한 항목 |

- **모든 금액은 정수 원 단위.** 입력 경계와 sanitizer 양쪽에서 `Math.round` 한다.
- 키는 계속 버전을 붙인다. 모양이 깨지는 변경은 **새 키 + 마이그레이션**이지 조용한 재해석이
  아니다. `v1`은 `monthlyBudget`/`date`/`paymentMethod` 시절 키이며 마이그레이션하지 않는다.
- 서버가 없으므로 `users` / `monthly_plans` 같은 테이블 개념은 **두지 않는다.** 총생활비도
  컬럼이 아니라 `totalBudget(categories)` 계산으로만 존재한다(기획서 §9.1 원칙과 같은 결론).

### 4.2 저장 백엔드 — `Storage` 어댑터

```ts
import { Storage } from '@apps-in-toss/web-framework';
// getItem(key): Promise<string | null>
// setItem(key, value): Promise<void>
// removeItem(key): Promise<void>
// clearItems(): Promise<void>
```

- **비동기다.** 현재 [BudgetContext](../src/context/BudgetContext.tsx)의
  `useState(() => loadStore())` 동기 초기화가 성립하지 않는다 — 초기 로딩 상태가 생긴다(§6).
- **토스 앱 밖에서는 브리지가 실패한다.** `npm run dev`를 데스크톱 브라우저에서 열면 `Storage`가
  붙지 않으므로, **토스 안이면 `Storage` / 밖이면 `localStorage`** 로 떨어지는 어댑터를 하나 둔다.
  [App.tsx](../src/App.tsx)의 `TDSMobileAITProvider`가 try/catch로 기본값 폴백하는 것과 같은 패턴이다.
- 어댑터는 **키–문자열만 아는 계층**이다. 도메인을 모른다. `sanitize*`와 `JSON.parse/stringify`는
  지금처럼 [storage.ts](../src/lib/storage.ts)에 남는다.
- `clearItems()`는 **다른 기능의 저장분까지 지운다.** 이 앱의 "데이터 초기화"는 `removeItem`으로
  자기 키만 지운다 — `clearItems`는 쓰지 않는다.

### 4.3 클라이언트 타입

[types.ts](../src/types.ts)는 1단계에서 이미 정리했다. 남은 것:

- **추가 예정**: 없음. `OnboardingDraft` / `OnboardingCategoryDraft`까지 1단계에서 만들었다.
- `MonthlyBudgetData`(`{ month, categories, expenses }`)가 화면이 쓰는 조립 타입이다.
- `BudgetStore`는 로컬 저장 루트 구조로 **계속 쓴다**(초안에서는 삭제 대상이었다).

### 4.4 데이터 모델 불변식 (유지)

- **월은 서로 독립이다.** `months`는 `"YYYY-MM"` 키이고 각 월이 **자기 항목 id**를 가진다.
  `copyBudgetFrom`은 id를 새로 발급하고 지출은 복사하지 않는다.
- **지출은 같은 월의 항목만 가리킨다.** 항목을 지우면 그 항목의 지출도 지운다.
- **`seedKey`는 계속 기록한다.** 읽는 곳은 아직 없지만 저장·정규화는 유지한다.

---

## 5. 저장 접근 경로

API가 없다. 저장 접근은 한 방향뿐이다.

```
컴포넌트 → useBudget() → BudgetContext → storage.ts → Storage 어댑터 → Storage | localStorage
```

- **컴포넌트는 저장소를 직접 부르지 않는다.** 지금 `localStorage`를 컴포넌트에서 건드리지 않는
  규칙 그대로다.
- 쓰기는 지금처럼 **상태 변경 → `useEffect`로 저장**이다. 다만 저장이 비동기라 실패할 수 있으므로
  실패는 조용히 삼키지 말고 콘솔 경고로 남긴다(현재 `saveStore`가 이미 그렇게 한다).

---

## 6. 상태 관리 방식

**현재 구조(`BudgetContext` 하나)를 유지한다.** 초안의 TanStack Query 도입은 **철회한다** —
서버가 없으면 캐시 무효화·재검증·인플라이트·롤백이 전부 무의미하고, 낙관적 업데이트는 그냥
로컬 상태 갱신이다.

바뀌는 것은 두 가지뿐이다.

1. **초기 로드가 비동기다.** `loadStore()`가 `Promise`가 되므로 provider에 로딩 상태가 생긴다.
   로드 전에는 진입 게이트 판단도, 빈 상태 렌더도 하지 않는다 — **저장된 데이터가 있는데
   온보딩으로 보내는 사고**를 막아야 한다.
2. **`OnboardingContext`가 새로 생긴다.** 온보딩 3화면은 저장소에 아무것도 쓰지 않은 채 오가고,
   S4의 "이대로 시작하기"에서 **한 번에** 커밋한다.

계층 정의:

| 계층 | 담당 |
| --- | --- |
| `src/lib/` (순수) | 계산·검증·상태 전이. **React·네트워크 없음.** 테스트가 있는 유일한 계층 |
| `src/lib/storage.ts` | 직렬화 + 방어적 정규화 |
| `src/storage/` (신규) | `Storage` / `localStorage` 어댑터 하나. 도메인을 모른다 |
| `src/context/` | `BudgetContext`(유지) + `OnboardingContext`(신규) |
| `src/components/` | 지금과 동일. 계산도 저장도 하지 않는다 |

- **provider는 도메인 규칙을 갖지 않는다.** 각 액션은 `src/lib/`의 순수 전이를 부르는 얇은
  래퍼라는 현재 규칙을 그대로 지킨다.

---

## 7. 계산 유틸리티 — **1단계 완료**

| 함수 | 결과 |
| --- | --- |
| `statusFromUsageRate` | 5단계로 교체 (`normal`/`caution`/`warning`/`exhausted`/`over`) |
| `computeUsageRate` | 유지 (예산 0 + 지출 있음 → `100 + used` 규칙 포함) |
| `categoryStats` `allCategoryStats` | 필드명 변경 외 로직 유지 |
| `monthlySummary` | `usedByMethod` 제거 |
| `projection` / `Projection` | 삭제 (G5) |
| `totalBudget` | 신규 — 항목 예산 합계 = 총생활비 |
| `previewExpenseImpact` | 신규 — 등록 전 `{ remaining, over }` |
| `previewBudgetChange` | 신규 — 예산 하향 시 초과 여부 |
| `remainingUseCount` | 신규 — `categoryStats`에 인라인돼 있던 `max(0, floor(...))` 분리 |
| `buildOnboardingPlan` | 신규 ([onboarding.ts](../src/lib/onboarding.ts)) — 항목 0개·빈 이름·이름 중복·예산 0 이하 거부 |
| `buildNewCategoryInput` `buildCategoryEditPatch` | 아이콘 필드 추가, **예산 > 0** 검증 |
| `daysInMonth` | 삭제 (`projection` 전용이었다) |

**상태 5단계**

| 사용률 | 상태 | 라벨 | 문구 |
| --- | --- | --- | --- |
| 0 ≤ r < 70 | `normal` | 여유 | 아직 충분히 남았어요 |
| 70 ≤ r < 90 | `caution` | 주의 | 예산을 많이 사용했어요 |
| 90 ≤ r < 100 | `warning` | 위험 | 예산이 얼마 남지 않았어요 |
| r == 100 | `exhausted` | 소진 | 이번 달 예산을 모두 사용했어요 |
| r > 100 | `over` | 초과 | 예산을 초과했어요 |

`exhausted`는 **정확히 100**이다. `STATUS_LABEL`(뱃지용 짧은 라벨)과 `STATUS_MESSAGE`(기획서 문구)를
나눠 뒀다 — 문구를 뱃지에 넣으면 배지가 터진다. `STATUS_MESSAGE`를 실제로 쓰는 곳은 5단계다.

---

## 8. 앱인토스 연동 범위

| 항목 | 내용 |
| --- | --- |
| 직접 의존성 | `@apps-in-toss/web-framework` (0단계에서 추가) |
| 설정 파일 | [granite.config.ts](../granite.config.ts) — `appName`, `brand`, `web.commands`, `permissions: []`, `outdir: "dist"`. `tsconfig.node.json`의 `include`에 넣어 `tsc -b`가 검사한다 |
| npm 스크립트 | `npm run build`는 `tsc -b && vite build`(유일한 정적 검사)를 유지하고, 미니앱 경로는 `dev:ait` / `build:ait` / `deploy`로 따로 둔다 |
| **쓰는 브리지 API** | **`Storage` 하나.** `appLogin`은 쓰지 않는다 |
| 이미 되어 있는 것 | `TDSMobileAITProvider`가 [App.tsx](../src/App.tsx) 최상단에 있고, 토스 앱 밖에서는 try/catch로 기본값 폴백한다 |
| 배포 | `npm run build` → 콘솔에 번들 업로드 → 토스앱 테스트 → 출시 요청 |
| 사람이 해야 할 일 | 콘솔 등록 후 `granite.config.ts`의 `appName` · `brand.icon` placeholder 교체 |

**`ait init`은 스캐폴더로 못 쓴다.** `granite.config.ts`를 만들어 주지 않고, `.gitignore`에
`.granite`를 넣고 npm 스크립트(`dev`/`build`)를 덮어쓴 뒤 대화형 프롬프트에서 멈춘다. 0단계에서
설정 파일은 직접 쓰고 스크립트는 되돌렸다.

**타입 확인 완료(2026-07-28).** `@apps-in-toss/web-framework@2.10.7`에서 `Storage`와 `appLogin`
모두 웹 진입점(`dist-web/index.d.ts` → `@apps-in-toss/web-bridge`)으로 타입이 정상 연결된다.
모듈 선언 보강 파일도 래퍼도 필요 없다. 다만 `web-bridge`의 `bridge.d.ts`에 `export *`
충돌(TS2308)이 수십 건 있어 **`skipLibCheck`를 끄면 빌드가 깨진다** — 끄지 말 것.

---

## 9. 컴포넌트 구조

```
src/
├─ main.tsx                    Router + TDS provider
├─ App.tsx                     라우트 정의만 (현재의 Dashboard는 pages/HomePage로)
├─ storage/                    (신규) Storage | localStorage 어댑터
├─ context/                    BudgetContext(유지) / OnboardingContext(신규)
├─ lib/                        기존 유지 (1단계에서 신규 함수 반영 완료)
├─ hooks/                      기존 5개 유지 + useUndoToast
├─ pages/                      (신규)
│  ├─ onboarding/CategorySelectPage.tsx / BudgetSetupPage.tsx / ConfirmPage.tsx
│  ├─ HomePage.tsx             현재 Dashboard 개조
│  ├─ CategoryDetailPage.tsx   (신규 S7)
│  └─ SettingsPage.tsx         현재 SettingsModal 개조
└─ components/                 도메인별 하위 폴더 (§9.1)
```

### 9.1 `components/` 하위 폴더

| 폴더 | 파일 | 상태 |
| --- | --- | --- |
| `common/` | `AmountField` `StatusBadge` `statusTheme` `ConfirmDialog` | 유지 |
| `month/` | `MonthSelector` `SummaryCard` | 유지 (`SummaryCard`는 5단계에서 개조) |
| `category/` | `CategoryList` `CategoryCard` `CategoryAddSheet` `CategoryEditSheet` | 유지 |
| | `IconPicker` — 항목 아이콘 | 신규 |
| `expense/` | `RecentExpenses` | 유지 |
| | `QuickExpenseForm` — 메모·날짜 입력, 초과 안내 | 개조 |
| | `UndoSnackbar` — 등록 직후 실행 취소 | 신규 |
| `onboarding/` | `CategoryPickerGrid` / `TotalBudgetFooter` | 신규 |

규칙 세 가지:

- **분리 축은 여전히 계층이다.** 이 폴더는 도메인 응집만을 위한 것이고, [CLAUDE.md](../CLAUDE.md)의
  3계층 규칙은 그대로다. 폴더가 생겼다고 계산 로직이나 저장 호출이 `components/` 안으로 들어오지
  않는다. **FSD로 가지 않는다**: 이 앱의 애그리게이트는 사실상 `MonthlyBudgetData` 하나라
  항목·지출을 독립 엔티티로 자르면 경계를 넘는 import가 상시화된다.
- **`common/`은 도메인을 모르는 것만 담는다.**
- **폴더 간 import는 자유롭게 둔다.** 강제할 린터가 없다 — 지킬 수 없는 규칙을 문서에만 적지 않는다.

**이동 시점** — 파일을 옮기는 커밋은 **3단계에서 따로 하나** 둔다(이동 + import 경로 수정만,
내용 변경 없음). 로직 변경과 파일 이동을 같은 커밋에 섞지 않는다.

**기존 UI 규칙은 그대로 지킨다** — [CLAUDE.md](../CLAUDE.md)의 TDS 사용 규칙(색은 `adaptive`에서만,
금액 입력은 `AmountField`, 오버레이는 TDS `BottomSheet`/`ConfirmDialog`, 아이콘 이름은 TDS가
참조하는 것만, `.app-shell`의 `translateZ(0)` containing block, 항목 제스처는 `CategoryList`
한 곳이 관리)이 전부 유효하다. 라우터 도입으로 `SettingsModal`이 페이지가 되면 `createPortal` +
`z-index` 제약은 사라지므로 그때 CLAUDE.md에서 해당 문단을 정리한다.

---

## 10. 구현 순서

각 단계는 `npm test` + `npm run build`(tsc strict) 통과가 완료 기준이다. **단계마다 커밋한다.**

### ~~0단계 — 준비~~ **완료** (`c9d5a65`)
`docs/` 추가, 브랜치 생성, `@apps-in-toss/web-framework` 직접 설치, `granite.config.ts` 작성,
타입 확인.

### ~~1단계 — 계산 로직~~ **완료** (`ed43ab1`)
상태 5단계, `projection`/`usedByMethod`/결제수단 제거, 필드명 통일(`budget`,
`targetAmountPerUse`, `spentAt`), 신규 순수 함수 5개, 테스트 136개.

### 2단계 — 저장 계층 교체
- `src/storage/` 어댑터: 토스 안이면 `Storage`, 밖이면 `localStorage`.
- `loadStore`/`saveStore`/`loadPrefs`/`savePrefs`를 비동기로 바꾸고 `BudgetContext`에 로딩 상태 추가.
- **완료 기준**: 토스 앱에서 지출 등록 → 앱 완전 종료 → 재실행 시 데이터가 남아 있다.
  데스크톱 브라우저(`npm run dev`)에서도 동작한다.

### ~~3단계 — 라우터 도입~~ **완료** (`27ef370`, `HEAD`)
`components/` 하위 폴더 이동(별도 커밋), `HashRouter` + `pages/` 분리, 진입 게이트
(`hasAnyMonthData` → 온보딩 / 홈), 설정을 오버레이에서 `/settings` 라우트로 전환.

세 가지가 계획과 다르다.

- **`react-router-dom`은 v6가 아니라 v7이다.** 선언형 API(`HashRouter`/`Routes`/`Route`/
  `Navigate`)는 같아서 쓰는 코드에 차이가 없다.
- **`/home?month=YYYY-MM`의 쿼리 파라미터는 넣지 않았다.** `currentMonth`는 `BudgetContext`에
  그대로 둔다 — `/settings`·`/category/:id`는 이 파라미터를 달지 않으므로 URL을 유일한 출처로
  삼으면 그 화면들을 오갈 때마다 이번 달로 되돌아간다. **8단계(월별 기능)에서 다시 판단한다.**
- **설정 화면이 페이지가 되면서 `useBodyScrollLock`·`useEscapeKey`가 고아가 되어 지웠다.**
  나머지 오버레이(TDS `BottomSheet`/`ConfirmDialog`)는 스크롤 잠금·Esc를 스스로 처리한다.

`/onboarding/categories`는 4단계 전까지 기본 시드로 시작하는 임시 화면이다.

**V4는 미확인이다** — 실기기가 필요하고, 사용자 결정으로 실기기 테스트는 9단계에 모아서 한다.

### ~~4단계 — 최초 설정 화면 (G2)~~ **완료** (`HEAD`)
`OnboardingContext`(라우트 안에서만 사는 초안), S2~S4 3화면, 추천 항목 9개,
총합 실시간(`FixedBottomCTA`의 `topAccessory`), 최종 확인 후 `startMonthWithCategories`로 일괄 저장.

- **추천 항목 9개는 기획서가 아니라 추정이다.** 기획서 원본이 이 저장소에 없어 §5.1 목록을
  확인할 수 없었다. `DEFAULT_CATEGORY_SEED`(식비 / 카페·간식 / 교통 / 장보기·생필품 / 쇼핑·의류 /
  문화·여가 / 건강·의료 / 구독·통신 / 경조사·기타)는 **원본이 확인되면 그대로 갈아 끼워야 한다** —
  [constants.ts](../src/constants.ts) 배열 하나만 고치면 된다.
- **S3는 예산 칸을 비운 채로 시작한다.** 시드 금액을 미리 채우면 남의 숫자를 그대로 확정하게 되고
  "총합 실시간"도 의미가 없어진다. 시드 금액은 "기본 예산으로 생성" 경로에서만 쓴다.
- 최초 설정으로 만든 항목에는 `seedKey`가 붙지 않는다(`createCategory` 경로). 읽는 곳이 없고
  이름이 같으면 다음 로드에서 sanitizer가 되붙이므로 따로 배선하지 않았다.

### ~~5단계 — 홈 화면 정리~~ **완료** (`HEAD`)
요약 카드에 `STATUS_MESSAGE` 문구, 항목 카드의 남은 금액에 라벨, 지난달 뱃지(`isPastMonth` 신규).

- **§7.3·§4.2 원문을 못 봤다.** 4단계의 §5.1과 같은 이유(기획서가 이 저장소에 없다)로, 계획서에
  요약된 두 줄("`STATUS_MESSAGE`를 쓴다", "남은 금액 최상단")만 근거로 삼았다.
- **초과일 때 음수를 그대로 보여 주지 않는다.** 요약 카드는 라벨을 "이번 달 초과 금액"으로,
  항목 카드는 접두사를 "초과"로 바꾸고 금액은 절댓값으로 쓴다.
- **"지난달은 조회 전용"은 뱃지로만 구현했다.** §2의 S9 행("지난달은 배지로 구분")을 따랐다.
  지난달 편집을 실제로 막는 것은 기존 기능(지난달 기록 수정)을 없애는 변경이라 원문 확인 전에는
  하지 않는다.

### 6단계 — 지출 기능
- `QuickExpenseForm`에 메모·날짜 입력(G9).
- 등록 전 소진/초과 안내(G8, `previewExpenseImpact`), 완료 문구, **실행 취소**(G7).
- 항목 상세 화면 S7(G6)과 거기서의 지출 수정·삭제.

### 7단계 — 항목 관리
- 아이콘 선택(G10), 이름 중복·길이 검증, 예산 하향 시 초과 안내(`previewBudgetChange`).
- 삭제 시 "지출 N건도 함께 삭제" 확인.
- 순서 변경은 기존 드래그 정렬을 그대로 쓴다.

### 8단계 — 월별 기능
- 새 달 진입 3택(G11). `copyBudgetFrom`이 이미 "새 id 발급 + 지출 미복사"라 순수 함수는 그대로다.
- 월별 데이터 분리 검증.

### 9단계 — 마무리
- 전체 테스트, 실기기 테스트(`--host`), 콘솔 업로드.
- [CLAUDE.md](../CLAUDE.md) / [README.md](../README.md) 를 바뀐 구조로 갱신.

---

## 11. 테스트 항목

### 단위 (Vitest, `environment: "node"` 유지)

- **계산** — 사용률, 상태 5단계 **경계값(69/70/89/90/99/100/101)**, 항목 남은 금액,
  추가 이용 가능 횟수(`max(0, floor(...))`), 예산 0 + 지출 있음. ✅ 1단계 완료
- **총생활비** — 항목 추가/수정/삭제 시 합계가 항상 항목 예산 합과 일치. ✅ 1단계 완료
- **미리보기** — `previewExpenseImpact` / `previewBudgetChange`의 소진·초과 판정. ✅ 1단계 완료
- **온보딩** — 항목 0개·빈 이름·이름 중복·예산 0 이하 거부. ✅ 1단계 완료
- **지출** — 생성·수정·삭제 후 재계산, 초과 지출 등록 허용, 최신순 정렬. ✅ 1단계 완료
- **항목** — 이름 검증, 예산 0 이하 거부, 순서 이동(no-op 시 동일 참조). ✅ 1단계 완료
- **월** — `copyBudgetFrom`이 지출을 복사하지 않고 새 id를 발급하는지, 월 키 검증. ✅ 1단계 완료
- **정규화** — sanitizer가 손상 데이터에서 예외를 던지지 않는지. ✅ 1단계 완료
- **저장 어댑터** — 2단계에서 추가. 값이 없을 때 `null`, 손상된 문자열일 때 빈 저장소로 폴백.

### 통합 (수동)

- 온보딩 → 홈 진입 전체 흐름.
- 지출 등록 → 실행 취소 → 잔액 원복.
- 항목 삭제 시 지출 동반 삭제.
- **월별 데이터 분리** — 7월 지출이 8월에 보이지 않는다.
- **재실행 복구** — 토스 앱을 완전히 종료했다가 다시 열어도 데이터가 남는다.
- 저장 실패 시 앱이 죽지 않는다.

### 컴포넌트 테스트
jsdom·Testing Library 설정이 없다. 온보딩 검증 로직이 순수 함수로 빠져 있으므로 MVP에서는
도입하지 않는다.

---

## 12. 검증 과제

| # | 내용 | 막히면 |
| --- | --- | --- |
| ~~V1~~ | ~~`appLogin` 타입 선언~~ **해결(0단계).** `Storage`도 같은 경로로 타입이 잡힌다 — §8 | (해당 없음) |
| ~~V2~~ | ~~토스 토큰 교환 mTLS~~ **해당 없음** — 로그인을 쓰지 않는다 | |
| ~~V3~~ | ~~Edge Function의 Supabase JWT 발급~~ **해당 없음** | |
| ~~V5~~ | ~~`getAnonymousKey()`로 로그인 대체~~ **해당 없음** | |
| **V4** | 토스 WebView의 뒤로가기 제스처와 `HashRouter` + BottomSheet 조합이 충돌하지 않는가 | `setIosSwipeGestureEnabled` 등으로 제어. **3단계에서 확인** |
| ~~V6~~ | ~~`Storage`가 `permissions` 선언을 요구하는가~~ **해결(2단계).** 선언할 수 없다 — `Permission`은 `clipboard`/`geolocation`/`contacts`/`photos`/`camera`/`microphone` 6개짜리 닫힌 유니온이고 저장소 항목이 없다. `permissions: []`가 맞다 | (해당 없음) |
| **V7** | `Storage`에 넣을 수 있는 **문자열 크기 한계**가 있는가. 월 12개 × 항목 9개 × 지출 수백 건이면 수백 KB가 된다 | 넘치면 월별로 키를 쪼갠다(`...:data:v2:2026-07`). 어댑터가 키만 아는 계층이라 교체 비용이 낮다 |

**V7이 이 계획의 남은 리스크다.** 초안의 최대 리스크(V2)는 사라졌다.

---

## 13. 검수 조건 매핑 (기획서 §13)

| 기획서 검수 조건 | 담당 단계 |
| --- | --- |
| 총생활비 직접 입력 화면이 없다 | 4단계 (그리고 애초에 만들지 않는다) |
| 항목 → 예산 순서로 설정, 합계 실시간 표시, 최소 1개 검증 | 4단계 |
| 총생활비 = 항목 예산 합계 (항상) | ✅ 1단계 (`totalBudget`, 캐시 값 미도입) |
| 금액·항목만으로 지출 등록 | ✅ 1단계 (결제수단 제거) + 6단계 |
| 지출 등록·수정·삭제 즉시 전 값 재계산 | ✅ 1단계 |
| 예산 초과 지출 안내 후 등록 | 6단계 (계산은 1단계 완료) |
| 1회 목표 금액 선택 설정 / 미설정 시 횟수 미표시 | ✅ 1단계 + 5단계 |
| 월별 데이터 미혼재 | ✅ 1단계(불변식) + 8단계 |
| 지난달 항목·예산 복사, 지출 미복사 | ✅ 1단계(`copyBudgetFrom`) + 8단계 |
| ~~서버 저장 / 기기 변경 후 복구 / 로컬만 원본으로 쓰지 않음~~ | **포기(2026-07-28 결정).** 기기 로컬 저장만 한다 — 앱 재실행은 복구되지만 기기 변경·토스 앱 삭제는 복구되지 않는다 |
