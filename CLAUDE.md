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

[docs/budget-mobile-implementation.md](docs/budget-mobile-implementation.md) records the design
port that produced the current UI, and states the standing rule: **the logic/state layers are
reused as-is; UI work rewrites only the presentation layer.** Keep that split.

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
  Thresholds live in `STATUS_THRESHOLDS`; CSS mirrors them as `.s-safe|.s-caution|.s-warning|.s-over`.
- Zero-budget-with-spending is deliberately reported as `100 + used` rather than `Infinity`, so it
  sorts as "over" without breaking formatting.
- `projection()` and `paceWarning()` return **`null` for any month that isn't the current month**;
  callers must handle null rather than render a meaningless forecast. Both accept an injectable
  `today: Date` — tests rely on this, so keep the parameter when editing.

### UI conventions

- All user-facing strings and most code comments are Korean; match that.
- Styling is plain CSS with custom properties in `:root` (`--ink`, `--accent: #ec3013`,
  `--col: 460px`, `--soft-card*` shadows, status colors). Mobile-first single column, rounded cards
  (radius 18 / 22 / 26), shadows instead of borders — the "Soft" system described in the docs file.
  No CSS framework, no CSS modules.
- **One design, one stylesheet.** [index.css](src/index.css) is the whole presentation layer; there
  is no theme switch, no `data-theme`, no route/hash handling. The earlier Modernist variant and its
  `design.ts` / `soft.css` plumbing were removed on 2026-07-25 — don't reintroduce scoped override
  sheets, edit the base rules. `.list-block.cats` / `.list-block.exps` are layout modifiers (floating
  cards vs. one card of rows), not theme hooks.
- [Modal.tsx](src/components/Modal.tsx) is the only overlay primitive (`sheet` / `fullscreen` /
  `center` variants, Esc + backdrop close, `aria-modal`); build new dialogs on it, and route
  destructive actions through [ConfirmDialog.tsx](src/components/ConfirmDialog.tsx).

### Known README drift

[README.md](README.md) still describes expense edit/delete UI and a pace-warning banner. The design
port removed both from the UI; `updateExpense`/`deleteExpense` remain on the context but are
currently unwired, and the pace warning was replaced by the projected-balance line in
[SummaryCard.tsx](src/components/SummaryCard.tsx). Trust the code and the docs file over the README
here.
