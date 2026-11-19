<!-- STATUS --> **STATUS:** ✅ A2 — wage ladder samples the tier band. Landed `4706169b`+, DEPLOYED to dev 2026-11-19.

---

# TASK — A2: make the wage ladder sample abilities that exist

**App only (`wunderkind-app`), branch `new-game-save`, on top of `4706169b`.** One file, a test,
and a `.context` note. **Commit; do not push.** No backend involvement, so this runs safely
alongside a backend session.

## 0. Code state

`git fetch origin` with explicit refspecs; confirm `new-game-save` is at **`4706169b`** ("Price the
pack on the device") and **1 commit ahead of `origin/new-game-save`** — expected, the owner is
holding the push. State branch, hash and date at the top of your report. The working tree must be
clean; if not, stop and report.

Both repos use ICM: read `.context/CONTEXT.md` and the relevant stage's `output/` before raw source.

## 1. The defect

`src/economy/economyWorkings.ts:23`:

```ts
export const WAGE_LADDER_ABILITIES = [10, 20, 40, 60, 80, 95] as const;
```

Sampled **at every tier**. The Economy Workings panel prices each rung through `weeklyWageRange`
and shows the result as that tier's wage table. At tier 8, whose authored band is **2–7**, every
row is off the end of the band — the panel quotes ~£3,200/wk for "ability 20" at a tier where no
such player can be generated. Six rows, none of them real.

**This is not cosmetic.** The panel is the diagnostic an owner reads to answer "what do wages look
like at this tier", and it has been answering for a squad the game never builds. It is a plausible
reason a large calibration gap went unnoticed for months (see §3).

## 2. The change

Sample **the tier's own authored band** instead of a fixed array. The band is already resolvable
app-side — `resolveAbilityRange(config.leaguePlayerAbilityRanges, country, tier)`
(`src/types/gameConfig.ts:30`), which engine code already uses (`NpcClubBrain.ts:563`,
`GameLoop.ts:1534`, `SeasonTransitionService.ts:3228`). Pick a handful of rungs across
`[min, max]`, keep the existing two-column authored/anchored output, and pin it with a test
asserting a tier-8 ladder contains no ability above 7.

⚠️ **The standing warning still applies and is not negotiable: do NOT "fix" this by re-authoring
`wageScaleMicroPence`.** The scale is calibrated against the band; moving it reprices every real
squad in the game. This is a display change only.

⚠️ **`resolveAbilityRange` needs the country.** The app reads `saveCountryCode()` for this
elsewhere; a country-blind read falls through to `TIER_DEFAULTS` and would silently show England's
band on a Scottish save. `src/__tests__/utils/saveCountry.test.ts:41` already forbids passing an
empty country — do not reintroduce it.

## 3. What the device pass found, and why it changes what this panel should SAY

Captured 2026-11-19 on a Scottish save, from the player card's RAW `ability/potential` readout:

| age | 19 | 20 | 20 | 24 | 24 | 26 | 31 |
|---|---|---|---|---|---|---|---|
| ability ÷ potential | 25% | 30% | 30% | 40% | 59% | 78% | 90% |

**The authored band is a POTENTIAL range.** Current ability is derived below it and grows toward it
with age. So a ladder sampling the band shows what players will *eventually* be worth, not what a
real squad costs today — measured tier-1 wage bills are ~28% of what the calibration targets, tier
8 ~35%.

**So sampling the band is the right first step but not the whole answer.** Add a line to the panel
making the distinction explicit — that the ladder is sampled across the tier's **potential** band,
and that a real squad sits below it until it matures. Whatever wording you choose goes through the
translation catalog (`scripts/i18n/manual-overrides.json` → `npm run i18n:apply-overrides --
--only <key> --write`, then `npx tsx scripts/i18n/audit-tokens.ts`). **Never hardcode a
user-facing string.**

**Deliberately out of scope:** sampling *expected mature ability* instead of the band. That is the
better panel and it depends on an open owner decision about re-calibrating the reference squad.
Do not pre-empt it; leave the hook obvious for whoever does.

## 4. Verification

1. `npx tsc --noEmit` clean.
2. `npm test` green, **with the suite COUNT confirmed** (`npx jest --listTests | wc -l` equals the
   suite count). Correct `CLAUDE.md`'s branch row if it moves — and trust your own measurement over
   the number written there; that row has gone stale six times.
3. `npx tsx scripts/i18n/audit-tokens.ts` — zero mismatches, zero absent keys.
4. **The economy gate must not move.** `scripts/economy/variantGate.ts` does not read this module,
   so COVERAGE must be byte-identical. If it moves, you have changed something you did not mean to.

## 5. Reporting, scratch files and `.context`

⚠️ **Nothing scratch-shaped inside either repository.** Your report goes in
`/Users/courtneyadesile/Documents/WunderkindFactory/docs/economy-loose-ends/a2-wage-ladder-report.md`.
Throwaway work goes in your own scratchpad directory.

**`.context` carries what is now true; the report carries what proves it.** Paste commands and
output **verbatim**, never summarised.

**`.context` status and review are owned by the project-manager session.** Append your own pass
entry to `shared/last-sync.md` and correct stage text your change makes wrong — nothing else. Do
not restructure a file, prune earlier entries, or delete a superseded section: **flag it in your
report instead.**

## 6. Do not

- Do not push.
- **Do not touch `wageScaleMicroPence`, any authored economy figure, or `league_ability_ranges`.**
- Do not change `weeklyWageRange` or anything in `wages.ts` — the pricing function is confirmed
  correct against six tiers of live device data.
- Do not work in `wunderkind-backend`; a separate session is in that repo.
