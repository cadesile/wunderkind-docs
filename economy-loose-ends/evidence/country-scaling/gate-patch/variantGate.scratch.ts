/**
 * THE VARIANT GATE — revenue is what the engine pays, not what the table authors.
 *
 *   npx tsx scripts/economy/variantGate.ts \
 *     --export <game-config?country=EN> --starter-config <starter-config> \
 *     --world <world-export> [--country EN] [--position 10]
 *
 * ## Why a second gate rather than a flag on the first
 *
 * The release gate credits every tier its full authored `turnoverPence` every season, and the
 * wage model is anchored to that same figure — so the two agree by construction and the gate
 * can never see a club that cannot earn what it is budgeted. **This run substitutes the revenue
 * line and nothing else**: the same wage model, the same upkeep, the same renewals, the same
 * seeds. A difference between the two verdicts is attributable to that one substitution.
 *
 * Both are reported side by side on purpose. Neither alone is the answer — the authored run
 * says whether the TABLE is coherent, this one says whether the GAME pays for it.
 *
 * ## ⚠️ Three things to read every verdict against
 *
 * 1. **This is a FLOOR on income.** `investor_income`, `pyramid_distribution`, `win_bonus`,
 *    `fan_initiative`, `manufacturing`, `dividend_draw`, `tournament_prize` and
 *    `guardian_payment` are not modelled. A tier failing here might still pay in the game; a
 *    tier passing here certainly can.
 * 2. **The insolvency ladder's EFFECTS are still not modelled.** A balance goes negative and
 *    the run carries on — no points deduction, no forced sale, no administration. So "insolvent
 *    in season 3" means "the arithmetic goes negative in season 3", not "the club is wound up".
 * 3. **Transfers, matchday variance and player decisions remain absent**, as in the first gate.
 */
import { readFileSync } from 'node:fs';
import { runHarness, seededRng } from '../../src/economy/harness/simulate';
import { ENGLAND_DEV, type TierFixture } from '../../src/economy/harness/fixtures';
import { loadEconomyExport, type StarterConfigExport } from '../../src/economy/harness/loadExport';
import { deepestTierForCountry, groundsByTier, homeGamesForLeague, leagueFinancials, type WorldExport } from '../../src/economy/harness/worldExport';
import { modelledSeasonIncome, totalIncomePence, OMITTED_INCOME_LINES } from '../../src/economy/harness/modelledIncome';
import { sponsorSeasonPence } from '../../src/economy/harness/flows';
import type { FacilityTemplate } from '../../src/types/facility';
import { registerConfigSource } from '../../src/utils/configSource';
import { recommendPricing } from '../../src/utils/pricingAdvice';
import { publishedTicketPricePence, sponsorBandConfigForTier } from '../../src/economy/perTierEconomy';
import { publishedShirtPricePence, FALLBACK_SHIRT_PRICE_PENCE } from '../../src/economy/shirtSales';
import { DEFAULT_GAME_CONFIG, type GameConfig } from '../../src/types/gameConfig';

const argOf = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const gbp = (p: number) => `${p < 0 ? '-' : ''}£${Math.abs(Math.round(p / 100)).toLocaleString('en-GB')}`;
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

const exportPath = argOf('export');
const starterPath = argOf('starter-config');
const worldPath = argOf('world');
const country = argOf('country') ?? 'EN';
/** Where the modelled club finishes. Mid-table by default — a champion is not the typical club. */
const FINISH = Number(argOf('position') ?? 10);

if (!exportPath || !starterPath || !worldPath) {
  console.error('\nREFUSED: --export, --starter-config and --world are all required.');
  console.error('  --export         GET /api/game-config?country=EN   (scale, TV, templates)');
  console.error('  --starter-config GET /api/starter-config           (the bands that price players)');
  console.error('  --world          a world export                    (the REAL ground per tier)');
  console.error('\n  Without a world export the ground would be the inferred one, and matchday income');
  console.error('  and upkeep would then describe two different stadiums. That is not a gate.');
  process.exit(1);
}

const cfg = JSON.parse(readFileSync(exportPath, 'utf8')) as GameConfig;

// ── ⚠️ Give the income path the REAL config, not `DEFAULT_GAME_CONFIG` ───────────────────────
//
// `computeMatchdayRevenue` reads `liveConfig()` for two things, and in a headless run with no
// Zustand registered that returns the shipped defaults. Both mattered:
//
//  · **`capacityCalculation` — 1000 by default, 1250 live.** No stand in the export carries a
//    `seatsPerLevel` override, so `standSeatsPerLevel` falls through to the config figure —
//    which means every matchday number this gate produced before this line **understated
//    capacity by 20%**. The flow matrix in `flows.ts` was passing 1250 explicitly, so the two
//    halves of the same audit disagreed and the one using the REAL engine function was wrong.
//  · **`matchdayFoodUptakePercent`** — 35 both ways today, but no reason to leave it to luck.
//
// `registerConfigSource` is exactly the seam the `configSource` split created for this: the
// gate is a process with no store, so it supplies the config itself.
// ⚠️ `undefined` means DERIVE, exactly as the live game does since 2026-11-14 — elasticity now
// follows `wageModel` unless explicitly overridden. Passing `false` here by default would have
// made the gate quietly model a DIFFERENT configuration from the one on the device: a turnover
// config runs with elasticity ON in the game and would have run OFF in the gate.
// `--elasticity` / `--no-elasticity` force it, which is how the two are measured apart.
const elasticityArg: boolean | undefined =
  process.argv.includes('--elasticity') ? true
  : process.argv.includes('--no-elasticity') ? false
  : undefined;
registerConfigSource(() => ({
  ...(cfg as unknown as GameConfig),
  // CLI override so a run can measure the flag either way without a backend change.
  ...(elasticityArg === undefined ? {} : { ticketPriceElasticity: elasticityArg }),
}));
const starter = JSON.parse(readFileSync(starterPath, 'utf8')) as StarterConfigExport;
const loaded = loadEconomyExport(cfg, starter, country);
const world = JSON.parse(readFileSync(worldPath, 'utf8')) as WorldExport;
const grounds = groundsByTier(world, country);
const fin = leagueFinancials(world, country);
const ORIG_TV1 = fin.find((l) => l.tier === 1)?.tvDeal ?? 0;
// SCRATCH, NOT IN THE REPO: apply the country factor (in bp) the backend now applies to league money.
// Mutated AFTER RESCALE is computed, so the rescale does not undo it. Unset => no-op.
const LM_BP = Number(process.env.LEAGUE_MONEY_BP ?? 10000);
if (LM_BP !== 10000) {
  const sc = (n: number) => Math.trunc((n * LM_BP) / 10000);
  for (const l of fin as unknown as Array<Record<string, any>>) {
    if (typeof l.tvDeal === 'number') l.tvDeal = sc(l.tvDeal);
    if (typeof l.prizeMoney === 'number') l.prizeMoney = sc(l.prizeMoney);
    if (typeof l.leaguePositionPot === 'number') l.leaguePositionPot = sc(l.leaguePositionPot);
    if (l.parachute?.perSeasonPence) l.parachute.perSeasonPence = l.parachute.perSeasonPence.map((v: number) => sc(v));
  }
}
// ⚠️ THE DEEPEST TIER THIS COUNTRY ACTUALLY HAS, which is where the player's own club goes and
// therefore the one division whose size is its club rows PLUS ONE. See `homeGamesForLeague`.
const deepestTier = deepestTierForCountry(world, country);

// SCRATCH (the TVCORRECTED correction, scotland-gate-remeasure §3): TV from the export's own league row, not England's fixture.
const TIERS: readonly TierFixture[] = loaded.tiers.map((t) => ({ ...t, tvPerClubPence: fin.find((l) => l.tier === t.tier)?.tvDeal ?? t.tvPerClubPence }));
const raw = cfg as unknown as Record<string, number | undefined>;
const templates = ((cfg as unknown as { facilityTemplates?: FacilityTemplate[] }).facilityTemplates ?? []);
const SEASONS = 30;
const RENEWAL_TURNOVER = 1 / 3;
/**
 * ⚠️ **THE LAST RESORT, AND IT MATCHES NOTHING.** The real figure is the division's DERIVED size
 * less one, worked out per tier from the export's club rows through `homeGamesForLeague`.
 *
 * 23 corresponds to a 24-club division and no league on either box is 24: EN derives 16, SC 12.
 * This constant stood in all three gate scripts as the home-game count for every division in
 * every country, which cannot be right for two countries at once. Reached only when a league
 * authors no size AND carries fewer than two club rows.
 */
const HOME_GAMES = 23;

/** The season-ticket share of the ground: both the headcount AND the discount. */
const holderPct = (cfg as unknown as { seasonTicketHolderPercent?: number })
  .seasonTicketHolderPercent ?? DEFAULT_GAME_CONFIG.seasonTicketHolderPercent;

/**
 * The fan base a tier's shirt line is priced off — the MIDPOINT of the authored band.
 *
 * ⚠️ `fanBaseRanges` is keyed by TIER ALONE, with no country level, unlike `leagueAbilityRanges`
 * in the same export. A `[country][tier]` lookup here silently misses and prices every shirt
 * line at zero, which would read as "shirts are negligible" rather than as a bug.
 */
const fanCountFor = (tier: number): number => {
  const band = starter.fanBaseRanges?.[String(tier)];
  if (!band) return 0;
  return Math.round((band.min + band.max) / 2);
};

/**
 * The shirt price a tier charges — the published ticket price times the authored ratio, which
 * is exactly what the game now charges both the player's club and every NPC.
 *
 * Deliberately NOT derived from `priceFor`, which models a flat worst-case ticket price for the
 * elasticity question. The shirt price the game uses follows the PUBLISHED ladder whatever a
 * club chooses to charge at the turnstile, so tying the two would make a worst-case ticket
 * assumption leak into an unrelated line.
 */
const shirtPriceFor = (tier: number): number =>
  publishedShirtPricePence(tier, cfg) || FALLBACK_SHIRT_PRICE_PENCE;
/**
 * ⚠️ **A FLAT price for every tier, which is the app's default and the worst case.**
 *
 * `recommendPricing` already advises £15 / £20 / £30 / £50 by reputation band, so a club on the
 * flat default is at r = 1.67 at the bottom and r = 0.50 at the top. With
 * `ticketPriceElasticity` on, that mispricing is exactly what gets charged for — so a run at
 * this price measures a pyramid in which NOBODY adjusts. `--advised-price` measures the other
 * end: every club charging what it is told to, where r = 1 and the elasticity is a no-op.
 */
const TICKET_PRICE_PENCE = 2500;
const useAdvisedPrice = process.argv.includes('--advised-price');
const FOOD_PRICE_PENCE = 800;

if (templates.length === 0) {
  console.error('\nREFUSED: the export carries no facilityTemplates, so no ground can be priced.');
  process.exit(1);
}

// ── League financials: the one input that must be rescaled, and said to be ───────────────
//
// The world export's league money pre-dates the dev re-authoring — its tier-1 `tvDeal` is
// £500,000,000 against the live £136,000,000. The SHAPE of the ladder survives a re-authoring;
// the LEVELS do not. So prize and position money are rescaled by the tvDeal ratio and the
// rescaling is printed, rather than either using stale figures or dropping the lines entirely.
// ⚠️ **This is the weakest input in the run.** A fresh authenticated GET /api/initialize/leagues
// removes the need for it, and until then every prize/position figure below carries this caveat.
const exportTv1 = ORIG_TV1;
const liveTv1 = TIERS.find((t) => t.tier === 1)?.tvPerClubPence ?? 0;
const RESCALE = 1; // SCRATCH: export league money is the device's money (§3); no rescale is warranted
const decreasePct = raw.leaguePositionDecreasePercent ?? 5;
const ANCHOR = (t: number) => (t <= 2 ? 87 : t <= 4 ? 57 : t <= 6 ? 27 : 7);
const REP_NAME = (t: number) => (t <= 2 ? 'Elite' : t <= 4 ? 'National' : t <= 6 ? 'Regional' : 'Local');
/**
 * The price a tier actually charges in this run.
 *
 * Declared AFTER `REP_NAME` rather than beside its flag: it closes over it, and while the
 * arrow body resolves at call time either way, a reader should not have to work that out.
 */
const priceFor = (tier: number): number => {
  // THE DIVISION'S PUBLISHED PRICE WINS, IN BOTH MODES, because it IS the price the live game
  // charges: when the backend publishes a `ticketPricePence` above 0 a club STARTS there, and
  // the elasticity term inside `modelledSeasonIncome` measures against that same figure. A run
  // that charged the flat default instead would be measuring a pyramid the app cannot build.
  //
  // ⚠️ **This line used to read `useAdvisedPrice ? published : TICKET_PRICE_PENCE`, which is
  // what the comment above it already said it should not.** The default mode therefore charged
  // a flat £25 against a published £80 advice — a 0.31 price ratio that no club in the live
  // game has ever had — and under-reported tier-1 coverage by roughly 8 points. The comment was
  // correct and the code was not; this is the code catching up (owner decision 2, 2026-11-15).
  //
  // What `--advised-price` still distinguishes is the UNAUTHORED tail below: with nothing
  // published for a tier, the flag is the difference between "every club charges what the
  // reputation ladder advises" (r = 1, elasticity a no-op) and "nobody adjusts off the app
  // default". On a fully authored backend the two modes now agree, which is correct rather
  // than a bug — there is only one price the game will actually run.
  const published = publishedTicketPricePence(tier, cfg as GameConfig);
  if (published > 0) return published;

  return useAdvisedPrice ? recommendPricing(REP_NAME(tier), 60).ticket : TICKET_PRICE_PENCE;
};
/** `npcTierToCommercialRepString` — the map the commercial lookups use since Q8. */
const COMMERCIAL = (t: number) => (t <= 2 ? 'elite' : t <= 4 ? 'national' : t <= 6 ? 'regional' : 'local');
/**
 * The sponsor bands for one division.
 *
 * ⚠️ **Per tier since 2026-11-15, and that is the point of this change.** This used to be a
 * single `BANDS` built from the six flat `raw.smallSponsorMin`-style keys — one band for every
 * division in the world, which is exactly the defect the per-tier rows fix: measured in the
 * app, club plus league sponsorship came to 175% of tier-8 authored turnover against 1.2% at
 * tier 1, because tier 8 drew from tier 1's pot.
 *
 * `sponsorBandConfigForTier` resolves the published rows and falls back to those same flat keys
 * per band half, so a run against a backend that has authored nothing prints what it printed
 * before. **It changes what this gate READS, not what it decides** — the verdict still follows
 * the FLIPPED column.
 */
const bandsFor = (tier: number): { small: [number, number]; medium: [number, number]; large: [number, number] } => {
  const b = sponsorBandConfigForTier(
    {
      smallSponsorMin: raw.smallSponsorMin ?? 0,
      smallSponsorMax: raw.smallSponsorMax ?? 0,
      mediumSponsorMin: raw.mediumSponsorMin ?? 0,
      mediumSponsorMax: raw.mediumSponsorMax ?? 0,
      largeSponsorMin: raw.largeSponsorMin ?? 0,
      largeSponsorMax: raw.largeSponsorMax ?? 0,
    },
    tier,
    cfg as GameConfig,
  );

  return {
    small: [b.smallSponsorMin, b.smallSponsorMax],
    medium: [b.mediumSponsorMin, b.mediumSponsorMax],
    large: [b.largeSponsorMin, b.largeSponsorMax],
  };
};
const maxSponsors = (cfg as unknown as { maxSponsorsByTier?: Record<string, number> }).maxSponsorsByTier ?? {};

const groundFor = (t: TierFixture) => {
  const g = grounds.find((x) => x.tier === t.tier);
  if (!g) {
    throw new Error(
      `No ground for tier ${t.tier} in the world export. Refusing rather than falling back to `
      + 'the inferred ground, which would make this tier incomparable with the rest.',
    );
  }
  return { templates, levels: g.levels, clubs: g.clubs, clubCount: g.clubCount };
};

// ⚠️ **Memoised per tier, and that is a correctness statement as much as a speed one.**
// `incomeFor` returns BASE-YEAR lines which `runHarness` inflates downstream, so its result is
// season-INVARIANT — recomputing it per season produced 30 identical answers per tier. With
// three runs over eight tiers that is 720 calls where 8 would do, each one pricing 18 clubs
// through `computeMatchdayRevenue`; the third run tipped it into a 1.8GB heap death before a
// single line of output. Caching makes the invariance explicit rather than incidental.
const incomeCache = new Map<number, ReturnType<typeof computeIncomeFor>>();
const incomeFor = (t: TierFixture) => {
  const hit = incomeCache.get(t.tier);
  if (hit) return hit;
  const lines = computeIncomeFor(t);
  incomeCache.set(t.tier, lines);
  return lines;
};

const computeIncomeFor = (t: TierFixture) => {
  const { clubs, clubCount } = groundFor(t);
  const league = fin.find((l) => l.tier === t.tier);
  // ⚠️ THE DIVISION'S DERIVED SIZE, LESS ONE — not a constant, and not the club rows either.
  //
  // This read `clubCount`, the export's club ROWS, which is one game too high wherever the rows
  // fill the division and exactly right at the deepest tier (where the generator reserves the
  // player's place). Right where anyone would check it, wrong at the other seven tiers. The
  // double round-robin gives `size − 1`; `homeGamesForLeague` owns the derivation and the
  // reasoning. ⚠️ It read the export's authored `slots` until 2026-11-19, when the owner retired
  // that column — so the size now comes from the rows plus the player's place at the deepest
  // tier, which is the backend's own rule. On Scotland that is 11 home games, not the 13 the
  // authored 14 gave.
  const homeGames = homeGamesForLeague(clubCount, t.tier === deepestTier, HOME_GAMES);
  // Position money declines `decreasePct` per place below first; the flat prize is 1st only.
  const posMultiplier = Math.max(0, 1 - (decreasePct / 100) * (FINISH - 1));
  // The league sponsor pot is not authored as an amount: the backend rolls one draw per
  // league-sponsor row off the same bands club sponsors use. `sponsorCount` is in the export.
  const leagueSponsor = sponsorSeasonPence({
    anchorReputation: ANCHOR(t.tier),
    sponsorCount: league?.sponsorCount ?? 0,
    bands: bandsFor(t.tier),
  });
  // ── Matchday is averaged over the tier's CLUBS, not computed once from mean levels ──
  //
  // `computeMatchdayRevenue` is not linear in level — the facility-income term bends and
  // upkeep's sibling `1.5^level` has a hard zero at 0 — so the bill of the mean ground is not
  // the mean of the bills. At the bottom of the pyramid, where most clubs hold a facility at 0
  // and a few hold it at 1, the two differ by about 1.9x. Averaging results is the only
  // version that answers "what does a club at this tier actually earn".
  const matchday = clubs.reduce((sum, levels) => sum + modelledSeasonIncome({
    tvPerClubPence: 0, templates, levels,
    reputation: ANCHOR(t.tier), reputationTier: REP_NAME(t.tier),
    ticketPricePence: priceFor(t.tier), foodDrinksPricePence: FOOD_PRICE_PENCE,
    homeGames, clubSponsorPence: 0, leagueSponsorPence: 0,
    // Shirts and season tickets — the two corrections that had to land together. See
    // `modelledSeasonIncome`: omitting shirts understated bottom-tier income by more than the
    // authored turnover, while charging every seat full face price overstated the ticket half
    // of matchday by 1/0.79. Either alone makes this model less accurate than both wrong.
    fanCount: fanCountFor(t.tier), shirtPricePence: shirtPriceFor(t.tier),
    seasonTicketHolderPercent: holderPct,
    // The division, so the elasticity term inside `modelledSeasonIncome` measures this price
    // against the division's own published advice rather than the reputation ladder's guess.
    leagueTier: t.tier,
    prizePence: 0, positionPence: 0,
  }).matchday!, 0) / Math.max(1, clubs.length);

  // Shirts do not vary by ground, so they are computed once rather than averaged over clubs.
  const shirt = modelledSeasonIncome({
    tvPerClubPence: 0, templates, levels: {},
    reputation: ANCHOR(t.tier), reputationTier: REP_NAME(t.tier),
    ticketPricePence: priceFor(t.tier), foodDrinksPricePence: FOOD_PRICE_PENCE,
    homeGames, clubSponsorPence: 0, leagueSponsorPence: 0, leagueTier: t.tier,
    prizePence: 0, positionPence: 0,
    fanCount: fanCountFor(t.tier), shirtPricePence: shirtPriceFor(t.tier),
    seasonTicketHolderPercent: holderPct,
  }).shirt!;

  return {
    tv: t.tvPerClubPence,
    matchday,
    shirt,
    clubSponsors: sponsorSeasonPence({
      anchorReputation: ANCHOR(t.tier),
      sponsorCount: maxSponsors[COMMERCIAL(t.tier)] ?? 2,
      bands: bandsFor(t.tier),
    }),
    leagueSponsors: leagueSponsor,
    prize: FINISH === 1 ? Math.round((league?.prizeMoney ?? 0) * RESCALE) : 0,
    position: Math.round((league?.leaguePositionPot ?? 0) * RESCALE * posMultiplier),
  };
};

const common = {
  seasons: SEASONS, model: 'turnover' as const, includeUpkeep: true,
  renewalTurnoverRate: RENEWAL_TURNOVER, tiers: TIERS, groundFor,
};

const authored = runHarness({ ...common, rng: seededRng(20261113) });
const modelled = runHarness({ ...common, revenue: 'modelled', incomeFor, rng: seededRng(20261113) });
// ── N6: the third run — the state AFTER `incomeAnchoredWages` is flipped ────────────────────
//
// Modelled revenue AND an income-anchored bill. This is the pair that is supposed to agree:
// income decides the budget and the budget decides the wages, so the two sides of the club's
// accounts are drawn from one figure instead of two that were never reconciled.
const flipped = runHarness({
  ...common, revenue: 'modelled', incomeFor, wageAnchor: 'income', rng: seededRng(20261113),
});

// ── Report ───────────────────────────────────────────────────────────────────────────────
console.log('='.repeat(92));
console.log('THE VARIANT GATE — authored turnover vs the income the engine pays');
console.log(`SOURCE: ${loaded.country} · ${TIERS.length} tiers · ${SEASONS} seasons · REAL grounds from the world export`);
console.log(`Modelled club finishes ${FINISH}${FINISH === 1 ? 'st' : FINISH === 2 ? 'nd' : FINISH === 3 ? 'rd' : 'th'} — pass --position to change it`);
console.log(`capacityCalculation ${(cfg as unknown as { capacityCalculation?: number }).capacityCalculation} (from the export, NOT the app default)`
  + ` · ticketPriceElasticity ${
      elasticityArg === undefined
        ? `${(cfg as unknown as { economyTierBaseline?: { wageModel?: string } }).economyTierBaseline?.wageModel === 'turnover' ? 'ON' : 'off'} (derived from wageModel)`
        : elasticityArg ? 'ON (--elasticity)' : 'off (--no-elasticity)'
    }`
  + ` · ticket price ${ticketPriceLabel()}`);
console.log('BOTH runs use the same wage model, upkeep, renewals and seed. Only the revenue line differs.');
console.log('='.repeat(92));

/**
 * How this run priced tickets, said accurately.
 *
 * ⚠️ **This label used to read a flat "flat £25 (the app default)" whenever `--advised-price`
 * was absent**, which stopped being true the moment `priceFor` started honouring the published
 * price in both modes. A run that misstates its own inputs is the same defect as a run that uses
 * the wrong ones — it is just harder to catch, because the number it prints looks deliberate.
 *
 * So the label is derived from what `priceFor` actually returns, per tier, rather than from the
 * flag alone: PUBLISHED when every tier is authored, the flag's own meaning when none is, and an
 * explicit mixed form when a backend is only partly authored.
 */
function ticketPriceLabel(): string {
  const tiers = TIERS.map((t) => t.tier);
  const authored = tiers.filter((t) => publishedTicketPricePence(t, cfg as GameConfig) > 0);
  const fallback = useAdvisedPrice ? 'AT ADVICE per tier (--advised-price)' : 'flat £25 (the app default)';

  if (authored.length === 0) return fallback;
  if (authored.length === tiers.length) {
    return `PUBLISHED per tier, ${(publishedTicketPricePence(tiers[0], cfg as GameConfig) / 100).toFixed(0)}`
      + `-${(publishedTicketPricePence(tiers[tiers.length - 1], cfg as GameConfig) / 100).toFixed(0)} GBP`
      + ' (the price the live game charges, both modes)';
  }
  return `PUBLISHED for tiers ${authored.join(', ')}; the rest ${fallback}`;
}

/** A marker, not a decision — see the note under the table. */
const coverageFlag = (c: number): string => (c < 0.85 || c > 1.10 ? '  <-- outside 85-110%' : '');

console.log('\n── Income composition, season 1, as a share of AUTHORED turnover ───────');
console.log('   COVERAGE = modelled income / authored turnover. TARGET 85-110% at every tier.');
console.log('   Outside that band the wage anchor and the revenue model disagree about what a');
console.log('   division is worth: under 85% every club is poorer than its own wage bill assumes,');
console.log('   over 110% the authored turnover has stopped being the thing wages are priced from.');
console.log('tier |     TV | matchday |  shirt | club spon | league spon |  prize | position || COVERAGE');
for (const t of TIERS) {
  const lines = incomeFor(t);
  const sh = (v: number) => pct(v / t.turnoverPence).padStart(6);
  console.log(
    `  ${String(t.tier).padEnd(2)} | ${sh(lines.tv!)} | ${sh(lines.matchday!).padStart(8)}`
    + ` | ${sh(lines.shirt!).padStart(6)}`
    + ` | ${sh(lines.clubSponsors!).padStart(9)} | ${sh(lines.leagueSponsors!).padStart(11)}`
    + ` | ${sh(lines.prize!)} | ${sh(lines.position!).padStart(8)}`
    + ` || ${pct(totalIncomePence(lines) / t.turnoverPence).padStart(6)}`
    + `${coverageFlag(totalIncomePence(lines) / t.turnoverPence)}`,
  );
}

const outsideCoverage = TIERS.filter((t) => {
  const c = totalIncomePence(incomeFor(t)) / t.turnoverPence;
  return c < 0.85 || c > 1.10;
}).map((t) => t.tier);
console.log(`\n  COVERAGE outside 85-110%: ${outsideCoverage.length ? outsideCoverage.join(', ') : 'none'}`);
console.log('  ⚠️ REPORTED, NOT A VERDICT. The verdict still follows the FLIPPED column below —');
console.log('     coverage says whether the revenue model and the authored ladder agree about a');
console.log('     division, which is a different question from whether a club stays solvent.');

console.log('\n── N6: THE THREE VERDICTS ──────────────────────────────────────────────');
console.log('  AUTHORED   = today: the gate credits authored turnover and budgets off it too');
console.log('  MODELLED   = the problem: real income, wages still anchored to authored turnover');
console.log('  FLIPPED    = Option 1: real income, wages anchored to THAT income');
console.log('\ntier | AUTHORED              | MODELLED              | FLIPPED');
console.log('     | bill% | insolvent     | bill% | insolvent     | bill% | insolvent | balance @ s30');
for (let i = 0; i < TIERS.length; i++) {
  const a = authored.tiers[i]!, m = modelled.tiers[i]!, f = flipped.tiers[i]!;
  const ins = (r: typeof a) => (r.firstInsolventSeason === null ? 'never' : `season ${r.firstInsolventSeason}`);
  const sh = (r: typeof a) => pct(r.seasons[0]!.wageShare);
  console.log(
    `  ${String(a.tier).padEnd(2)} | ${sh(a).padStart(5)} | ${ins(a).padStart(13)}`
    + ` | ${sh(m).padStart(5)} | ${ins(m).padStart(13)}`
    + ` | ${sh(f).padStart(5)} | ${ins(f).padStart(9)} | ${gbp(f.finalBalancePence).padStart(15)}`,
  );
}

const fFail = flipped.tiers.filter((t) => t.firstInsolventSeason !== null).map((t) => t.tier);
console.log(`\n  insolvent once FLIPPED: ${fFail.length ? fFail.join(', ') : 'none'}`);
console.log('  ⚠️ Read the FLIPPED column over the whole run, not season 1. `renewalTurnoverRate`');
console.log('     converges a re-anchored bill over about three seasons, which is the');
console.log('     grandfathering decision — a club over-committed in season 1 is expected.');

// ── The bill, SPLIT ─────────────────────────────────────────────────────────────────────────
//
// `bill%` above is wages PLUS upkeep over revenue, and collapsing the two is what let a
// phantom "1.27x wage calibration mismatch" stand in the economy docs for days: the wage half
// and the upkeep half move in opposite directions down the pyramid, so their sum hides both.
// Printed per arm because the denominators differ — authored turnover on the first, modelled
// income on the other two.
console.log('\n── The same bill, split — wages vs upkeep (season 1) ───────────────────');
console.log('     |      AUTHORED      |      MODELLED      |      FLIPPED');
console.log('tier | wages | upkeep     | wages | upkeep     | wages | upkeep');
for (let i = 0; i < TIERS.length; i++) {
  const row = (r: (typeof authored)['tiers'][number]) => {
    const s0 = r.seasons[0]!;
    return `${pct(s0.totalWagesPence / s0.revenuePence).padStart(5)} | ${pct(s0.upkeepPence / s0.revenuePence).padStart(6)}`;
  };
  console.log(
    `  ${String(authored.tiers[i]!.tier).padEnd(2)} | ${row(authored.tiers[i]!)}`
    + `     | ${row(modelled.tiers[i]!)}     | ${row(flipped.tiers[i]!)}`,
  );
}
const wagesOnly = (r: (typeof authored)['tiers'][number]) =>
  r.seasons[0]!.totalWagesPence / r.seasons[0]!.revenuePence;
const aw = authored.tiers.map(wagesOnly);
console.log(`\n  AUTHORED wage share spans ${pct(Math.min(...aw))} - ${pct(Math.max(...aw))}`
  + ` (spread ${((Math.max(...aw) - Math.min(...aw)) * 100).toFixed(1)} points).`);
console.log('  ⚠️ A FLAT wage share across the pyramid is the authored table being internally');
console.log('     consistent. If this row is flat, any published "wage calibration mismatch" was');
console.log('     between two DOCUMENTS, not inside the config.');

console.log('\n── The two original verdicts, for reference ────────────────────────────');
console.log('     |      AUTHORED REVENUE       ||      MODELLED REVENUE');
console.log('tier | bill% | insolvent | balance || bill% | insolvent |        balance');
const variantFailures: number[] = [];
for (let i = 0; i < TIERS.length; i++) {
  const a = authored.tiers[i]!;
  const m = modelled.tiers[i]!;
  if (m.firstInsolventSeason !== null) variantFailures.push(m.tier);
  const s = (r: typeof a) => ({
    share: pct(r.seasons[0]!.wageShare),
    ins: r.firstInsolventSeason === null ? 'never' : `season ${r.firstInsolventSeason}`,
  });
  const A = s(a), M = s(m);
  console.log(
    `  ${String(a.tier).padEnd(2)} | ${A.share.padStart(5)} | ${A.ins.padStart(9)} | ${gbp(a.finalBalancePence).padStart(7).slice(0, 15).padStart(15)}`
    + ` || ${M.share.padStart(5)} | ${M.ins.padStart(9)} | ${gbp(m.finalBalancePence).padStart(14)}`,
  );
}

// ── F5.5: the first two seasons, both arms ────────────────────────────────────────────────
//
// The 30-season columns above answer "does this tier survive", which is a different question
// from "what happens at the START". A rescue fires on exactly one condition — `club.balance < 0`
// at season end (`NpcRescueService.rescueInsolventNpcClubs`) — so the early seasons ARE the
// rescue forecast, and they were already in the harness results and never printed.
//
// ⚠️ **BOTH arms, and the SECOND one is today. This was recorded backwards until 2026-11-16.**
//
// The old note here said `incomeAnchoredWages` is absent from the live export and that
// `resolveEconomy` reads an absent key as false, so MODELLED was the present and FLIPPED the
// destination. The first half is true and the second is not. `economyConfig.ts` resolves
// `config.incomeAnchoredWages ?? (baseline?.wageModel === 'turnover')` — an absent key DERIVES
// from the wage model rather than defaulting to false, because the backend has no admin surface
// for a standalone boolean. The live export carries `wageModel: 'turnover'`, so the flag
// resolves TRUE, and a device confirms it: the Economy Workings panel reads
// "income-anchored wages ON".
//
// So FLIPPED is what the game runs today and MODELLED is the arm it has already left. The
// correction matters because the two were being read the wrong way round when deciding which
// tiers need attention.
//
// The irony worth keeping: the original note warns against reasoning from `wageModel: turnover`
// because it "is a different switch". It is the same switch — the derivation is written in
// `economyConfig.ts` and pinned by `economyConfigIntake.test.ts`. This gate already derives
// `ticketPriceElasticity` from that exact expression a few lines above; only this flag was
// missed.
//
// ⚠️ **A PER-TIER representative club, not a population.** The harness models one club per tier
// finishing in a fixed position, so "insolvent" means a typical club there ends the season in
// the red, not that every club does. Read it as which tiers generate rescues and how close to
// the line they sit — never as a count of clubs.
const earlySeasons = (r: typeof modelled, label: string) => {
  console.log(`\n── F5.5: first two seasons — ${label} ${'─'.repeat(Math.max(0, 34 - label.length))}`);
  console.log('tier |   s1 income |     s1 bill | s1 bill% | s1 balance | s2 balance | rescue?');
  const triggered: number[] = [];
  for (const t of r.tiers) {
    const s1 = t.seasons[0];
    const s2 = t.seasons[1];
    if (!s1) continue;
    const fires = (s1.balancePence < 0) || (!!s2 && s2.balancePence < 0);
    if (fires) triggered.push(t.tier);
    console.log(
      `  ${String(t.tier).padEnd(2)} | ${gbp(s1.revenuePence).padStart(11)}`
      + ` | ${gbp(s1.totalWagesPence).padStart(11)}`
      + ` | ${pct(s1.wageShare).padStart(8)}`
      + ` | ${gbp(s1.balancePence).padStart(10)}`
      + ` | ${(s2 ? gbp(s2.balancePence) : '—').padStart(10)}`
      + ` | ${fires ? 'YES' : 'no'}`,
    );
  }
  console.log(`  tiers generating rescues in seasons 1-2: ${triggered.length ? triggered.join(', ') : 'none'}`);
};
earlySeasons(modelled, 'MODELLED (wages on authored turnover — NOT what runs today)');
earlySeasons(flipped, 'FLIPPED — incomeAnchoredWages ON, WHAT THE GAME RUNS TODAY');
console.log('  ⚠️ `bill%` is the WHOLE recurring bill (player + staff wages + upkeep) over MODELLED');
console.log('     income — not a wage share, and not comparable to the authored-revenue columns.');
console.log('  ⚠️ Every cost here is a FLOOR: no transfers, no matchday variance, no injury load,');
console.log('     and the balance starts at ZERO rather than at the club\'s authored opening cash.');

// ── F5.4: a relegated club, two seasons, with the parachute ───────────────────────────────
//
// The question is "does the wage bill converge without a spiral", and it has no harness: the
// dispersion gate states outright that promotion and relegation are absent, so no club ever
// leaves its tier. Rather than build a second simulation, this traces the one club analytically
// — which is enough, because the convergence is a single recurrence and the parachute is a
// published schedule.
//
//   w(0)   = the bill the club carries DOWN, priced at the division it just left
//   w(k)   = w(k-1) + (target - w(k-1)) x renewalTurnoverRate
//   target = the same wage ratio against the NEW division's authored turnover
//
// ⚠️ **The bill cannot spiral, and the reason is structural rather than a tuning result.**
// `renewalTurnoverRate` moves a fixed share of the squad to the new division's prices every
// season, so w(k) is a geometric approach to `target` from above — monotonic, never divergent.
// What the parachute changes is not whether it converges but whether the club is SOLVENT while
// it does, which is the only thing worth reporting here.
//
// ⚠️ **NOT today's anchor.** This trace runs wages on AUTHORED turnover while income is
// modelled — the MODELLED arm. The note here used to call that "today's anchor" on the grounds
// that an absent `incomeAnchoredWages` is false; it derives from `wageModel: 'turnover'` and
// resolves TRUE, so the live anchor is income (see the correction above the F5.5 table). The
// mismatch traced below is therefore a measurement of the arm the game has LEFT, which is still
// worth having as the pessimistic bound — but it is not a forecast of the live pyramid.
console.log('\n── F5.4: relegation, two seasons, with the parachute ───────────────────');
console.log('w(0) = the bill carried down · target = the same ratio at the new tier');
console.log('from→to |       w(0) |     w(s1) |     w(s2) | parachute s1 | s1 balance | s2 balance');
const WAGE_RATIO = (raw.wageToTurnoverRatioBp ?? 6000) / 10_000;
const parachuteFor = (tier: number): number[] => {
  const lg = world.leagues?.find((l) => l.country === country && l.tier === tier);
  const p = (lg as unknown as { parachute?: { perSeasonPence?: number[] } } | undefined)?.parachute;
  return p?.perSeasonPence ?? [];
};
for (let from = 1; from <= TIERS.length - 1; from++) {
  const to = from + 1;
  const a = TIERS.find((x) => x.tier === from);
  const b = TIERS.find((x) => x.tier === to);
  if (!a || !b) continue;

  const w0 = a.turnoverPence * WAGE_RATIO;
  const target = b.turnoverPence * WAGE_RATIO;
  const w1 = w0 + (target - w0) * RENEWAL_TURNOVER;
  const w2 = w1 + (target - w1) * RENEWAL_TURNOVER;

  const income = totalIncomePence(incomeFor(b));
  const chute = parachuteFor(to);
  const bal1 = income + (chute[0] ?? 0) - w1;
  const bal2 = bal1 + income + (chute[1] ?? 0) - w2;

  console.log(
    `   ${from}→${to}   | ${gbp(w0).padStart(10)} | ${gbp(w1).padStart(9)} | ${gbp(w2).padStart(9)}`
    + ` | ${gbp(chute[0] ?? 0).padStart(12)} | ${gbp(bal1).padStart(10)} | ${gbp(bal2).padStart(10)}`,
  );
}
console.log('  ⚠️ The bill ALWAYS converges — w(k) approaches the target geometrically from');
console.log('     above, by construction. A negative balance here is an income problem at the');
console.log('     destination tier, never a wage spiral.');

console.log('\n── What the substitution changed ───────────────────────────────────────');
const aFail = authored.tiers.filter((t) => t.firstInsolventSeason !== null).map((t) => t.tier);
const mFail = modelled.tiers.filter((t) => t.firstInsolventSeason !== null).map((t) => t.tier);
console.log(`  insolvent on AUTHORED revenue: ${aFail.length ? aFail.join(', ') : 'none'}`);
console.log(`  insolvent on MODELLED revenue: ${mFail.length ? mFail.join(', ') : 'none'}`);
const brokenByModelling = mFail.filter((t) => !aFail.includes(t));
const rescued = aFail.filter((t) => !mFail.includes(t));
if (brokenByModelling.length) console.log(`  ⚠️ FAIL only once income is modelled: tiers ${brokenByModelling.join(', ')}`);
if (rescued.length) console.log(`  ✅ pass only once income is modelled: tiers ${rescued.join(', ')}`);

console.log('\n── Caveats that travel with this verdict ───────────────────────────────');
console.log('  · A FLOOR on income. Not modelled, and so absent from every figure above:');
for (const l of OMITTED_INCOME_LINES) console.log(`      ${l}`);
console.log('  · The insolvency ladder has NO EFFECTS in this sim: a negative balance is recorded');
console.log('    and the run continues. "Insolvent in season N" means the arithmetic goes negative,');
console.log('    not that the club is wound up or deducted points.');
console.log('  · Transfers, matchday variance and the player\'s own decisions are absent.');
console.log(`  · Prize and position money are rescaled by ${RESCALE.toFixed(3)}x — the tier-1 tvDeal ratio`);
console.log('    between the world export and live. THIS IS THE WEAKEST INPUT IN THE RUN; a fresh');
console.log('    authenticated GET /api/initialize/leagues removes the need for it entirely.');
console.log('  · AUTHORED and MODELLED both anchor wages to AUTHORED turnover — that mismatch is');
console.log('    the thing being measured. Only FLIPPED anchors them to the income it credits.');

console.log('\n' + '='.repeat(92));
// ── The verdict follows the FLIPPED run, not the modelled one ───────────────────────────────
//
// The modelled column failing at tiers 1-5 is the DIAGNOSIS, not the thing to gate on: it is
// the state today, it is why Option 1 exists, and a gate that failed on it would fail for as
// long as the problem it describes is unfixed — which is how a red gate stops being read.
//
// The flipped column is the destination, so that is what has to be green before the flag is
// turned on. The modelled failures are reported above it either way.
if (fFail.length > 0) {
  console.log(`VARIANT GATE: FAIL — tiers ${fFail.join(', ')} still insolvent once wages follow income`);
  console.log('  (modelled-revenue failures above are the DIAGNOSIS, not this verdict)');
  console.log('='.repeat(92));
  process.exit(1);
}
console.log('VARIANT GATE: PASS — every tier solvent for 30 seasons once wages follow income');
// The diagnosis line only makes sense when there IS a diagnosis. It used to print
// "tiers none cannot pay their bills ... That is the case FOR flipping the flag" on a run where
// nothing failed, which states the opposite of what the run found and reads as a bug in the gate.
if (variantFailures.length > 0) {
  console.log(`  diagnosis, unchanged: tiers ${variantFailures.join(', ')} cannot pay their bills while`);
  console.log('  wages stay anchored to authored turnover. That is the case FOR flipping the flag.');
} else {
  console.log('  no diagnosis: every tier pays its bills on modelled revenue too, so this run is');
  console.log('  not itself an argument for flipping the flag.');
}
console.log('='.repeat(92));
