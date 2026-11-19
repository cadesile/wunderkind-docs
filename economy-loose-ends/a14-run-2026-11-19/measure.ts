/**
 * A14 measurement — the starting fan base and the season shirt income it pays, BEFORE (the
 * tier-absolute band published today) and AFTER (catchment × share). Scratch; lives outside
 * both repositories.
 *
 * Inputs, all real:
 *   - starter-config.LIVE.json : the LIVE `fanBaseRanges` (absolute headcounts)
 *   - game-config-en.LIVE.json : `economyTierBaseline.tiers[].ticketPricePence` → shirt price
 *   - world.json               : every NPC club's ACTUAL `populationSize`, by country and tier
 *
 * Every formula is the app's own: `resolveStartingFanCount`, `shirtSalesFor`,
 * `publishedShirtPricePence`.
 *
 * ⚠️ Shirt price is read from the ENGLAND config, the only per-country export in hand. The
 * backend resolves the ticket ladder per country, so the Scottish MONEY columns are indicative;
 * the Scottish FAN columns are exact (both ladders are keyed on tier alone, with no country
 * level).
 */
import { readFileSync } from 'node:fs';
import { resolveStartingFanCount, REFERENCE_FAN_BASE_SHARE_PERCENT, type FanBaseLadder } from '@/economy/fanBase';
import { shirtSalesFor, publishedShirtPricePence, DEFAULT_FAN_MORALE, SHIRT_MANUFACTURING_MIDPOINT } from '@/economy/shirtSales';
import { registerConfigSource } from '@/utils/configSource';
import type { GameConfig } from '@/types/gameConfig';

const APP = '/Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-app';

const rawCfg = JSON.parse(readFileSync(`${APP}/game-config-en.LIVE.json`, 'utf8'));
const cfg = (rawCfg.data ?? rawCfg.config ?? rawCfg) as GameConfig;
registerConfigSource(() => cfg);

const starter = JSON.parse(readFileSync(`${APP}/starter-config.LIVE.json`, 'utf8')) as {
  fanBaseRanges?: FanBaseLadder;
};
const LIVE_ABSOLUTE = starter.fanBaseRanges;
if (!LIVE_ABSOLUTE) throw new Error('REFUSED: no fanBaseRanges in the live starter config.');

type XClub = { country: string; tier: number; populationSize?: number | null };
const world = JSON.parse(readFileSync(`${APP}/world.json`, 'utf8')) as { exportedAt?: string; clubs: XClub[] };

/** The world-club fallback band, as `fanStore` uses it. */
const WORLD_FALLBACK = { min: 500, max: 2000 };

const money = (p: number) => `£${(p / 100).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
const n = (x: number) => Math.round(x).toLocaleString('en-GB');

/** Fan count at a given roll. `undefined` share ladder = today's behaviour. */
const fansNow = (tier: number, roll: number) =>
  resolveStartingFanCount({ tier, population: null, absoluteRanges: LIVE_ABSOLUTE, absoluteFallback: WORLD_FALLBACK, random: () => roll });

const fansNew = (tier: number, population: number, roll: number) =>
  resolveStartingFanCount({
    tier, population, sharePercent: REFERENCE_FAN_BASE_SHARE_PERCENT,
    absoluteRanges: LIVE_ABSOLUTE, absoluteFallback: WORLD_FALLBACK, random: () => roll,
  });

/** One season of shirt income, at the fan store's own seeded morale and the midpoint cost. */
const shirtGross = (tier: number, fanCount: number) =>
  shirtSalesFor({
    fanCount, morale: DEFAULT_FAN_MORALE,
    shirtPricePence: publishedShirtPricePence(tier, cfg),
    manufacturingRate: SHIRT_MANUFACTURING_MIDPOINT,
  }).grossPence;

const quantile = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]!;

console.log(`A14 measurement — world ${world.exportedAt}, ${world.clubs.length} clubs`);
console.log(`morale ${DEFAULT_FAN_MORALE}, manufacturing midpoint ${SHIRT_MANUFACTURING_MIDPOINT}\n`);

// ── 1. The real population distribution, by country and tier ────────────────────────────────
console.log('── 1. REAL populationSize per country/tier (admin world export) ──');
console.log('country tier    n        min       p25    median       p75         max');
for (const country of ['EN', 'SC']) {
  for (const tier of [1, 8]) {
    const pops = world.clubs
      .filter((c) => c.country === country && c.tier === tier && typeof c.populationSize === 'number' && c.populationSize! > 0)
      .map((c) => c.populationSize!)
      .sort((a, b) => a - b);
    if (pops.length === 0) { console.log(`${country}      ${tier}       0  — no clubs with a population`); continue; }
    console.log(
      `${country}      ${tier}   ${String(pops.length).padStart(4)} ${n(pops[0]!).padStart(10)} ${n(quantile(pops, 0.25)).padStart(9)} ` +
      `${n(quantile(pops, 0.5)).padStart(9)} ${n(quantile(pops, 0.75)).padStart(9)} ${n(pops[pops.length - 1]!).padStart(11)}`,
    );
  }
}

// ── 2. Today's fan base and shirt income ────────────────────────────────────────────────────
console.log('\n── 2. TODAY (tier-absolute, country-blind) ──');
console.log('tier   fans min      fans max   shirt price   season shirts @min   season shirts @max');
for (const tier of [1, 8]) {
  const lo = fansNow(tier, 0);
  const hi = fansNow(tier, 0.999999);
  console.log(
    `  ${tier}  ${n(lo).padStart(10)} ${n(hi).padStart(13)} ${money(publishedShirtPricePence(tier, cfg)).padStart(13)} ` +
    `${money(shirtGross(tier, lo)).padStart(20)} ${money(shirtGross(tier, hi)).padStart(20)}`,
  );
}

// ── 3. The ladder, at the brief's three populations and at the real median ──────────────────
const SIZES: { label: string; pop: number }[] = [
  { label: 'small  20,000', pop: 20_000 },
  { label: 'medium 100,000', pop: 100_000 },
  { label: 'large  1,000,000', pop: 1_000_000 },
];

console.log('\n── 3. AFTER (catchment × reference share ladder) ──');
console.log('tier  share%      population        fans min     fans max   shirts @min      shirts @max    multiple vs today (mid)');
for (const tier of [1, 8]) {
  const band = REFERENCE_FAN_BASE_SHARE_PERCENT[String(tier)]!;
  const nowMid = (fansNow(tier, 0) + fansNow(tier, 0.999999)) / 2;
  for (const { label, pop } of SIZES) {
    const lo = fansNew(tier, pop, 0);
    const hi = fansNew(tier, pop, 0.999999);
    const mid = (lo + hi) / 2;
    console.log(
      `  ${tier}  ${String(band.min).padStart(2)}–${String(band.max).padStart(2)}%  ${label.padStart(16)} ${n(lo).padStart(13)} ${n(hi).padStart(12)} ` +
      `${money(shirtGross(tier, lo)).padStart(14)} ${money(shirtGross(tier, hi)).padStart(16)}      ${(mid / nowMid).toFixed(3)}×`,
    );
  }
}

// ── 4. The same, at each country/tier's OWN median population ───────────────────────────────
console.log('\n── 4. AFTER, at each country/tier\'s own MEDIAN population ──');
console.log('country tier   median pop     fans now (mid)   fans new (mid)   multiple   shirts now (mid)   shirts new (mid)      delta');
for (const country of ['EN', 'SC']) {
  for (const tier of [1, 8]) {
    const pops = world.clubs
      .filter((c) => c.country === country && c.tier === tier && typeof c.populationSize === 'number' && c.populationSize! > 0)
      .map((c) => c.populationSize!)
      .sort((a, b) => a - b);
    if (pops.length === 0) continue;
    const pop = quantile(pops, 0.5);
    const nowMid = Math.round((fansNow(tier, 0) + fansNow(tier, 0.999999)) / 2);
    const newMid = Math.round((fansNew(tier, pop, 0) + fansNew(tier, pop, 0.999999)) / 2);
    const sNow = shirtGross(tier, nowMid);
    const sNew = shirtGross(tier, newMid);
    console.log(
      `${country}      ${tier}  ${n(pop).padStart(11)} ${n(nowMid).padStart(16)} ${n(newMid).padStart(16)} ${(newMid / nowMid).toFixed(3).padStart(10)}× ` +
      `${money(sNow).padStart(18)} ${money(sNew).padStart(18)} ${money(sNew - sNow).padStart(14)}`,
    );
  }
}

// ── 5. Whole-pyramid summary: every tier, at its own median population ──────────────────────
console.log('\n── 5. EVERY TIER (England), at that tier\'s own median population ──');
console.log('tier   median pop   share%    fans now (mid)   fans new (mid)   multiple      shirts now        shirts new');
for (let tier = 1; tier <= 8; tier++) {
  const pops = world.clubs
    .filter((c) => c.country === 'EN' && c.tier === tier && typeof c.populationSize === 'number' && c.populationSize! > 0)
    .map((c) => c.populationSize!)
    .sort((a, b) => a - b);
  if (pops.length === 0) { console.log(`  ${tier}   — no clubs`); continue; }
  const pop = quantile(pops, 0.5);
  const band = REFERENCE_FAN_BASE_SHARE_PERCENT[String(tier)]!;
  const nowMid = Math.round((fansNow(tier, 0) + fansNow(tier, 0.999999)) / 2);
  const newMid = Math.round((fansNew(tier, pop, 0) + fansNew(tier, pop, 0.999999)) / 2);
  console.log(
    `  ${tier}  ${n(pop).padStart(11)}   ${String(band.min).padStart(2)}–${String(band.max).padStart(2)}%  ${n(nowMid).padStart(14)} ${n(newMid).padStart(16)} ` +
    `${(newMid / nowMid).toFixed(3).padStart(9)}× ${money(shirtGross(tier, nowMid)).padStart(17)} ${money(shirtGross(tier, newMid)).padStart(17)}`,
  );
}

// ── 6. The binding threshold: does the fan cap still bite? ──────────────────────────────────
//
// Attendance is min(capacity, capacity × fill, fanCount). The largest buildable ground is
// 4 stands × level 10 × capacityCalculation, and an Elite club fills 0.85 of it — so any fan
// base above that can never constrain attendance at all.
const cc = (cfg as unknown as { capacityCalculation?: number }).capacityCalculation ?? 1000;
console.log(`\n── 6. The attendance-cap binding threshold (capacityCalculation = ${cc}) ──`);
for (const [levels, fill, label] of [[1, 0.35, 'level 1, Local'], [5, 0.70, 'level 5, National'], [10, 0.85, 'level 10, Elite']] as [number, number, string][]) {
  const capacity = 4 * levels * cc;
  console.log(`${label.padEnd(20)} capacity ${n(capacity).padStart(7)}  × fill ${fill}  → binds below ${n(capacity * fill)} fans`);
}
