# A23 verbatim run output — 2026-11-19

| file | what it is |
|---|---|
| `measure-before-after.py` / `.txt` | the division size, home-game count and per-club TV share under BOTH rules, **all 25 countries** in `~/Downloads/wunderkind-world-2026-11-19.json`. The SUMMARY block at the end is the blast radius: 24 unchanged, SC only. The last block recomputes the £86,600,000.36 Scottish shortfall independently. Run: `python3 -I measure-before-after.py ~/Downloads/wunderkind-world-2026-11-19.json` |
| `variantGate-EN.BEFORE.txt` / `.AFTER.txt` | **the England proof. `diff` is empty.** Same config, same export, same gate; BEFORE taken with the whole change stashed |
| `variantGate-SC.BEFORE.txt` / `.AFTER.txt` | ⚠️ both are the SAME pre-existing refusal — `loadExport`: *"export is resolved for EN, not SC"*. No SC-resolved game-config export exists on disk. They differ by one stack-trace line number and nothing else |
| `suite-backend.txt` | `lando php vendor/bin/phpunit --filter '/^(?!.*AdminShellCoverage).*$/'` tail — 3,238 tests, 3 failures |
| `suite-backend-CLEAN-TREE-same-three.txt` | ⚠️ **the attribution**: the same three files run with the whole change stashed, failing identically |
| `suite-app.txt` | `npm test` tail — 647 suites / 10,802 passed |

The gate invocation used for both EN runs:

```
npx tsx scripts/economy/variantGate.ts \
  --export game-config-en.LIVE.json --starter-config starter-config.LIVE.json \
  --world ~/Downloads/wunderkind-world-2026-11-19.json --country EN
```
