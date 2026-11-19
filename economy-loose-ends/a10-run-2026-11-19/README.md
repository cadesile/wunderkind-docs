# A10 evidence — 2026-11-19

Verbatim command output for `../a10-wage-scale-report.md`. Nothing here is inside either
repository.

| file | what |
|---|---|
| `gate-before.txt` | `lando php bin/console app:economy:wage-table EN SC` at `0e68d6ac`, exit 1, 31 checks failed |
| `gate-after.txt` | the same command with the change, exit 1, 37 checks failed |
| `measure-coverage.txt` | sigma old/new, S_tier old/new and coverage per tier, measured against 40 real generated squads per tier |
| `measure-ladders.txt` | the per-tier wage ladder before/after for EN and SC tiers 1 and 8, plus real-squad mean wages |
| `measure-generator-truth.txt` | what the real generator actually produces: ability/potential by age and position over ~1,300 players per tier, and the personality/physique expectations `expectedTraits()` is checked against |
| `measure-model-comparison.txt` | the brief's literal formula against the faithful one, coverage per tier — the §0.1 table |
| `probe-*.php` | the probes that produced the above. They boot the kernel inside the Lando container and build the services by hand, because `PlayerGenerationService` is a private service. **Run from the container's `/tmp`, never from the repo.** |
| `suite-wholerun-*-oomkilled.txt` | the whole-suite run dying at exit 137, with and without the change, on the same box minutes apart |
| `suite-batches/` | the suite re-run in 20-file batches, 386 files; `_summary.txt`, `_totals.txt`, `_file-batches.txt` (which file went in which batch), `_list-all-tests.txt` (PHPUnit's own enumeration of all 3,297) and **`_reconciliation.txt`** (planned vs reported per batch — the whole 72-test gap is one OOM-killed file) |
| `legacy-newgame-flake-attribution.txt` | why `LegacyNewGameFlowTest::testTheEconomyBlockShipsSwitchedOff` is a genuine sixth baseline item and not a stale test, proved three ways, with the two tests that pollute the shared row |
