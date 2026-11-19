/**
 * A12 measurement — NPC weekly income and season budget, before and after the
 * home-games correction. Scratch; lives outside both repositories.
 *
 * Inputs, all real:
 *   - game-config-en.LIVE.json  : facility templates, per-tier ticket price, sponsor bands,
 *                                 weeksPerSeason, authored turnover
 *   - world.json / world.2148.json : every club's ACTUAL facility levels, reputation, balance
 *
 * Every formula is the app's own: computeMatchdayRevenue, computeNpcFacilityUpkeep,
 * npcWeeklyIncomePence, deriveClubBudget, weeksRunway, solvencyBand.
 */
import { readFileSync } from 'node:fs';
import { computeMatchdayRevenue } from '@/utils/matchdayIncome';
import { calculateFacilityUpkeep } from '@/utils/facilityUpkeep';
import { npcWeeklyIncomePence, weeksRunway, solvencyBand, resolveSolvencyThresholds } from '@/economy/npcSolvency';
import { deriveClubBudget } from '@/economy/clubBudget';
import { resolveEconomy } from '@/economy/economyConfig';
import { advisedTicketPricePence } from '@/economy/perTierEconomy';
import { recommendPricing } from '@/utils/pricingAdvice';
import { getClubReputationTier } from '@/utils/clubReputation';
import { sponsorSeasonPence } from '@/economy/harness/flows';
import { WAGE_TO_TURNOVER_BP } from '@/economy/harness/fixtures';
import type { FacilityTemplate } from '@/types/facility';
import type { GameConfig } from '@/types/gameConfig';

const APP = '/Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-app';
const raw = JSON.parse(readFileSync(`${APP}/game-config-en.LIVE.json`, 'utf8'));
const cfg = (raw.data ?? raw.config ?? raw) as GameConfig;
const templates = ((cfg as unknown as { facilityTemplates?: FacilityTemplate[] }).facilityTemplates ?? []);
if (templates.length === 0) throw new Error('REFUSED: no facilityTemplates in the live config.');

type XClub = { country: string; tier: number; reputation?: number; balance?: number; facilities?: Record<string, number> | null };
type XLeague = { country: string; tier: number; tvDeal?: number | null; slots?: number | null };
const loadWorld = (p: string) => JSON.parse(readFileSync(p, 'utf8')) as { exportedAt?: string; clubs: XClub[]; leagues?: XLeague[] };

const WORLDS = {
  'world.json (2026-11-18 22:00, newest)': `${APP}/world.json`,
  'world.2148.json (2026-11-18 21:48)':    '/Users/courtneyadesile/Documents/WunderkindFactory/docs/economy-loose-ends/pre-r2-exports/world.2148.json',
};

const gbp = (p: number) => `£${(p / 100).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

/** Matchday income for ONE home game, the figure `computeNpcMatchdayIncome` produces. */
function matchdayPerGame(club: XClub): number {
  const levels = club.facilities ?? {};
  const conditions: Record<string, number> = {};
  for (const t of templates) conditions[t.slug] = 100;
  const reputationTier = getClubReputationTier(club.reputation ?? 0);
  const fanMorale = 60; // `computeNpcMatchdayIncome`'s own default when no fan record exists
  const ticketPence = advisedTicketPricePence({ leagueTier: club.tier, reputationTier, fanMorale, config: cfg });
  return computeMatchdayRevenue({
    templates,
    levels: levels as never,
    conditions: conditions as never,
    reputation: club.reputation ?? 0,
    reputationTier,
    ticketPricePence: ticketPence,
    foodDrinksPricePence: recommendPricing(reputationTier, fanMorale).food,
    prepaidSeats: 0,
    fanMorale,
    leagueTier: club.tier,
  }).totalPence;
}

const repStringFor = (tier: number) => tier <= 1 ? 'elite' : tier <= 2 ? 'national' : tier <= 3 ? 'regional' : 'local';
const maxSponsors = (cfg as unknown as { maxSponsorsByTier?: Record<string, number> }).maxSponsorsByTier ?? {};

/** The club's own weekly sponsor income, from the live per-tier bands at its own reputation. */
function sponsorWeeklyPence(club: XClub, weeks: number): number {
  const tierRow = (cfg.economyTierBaseline?.tiers ?? []).find((t: any) => t.tier === club.tier) as any;
  const b = tierRow?.sponsorBandsPence ?? cfg.economyTierBaseline?.sponsorBandsPence;
  if (!b) return 0;
  const bands = {
    small:  [b.small?.min ?? 0,  b.small?.max ?? 0]  as [number, number],
    medium: [b.medium?.min ?? 0, b.medium?.max ?? 0] as [number, number],
    large:  [b.large?.min ?? 0,  b.large?.max ?? 0]  as [number, number],
  };
  const season = sponsorSeasonPence({
    anchorReputation: club.reputation ?? 0,
    sponsorCount: maxSponsors[repStringFor(club.tier)] ?? 2,
    bands,
  });
  return Math.round(season / weeks);
}

/**
 * VERBATIM copy of `computeNpcFacilityUpkeep` (`src/utils/npcFinances.ts`). Inlined only
 * because that module imports `useFanStore`, which pulls react-native into a node process.
 */
function computeNpcFacilityUpkeep(tpls: FacilityTemplate[], levels: Record<string, number>): number {
  return tpls.reduce((sum, t) => {
    const level = levels[t.slug] ?? 0;
    return level > 0 ? sum + calculateFacilityUpkeep(t, level) : sum;
  }, 0);
}

const THRESHOLDS = resolveSolvencyThresholds((cfg as any).npcSolvencyThresholds);

interface Row {
  country: string; tier: number; name: string;
  weeks: number; homeBefore: number; homeAfter: number;
  matchday: number; sponsorWeekly: number; tvSeason: number;
  upkeepWeekly: number; wageSeason: number; balance: number;
}

function assess(r: Row, homeGames: number) {
  const weekly = npcWeeklyIncomePence({
    sponsorPence: r.sponsorWeekly,
    matchdayPerHomeGamePence: r.matchday,
    homeGamesPerSeason: homeGames,
    seasonalPence: r.tvSeason,
    weeksPerSeason: r.weeks,
  });
  const budget = deriveClubBudget({
    season: 1,
    incomePence: weekly * r.weeks,
    projectedWagePence: r.wageSeason,
    projectedUpkeepPence: r.upkeepWeekly * r.weeks,
  });
  const runway = weeksRunway(r.balance, weekly, Math.round(r.wageSeason / r.weeks) + r.upkeepWeekly);
  return { weekly, budget, runway, band: solvencyBand(runway, THRESHOLDS) };
}

for (const [label, path] of Object.entries(WORLDS)) {
  const world = loadWorld(path);
  console.log('\n' + '='.repeat(100));
  console.log(`WORLD EXPORT: ${label}   exportedAt=${world.exportedAt}`);
  console.log('='.repeat(100));

  for (const country of ['EN', 'SC'] as const) {
    const clubs = world.clubs.filter((c) => c.country === country);
    const rowsPerTier = new Map<number, XClub[]>();
    for (const c of clubs) {
      if (!rowsPerTier.has(c.tier)) rowsPerTier.set(c.tier, []);
      rowsPerTier.get(c.tier)!.push(c);
    }
    const deepest = Math.max(...rowsPerTier.keys());

    console.log(`\n${country}: club rows per tier  ${JSON.stringify(
      Object.fromEntries([...rowsPerTier.entries()].sort((a, b) => a[0] - b[0]).map(([t, cs]) => [t, cs.length])),
    )}`);
    console.log(`${country}: authored slots       ${JSON.stringify(
      Object.fromEntries((world.leagues ?? []).filter((l) => l.country === country).sort((a, b) => a.tier - b.tier).map((l) => [l.tier, l.slots])),
    )}`);

    for (const tier of [1, deepest]) {
      const cs = rowsPerTier.get(tier) ?? [];
      if (cs.length === 0) continue;
      // The AMP's own league (the deepest tier at world generation) has the player's reserved
      // place, so its participants are rows + 1. Every other division's are its rows.
      const participants = cs.length + (tier === deepest ? 1 : 0);
      const homeAfter = participants - 1;
      const weeks = resolveEconomy(cfg, tier).weeksPerSeason;
      const tierRow = (cfg.economyTierBaseline?.tiers ?? []).find((t: any) => t.tier === tier) as any;
      const tvSeason = (world.leagues ?? []).find((l) => l.country === country && l.tier === tier)?.tvDeal ?? 0;
      const wageSeason = Math.round(((tierRow?.turnoverPence ?? 0) * WAGE_TO_TURNOVER_BP) / 10_000);

      const built: Row[] = cs.map((c) => ({
        country, tier, name: (c as any).name ?? '?',
        weeks, homeBefore: 23, homeAfter,
        matchday: matchdayPerGame(c),
        sponsorWeekly: sponsorWeeklyPence(c, weeks),
        tvSeason,
        upkeepWeekly: computeNpcFacilityUpkeep(templates, c.facilities ?? {}),
        wageSeason,
        balance: c.balance ?? 0,
      })).sort((a, b) => a.matchday - b.matchday);

      const rep = built[Math.floor(built.length / 2)]!;   // median by matchday income
      const before = assess(rep, 23);
      const after = assess(rep, homeAfter);

      console.log(`\n── ${country} tier ${tier} ─ ${cs.length} rows, ${participants} participants`
        + `${tier === deepest ? ' (AMP league: +1 reserved place)' : ''}`
        + ` → home games ${homeAfter} (was 23)`);
      console.log(`   representative club: median by matchday income of ${built.length} · "${rep.name}"`);
      console.log(`   weeks/season ${weeks} · matchday/home game ${gbp(rep.matchday)} · sponsors ${gbp(rep.sponsorWeekly)}/wk`
        + ` · TV ${gbp(rep.tvSeason)}/season · upkeep ${gbp(rep.upkeepWeekly)}/wk · balance ${gbp(rep.balance)}`);
      const tbl = (k: string, b: number, a: number) =>
        console.log(`   ${k.padEnd(28)} ${gbp(b).padStart(16)} ${gbp(a).padStart(16)}   ${
          b === 0 ? '      —' : pct((a - b) / b).padStart(7)}`);
      console.log(`   ${''.padEnd(28)} ${'BEFORE (23)'.padStart(16)} ${`AFTER (${homeAfter})`.padStart(16)}     change`);
      tbl('weekly income', before.weekly, after.weekly);
      tbl('season income', before.budget.incomePence, after.budget.incomePence);
      tbl('wage share (60%)', before.budget.wageSharePence, after.budget.wageSharePence);
      tbl('wage reservation', before.budget.wageReservationPence, after.budget.wageReservationPence);
      tbl('surplus', before.budget.surplusPence, after.budget.surplusPence);
      console.log(`   overCommitted                ${String(before.budget.overCommitted).padStart(16)} ${String(after.budget.overCommitted).padStart(16)}`);
      console.log(`   solvency runway / band       ${`${before.runway}w ${before.band}`.padStart(16)} ${`${after.runway}w ${after.band}`.padStart(16)}`);

      // ── §3b: how many of this division's clubs change solvency BAND ──────────────
      let flips = 0;
      const detail: string[] = [];
      for (const r of built) {
        const b = assess(r, 23), a = assess(r, homeAfter);
        if (b.band !== a.band) { flips++; detail.push(`${r.name}: ${b.band}→${a.band} (${b.runway}w→${a.runway}w)`); }
      }
      console.log(`   VERDICT FLIPS in this division: ${flips} of ${built.length}`);
      for (const d of detail) console.log(`      ${d}`);

      // ⚠️ The flip count is highly sensitive to the WAGE BILL, which is MODELLED here (60% of
      // authored turnover, `WAGE_TO_TURNOVER_BP`) because no export carries NPC squads. Swept
      // so the owner can see how much of the flip count is the assumption rather than the fix.
      const sweep: string[] = [];
      for (const bp of [4000, 5000, 5500, 6000, 6500, 7000]) {
        let f = 0;
        for (const r of built) {
          const rr = { ...r, wageSeason: Math.round(((tierRow?.turnoverPence ?? 0) * bp) / 10_000) };
          if (assess(rr, 23).band !== assess(rr, homeAfter).band) f++;
        }
        sweep.push(`${bp / 100}%:${f}`);
      }
      console.log(`   flips vs modelled wage share  ${sweep.join('  ')}`);
    }
  }
}
