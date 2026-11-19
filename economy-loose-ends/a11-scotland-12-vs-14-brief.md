<!-- STATUS --> **STATUS:**  🔄 ACTIVE — agent running as of 2026-11-19 18:30.

---

# TASK — A11: why does Scotland hold 12 clubs where two migrations counted 14?

**Backend-first (`wunderkind-backend`), branch `development`, on top of `0e68d6ac`.** You may
**read** `wunderkind-app` for evidence; **do not write there.** **Commit only if you change code;
a report alone is a valid and likely outcome. Do not push.**

## 🟥 0. WHAT THIS TASK IS — and what it is NOT

**This is a DIAGNOSIS, not a fix.** The deliverable is a defensible answer to one question, with
evidence. ⚠️ **You must not author `slots`, re-run any migration, regenerate any pack, or "correct"
any club count.** Whether Scotland should hold 12 clubs or 14 is the **owner's** decision and is
explicitly not yours. Several agents have been told this; it still holds.

⚠️ **You cannot reach the deployed box, and the local database is a CLONE of a DIFFERENT WORLD** —
it reads Scotland at `slots = 3` and England at `18`, both pre-correction. **It has already produced
one false finding in this workstream.** Any clone reading must be labelled as such. **Your answer
must come from the code, not from the clone's data.**

## 1. Code state

`git fetch origin` with explicit refspecs; confirm `development` is at **`0e68d6ac`** and in sync.
Working tree clean, or stop. State branch, hash and date at the top of your report.

ICM: read `.context/CONTEXT.md` and the relevant stage's `output/` before raw source.

**Read first — the evidence is already gathered, do not re-gather it:**
`docs/economy-loose-ends/next-work-plan.md`, sections:
- **"DEVICE FINDING 2026-11-19 — SC t7 shows 12 CLUBS"**
- **"MEASURED 2026-11-19 — Scotland is short by 2 everywhere"**
- **"UNRESOLVED — Scotland lost 2 clubs per tier in a three-hour window"**
- **"DEVICE PASS 2026-11-19 15:47"** (§3, the third corroborating source)

Also `docs/economy-loose-ends/a7-slots-drift-report.md` §3.4–3.5.

---

## 2. The contradiction, stated precisely

**Two migrations independently counted 14 Scottish clubs per tier at ~10:28–11:04 on 2026-11-19.**

`Version20261119090000::AUTHOR_SQL` authors where `slots = 0` using
`COUNT(n.id) + CASE WHEN lg.tier = m.deepest THEN 1 ELSE 0 END` — an **unconditional** `+1` at the
deepest tier. Scottish tiers 5–8 were `slots = 0` and came out at **14**, so rows were **14** at
t5–t7 and **13** at t8.

`Version20261119120000` writes `target` and demonstrably matched Scotland (t1–t4 went 18 → 14).
Under its own rule it can only write 14 if `target = 14`.

**Three later sources independently say 12:**

| source | reading |
|---|---|
| world export, ~14:15 | 12 per tier, 11 at t8 |
| device league table, 14:48 | `12 CLUBS` at tier 7 |
| device pack contents, 15:47 | `95 club(s)` = 12 × 7 + 11 |

⚠️ **The owner rebuilt the worldpack caches between 11:04 and 14:15.**

### The two live hypotheses

- **(C) The rows really changed.** Something in the cache rebuild removed 2 `npc_club` rows per
  Scottish tier. **If true this is the drift the new check 9 exists to catch, arriving before it
  shipped** — a vindication, not a design fault.
- **(A) Nothing changed; the readings are lossy.** The export and the pack both under-count, and
  `npc_club` still holds 14. Note both migrations use the **same**
  `n.league_id = lg.id AND n.country = lg.country` join, so a join that drops rows would make them
  wrong *identically* — meaning the true count could be higher than 14.

**(B) "the migration failed to match Scotland" has been STRUCK** — it is arithmetically
self-contradictory. Do not revisit it unless you find evidence that overturns the reasoning above,
in which case say so loudly.

---

## 3. What to actually do

### 3.1 🔴 PRIMARY — can a worldpack cache rebuild delete or orphan `npc_club` rows?

**This is the highest-value question and it is answerable from code alone.**

Trace every path a "rebuild the worldpack caches" admin action can take, and determine whether any
of them **deletes, replaces, re-parents or filters** `npc_club` rows — or changes `league_id` /
`country` such that the join stops matching. Candidates to start from (not exhaustive — find the
real set yourself): `CountryWorldPackCacheRepository`, `WorldPackClubGenerationService`,
`StarterPackPoolWarmService`, `BootstrapCountryCommand`, and whatever admin controller or command
the owner's "regenerate" button actually invokes.

**If you find such a path, say exactly which, under what conditions, and whether it would produce a
uniform −2 across all eight tiers** — that uniformity is a strong constraint and a hypothesis that
cannot produce it is probably wrong.

**A clean "no such path exists" is an equally good answer**, and it would make (A) the likely truth.

### 3.2 Can the export under-count?

`LeagueImportExportService`'s club serialisation and `WorldPackSnapshotBuilder`'s. Do either filter
clubs — by `isAmp`, an active/spoof flag, a nationality rule, a cap, anything? **If the export and
the pack share a filter, that is (A) located precisely**, and it would also mean `npc_club` may hold
*more* than 14.

### 3.3 Does `+1`-at-deepest reconcile cleanly?

Both the 14-era and 12-era readings show the deepest tier exactly one short (14/13, 12/11). Confirm
the reservation is intact in both, so it is not confounding the −2. If it does not reconcile, that
is itself a finding.

### 3.4 Make the owner's one command decisive

The owner will run `php bin/console app:country:check SC` on the box. **Read
`CheckCountryContentCommand` and confirm it will actually discriminate (A) from (C)** — it prints
NPC clubs per tier and world pack sets. If its output would be ambiguous, **say so and give the
exact alternative** (A7 left two SQL queries in `a7-slots-drift-report.md`; the second drops the
league join deliberately). ⚠️ **If a small, safe, read-only improvement to that command would make
the answer unambiguous, propose it in the report first — do not just make it.**

---

## 4. Verification

- If you change **no** code: no suite run needed. Say so.
- If you change **any** code: full `vendor/bin/phpunit`, judged against
  `.context/stages/01_overview/output/environment.md`'s documented **three to five** failures
  (⚠️ **not "~31"** — that is the gate's failed-check count, already struck in that file).
  Attribute anything outside the list by **stashing and re-running**.
- **Every claim about the deployed world must be labelled as inference, not measurement.** You
  cannot reach that box. The PM has been wrong twice in this chain by inferring; be explicit about
  which of your statements are inferences and what would falsify each.

## 5. Reporting, scratch files and `.context`

⚠️ **Nothing scratch-shaped inside either repository.** Your report is
`/Users/courtneyadesile/Documents/WunderkindFactory/docs/economy-loose-ends/a11-scotland-report.md`.

**Structure it to answer one question**: (A), (C), something else, or undetermined — with the
evidence for and against each, and **what single observation would settle it.** A report that ends
"undetermined, and here is the one command that decides it" is a success.

**`.context` status and review are owned by the project-manager session.** Append a pass entry only
if you changed something. Do not restructure or prune: **flag it in your report.**

## 6. Do not

- **Do not author, correct or write `slots`** anywhere.
- **Do not re-run, revert or edit any migration.**
- **Do not regenerate, warm or clear any worldpack cache or club**, locally or otherwise.
- Do not write in `wunderkind-app` (reading is fine).
- Do not push. Do not deploy.
- **Do not present a clone reading as a fact about the deployed world** (§0).
