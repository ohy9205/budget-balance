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

Single test / subset:

```bash
npx vitest run src/lib/calculations.test.ts
npx vitest run -t "projection"        # match describe/it name (Korean names are used, e.g. -t "경계값")
```

There is no lint script and no ESLint config — the lone `eslint-disable` comment in
[BudgetContext.tsx](src/context/BudgetContext.tsx) is vestigial. `npm run build` (tsc with `strict`,
`noUnusedLocals`, `noUnusedParameters`) is the only static check.

## Architecture

Personal single-user monthly budget app. No server, no DB, no auth — everything lives in
`localStorage`. React 18 + Vite + TypeScript, state via a single Context (no state library).

Three layers, deliberately separated:

1. **Pure logic** — [src/lib/](src/lib/) + [types.ts](src/types.ts) + [constants.ts](src/constants.ts).
   No React, no DOM (except `storage.ts` touching `localStorage`). All of `calculations.ts`,
   `date.ts`, `format.ts` are pure functions; this is the only layer with tests
   ([calculations.test.ts](src/lib/calculations.test.ts), 25 tests, `environment: "node"`).
2. **State** — [src/context/BudgetContext.tsx](src/context/BudgetContext.tsx). Holds the whole
   `BudgetStore` plus `currentMonth` and `prefs`; every mutation goes through `mutateMonth`, which
   is a no-op when the selected month has no data. Two `useEffect`s persist store/prefs on any change.
3. **Presentation** — [src/App.tsx](src/App.tsx), [src/components/](src/components/),
   [src/index.css](src/index.css). Components read state via `useBudget()` or receive it as props;
   they never touch `localStorage` or recompute budget math themselves.

[docs/budget-mobile-implementation.md](docs/budget-mobile-implementation.md) records the earlier
"Soft" design port. That UI is gone (the presentation layer now runs on 토스 TDS Mobile — see
[UI conventions](#ui-conventions)), but the standing rule it states still holds: **the logic/state
layers are reused as-is; UI work rewrites only the presentation layer.** Keep that split.

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
  sorts as "over" without breaking formatting.
- `projection()` and `paceWarning()` return **`null` for any month that isn't the current month**;
  callers must handle null rather than render a meaningless forecast. Both accept an injectable
  `today: Date` — tests rely on this, so keep the parameter when editing.

### UI conventions

- All user-facing strings and most code comments are Korean; match that.
- **UI는 토스 [TDS Mobile](https://tossmini-docs.toss.im/tds-mobile/)(`@toss/tds-mobile`)로 만든다.**
  2026-07-25에 직접 만든 "Soft" 디자인 시스템을 걷어내고 TDS로 갈아탔다. 새 UI를 만들 때는 먼저
  `@toss/tds-mobile`에 해당 컴포넌트가 있는지 보고, 없을 때만 직접 만든다. 타입 정의
  (`node_modules/@toss/tds-mobile/dist/esm/index.d.ts`)가 사실상의 API 문서다.
- [App.tsx](src/App.tsx)의 최상단이 `TDSMobileAITProvider`(`@toss/tds-mobile-ait`)다. 이게
  `:root`에 `--adaptive*` 색 변수와 타이포 변수를 주입하므로 **provider 밖에서는 TDS 컴포넌트가
  깨진다.** 토스 앱 밖(일반 브라우저)에서는 `@apps-in-toss/web-framework` 호출이 실패하지만
  provider가 try/catch로 감싸 기본값(blue500, safe-area 0)으로 떨어지므로 그대로 동작한다.
  `colorPreference`는 `"light"`로 고정돼 있다 — 다크 모드는 지원하지 않는다.
- **색은 `adaptive`(`@toss/tds-colors`)에서만 가져온다.** `adaptive.grey900` 같은 값은 실제로는
  `var(--adaptiveGrey900)` 문자열이라 `style`/props 어디에나 넣을 수 있다. 새 hex를 만들지 않는다.
  상태색(여유/주의/위험/초과) 매핑은 [statusTheme.ts](src/components/statusTheme.ts) 한 곳에만 두고,
  뱃지는 색(blue/yellow/red) + variant(weak/fill) 조합으로 위험과 초과를 구분한다.
- 타이포는 `Paragraph` / `ListRow.Text`의 `typography` 토큰을 쓴다. 크기는 t1=30px, t2=26, t3=22,
  t4=20, t5=17, t6=15, t7=13, st13=11px (전체 순서: t1 st1 st2 st3 t2 st4 st5 st6 t3 st7 t4 st8 st9
  t5 st10 t6 st11 t7 st12 st13 = 30→11px).
- 아이콘은 `IconButton`/`TopNavigationIconButton`의 `name`으로 지정하며 `https://static.toss.im/icons/svg/{name}.svg`
  에서 받아온다. **TDS 자신이 참조하는 이름만 쓴다** (`icon-arrow-left-small-mono`,
  `icon-arrow-right-small-mono`, `icon-arrow-up-mono`, `icon-arrow-down-mono`, `icon-x-circle-mono` …)
  — 없는 이름을 넣으면 조용히 404가 난다.
- [index.css](src/index.css)는 이제 **레이아웃 전용**이다 (중앙 460px 컬럼, 섹션 간격, 시트/설정
  화면 내부 여백). 색·모양·타이포는 넣지 않는다. `.app-shell`의 `transform: translateZ(0)`는
  일부러 넣은 것 — TDS의 `TopNavigation fixed` / `FixedBottomCTA`가 뷰포트가 아니라 이 컬럼을
  기준으로 고정되게 하는 containing block이다. 지우면 데스크톱에서 화면 전체로 퍼진다.
- `ListRow`는 `as="button"`으로 렌더링해 행 전체를 누를 수 있게 하며(`.cat-row`, `.exp-row`가
  버튼 기본 스타일만 지운다), 그래서 `<List>`(ul) 대신 `.list-rows` div로 감싼다.
- 오버레이는 전부 TDS 것을 쓴다: 하단 시트는 `BottomSheet`(+ `BottomSheet.CTA` / `DoubleCTA`),
  전체 화면은 `Modal` + `Modal.Overlay` / `Modal.Content`, 파괴적 동작은
  [ConfirmDialog.tsx](src/components/ConfirmDialog.tsx)(TDS `ConfirmDialog` 래퍼)를 거친다.
  직접 만들었던 `Modal.tsx` 프리미티브는 삭제했다 — 되살리지 말 것.
  `BottomSheet`는 닫힘 애니메이션 후 `onExited`가 불리므로, 시트를 닫고 이어서 할 일
  (예: 삭제 확인 다이얼로그 열기)은 `onExited` 뒤로 미룬다 —
  [QuickExpenseForm.tsx](src/components/QuickExpenseForm.tsx)의 `afterExitRef` 참고.

### Known README drift

[README.md](README.md) still describes a pace-warning banner; it was replaced by the
projected-balance line in [SummaryCard.tsx](src/components/SummaryCard.tsx). `resetCategoryExpenses`
is unwired since the per-category settings button was repurposed to "기본값으로" (restore the seed
defaults). Trust the code over the README here.
