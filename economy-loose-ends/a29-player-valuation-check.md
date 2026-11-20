<!-- STATUS: 📋 OWNER ASK, BRIEF READY, NOT STARTED — blocked behind A28 (2026-11-20) -->

# A29 — a CHECKS panel that samples real players and shows ability → wage → band

**Owner ask, 2026-11-20:**

> *"Do we have any checks that monitor the player valuation banding? A check that randomly pulls
> a player from tier one, maybe from another 2 or 3 tiers in a range, and displays the raw values
> related to ability and then the contract values and what bands are associated with those
> contracts, just so that we don't have to be taking screenshots of players."*

## Answer: no, and the gap is a specific one

The thirteen economy checks that exist are **tier-level aggregates computed from config**:

```
Division sizes · Economy block resolved for a country · Effective pricing · Game config
Income-anchored wages · Money keys · NPC home games · NPC weekly income
Ticket-price elasticity · Tier table · Wage coverage vs authored budget
Wage coverage · Wage model (the one switch)
```

The closest, *Wage coverage vs authored budget*, computes `budget = turnover × ratio × (1 −
staff share)` per tier and compares the modelled income — **from config, never from a player
row.** Its own `full` text says so: *"app constants, NOT published per-tier keys"*.

🔴 **So nothing anywhere reads an actual player's stored wage and asks whether it matches what
the model says that player should earn.** Every such question this workstream has asked — the
Scotland starter-squad discrepancy, the staff-vs-player gap, Grant Dalgleish at £2.3k — was
answered by the owner photographing a screen. That is the gap.

## What to build

A CHECKS panel that **samples real `players` rows** and prints, per player:

| column | source |
|---|---|
| tier, club | the player's club and its league |
| current ability / potential | `players.current_ability`, `players.potential` — **raw, not perceived** |
| stored wage | the ingested/contracted `wage`, in pence, shown as £/wk |
| expected wage | `weeklyWageRange({ ability, economy }).expectedPence` for that player's tier |
| ratio | stored ÷ expected — **the number the owner is actually looking for** |
| band | which `wageMultiplierTiers` row the ability falls in, and the rand bounds |

Sampling: a few players from tier 1 and from two or three other tiers across the range, as the
owner describes. **Make the tier set and the sample size constants at the top**, not buried.

## ⚠️ Five things to get right

1. **RAW ability, never perceived.** `player_rating` is the manager's opinion and is deliberately
   lossy; this panel exists to show the truth. Read `players.current_ability` /
   `players.potential` directly. Getting this wrong makes the panel useless in exactly the cases
   it is for.
2. **Units.** `Player.wage` is PENCE. `playerMapper.ts:207` divides by 100 for display. The
   `CLAUDE.md` money rule is explicit and this is a classic site for a stray `× 100`.
3. **A deterministic sample beats a random one.** "Randomly pulls a player" is the owner's
   phrasing, but a panel that shows a different player each run cannot be used to watch a number
   change across two runs. **Seed the sample** (e.g. by tier + a stable key) so repeated CHECKS
   runs show the same players until the data changes, and say so on the panel.
4. **Expected wage must come from the same code the game uses** — `weeklyWageRange` /
   `resolveEconomy` — never a reimplementation. A second implementation of the wage formula is
   the defect class this workstream exists to remove.
5. **It must survive an unresolvable tier.** `resolveEconomy` can report `tier-unresolvable`;
   print that rather than a 0 or a crash. **A `?? 0` on a money field is a defect, not a
   default** — see `CLAUDE.md`'s pack-is-a-census rule.

## Where it goes

`src/economy/economyDiagnostics.ts` alongside the existing checks, surfaced in
`src/components/debug/ChecksTab.tsx`. Follow the existing check shape — `id`, `label`, `status`,
`detail`, `full` — and keep the per-player table in `full`, as the wage-coverage check does.

⚠️ **Status semantics:** this is an instrument, not a verdict. It should `pass` whenever it can
read the data and only `warn` on a ratio outside a stated band. **Never `fail`** — a surprising
wage is information, not a broken build.

## ⚠️ Blocked behind A28

A28 is live in `ChecksTab.tsx` adding a bond-count line. **Do not start until it commits** —
two writers in one file is how work gets clobbered, and it nearly happened today between A23 and
A26.

## Verification

- `npx tsc --noEmit` clean; `npm test` green with the count confirmed. Baseline will be A28's —
  **take it from `CLAUDE.md`'s `new-game-save` row, not from this brief.**
- **Paste the panel's real output into the report.** The whole point is that the owner stops
  taking screenshots; a report that describes the panel without showing it has not demonstrated
  the thing.

## Branch

App `new-game-save`, app-only. ICM — read `.context/CONTEXT.md` first.

## Not established

- Which tiers to sample, and how many players each.
- Whether the owner wants staff and scouts in the same panel. **Probably yes, eventually** —
  the same screenshot problem applies to them, and A24 will need it — but it is not what was
  asked for, so build the player panel first and raise it.
