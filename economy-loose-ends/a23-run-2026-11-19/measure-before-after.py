# A23 — the division size, the home-game count and the per-club TV share, under BOTH rules,
# computed off the world export. OLD = authored `league.slots`. NEW = NPC club rows + the
# player's own place at the country's deepest tier (0 for a tier with no rows at all).
import json, sys, collections

d = json.load(open(sys.argv[1]))
rows = collections.Counter()
for c in d['clubs']:
    rows[(c['country'], c['tier'])] += 1

by = collections.defaultdict(list)
for l in d['leagues']:
    by[l['country']].append(l)

def money(p):
    return '-' if p is None else f"£{p/100:,.2f}"

print(f"export {d['exportedAt']} · {len(d['leagues'])} leagues · {len(d['clubs'])} clubs · {len(by)} countries\n")

grand = {}
for cc in sorted(by):
    ls = sorted(by[cc], key=lambda x: x['tier'])
    bottom = max(x['tier'] for x in ls)
    moved = []
    out = []
    for l in ls:
        t, r = l['tier'], rows[(cc, l['tier'])]
        old = l['slots']
        new = 0 if r == 0 else r + (1 if t == bottom else 0)
        og = old - 1 if old > 1 else (r - 1 if r > 1 else None)
        ng = new - 1 if new > 1 else None
        pool = l['tvPoolPence']
        otv = pool // old if (pool is not None and old) else None
        ntv = pool // new if (pool is not None and new) else None
        if old != new:
            moved.append(t)
        out.append((t, r, old, new, og, ng, otv, ntv, pool))
    grand[cc] = moved
    flag = 'UNCHANGED' if not moved else f"MOVES at tiers {moved}"
    print(f"=== {cc} === deepest={bottom} · {flag}")
    print(f"{'t':>2} {'rows':>4} | {'size OLD':>8} {'size NEW':>8} | {'homeG OLD':>9} {'homeG NEW':>9} |"
          f" {'tvDeal OLD':>14} {'tvDeal NEW':>14} | {'pool':>18}")
    for t, r, old, new, og, ng, otv, ntv, pool in out:
        print(f"{t:>2} {r:>4} | {old:>8} {new:>8} | {str(og):>9} {str(ng):>9} |"
              f" {money(otv):>14} {money(ntv):>14} | {money(pool):>18}")
    print()

print("── SUMMARY ─────────────────────────────────────────────")
for cc in sorted(grand):
    print(f"{cc}: {'unchanged at every tier' if not grand[cc] else 'CHANGES at tiers ' + str(grand[cc])}")
unchanged = [c for c in grand if not grand[c]]
print(f"\n{len(unchanged)} of {len(grand)} countries unchanged. "
      f"Changed: {sorted(c for c in grand if grand[c])}")

# The shortfall the old rule produced, per country, per season.
print("\n── The pool each division credited itself under the OLD rule, against the pool authored ──")
for cc in sorted(by):
    ls = sorted(by[cc], key=lambda x: x['tier'])
    bottom = max(x['tier'] for x in ls)
    total = 0
    for l in ls:
        t, r = l['tier'], rows[(cc, l['tier'])]
        pool, old = l['tvPoolPence'], l['slots']
        if pool is None or not old:
            continue
        recipients = r + (1 if t == bottom else 0)   # NPC clubs + the player's own club
        total += pool - (pool // old) * recipients
    if total:
        print(f"{cc}: {money(total)} a season reached nobody")
