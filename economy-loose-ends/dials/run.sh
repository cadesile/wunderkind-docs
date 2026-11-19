#!/bin/zsh
#
# run.sh <name> [patch.mjs args…] — patch the gate's inputs, run the variant gate, keep the report.
#
# Outputs land in ./runs/<name>/ (game-config.json, world.json, gate.txt). Nothing in either
# repo is touched: the gate reads the patched copies from there.
#
# The two candidates derived on 2026-11-18 (see ../REMAINING-WORK.md §2) reproduce with:
#
#   SIX='scouting_center|scout_fleet|imaging_suite|player_wellbeing|nutrition_centre|technical_zone'
#
#   # Candidate B — turnover follows income, grounds as generated
#   ./run.sh cand-b --exclude "7:$SIX,8:$SIX" --wage-scale-follow \
#     --turnover 28800000000,9950000000,3010000000,1800000000,636000000,382000000,104000000,71800000
#
#   # Candidate C, AS CHOSEN and in its authorable form — dial 3 in (smaller bottom-tier grounds),
#   # with the nine exclusions on BOTH tiers 7 and 8, because `npcFacilityLevelRanges` is keyed by
#   # band and cannot hold a tier-8-only row. This is the run `candidate-c-rollout.md` pins.
#   NINE="$SIX|youth_academy|trial_pitch|car_park"
#   ./run.sh cand-c-authorable --exclude "7:$NINE,8:$NINE" \
#     --stand-band 7:0-1,8:0-1 --wage-scale-follow \
#     --turnover 28800000000,9950000000,3010000000,1800000000,636000000,382000000,59600000,36100000
#
#   # Candidate C as first derived (six exclusions at tier 7, nine at tier 8) — kept because it is
#   # what §2e's table holds; tier 7 is £602,000 there against £596,000 authorable, a 1% difference.
#   ./run.sh cand-c --exclude "7:$SIX,8:$SIX|youth_academy|trial_pitch|car_park" \
#     --stand-band 7:0-1,8:0-1 --wage-scale-follow \
#     --turnover 28800000000,9950000000,3010000000,1800000000,636000000,382000000,60200000,36100000
#
# Both must print COVERAGE 97.x% at every tier, "COVERAGE outside 85-110%: none", a flat 60.0%
# AUTHORED wage share, and PASS. A run that prints anything else is the finding.
#
set -u
D=$(cd "$(dirname "$0")" && pwd)
APP=${APP:-/Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-app}
NAME=$1; shift
OUT=$D/runs/$NAME

source ~/.nvm/nvm.sh >/dev/null 2>&1; nvm use >/dev/null 2>&1   # the gate needs the pinned Node
node $D/patch.mjs --app $APP --out $OUT "$@"

cd $APP
# ⚠️ `|| true` — the gate EXITS NON-ZERO ON FAIL, which is the whole point of it. Without this
# a FAIL would abort the script before the report it just wrote could be read.
npx tsx scripts/economy/variantGate.ts --export $OUT/game-config.json \
  --starter-config starter-config.LIVE.json --world $OUT/world.json --country EN > $OUT/gate.txt 2>&1 || true

echo "--- COVERAGE ($NAME)"
sed -n '/tier |     TV |/,/COVERAGE outside/p' $OUT/gate.txt
echo "--- the three verdicts"
sed -n '/tier | AUTHORED/,/insolvent once FLIPPED/p' $OUT/gate.txt | tail -12
echo "--- wages vs upkeep"
sed -n '/wages vs upkeep/,/AUTHORED wage share spans/p' $OUT/gate.txt | head -14
echo "--- season 1, FLIPPED (what the game runs today)"
sed -n '/FLIPPED — incomeAnchoredWages ON/,/tiers generating/p' $OUT/gate.txt
tail -4 $OUT/gate.txt
