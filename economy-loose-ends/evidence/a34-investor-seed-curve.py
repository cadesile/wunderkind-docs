import json, random, statistics as st
random.seed(12345)
D=json.load(open('/Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-docs/economy-loose-ends/evidence/world-export-2026-11-20.json'))
eng=[c for c in D['clubs'] if (c.get('country') or '').upper()=='EN']
MAXINV={'local':2,'regional':2,'national':2,'elite':2}   # LIVE game-config-en.LIVE.json
def commercial(t): return 'elite' if t<=2 else 'national' if t<=4 else 'regional' if t<=6 else 'local'
def contracts(tier, rep, trials=20000):
    """Mirror of generateNpcInvestorContracts, returning investment as a MULTIPLE of valuation."""
    if tier>3: return [0.0]
    maxInv=MAXINV[commercial(tier)]
    count=max(0,min(maxInv,round((rep/100)*maxInv)))
    if count==0: return [0.0]
    maxEquity = 100 if rep>=75 else 20 if rep>=40 else 10
    out=[]
    for _ in range(trials):
        tot=0.0
        for _ in range(count):
            eq=min(maxEquity, 5+random.random()*(maxEquity-5))
            var=0.7+random.random()*0.6
            tot += (eq/100.0)*var
        out.append(tot)
    return out
BAL={1:500_000_000,2:200_000_000,3:80_000_000,4:30_000_000,5:15_000_000,6:10_000_000,7:5_000_000,8:2_000_000}
byt={}
for c in eng: byt.setdefault(c['tier'],[]).append(c['reputation'])
print(f"{'tier':>4} {'n':>3} {'medRep':>7} {'count':>5} {'maxEq':>6} {'inv/valuation  p10':>20} {'median':>8} {'p90':>8}   {'startBal':>12}")
print('-'*96)
for t in sorted(byt):
    reps=byt[t]; med=st.median(reps)
    allm=[]
    for r in reps: allm+=contracts(t,r,4000)
    allm.sort()
    def q(p): return allm[int(p*(len(allm)-1))]
    maxInv=MAXINV[commercial(t)]
    cnt=max(0,min(maxInv,round((med/100)*maxInv))) if t<=3 else 0
    me=(100 if med>=75 else 20 if med>=40 else 10) if t<=3 else 0
    print(f"{t:>4} {len(reps):>3} {med:>7.1f} {cnt:>5} {me:>6} {q(.10):>20.3f} {st.median(allm):>8.3f} {q(.90):>8.3f}   {'£'+format(BAL[t]//100,','):>12}")
print()
print('Per-club spread at TIER 1 (the discontinuity):')
for c in sorted([c for c in eng if c['tier']==1], key=lambda x:x['reputation'])[:4] + sorted([c for c in eng if c['tier']==1], key=lambda x:-x['reputation'])[:2]:
    m=contracts(1,c['reputation'],4000); r=c['reputation']
    print(f"  rep {r:>3}  maxEquity {100 if r>=75 else 20:>3}  count {max(0,min(2,round(r/100*2)))}  median inv/valuation {st.median(m):.3f}")
