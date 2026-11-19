#!/usr/bin/env python3
"""
A18 §4 — what the authored catchment share ladder produces against today's absolute bands.

Inputs, both read-only and both EXPORTS of the deployed box (never a fallback constant):
  wunderkind-app/world.json              — every NPC club's real populationSize (admin world export)
  .../pre-r2-exports/starter-config.LIVE.json — the LIVE, admin-edited absolute fanBaseRanges

Model, copied from the app half (wunderkind-app/src/economy/fanBase.ts:resolveStartingFanCount):
  share  = band.min + roll * (band.max - band.min)        # roll uniform [0,1)
  fans   = max(1, floor(population * share / 100))
A club with no population takes the ABSOLUTE path, so it is excluded from the ladder columns.
"""
import json, statistics, sys

APP   = '/Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-app'
DOCS  = '/Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-docs/economy-loose-ends'

LADDER = {  # the authored default (A18 §2)
    1: (60, 70), 2: (49, 59), 3: (40, 49), 4: (33, 41),
    5: (27, 34), 6: (22, 29), 7: (18, 24), 8: (15, 20),
}
CAP = 42_500   # above this, attendance stops being demand-limited (50,000 seats x 0.85 Elite fill)

world = json.load(open(f'{APP}/world.json'))
live  = json.load(open(f'{DOCS}/pre-r2-exports/starter-config.LIVE.json'))['fanBaseRanges']

print(f"A18 measurement — world export {world['exportedAt']}, {len(world['clubs'])} clubs")
print(f"ladder: " + "  ".join(f"t{t}={a}-{b}%" for t,(a,b) in LADDER.items()))
print(f"today:  " + "  ".join(f"t{t}={live[str(t)]['min']:,}-{live[str(t)]['max']:,}" for t in range(1,9)))
print()

def fans(pop, share):
    return max(1, int(pop * share / 100))

summary = {}
for country in ('EN','SC'):
    print(f"── {country} — ladder fan count per club, at the band MIDPOINT share ──")
    print(f"{'tier':>4} {'n':>3} {'share%':>8} {'mean':>10} {'min':>9} {'max':>10} "
          f"{'today mid':>10} {'xtoday':>7} {'>42.5k':>7} {'today>42.5k':>12}")
    for tier in range(1,9):
        pops = [c.get('populationSize') or 0 for c in world['clubs']
                if c.get('country')==country and c.get('tier')==tier]
        known = [p for p in pops if p > 0]
        lo, hi = LADDER[tier]
        mid = (lo+hi)/2
        f = [fans(p, mid) for p in known]
        today_mid = (live[str(tier)]['min'] + live[str(tier)]['max'])/2
        summary[(country,tier)] = dict(n=len(pops), known=len(known), mean=sum(f)/len(f),
                                       mn=min(f), mx=max(f), today=today_mid,
                                       above=sum(1 for x in f if x > CAP))
        s = summary[(country,tier)]
        print(f"{tier:>4} {len(pops):>3} {f'{lo}-{hi}':>8} {s['mean']:>10,.0f} {s['mn']:>9,} "
              f"{s['mx']:>10,} {today_mid:>10,.0f} {s['mean']/today_mid:>7.2f} "
              f"{s['above']:>3}/{len(f):<3} {(f'{len(f)}/{len(f)}' if live[str(tier)]['min']>CAP else f'0/{len(f)}'):>12}")
        if len(known) != len(pops):
            print(f"{'':>4} {'':>3}  ⚠ {len(pops)-len(known)} club(s) with no population — absolute path, excluded above")
    t1, t8 = summary[(country,1)], summary[(country,8)]
    print(f"  spread tier1:tier8 on MEANS  = {t1['mean']/t8['mean']:.1f}:1   "
          f"(today {t1['today']/t8['today']:.1f}:1)")
    print(f"  x today, range across tiers  = "
          f"{min(summary[(country,t)]['mean']/summary[(country,t)]['today'] for t in range(1,9)):.3f}"
          f" – {max(summary[(country,t)]['mean']/summary[(country,t)]['today'] for t in range(1,9)):.3f}")
    print()

print("── the full envelope: the band EDGES, not the midpoint ──")
print(f"{'country':>7} {'tier':>4} {'fans at min share':>22} {'fans at max share':>22}")
for country in ('EN','SC'):
    for tier in (1,8):
        pops = [c.get('populationSize') or 0 for c in world['clubs']
                if c.get('country')==country and c.get('tier')==tier and (c.get('populationSize') or 0)>0]
        lo, hi = LADDER[tier]
        print(f"{country:>7} {tier:>4} {f'{fans(min(pops),lo):,} – {fans(max(pops),lo):,}':>22} "
              f"{f'{fans(min(pops),hi):,} – {fans(max(pops),hi):,}':>22}")
print()

print("── catchment itself, for the record (is the 19:1 tier gradient there?) ──")
for country in ('EN','SC'):
    for tier in range(1,9):
        pops = [c.get('populationSize') or 0 for c in world['clubs']
                if c.get('country')==country and c.get('tier')==tier]
        k=[p for p in pops if p>0]
        print(f"{country} t{tier}  n={len(pops):<3} mean={sum(k)/len(k):>10,.0f} "
              f"median={statistics.median(k):>9,.0f} min={min(k):>9,} max={max(k):>10,}")
    k1=[c.get('populationSize') or 0 for c in world['clubs'] if c.get('country')==country and c.get('tier')==1]
    k8=[c.get('populationSize') or 0 for c in world['clubs'] if c.get('country')==country and c.get('tier')==8]
    print(f"  {country} mean catchment t1:t8 = "
          f"{(sum(k1)/len(k1))/(sum(x for x in k8 if x>0)/len([x for x in k8 if x>0])):.1f}:1\n")
