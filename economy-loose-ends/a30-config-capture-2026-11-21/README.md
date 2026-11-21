# Live `GET /api/game-config` capture — 2026-11-21, A30

Captured by the A30 session against **`api.dev.buildmyclub.co.uk`** on 2026-11-21, all three in
the same minute, so the figures in them are directly comparable to one another:

| file | request |
|---|---|
| `game-config-en.LIVE.json` | `GET /api/game-config?country=EN` |
| `game-config-sc.LIVE.json` | `GET /api/game-config?country=SC` |
| `game-config-nocountry.LIVE.json` | `GET /api/game-config` (the const fallback) |

**Why these are here rather than only in a scratchpad.**
`economy-reference.md` §2064 records that *"Scotland has never been gate-measured and cannot be on
any machine here"*, because `loadExport.assertCountryResolved` refuses an EN-resolved config with
`--country SC` and every config captured to date was EN — and that **one** authenticated
`GET /api/game-config?country=SC` saved as `game-config-sc.LIVE.json` unblocks the whole gate
suite. This is that file. Whether to run the SC gate with it is the PM's call, not A30's.

**What they measure** (`economyTierBaseline`, pasted from the files themselves):

```
EN  country 'EN'  wageModel turnover  tierCount 8  rows 8
      t1 1269725639  t2 1031522690  t3 949061019  t4 925730138
      t5  829701212  t6  850090181  t7 821051954  t8 928521647   (all resolvable: true)
SC  country 'SC'  wageModel turnover  tierCount 4  rows 4
      t1  126972564  t2  103152269  t3  94906102  t4  92573014   (all resolvable: true)
NONE country null  wageModel turnover  tierCount 8  rows 8
      t1  847206430  t2  387311996  t3 159757285  t4 138884770
      t5   83195802  t6   59670217  t7  35619298  t8  27554524   (all resolvable: true)
```

Three things in there are load-bearing for A30 and are easy to lose:

1. **EN t1 ÷ SC t1 = 10.000** and **EN t8 ÷ SC t4 = 10.030.** Those are the two ratios the A30
   defect produced, and they are a property of this publish, not of the app.
2. **Every SC row is `resolvable: true` under `wageModel: 'turnover'`**, so `resolveEconomy`
   returns `fallbackReason: 'none'` at every tier Scotland publishes. A `LEGACY` reading on a
   Scottish save is therefore never a `fallbackReason` — see the A30 report.
3. **The no-country fallback is NOT a scaled copy of England.** Its ladder declines far more
   steeply (t8 27,554,524, under a third of SC t4), so a save built on the fallback would be too
   CHEAP at the bottom, not 10× too dear. That is what rules the fallback out as A30's cause.

⚠️ These are a snapshot of **dev** on one day. Re-capture rather than reconcile against them.
