/**
 * Dial patcher — writes patched copies of game-config / world for a gate run.
 *
 * It NEVER writes into the repo: both outputs land in --out.
 *
 * Dials:
 *   1  --turnover  t1,..,t8   pence, authored season turnover
 *   2  --payout-ratio r       prize = pot = r x that tier's own turnover (backend 5dc3f51b: 0.2573)
 *      --payout-keep          leave world.json's prize/pot exactly as exported (the stale ladder)
 *   3  --stand-band t:min-max,...   per-STAND level band for a tier's clubs (uniform, deterministic)
 *   4  --exclude   t:slug|slug,...  facilities a tier's clubs do not hold at all
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const has = (n) => process.argv.includes(`--${n}`);

const APP = arg('app', '/Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-app');
const OUT = arg('out');
const COUNTRY = arg('country', 'EN');
if (!OUT) { console.error('REFUSED: --out <dir> is required.'); process.exit(1); }
mkdirSync(OUT, { recursive: true });

const cfg = JSON.parse(readFileSync(join(APP, 'game-config-en.LIVE.json'), 'utf8'));
const world = JSON.parse(readFileSync(join(APP, 'world.json'), 'utf8'));

// ── dial 1 ───────────────────────────────────────────────────────────────────────────────
const turnover = arg('turnover');
const base0 = cfg.economyTierBaseline.tiers.map((r) => r.turnoverPence);
let vals0 = base0;
if (turnover) {
  const vals = turnover.split(',').map((x) => Math.round(Number(x)));
  if (vals.length !== cfg.economyTierBaseline.tiers.length) {
    console.error(`REFUSED: --turnover has ${vals.length} values for ${cfg.economyTierBaseline.tiers.length} tiers.`);
    process.exit(1);
  }
  cfg.economyTierBaseline.tiers.forEach((row, i) => { row.turnoverPence = vals[i]; });
  vals0 = vals;
}
const T = Object.fromEntries(cfg.economyTierBaseline.tiers.map((r) => [r.tier, r.turnoverPence]));

// ── dial 1's dependent: the wage scale ──────────────────────────────────────────────────
// `wageScaleMicroPence` was calibrated so the authored wage bill is ~60% of authored turnover.
// Re-authoring turnover without it leaves the AUTHORED arm pricing season-1 squads off the old
// ladder, which the gate shows as the 60.0% row going non-flat.
if (has('wage-scale-follow')) {
  if (!turnover) { console.error('REFUSED: --wage-scale-follow needs --turnover.'); process.exit(1); }
  cfg.economyTierBaseline.tiers.forEach((row, i) => {
    row.wageScaleMicroPence = Math.round(row.wageScaleMicroPence * (vals0[i] / base0[i]));
  });
}

// ── dial 2 ───────────────────────────────────────────────────────────────────────────────
// The authored ladder is "r x each tier's OWN turnover", so it is re-derived from whatever
// dial 1 just wrote — which is the property the backend's ppm table only holds at a snapshot.
const ratio = Number(arg('payout-ratio', '0.2573'));
if (!has('payout-keep')) {
  for (const l of world.leagues ?? []) {
    if (l.country !== COUNTRY || !T[l.tier]) continue;
    l.prizeMoney = Math.round(T[l.tier] * ratio);
    l.leaguePositionPot = Math.round(T[l.tier] * ratio);
  }
}

// ── dials 3 and 4 ────────────────────────────────────────────────────────────────────────
const STANDS = ['north_stand', 'south_stand', 'east_stand', 'west_stand'];
const bands = new Map();
for (const part of (arg('stand-band') ?? '').split(',').filter(Boolean)) {
  const [t, range] = part.split(':');
  const [min, max] = range.split('-').map(Number);
  bands.set(Number(t), { min, max });
}
const excludes = new Map();
for (const part of (arg('exclude') ?? '').split(',').filter(Boolean)) {
  const [t, slugs] = part.split(':');
  excludes.set(Number(t), new Set(slugs.split('|')));
}

// Deterministic uniform spread over the band: club i, stand j takes min + ((i*4+j) mod span).
// A real generation draw is uniform per facility, so the tier MEAN is the band midpoint either
// way; cycling just removes the seed from the answer.
const perTierIndex = new Map();
for (const c of world.clubs ?? []) {
  if (c.country !== COUNTRY || !c.facilities) continue;
  const i = perTierIndex.get(c.tier) ?? 0;
  perTierIndex.set(c.tier, i + 1);

  const band = bands.get(c.tier);
  if (band) {
    const span = band.max - band.min + 1;
    STANDS.forEach((slug, j) => {
      if (!(slug in c.facilities)) return;
      c.facilities[slug] = band.min + ((i * STANDS.length + j) % span);
    });
  }
  const drop = excludes.get(c.tier);
  if (drop) for (const slug of drop) delete c.facilities[slug];
}

writeFileSync(join(OUT, 'game-config.json'), JSON.stringify(cfg));
writeFileSync(join(OUT, 'world.json'), JSON.stringify(world));

// ── what was written, so a run can never misreport its own inputs ───────────────────────
const stats = (tier) => {
  const cs = (world.clubs ?? []).filter((c) => c.country === COUNTRY && c.tier === tier);
  const standTot = cs.map((c) => STANDS.reduce((s, g) => s + (c.facilities?.[g] ?? 0), 0));
  const mean = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  return { clubs: cs.length, standMean: mean(standTot).toFixed(2), keys: cs[0] ? Object.keys(cs[0].facilities).length : 0 };
};
console.log(`PATCHED -> ${OUT}`);
console.log('tier |      turnover | prize = pot | stands/club | facility keys');
for (const row of cfg.economyTierBaseline.tiers) {
  const l = (world.leagues ?? []).find((x) => x.country === COUNTRY && x.tier === row.tier);
  const s = stats(row.tier);
  console.log(`  ${row.tier}  | ${String(Math.round(row.turnoverPence / 100).toLocaleString('en-GB')).padStart(13)} `
    + `| ${String(Math.round((l?.prizeMoney ?? 0) / 100).toLocaleString('en-GB')).padStart(11)} `
    + `| ${s.standMean.padStart(11)} | ${s.keys}`);
}
