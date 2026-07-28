# CLAUDE.md


Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

—

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.


---

# Ptoject Guide

## Commands

```bash
npm run dev          # Vite dev server (http://localhost:5173)
npm run build        # tsc -b (typecheck) + vite build
npm run preview      # serve the production build
npm test             # vitest run (all tests)
npm run test:watch   # vitest watch mode
```

```bash
npx vitest run src/lib/calculations.test.ts
npx vitest run -t "경계값"     # describe/it 이름으로 필터 — 테스트 이름은 한국어다
```

There is no lint script and no ESLint config (the lone `eslint-disable` comment in
[BudgetContext.tsx](src/context/BudgetContext.tsx) is vestigial). `npm run build` — tsc with
`strict`, `noUnusedLocals`, `noUnusedParameters` — is the only static check.

The suite is six files under [src/lib/](src/lib/) (150 tests) running with `environment: "node"`:
[calculations.test.ts](src/lib/calculations.test.ts) (also covers `format.ts` / `date.ts`),
[category.test.ts](src/lib/category.test.ts), [expense.test.ts](src/lib/expense.test.ts),
[month.test.ts](src/lib/month.test.ts), [onboarding.test.ts](src/lib/onboarding.test.ts),
[storage.test.ts](src/lib/storage.test.ts) (`sanitizeMonth` + 가짜 `KeyValueStore`를 주입한
load/save 왕복). There is no
jsdom, Testing Library, or setup file, so adding a component test means adding that config first.

## Architecture

Personal single-user monthly budget app. No server, no DB, no auth — 저장은 앱인토스 미니앱의
`Storage`(기기 로컬)이고, 토스 앱 밖에서는 `localStorage`로 떨어진다. React 18 + Vite +
TypeScript, state via a single Context (no state library).

Three layers, deliberately separated:

1. **Pure logic** — [src/lib/](src/lib/) + [types.ts](src/types.ts) + [constants.ts](src/constants.ts).
   No React, no DOM (except `storage.ts` touching `localStorage`). `calculations.ts` (budget math),
   `category.ts` / `expense.ts` / `month.ts` (domain rules and state transitions), `date.ts`,
   `format.ts`, `id.ts` are pure functions, and this is the only layer with tests. **`month.ts` owns
   month *values*** (`createSeededMonth`, `copyBudgetFrom`, `findPreviousMonthWithData`,
   `hasAnyMonthData`, `removeMonth`) and **`storage.ts` owns only persistence** (sanitizers + load/save) — keep that
   split; building a month is not a storage concern. `id.ts`'s `newId()` is the one exception to
   purity (random), so functions that need ids take them as arguments — either a single
   `id`/`createdAt` (`createExpense`, `createCategory`) or an injectable `nextId: () => string`
   defaulting to `newId` (`createSeededMonth`, `copyBudgetFrom`). Tests pass a counter.
   `onboarding.ts`는 최초 설정 입력 검증만 담당한다. Domain input types (`NewExpenseInput`,
   `NewCategoryInput`) live in `types.ts`, **not** in the context file — components import types from
   here and only `useBudget`/`BudgetProvider` from layer 2. **Logic a component needs but React does
   not belongs here, not in the component** — e.g. `resolveInitialCategoryId`,
   `buildNewCategoryInput`, `buildCategoryEditPatch`, `buildCategoryNameLookup`,
   `sortExpensesByRecency`. DOM-touching helpers
   (viewport measuring) are the exception and stay next to the component.
2. **State** — [src/context/BudgetContext.tsx](src/context/BudgetContext.tsx). Holds the whole
   `BudgetStore` plus `currentMonth` and `prefs`; every mutation goes through `mutateMonth`, which
   is a no-op when the selected month has no data. Two `useEffect`s persist store/prefs on any change.
   **The provider owns no domain rules** — each action is a `setStore`/`mutateMonth` wrapper around a
   pure transition in layer 1 (`createExpense`, `applyExpenseInput`, `createCategory`,
   `moveCategoryToIndex`, `findPreviousMonthWithData`, `removeMonth`, `createSeededMonth`,
   `copyBudgetFrom`, `addMonth`). New behaviour goes in the pure function with a test, not inline
   here.
   `moveCategoryToIndex` returns **the same array reference** when the move is a no-op (unknown id,
   or an index that clamps back to where it already is), and `reorderCategory` relies on that to
   leave state untouched — don't "simplify" it into always copying.
   **No `useCallback`/`useMemo` for the actions** — the context `value` is a fresh object every
   render and no consumer is `React.memo`ed, so memoizing the callbacks blocks nothing. If profiling
   ever shows a real cost, fix it with `useMemo` on `value` + `React.memo` on the hot consumer, not
   with scattered `useCallback`. (`previousMonthWithData` keeps its `useMemo` — it walks
   `store.months`.)
3. **Presentation** — [src/pages/](src/pages/), [src/components/](src/components/),
   [src/hooks/](src/hooks/), [src/index.css](src/index.css). Components read state via `useBudget()`
   or receive it as props; they never touch `localStorage` or recompute budget math themselves.
   A component is JSX plus local form state — anything else is factored out: pure logic to layer 1,
   and each state/effect/DOM concern to its own **single-responsibility hook** in
   [src/hooks/](src/hooks/) (`useDeferredClose`, `useSheetMaxHeight`, `useAutoFocus`). Don't merge
   those into one per-component "behavior" hook — they are independent concerns and get reused
   separately.

   [main.tsx](src/main.tsx)가 프로바이더 조립(`TDSMobileAITProvider` → `BudgetProvider` →
   `HashRouter`)이고 [App.tsx](src/App.tsx)는 라우트 정의뿐이다. 화면은 `pages/`, 재사용 조각은
   `components/`의 도메인 폴더(`common` / `month` / `category` / `expense`)에 둔다 —
   `common/`은 도메인을 모르는 것만 담는다. 폴더는 응집만을 위한 것이고 3계층 규칙이 우선이다.

**UI work rewrites only the presentation layer; layers 1–2 are reused as-is.** Keep that split.

### Data model invariants

- **All money is integer KRW.** Inputs are `Math.round`ed at the context boundary and again in
  `storage.ts` sanitizers.
- **Months are independent.** `BudgetStore.months` is keyed `"YYYY-MM"`; each month owns its own
  `categories` array with **its own category ids**. Copying last month's budget
  (`copyBudgetFrom`) re-issues fresh ids and never copies expenses. So a category id is meaningful
  only within one month — never join categories across months by id.
- **Expenses reference categories within the same month.** `deleteCategory` also deletes that
  category's expenses, and `sanitizeExpense` silently drops any expense whose `categoryId` isn't in
  the same month's sanitized category list. Adding a category-less expense path would lose data on
  the next load.
- **`category.seedKey` points back at `DEFAULT_CATEGORY_SEED`.** Categories created from the seed
  (and copies of them in later months) keep the seed's `key`, so the row can be traced back to
  [constants.ts](src/constants.ts) even after the name was edited. Manually added categories have no
  `seedKey`. **Right now nothing reads it back** — the "기본값으로 되돌리기" UI and its
  `resetCategoryToSeed` / `categoryDefaultDiff` helpers were removed — but it is still persisted and
  sanitized, so keep writing it; that is what a restored reset feature would key off.
  `updateCategory`'s patch type excludes it; `sanitizeCategory` drops unknown keys and backfills
  pre-`seedKey` data by matching the stored name against seed names — which also means a **manually
  added** category whose name happens to equal a seed name picks up that `seedKey` on the next load
  (documented in [storage.test.ts](src/lib/storage.test.ts)). **Editing a seed entry's `name`/amounts
  changes what "기본값" means for existing months; changing its `key` orphans them.**
- Date strings are local-time formatted (`getMonthKey`/`getDateKey` use `getFullYear()` etc., not
  `toISOString`) — don't swap in UTC-based formatting.

### Defensive loading

`loadStore` never throws on bad data: unknown values are normalized field by
field and unusable records are dropped, falling back to an empty store. Any new persisted field
needs a matching sanitizer in [storage.ts](src/lib/storage.ts), otherwise it silently disappears on
reload.

**저장 백엔드는 [keyValueStore.ts](src/storage/keyValueStore.ts) 어댑터 하나가 고른다** — 토스 앱
안이면 `Storage`, 밖이면 `localStorage`다. 판별은 실제 호출을 한 번 해 보고 실패하면 폴백하는
방식이며, 고른 결과는 모듈에 캐시된다. **`window`가 없으면(노드) 네이티브 브리지가 스텁으로
바뀌어 호출이 영영 끝나지 않으므로**, 그 경우는 호출하기 전에 폴백한다 — 이 가드를 지우면
테스트 스위트가 매달린다(`storage.test.ts`의 "어댑터를 주입하지 않아도 매달리지 않는다"가
타임아웃으로 잡는다). `Storage.clearItems()`는 다른 기능의 저장분까지 지우므로 쓰지 않는다.

`loadStore`/`saveStore`/`loadPrefs`/`savePrefs`는 **비동기**이고, 테스트를 위해 `KeyValueStore`를
인자로 받는다(기본값은 어댑터가 고른 것) — `nextId`·`today`와 같은 주입 패턴이다.
**`BudgetProvider`는 읽기가 끝나기 전에 `null`을 렌더링하고 저장도 하지 않는다.** 둘 다
필수다 — 로드 전에 저장하면 빈 값이 기존 데이터를 덮고, 로드 전에 렌더하면 데이터가 있는데도
"예산 없음" 화면이 스친다. Storage keys are versioned (`budget-balance:data:v2`, `budget-balance:prefs:v1`) with
`STORE_VERSION = 2`; a breaking shape change means a new key + migration, not a silent reinterpret.
v1은 `monthlyBudget`/`targetExpenseAmount`/`date`/`paymentMethod` 시절 키다 — 마이그레이션하지
않고 버린다.

### Calculation rules worth knowing

- `statusFromUsageRate`: `<70` normal / `70–<90` caution / `90–<100` warning / `==100` exhausted
  (정확히 100) / `>100` over. Thresholds live in `STATUS_THRESHOLDS`; the UI maps the five statuses
  to TDS colors in [statusTheme.ts](src/components/statusTheme.ts). `STATUS_LABEL`은 뱃지용 짧은
  라벨, `STATUS_MESSAGE`는 사용자에게 보여 줄 문구다.
- Zero-budget-with-spending is deliberately reported as `100 + used` rather than `Infinity`, so it
  sorts as "over" without breaking formatting. That rule lives **only** in `computeUsageRate`
  (used by both `categoryStats` and `monthlySummary`) — don't re-inline it.
- `sortByOrder()` (in `category.ts`) is the single `sortOrder` comparator — categories are always
  displayed ascending, and it copies before sorting so callers never mutate store arrays.
- `totalBudget(categories)`가 총생활비의 유일한 정의다 — 캐시 컬럼도, 별도 입력값도 두지 않는다.
- `previewExpenseImpact` / `previewBudgetChange`는 저장하기 **전** 결과를 보여 주는 계산이다.
  실제 상태를 바꾸지 않으므로 안내 문구 외의 용도로 쓰지 않는다.

### UI conventions

- All user-facing strings and most code comments are Korean; match that.
- **UI는 토스 [TDS Mobile](https://tossmini-docs.toss.im/tds-mobile/)(`@toss/tds-mobile`)로 만든다.**
  새 UI를 만들 때는 먼저 `@toss/tds-mobile`에 해당 컴포넌트가 있는지 보고, 없을 때만 직접 만든다.
  타입 정의(`node_modules/@toss/tds-mobile/dist/esm/index.d.ts`)가 사실상의 API 문서다.
- [main.tsx](src/main.tsx)의 최상단이 `TDSMobileAITProvider`(`@toss/tds-mobile-ait`)다. 이게
  `:root`에 `--adaptive*` 색 변수와 타이포 변수를 주입하므로 **provider 밖에서는 TDS 컴포넌트가
  깨진다.** 토스 앱 밖(일반 브라우저)에서는 `@apps-in-toss/web-framework` 호출이 실패하지만
  provider가 try/catch로 감싸 기본값(blue500, safe-area 0)으로 떨어지므로 그대로 동작한다.
  `colorPreference`는 `"light"`로 고정돼 있다 — 다크 모드는 지원하지 않는다.
- **색은 `adaptive`(`@toss/tds-colors`)에서만 가져온다.** `adaptive.grey900` 같은 값은 실제로는
  `var(--adaptiveGrey900)` 문자열이라 `style`/props 어디에나 넣을 수 있다. 새 hex를 만들지 않는다.
  상태색(여유/주의/위험/초과) 매핑은 [statusTheme.ts](src/components/statusTheme.ts) 한 곳에만 두고,
  뱃지는 색(blue/yellow/red) + variant(weak/fill) 조합으로 위험과 초과를 구분한다. 상태 뱃지는
  [StatusBadge.tsx](src/components/StatusBadge.tsx)(`status` + `size`)를 쓴다 — 카드가 라벨·색 매핑을
  직접 알 필요는 없다.
- 타이포는 `Paragraph` / `ListRow.Text`의 `typography` 토큰을 쓴다. 크기는 t1=30px, t2=26, t3=22,
  t4=20, t5=17, t6=15, t7=13, st13=11px (전체 순서: t1 st1 st2 st3 t2 st4 st5 st6 t3 st7 t4 st8 st9
  t5 st10 t6 st11 t7 st12 st13 = 30→11px).
- 아이콘은 `IconButton`/`TopNavigationIconButton`의 `name`으로 지정하며 `https://static.toss.im/icons/svg/{name}.svg`
  에서 받아온다. **TDS 자신이 참조하는 이름만 쓴다** — 없는 이름을 넣으면 조용히 404가 난다.
  쓰기 전에 `grep -rl "icon-이름" node_modules/@toss/`로 확인할 것. 현재 쓰는 이름:
  `icon-arrow-left-small-mono`, `icon-arrow-right-small-mono`.
- [index.css](src/index.css)는 **레이아웃 전용**이다 (중앙 460px 컬럼, 섹션 간격, 시트/설정 화면
  내부 여백). 색·모양·타이포는 넣지 않는다. 유일한 예외가 **섹션 카드 면**이다: 셸 바닥은
  `--adaptiveGreyBackground`, 각 섹션(`.summary` / `.section-card`)은 `--adaptiveBackground` +
  `border-radius`로 흰 카드가 된다. TDS에 카드 컴포넌트가 없어서 직접 그리는 것이며, 색은 반드시
  `--adaptive*` 변수만 쓴다. 카드 바깥 좌우 여백은 16px이고 그 안의 `ListRow`는
  `horizontalPadding="small"`(16px)이라 글머리가 32px에 선다 — `ListHeader`(자체 여백 24px)는
  `.section-head`가 8px 밀어 같은 선에 맞춘다. 셋 중 하나만 바꾸면 정렬이 어긋난다. `.app-shell`의 `transform: translateZ(0)`는 일부러
  넣은 것 — TDS의 `TopNavigation fixed` / `FixedBottomCTA`가 뷰포트가 아니라 이 컬럼을 기준으로
  고정되게 하는 containing block이다. 지우면 데스크톱에서 화면 전체로 퍼진다.
- **금액 입력은 전부 [AmountField.tsx](src/components/AmountField.tsx)를 쓴다** — `TextField`를 직접
  쓰지 않는다. 안에서 `type="text"` + `inputMode="numeric"`, 표시 `formatThousands`, 입력
  `toAmountDigits`([format.ts](src/lib/format.ts))를 묶어 두었다(`type="number"`나 TDS
  `NumberKeypad`는 쓰지 않는다 — 키패드는 레이아웃에서 자리를 고정으로 차지해 본문을 누른다).
  in/out은 **숫자**다: `value: number | undefined`, `onChange(value: number | undefined)`이고
  **빈 칸이 `undefined`** 다. 빈 칸과 0을 구분해야 하는 검증(예: 항목 추가 폼의 "예산 미입력")이
  여기에 걸려 있으니 `?? 0`으로 뭉개지 말 것.
- **항목 추가·편집·삭제·순서 변경은 전부 대시보드에 있다** — 설정 화면에는 없다(이전에 있던
  `CategoryEditRow` / `AddCategoryForm`은 삭제했다). 편집은 롱프레스 메뉴가 여는
  [CategoryEditSheet.tsx](src/components/CategoryEditSheet.tsx), 추가는 목록 맨 아래
  "+ 항목 추가"가 여는 [CategoryAddSheet.tsx](src/components/CategoryAddSheet.tsx)다. 둘 다
  **CTA를 눌러야 반영**되고(닫기로 취소할 수 있어야 한다) 성공하면 시트가 닫히며, 검증은 각각
  `buildCategoryEditPatch` / `buildNewCategoryInput` 순수 함수 하나에만 있다.
  진입점이 사라진 코드(`resetCategoryToDefault`, `categoryDefaultDiff`, `moveCategory`,
  `moveCategoryInList`, `resetCategoryToSeed`, `isValidNewCategory`)는 테스트까지 함께 지웠다 —
  "기본값으로 되돌리기"를 되살리려면 lib에 순수 함수 + 테스트부터 다시 쓴다.
- 지출 시트가 실제로 편집하는 값은 **금액·항목뿐**이다. `spentAt`은 새 지출이면
  "현재 월이면 오늘, 아니면 그 달 1일", 수정이면 원본 유지고, `memo`는 타입·저장·정렬에는
  살아 있지만 입력 UI가 없다. 없는 게 아니라 화면에서 빠진 것이니 지우지 말 것.
- `ListRow`는 `as="button"`으로 렌더링해 행 전체를 누를 수 있게 하며(`.cat-row`, `.exp-row`가
  버튼 기본 스타일만 지운다), 그래서 `<List>`(ul) 대신 `.list-rows` div로 감싼다.
- **항목 카드의 제스처는 [CategoryList.tsx](src/components/CategoryList.tsx) 한 곳이 관리한다**
  (`@dnd-kit/react` — legacy `@dnd-kit/core`와 API가 전혀 다르니 예제를 섞지 말 것):
  - 탭 / 스크롤 / 롱프레스는 `PointerSensor`의 활성화 제약 하나로 갈린다. **기본 센서 설정을
    반드시 덮어써야 한다** — 기본값은 마우스일 때 5px 이동만으로 드래그가 시작돼 롱프레스 규칙이
    깨진다. `PointerActivationConstraints.Delay` 하나만 남겨 입력 종류를 통일한다.
  - 메뉴는 `preview`(아직 누르는 중) → `open`(뗌) 2단계다. `preview`에서는 메뉴에
    `pointer-events: none`을 주고 스크림도 깔지 않는다 — 안 그러면 이어지는 드래그가 막힌다.
  - 순서는 `onDragEnd`의 `source.index`(드래그 중 낙관적으로 갱신됨)로 `reorderCategory`를 부른다.
    `@dnd-kit/helpers`의 `move`를 쓰지 않는다 — `sortOrder` 재부여가 빠지고 도메인 규칙이 샌다.
  - `.cat-sortable`의 `touch-action`은 `none`이 아니라 `manipulation`이다. 롱프레스 전까지는
    리스트가 스크롤돼야 한다.
  - 드래그 뒤 따라오는 유령 `click`을 한 틱 무시한다(`suppressClickRef`). 지우면 드래그를 끝낼
    때마다 지출 시트가 열린다.
  - `DragOverlay`는 쓰지 않는다 — 카드가 컨테이너 안에서만 움직이면 되므로 불필요하다.
- 오버레이는 TDS 것을 쓴다: 하단 시트는 `BottomSheet`(+ `BottomSheet.CTA` / `DoubleCTA`), 파괴적
  동작은 [ConfirmDialog.tsx](src/components/ConfirmDialog.tsx)(TDS `ConfirmDialog` 래퍼)를 거친다.
  모달 프리미티브를 직접 만들지 않는다.
- 항목 메뉴는 TDS `Menu.Dropdown`을 **`Menu.Trigger` 없이 단독으로** 쓴다(단독 렌더 확인함).
  `Menu.Trigger`의 dim이 드래그 중 포인터를 가로채기 때문이며, 열림 상태와 위치는 직접 관리한다.
  `Menu.DropdownItem`은 `role="menuitem"`·`tabindex`를 스스로 넣으므로 덧붙이지 않는다.
- 설정은 오버레이가 아니라 라우트다([SettingsPage.tsx](src/pages/SettingsPage.tsx), `/settings`).
  하는 일은 상단바와 "이번 달 데이터 초기화" 확인 하나뿐이다 — 항목 관련 UI는 여기 두지 않는다.
  카드 없는 단색 화면이라 `.settings-page`가 셸의 회색 바닥을 흰색으로 덮는다.
- `BottomSheet`는 닫힘 애니메이션 후 `onExited`가 불리므로, 시트를 닫고 이어서 할 일
  (예: 삭제 확인 다이얼로그 열기)은 `onExited` 뒤로 미룬다 —
  [useDeferredClose](src/hooks/useDeferredClose.ts)의 `runAfterClose`가 그 흐름이다.
  [useSheetMaxHeight](src/hooks/useSheetMaxHeight.ts)도 지우지 말 것: `BottomSheet`의 `maxHeight`
  prop은 마운트 시점 값으로 굳어서 키보드가 올라와도 안 줄어들기 때문에 `visualViewport` 크기를
  `style`로 덮어써야 금액 입력이 키보드에 가리지 않는다.

### README

[README.md](README.md)는 현재 코드 기준으로 다시 쓴 문서다(기능·파일 구조·저장 구조).
사람이 읽는 소개 문서이므로 여기 CLAUDE.md와 역할이 겹치지 않게 유지한다 — README는 "무엇을
하는 앱인가", CLAUDE.md는 "코드를 고칠 때 지킬 제약". 화면 구성이나 파일 배치를 바꾸면
README의 기능 목록·파일 구조도 같이 고칠 것. 충돌하면 **코드가 우선**이다.
