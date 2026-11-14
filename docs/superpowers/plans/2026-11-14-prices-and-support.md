# Prices and Support Settings Implementation Plan

> **For agentic workers:** Two parallel tracks dispatched through fleet (Task 1 to Codex, Task 2 to Claude Opus), integrated in the main session. Workers do not run git. Steps use checkbox syntax.

**Goal:** The income figure for each rotation is built from crop prices, yields, costs and the public support that applies, and the farmer can change the prices and switch or edit each support payment in a Settings screen.

**Architecture:** The bundle gains an optional `economics` block. A pure module, `src/money/money.ts`, turns it plus the farmer's changes (`AppState.money`) into each option's income. `withMoney(bundle, money)` returns the bundle with those incomes filled in, and is applied once where the bundle is handed to the screens, so Options, Why, Year and Print need no change to show the new figures. The farmer's changes travel in the shared link.

**Spec:** `README.md`, plus this file. Types are already written in `src/data/types.ts` (`Economics`, `CropEconomics`, `SupportItem`, `LocalText`, `Money`, `AppState.money`, `Fact.edited`, `FieldBundle.economics`) and the function outlines in `src/money/money.ts`. Do not rename or re-type them.

## Global Constraints

- Everything in the first plan's Global Constraints still holds (`docs/superpowers/plans/2026-11-14-frontend-buildout.md`): dictionaries for all UI text, no colour or font literals in components, 44 px tap targets, no text under 12 px, works from 360 px, scale badge on every number, placeholder note, `npm run typecheck`, `npm test`, `npm run build` all pass.
- With no changes from the farmer, every screen shows exactly the same ranking as before this plan.
- A figure the farmer changed is marked as theirs ("Yours") wherever it is shown, and is never labelled with a dataset it did not come from.
- The app never says a farmer is entitled to a payment. Every support item shows its one-sentence condition, and the printout lists which were switched on.
- Money keys: `p.<crop>` crop price in €/t; `s.<support id>` support amount in €/ha; `on.<support id>` 1 or 0. Only values that differ from the bundle are stored.

## Review Focus

1. A shared link with money keys for a crop or support id the bundle does not have, or with a negative or absurd number: ignored, never NaN on screen. (Task 1 tests.)
2. A bundle with no `economics`: the app behaves exactly as before and Settings says there is nothing to edit. (Task 1 `withMoney` test; Task 2 test.)
3. The farmer clears an input or types a letter: the field shows the mistake, the stored value does not change, no NaN anywhere. (Task 2 test.)
4. Every support payment switched off and prices set to zero: income goes negative and is shown as a negative number, not hidden or clamped. (Task 1 test; Task 2 renders it.)
5. Changing a price changes which rotation is "best fit" only through the income priority; a farmer who chose soil and water sees the income figure change and the order stay. (Task 1 test.)

---

### Task 1: Money logic, link and data (Codex)

**Files (only these):**
- Modify: `src/money/money.ts`, `src/state/url.ts`, `src/state/url.test.ts`, `src/data/validate.ts`, `src/data/validate.test.ts`, `scripts/make-placeholder-bundle.mjs`, `public/data/genzano-demo.json` (by running the script), `docs/scoring.md`
- Create: `src/money/money.test.ts`

**Rules**

- [ ] **Bundle.** In `scripts/make-placeholder-bundle.mjs` add `economics` and derive each option's `facts.income.value` from it, so the file is self-consistent. Placeholder figures (all `placeholder: true`, `scale: "area"`, `confidence: "low"`, source `src.trials`, `asOf: "2026-10"`):

  | crop | yield t/ha | price €/t | costs €/ha |
  |---|---|---|---|
  | durum | 3.0 | 320 | 620 |
  | chickpea | 1.6 | 650 | 520 |
  | faba | 2.2 | 330 | 430 |
  | vetch-oat | 5.5 | 120 | 380 |

  Support items (all `defaultOn: true`, placeholder amounts, source `{ dataset: "Italian CAP Strategic Plan 2023–2027 (to be confirmed)", resolution: "national", url: "" }`, `level` as given): `basic-income` (eu, 160 €/ha, every crop, every rotation, name "Basic income support" / "Sostegno di base al reddito", condition "Paid on eligible hectares with entitlements." / "Pagato sugli ettari ammissibili con titoli."); `coupled-durum` (italy, 95, crops `["durum"]`, "Coupled support for durum wheat" / "Sostegno accoppiato grano duro", "Durum wheat in central and southern Italy, certified seed." / "Grano duro nel Centro-Sud, seme certificato."); `coupled-legumes` (italy, 60, crops `["chickpea","faba"]`, "Coupled support for grain legumes" / "Sostegno accoppiato leguminose da granella", "Grain legumes harvested as dry grain." / "Leguminose raccolte a granella secca."); `eco-rotation` (eu, 110, crops `[]`, options the three rotations that are not continuous durum, "Eco-scheme: rotation with legumes or forage" / "Eco-schema: avvicendamento con leguminose o foraggere", "Needs a legume or forage in the rotation; limits on chemicals in that year." / "Serve una leguminosa o foraggera in rotazione; limiti ai prodotti chimici in quell'anno."). The research track will replace these; keep them in one clearly marked array near the top of the script.

  With these figures the default incomes are: durum-durum-durum 595, chickpea-durum-durum 753, faba-durum-faba 652, vetch-oat-durum-durum 653 (sales − costs + support, mean of three years, rounded). Update the income ranges in the script to ±25% of each value, rounded to 10. The `scores` in the script stay exactly as they are.
- [ ] **`resolveMoney`.** Price for a crop is `money["p.<crop>"]` when it is a finite number within `MONEY_LIMITS.price`, else the bundle's. Support amount likewise from `s.<id>` within `MONEY_LIMITS.support`. `on` is `money["on.<id>"] === 1` or `=== 0` when present, else `defaultOn`. `edited` flags compare with the bundle's values.
- [ ] **`optionMoney`.** For each of the option's three crops: `sales = yield × price`, `costs` from the bundle, `support` = every item that is on and applies (its `options` is empty or contains this option's id, and its `crops` is empty or contains this year's crop), `margin = sales − costs + sum(support)`. `perYear` is the mean margin rounded to a whole euro.
- [ ] **`incomeFact`.** `value: perYear`, `unit: "€/ha"`, `scale: "area"`, `label: "fact.income"`. When nothing the option uses was changed: the bundle fact's `source`, `confidence`, `range`, `asOf` and `placeholder`. When something it uses was changed: `edited: true`, no `range`, `source: { dataset: "Your own figures", resolution: "this farm", url: "" }`, `confidence: "fair"`, and `placeholder` true only if a yield or cost it uses is still a placeholder.
- [ ] **`withMoney`.** No `economics`: return the same object. Otherwise a copy in which each option has `facts.income = incomeFact(...)` and, for each scenario, `scores[scenario].income` multiplied by `perYear(with money) / perYear(defaults)`, with that ratio held between 0 and 2 and the result between 0 and 1; if the default `perYear` is 0 or less the score is left alone. The input bundle is not mutated.
- [ ] **`setMoney`.** Returns a new object. The key is removed when the value equals the bundle default (price, amount, or `defaultOn` as 1/0), set otherwise. Values outside `MONEY_LIMITS` or not finite leave `money` unchanged.
- [ ] **Link.** `m` parameter: `key:value` pairs joined by `;`, keys sorted, for example `m=on.eco-rotation:0;p.durum:350`. Decode keeps a pair only if the key matches `^(p|s|on)\.[a-z0-9-]{1,32}$` and the value is a finite number from 0 to 5000 (and exactly 0 or 1 for `on.`); at most 40 pairs; default `{}` is omitted on encode.
- [ ] **Validate.** `economics` is optional. When present: all four crops with valid `yield`, `price`, `costs` facts whose values are numbers; `support` an array of items with unique string `id`, `name` and `condition` each with string `en` and `it`, a known `level`, a valid `amount` fact with a numeric value, `crops` of known crops, `options` of ids that exist in the bundle, boolean `defaultOn`. Error messages start with `bundle:` and contain `economics`.
- [ ] **Tests** (`money.test.ts`, on the regenerated fixture):
  - defaults: `optionMoney` `perYear` is 595, 753, 652, 653 for the four options in the order above; chickpea year 1 has sales 1040, costs 520 and support ids `basic-income`, `coupled-legumes`, `eco-rotation`; durum-durum-durum never gets `eco-rotation`.
  - `withMoney(fixture, {})` deep-equals the fixture except that nothing has `edited`, and every option's `facts.income.value` equals the fixture's.
  - `{"p.durum": 400}`: durum-durum-durum `perYear` is 835; its `facts.income` has `edited: true`, no `range`, dataset "Your own figures"; chickpea-durum-durum is 913.
  - `{"on.eco-rotation": 0}`: chickpea-durum-durum drops by 110 to 643 and durum-durum-durum is unchanged with `edited` not set.
  - all four prices 0 and all four supports off: every `perYear` is negative and equals minus the mean costs.
  - income score scaling: with `{"p.durum": 400}` durum-durum-durum's `scores.normal.income` is `0.55 × 835/595` held to at most 1; `scores.normal.soil` is unchanged; the input fixture is unchanged.
  - with priorities `["soil","water"]`, `rankOptions` on `withMoney(fixture, {"p.durum": 1000}).options` gives the same order as on the fixture's options.
  - junk: `{"p.maize": 9, "p.durum": -5, "s.basic-income": 99999, "on.eco-rotation": 7, "x": 1}` resolves to all defaults with `edited: false`.
  - a bundle copy with `economics` deleted: `withMoney` returns the very same object.
  - `setMoney`: setting `p.durum` to 350 adds the key; setting it back to 320 removes it; setting it to -1 or NaN changes nothing.
  - link: a state with `money: {"p.durum": 350, "on.eco-rotation": 0}` round-trips and encodes with keys sorted; `decodeState("m=p.durum:abc;on.x:2;p.durum:9999;s.ok:12")` gives `money: {"s.ok": 12}`.
  - validate: the fixture passes; removing `economics.crops.faba`, giving a support item an unknown option id, or two support items the same id each throws a message containing "economics".
- [ ] **docs/scoring.md.** Add a short plain-words section "How the income figure is worked out" with the formula, what the farmer can change, and how a change moves the ranking.
- [ ] Run `npm run typecheck` and `npx vitest run src/money src/state src/data src/ranking`.

### Task 2: Settings screen and where the figures show (Claude Opus)

**Files (only these):** `src/App.tsx`, `src/components/BundleProvider.tsx`, `src/components/TopBar.tsx`, `src/components/Icons.tsx`, `src/components/FactParts.tsx`, `src/screens/Settings.tsx` (new), `src/screens/Options.tsx`, `src/screens/Why.tsx`, `src/screens/Print.tsx`, `src/i18n/en.ts`, `src/i18n/it.ts`, `src/index.css`, `src/theme/*.css`, tests beside your files (new file `src/screens/settings.test.tsx`).

**Interfaces:** consumes `resolveMoney`, `optionMoney`, `withMoney`, `setMoney`, `MONEY_LIMITS` from `src/money/money.ts` exactly as outlined there, and `state.money` from `useAppState`. Another worker is filling those in now; until it lands they throw "not implemented".

- [ ] **Apply the money once.** `BundleGate` hands its children `withMoney(bundle, state.money)` (memoised). No other screen recomputes income.
- [ ] **Way in.** A gear button in `TopBar` (44 px, labelled for screen readers) opens `/settings`, keeping the query string. It must still fit beside the view and language switches at 360 px; shorten nothing else. The Options screen gets one row under the list, "Prices and support", which opens the same screen and shows a "Yours" mark when anything is changed.
- [ ] **Settings screen** (`/settings`, reachable with or without a field). A "Back" link returns to where the farmer came from (browser back; if there is no history, to `/options` when a field is chosen, else `/`). Three parts:
  1. *Crop prices*, €/t: one row per crop in the bundle's `economics.crops`: crop icon and name, a number input (`inputMode="decimal"`, 44 px tall), and the default beside it in small type when the value differs.
  2. *Support*, €/ha: one row per support item: a real checkbox or switch (on/off), the name in the current language, the condition sentence under it in small type, a level word (EU, Italy, Basilicata), and a number input for the amount. An item that is off shows its amount greyed and not editable.
  3. "Reset to the starting figures" (only enabled when something is changed), and one line: "Check each payment with your adviser. This app cannot tell whether you qualify."
  Every change goes through `setMoney` into `state.money` at once; there is no Save button. An input that is empty, not a number, or outside `MONEY_LIMITS` shows a short error under it and does not change the stored value. If there is no field yet, or the bundle has no `economics`, show one line saying so in place of parts 1 to 3. Scale badge and source label on the section headings as elsewhere; the placeholder note when any shown default is a placeholder.
- [ ] **"Yours" mark.** Where a fact with `edited: true` is shown (option rows, Why, Print), show a small "Yours" tag and do not show a dataset label for it.
- [ ] **Why screen.** Under the income figure, the working for the three years as a small table: year and crop, sales, costs, support, total; then "Change prices and support" linking to Settings. Uses `optionMoney`. Skipped when the bundle has no `economics`.
- [ ] **Print.** A short "Prices and support used" block: the four prices and each support item with on/off and amount, marking the ones the farmer changed.
- [ ] **Dictionaries.** All new text in English and plain Italian.
- [ ] **Tests** (`settings.test.tsx`, Map mocked as in `screens.test.tsx`): (a) Settings lists four price inputs and every support item of the fixture with its condition; (b) typing 400 in the durum price puts `p.durum:400` in the link, and Options then shows 835 for durum with a "Yours" tag; (c) switching off the rotation eco-scheme changes chickpea's figure on Options from 753 to 643; (d) clearing an input shows the error and leaves the link unchanged; (e) Reset empties `m` from the link and is disabled afterwards; (f) with no field chosen Settings shows the "choose your field first" line and no inputs; (g) with a bundle that has no `economics`, Options renders as before and Settings shows the nothing-to-edit line; (h) the gear button is present on every route and keeps the query string.
- [ ] Run `npm run typecheck`, `npm test`, `npm run build`.
