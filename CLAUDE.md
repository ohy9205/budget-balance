# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

The suite is three files under [src/lib/](src/lib/) (50 tests) running with `environment: "node"`:
[calculations.test.ts](src/lib/calculations.test.ts) (also covers `format.ts` / `date.ts`),
[category.test.ts](src/lib/category.test.ts), [expense.test.ts](src/lib/expense.test.ts). There is
no jsdom, Testing Library, or setup file, so adding a component test means adding that config first.

## Architecture

Personal single-user monthly budget app. No server, no DB, no auth — everything lives in
`localStorage`. React 18 + Vite + TypeScript, state via a single Context (no state library).

Three layers, deliberately separated:

1. **Pure logic** — [src/lib/](src/lib/) + [types.ts](src/types.ts) + [constants.ts](src/constants.ts).
   No React, no DOM (except `storage.ts` touching `localStorage`). `calculations.ts` (budget math),
   `category.ts` / `expense.ts` (domain rules pulled out of components), `date.ts`, `format.ts` are
   pure functions, and this is the only layer with tests. Domain input types (`NewExpenseInput`,
   `NewCategoryInput`) live in `types.ts`, **not** in the context file — components import types from
   here and only `useBudget`/`BudgetProvider` from layer 2. **Logic a component needs but React does
   not belongs here, not in the component** — e.g. `categoryDefaultDiff`, `resolveInitialCategoryId`,
   `buildNewCategoryInput`, `buildCategoryNameLookup`, `sortExpensesByRecency`. DOM-touching helpers
   (Blob download, viewport measuring) are the exception and stay next to the component.
2. **State** — [src/context/BudgetContext.tsx](src/context/BudgetContext.tsx). Holds the whole
   `BudgetStore` plus `currentMonth` and `prefs`; every mutation goes through `mutateMonth`, which
   is a no-op when the selected month has no data. Two `useEffect`s persist store/prefs on any change.
   **No `useCallback`/`useMemo` for the actions** — the context `value` is a fresh object every
   render and no consumer is `React.memo`ed, so memoizing the callbacks blocks nothing. If profiling
   ever shows a real cost, fix it with `useMemo` on `value` + `React.memo` on the hot consumer, not
   with scattered `useCallback`. (`previousMonthWithData` keeps its `useMemo` — it walks
   `store.months`.)
3. **Presentation** — [src/App.tsx](src/App.tsx), [src/components/](src/components/),
   [src/hooks/](src/hooks/), [src/index.css](src/index.css). Components read state via `useBudget()`
   or receive it as props; they never touch `localStorage` or recompute budget math themselves.
   A component is JSX plus local form state — anything else is factored out: pure logic to layer 1,
   and each state/effect/DOM concern to its own **single-responsibility hook** in
   [src/hooks/](src/hooks/) (`useEscapeKey`, `useBodyScrollLock`, `useDeferredClose`,
   `useSheetMaxHeight`, `useAutoFocus`). Don't merge those into one per-component "behavior" hook —
   they are independent concerns and get reused separately.

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
  (and copies of them in later months) keep the seed's `key`, so `resetCategoryToDefault` can restore
  name / monthlyBudget / targetExpenseAmount from [constants.ts](src/constants.ts) even after the
  name was edited. Manually added categories have no `seedKey` and no default to return to.
  `updateCategory`'s patch type excludes it; `sanitizeCategory` drops unknown keys and backfills
  pre-`seedKey` data by matching the stored name against seed names. **Editing a seed entry's
  `name`/amounts changes what "기본값" means for existing months; changing its `key` orphans them.**
- Date strings are local-time formatted (`getMonthKey`/`getDateKey` use `getFullYear()` etc., not
  `toISOString`) — don't swap in UTC-based formatting.

### Defensive loading

`loadStore` / `parseImportedJSON` never throw on bad data: unknown values are normalized field by
field and unusable records are dropped, falling back to an empty store. Any new persisted field
needs a matching sanitizer in [storage.ts](src/lib/storage.ts), otherwise it silently disappears on
reload. Storage keys are versioned (`budget-balance:data:v1`, `budget-balance:prefs:v1`) with
`STORE_VERSION = 1`; a breaking shape change means a new key + migration, not a silent reinterpret.

### Calculation rules worth knowing

- `statusFromUsageRate`: `<60` safe / `60–<80` caution / `80–100` warning / `>100` over.
  Thresholds live in `STATUS_THRESHOLDS`; the UI maps the four statuses to TDS colors in
  [statusTheme.ts](src/components/statusTheme.ts).
- Zero-budget-with-spending is deliberately reported as `100 + used` rather than `Infinity`, so it
  sorts as "over" without breaking formatting. That rule lives **only** in `computeUsageRate`
  (used by both `categoryStats` and `monthlySummary`) — don't re-inline it.
- `sortByOrder()` (in `category.ts`) is the single `sortOrder` comparator — categories are always
  displayed ascending, and it copies before sorting so callers never mutate store arrays.
- `projection()` returns **`null` for any month that isn't the current month**; callers must handle
  null rather than render a meaningless forecast. It accepts an injectable `today: Date` — tests rely
  on this, so keep the parameter when editing.

### UI conventions

- All user-facing strings and most code comments are Korean; match that.
- **UI는 토스 [TDS Mobile](https://tossmini-docs.toss.im/tds-mobile/)(`@toss/tds-mobile`)로 만든다.**
  새 UI를 만들 때는 먼저 `@toss/tds-mobile`에 해당 컴포넌트가 있는지 보고, 없을 때만 직접 만든다.
  타입 정의(`node_modules/@toss/tds-mobile/dist/esm/index.d.ts`)가 사실상의 API 문서다.
- [App.tsx](src/App.tsx)의 최상단이 `TDSMobileAITProvider`(`@toss/tds-mobile-ait`)다. 이게
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
  `icon-arrow-left-small-mono`, `icon-arrow-right-small-mono`, `icon-arrow-up-mono`,
  `icon-arrow-down-mono`, `icon-refresh-mono`, `icon-x-circle-mono`.
- [index.css](src/index.css)는 **레이아웃 전용**이다 (중앙 460px 컬럼, 섹션 간격, 시트/설정 화면
  내부 여백). 색·모양·타이포는 넣지 않는다. `.app-shell`의 `transform: translateZ(0)`는 일부러
  넣은 것 — TDS의 `TopNavigation fixed` / `FixedBottomCTA`가 뷰포트가 아니라 이 컬럼을 기준으로
  고정되게 하는 containing block이다. 지우면 데스크톱에서 화면 전체로 퍼진다.
- **금액 입력은 전부 [AmountField.tsx](src/components/AmountField.tsx)를 쓴다** — `TextField`를 직접
  쓰지 않는다. 안에서 `type="text"` + `inputMode="numeric"`, 표시 `formatThousands`, 입력
  `toAmountDigits`([format.ts](src/lib/format.ts))를 묶어 두었다(`type="number"`나 TDS
  `NumberKeypad`는 쓰지 않는다 — 키패드는 레이아웃에서 자리를 고정으로 차지해 본문을 누른다).
  in/out은 **숫자**다: `value: number | undefined`, `onChange(value: number | undefined)`이고
  **빈 칸이 `undefined`** 다. 빈 칸과 0을 구분해야 하는 검증(예: 항목 추가 폼의 "예산 미입력")이
  여기에 걸려 있으니 `?? 0`으로 뭉개지 말 것.
- 결제수단은 [constants.ts](src/constants.ts)의 `PAYMENT_METHODS` 하나로 정의한다 —
  `SegmentedControl` 항목도 하드코딩하지 않고 여기서 `map`하며, 표시 이름은 `paymentMethodLabel`.
- 설정 화면의 항목 편집 필드([CategoryEditRow.tsx](src/components/CategoryEditRow.tsx))는 로컬 state
  없이 `onChange`마다 `updateCategory`를 직접 호출한다(=키 입력마다 저장·재계산). 필드를 비우면
  그 자리에서 예산이 0이 된다.
- 지출 시트가 실제로 편집하는 값은 **금액·항목·결제수단뿐**이다. `date`는 새 지출이면
  "현재 월이면 오늘, 아니면 그 달 1일", 수정이면 원본 유지고, `memo`는 타입·저장·정렬에는
  살아 있지만 입력 UI가 없다. 없는 게 아니라 화면에서 빠진 것이니 지우지 말 것.
- `ListRow`는 `as="button"`으로 렌더링해 행 전체를 누를 수 있게 하며(`.cat-row`, `.exp-row`가
  버튼 기본 스타일만 지운다), 그래서 `<List>`(ul) 대신 `.list-rows` div로 감싼다.
- 오버레이는 TDS 것을 쓴다: 하단 시트는 `BottomSheet`(+ `BottomSheet.CTA` / `DoubleCTA`), 파괴적
  동작은 [ConfirmDialog.tsx](src/components/ConfirmDialog.tsx)(TDS `ConfirmDialog` 래퍼)를 거친다.
  모달 프리미티브를 직접 만들지 않는다.
- **예외는 설정 화면 하나뿐이다.** TDS `Modal`은 고정폭 카드라 전체 화면 페이지에 맞지 않아
  [SettingsModal.tsx](src/components/SettingsModal.tsx)는 `.settings-panel`(`position: fixed`)을
  직접 그린다(현재 코드에 TDS `Modal` 사용처는 없다). 이 파일은 셸(포털·상단바·스크롤 잠금·Esc)과
  확인 다이얼로그 4종 조율만 담당하고, 내용은
  [CategoryEditRow](src/components/CategoryEditRow.tsx) /
  [AddCategoryForm](src/components/AddCategoryForm.tsx) /
  [DataManagementSection](src/components/DataManagementSection.tsx)로 나뉘어 있다 —
  `useBudget()`과 확인 상태는 부모에만 두고 자식엔 props·콜백만 내린다. 여기 엮여 있는 제약 세 가지:
  - `.app-shell`의 `transform`이 containing block이라 그 안에서는 `fixed`가 460px 컬럼에 갇힌다.
    그래서 `createPortal(..., document.body)`로 셸 밖에 붙인다 — 포털을 빼면 화면을 덮지 못한다.
  - `.settings-panel`의 `z-index: 9999`는 TDS 오버레이보다 **낮게** 둔 값이다. 확인 다이얼로그가
    설정 패널 위에 떠야 하므로 올리지 말 것.
  - 포커스 트랩·스크롤 잠금·Esc 닫기를 TDS가 안 해 주므로 직접 처리한다 —
    [useBodyScrollLock](src/hooks/useBodyScrollLock.ts) / [useEscapeKey](src/hooks/useEscapeKey.ts).
    확인 다이얼로그가 떠 있으면 `useEscapeKey(onClose, confirm === null)`로 Esc를 그쪽에 양보한다.
- `BottomSheet`는 닫힘 애니메이션 후 `onExited`가 불리므로, 시트를 닫고 이어서 할 일
  (예: 삭제 확인 다이얼로그 열기)은 `onExited` 뒤로 미룬다 —
  [useDeferredClose](src/hooks/useDeferredClose.ts)의 `runAfterClose`가 그 흐름이다.
  [useSheetMaxHeight](src/hooks/useSheetMaxHeight.ts)도 지우지 말 것: `BottomSheet`의 `maxHeight`
  prop은 마운트 시점 값으로 굳어서 키보드가 올라와도 안 줄어들기 때문에 `visualViewport` 크기를
  `style`로 덮어써야 금액 입력이 키보드에 가리지 않는다.

### README

[README.md](README.md)는 UI 개편 이전 문서라 화면·컴포넌트 구성 설명이 현재 코드와 다르다.
**코드를 먼저 믿을 것.** 여전히 맞는 부분은 앱의 목적, 실행 명령, 예산 경고 규칙 표, 저장 키와
정수 원 단위 규칙이다.
