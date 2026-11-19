<!-- STATUS --> **STATUS:** ✅ Historical device pass, 2026-11-18.

---

# Device pass — re-pinned for what is live, 2026-11-18

**Every figure here is recomputed for the world as it stands tonight.** The previous sheet's pins
predate R2, the regeneration and the 16-club divisions, so treat this file as the sheet and the old
rows as void. The sheet has gone stale three times by being read after the thing it described
moved; this is the fourth re-pin.

## The build and the environment

| | |
|---|---|
| App | `dev` @ `94236541`, **OTA 481** — splash and debug header read `481 9423654` |
| Backend | `dev` @ `459dac4b`, Deploy Development run **276** |
| API | `api.dev.buildmyclub.co.uk` · `WORLD_PACK_VERSION` **10** |
| `wageModel` | `turnover`, so **`incomeAnchoredWages` derives ON** |
| `PYRAMID_DISTRIBUTION_ENABLED` | **false**, both halves |

⚠️ **`EXPO_PUBLIC_BUILD_NUMBER` moves once per publish, not per APK build**, so `481` plus the SHA
is the only reliable answer to "did my update land". `expo.version` does not move with an OTA.

## What changed under the player since the last pass

- **Authored turnover** is now `£331m · £114m · £34.6m · £20.7m · £7.32m · £2.69m · £686k · £215k`.
- **Wages followed it**, because `wageScaleMicroPence` is derived: the published scale is
  `332484503 … 233303081`. At tier 8 the average authored wage is about **£165/wk per player**
  (0.6 × £215,000 ÷ 46 weeks ÷ a 17-man squad).
- **The bottom two divisions have new grounds and fewer facilities.** EN tiers 7–8 hold **eight**
  facilities — four small stands, a training pitch, a physio clinic, a club shop, a tactical room —
  and nothing else. No youth academy, no scouting centre, no car park, no trial pitch, no imaging
  suite, no nutrition centre, no player wellbeing, no scout fleet, no technical zone.
- **Tier-8 NPC grounds are small and uneven**: mean 1.27 total stand levels, about **1,583 seats**
  (tier 7: 2.06 levels, about 2,578).
- **Divisions are 16 clubs** (15 + the player at the bottom tier), down from 20.
- **Prize money collapsed by design**: a tier-8 champion is paid **£55,358**, not £5,000,000.
- **The youth scholarship floors at tiers 6–8** — all three sit on £25.00/wk.

## Rows to run

### H — do bottom-tier NPC clubs get rescued in season 1? ★ the one that decides what happens next
- **Setup** — any tier-8 save, play to the first season boundary.
- **Why it is first** — the gate predicts tier 8 **insolvent in season 1 and generating a rescue**:
  modelled income £226,568 against a bill of £135,941, 102.6%. If the device agrees, the bottom
  tier needs fixing (upkeep down or income up) before anything else in the economy is tuned. If it
  does not, the gate's floor is too pessimistic — it models no investor income, no win bonus, no
  pyramid payout, no tournament prize — and that gap is itself the finding.
- **Record** — how many tier-8 NPC clubs end season 1 negative, and whether a rescue fires.

### I — the player's club is NOT bound by the new NPC ground ★ new, and nothing pins it
- **Setup** — a fresh tier-8 save through the v3 flow, building the stadium you would normally build.
- **Why** — band 3 is a GENERATION band for NPC clubs. The player buys their own stands in setup,
  so a player tier-8 club can hold a far bigger ground than the 1,583-seat division around it, and
  nothing in the gate models that. **If tier 8 feels comfortable while the NPCs are being rescued,
  this asymmetry is why.**
- **Record** — your own capacity and weekly income beside a neighbouring NPC's.

### E — the season-1 ledger on a fresh save *(carried forward; still the highest-value capture)*
- **Expect** — a `Season shirt sales` line, its manufacturing cost at 40–50% of it, a
  `Season ticket sales` row, **no flat league prize**.
- **⚠️ Record the exact `fanCount`, `morale`, `shirtPrice` and `ticketPrice`.** These are save state
  and cannot be derived from either repo; they are still the last missing inputs to the income
  trace, and every shirt figure in `REMAINING-WORK.md` rests on an assumed fan base.

### G — squad abilities and wages *(carried forward, and now has a prediction)*
- **Capture** — each tier-8 player's ability and weekly wage.
- **Expect** — an average near **£165/wk**, and a squad bill near **£2,804/wk**, if the squad is
  priced from the authored table.
- **Why it matters** — the open question is a player club committing **£14,057/wk** against an
  NPC's £1,700. The reading from the gate is that NPCs price off authored turnover while the player
  is budgeted from income, so under R2 those two should have converged. **If the player's bill is
  still an order of magnitude above the NPCs', that explanation is wrong** and it needs tracing.

### F — the Budget card
- **Expect** — `over-committed: no` and a small positive surplus. Record the income basis, wage
  share, wage floor and surplus whatever it says; `yes` is a finding to record, not an automatic
  fail.

### D — shirt price follows the division
- **Expect** — **£7.88** at tier 8, the Chairman's advice agreeing, and the `+` stepper stopping at
  2× advice. Unchanged by R2: the shirt price follows the published ticket price, which R2 did not
  touch.

### A — the published ticket price
- **Expect** — **£14** at tier 8. Unchanged by R2. Fails if £25 (a pack at the wrong version) or
  £80.

### B — parachutes across two seasons
- **Expect** — nothing in the season of relegation; instalment 1 at the end of the NEXT season on a
  60/40/20 taper, at 60% of the turnover of the division relegated INTO. **Re-pinned: tier 8 is now
  about £129,000** (60% of £215,000), not £98,911; tier 3 about £18.06m.
- ⚠️ Still never exercised in a real save.

### C — NPC rescues at the other tiers
- **Expect** — zero at tiers 1–7. Row H covers tier 8, where the expectation is now the opposite.

## Rows retired

Anything asserting the old prize ladder (£5m at tier 8), a 20-club division, a tier-7/8 ground of
~6,100 seats, a youth academy or scouting centre at tiers 7–8, or a tier-8 average wage above
about £200/wk. All of those described the world before tonight.

## What this pass is for

Two things, and they are the gate for the largest remaining piece of work:

1. **Decide whether the bottom tier is actually broken** (row H) or only looks broken to a model
   with no upkeep term in its coverage metric and no investor income in its revenue.
2. **Capture the save-state inputs** (rows E and G) that neither repo can derive, which is what
   the PARKED item — moving contract values out of the worldpack — had been waiting on since
   14 November.

   ⚠️ **Pointer corrected 2026-11-18:** that item was NOT in `REMAINING-WORK.md`'s "PARKED
   section", which does not exist. The record is the app's
   `.context/stages/07_synthesis/output/current-focus.md` (PARKED 2026-11-14, now marked
   SHIPPED).

   ✅ **And it is no longer waiting: the work shipped 2026-11-18** — all money left the pack,
   both repos, `WORLD_PACK_VERSION` 10 → 11 (`pack-economy-removal-report.md`). These
   save-state captures are still worth having for the coverage question in item 1, but they no
   longer block anything.
