<!-- STATUS: ✅ REVIEWED AND ACCEPTED by the PM session, 2026-11-20. COMMIT DEFERRED — see §4 -->

# A23 — PM review

**Verdict: accept. No defect found. Commit is deferred for a mechanical reason, not a doubt
about the work** (§4).

Reviewed against the code, not the report — `LeagueSizeResolver.php`, `worldExport.ts`, the
remaining `slots` references in both repos, and the `.context` entries.

## 1. The core derivation is correct

```php
$npc = $this->countsFor($country)[(string) $league->getId()] ?? 0;
if ($npc === 0) return 0;
return $npc + ($this->isBottomTier($league) ? 1 : 0);
```

Checked against the live shapes: EN t1–7 (16 rows, not deepest) → 16; EN t8 (15 rows, deepest)
→ 16; SC (12 rows) → 12 above, (11 rows, deepest) → 12. Matches the report's table.

🟢 **The empty-tier guard is a real catch and I verified the reasoning.** Without it the
unconditional deepest-tier `+1` makes a row-less tier a division of ONE, and
`derivedTvDealPence()` publishes the whole pool as one club's share. `BootstrapCountryCommand`
creates leagues before filling them, so every country passes through that state. Finding this
*because* `slots` stopped masking it is the change paying for itself.

## 2. The app mirrors the backend, including at the edges

`homeGamesForLeague(clubCount, isDeepestTier, fallback)` computes `size = clubCount +
(isDeepestTier ? 1 : 0)` and returns `size - 1`. Divergence at the edges is deliberate and
correct: the backend returns size `0` for an empty tier, the app returns the caller's `fallback`
for home games, and a non-deepest tier of one club yields a fallback rather than 0 home games.
Neither is a size the other contradicts.

`deepestTierForCountry()` takes the max tier that EXISTS, with club rows as a fallback for older
exports — the deepest league present, never a declared depth. Correct, and it is what makes the
rule survive Scotland's ladder being cut to four tiers.

## 3. `slots` is genuinely unread — verified independently

`grep` across both repos' `src/` leaves exactly three references and all three are intended:

| site | what it is |
|---|---|
| `League.php:214` | the accessor itself, kept |
| `LeagueAdminController.php:142` | the reconciliation column on the admin screen |
| `EconomyWageTableCommand.php:541` | check 9's `slots (unread)` column |

**Nothing computes a size from it.** The only writer is `League::setSlots()`, which nothing in
`src/` calls.

## 4. ⚠️ Why the commit is deferred, and it is not a doubt about A23

**A26 is mid-flight in the same two working trees.** Its files and A23's are interleaved, so:

1. I cannot re-run either suite to confirm A23's figures — a run today measures A23 + A26's
   half-finished work together, which is exactly the attribution trap A23 itself hit with A22
   and solved by stash-and-rerun.
2. Committing A23's paths now risks sweeping in a file I have mis-attributed.

**So: commit A23 once A26 has committed and cleared the tree**, then re-run both suites on the
combined tree. A26 has been warned to stage by path and told that a non-identical economy gate
may be A23's change in its tree rather than its own.

🟢 `.context/shared/last-sync.md` currently holds A23's eighty-sixth-pass entry only — A26 has
not added its own yet, so the entry is clean to commit when the time comes.

## 5. What is accepted along with the change — the owner should know these

1. **A tier's TV share now moves whenever its NPC rows change**, with no author and no
   migration. This is the ruling working as intended, not a side effect. Regenerating a cache
   re-prices that tier for every existing build.
2. **Scotland's variant gate was never run.** No SC-resolved config export exists on disk;
   `loadExport` refuses rather than measuring the wrong country. Scotland's 14 → 12 is evidenced
   by the export measurement and unit tests, **not by the gate**. England's byte-identical
   result IS gate-proven.
3. **Not verified on a device.** The confirming line after a dev deploy is
   `SC t4  divisor 12 · clubs 12 · home games 11`.
4. **£86,600,000.36 a season** is what the old authored divisor was costing Scotland. England:
   £0.00.

## 6. Two corrections A23 made to its own brief, both upheld

- **All 25 countries were measured**, not just EN and SC. 24 are byte-identical. The "23
  unchecked countries" item is CLOSED, not deferred.
- **A19 is not superseded.** Its own note says A23 removes its central case; it does not. The
  three-state scoring, the `pool ÷ tvDeal` divisor recovery and the integer tolerance are all
  still needed and unstarted, because `divisor` is still null for every pack-sourced league.
  A19 should be re-scoped as *"re-check the wording against A23's rename"* — a much smaller job
  than its note implies.
