/**
 * A17 measurement — what sharing ONE projection does to every NPC club's verdict.
 *
 * Scratch; lives outside both repositories. Structure and inputs follow A12's measure.ts so the
 * two are comparable: the same live config, the same world exports, the same representative-club
 * rule, the same modelled wage bill.
 *
 * Three derivations are compared per club:
 *   OLD_BRAIN  — `min(52, floor(balance / netOutflow))` on the brain's own income term
 *   NEW_BRAIN  — `runwayWeeks(...)`, the projection the player's chart is drawn from
 *   OLD_SELL   — the fire-sale copy: `floor(balance / (wageBill − sponsors))`, no upkeep, no TV
 * plus a TIMED variant: NEW_BRAIN with the seasonal lump placed AT the season boundary rather
 * than amortised into weekly income — the shape a literal reading of "mirror the chart" implies.
 */
import { readFileSync } from 'node:fs';
import { computeMatchdayRevenue } from '@/utils/matchdayIncome';
import { calculateFacilityUpkeep } from '@/utils/facilityUpkeep';
import {
  npcWeeklyIncomePence, npcSolvencyAssessment, solvencyBand, resolveSolvencyThresholds,
  type SolvencyBand,
} from '@/economy/npcSolvency';
import { runwayWeeks } from '@/economy/projection';
import { resolveEconomy } from '@/economy/economyConfig';
import { advisedTicketPricePence } from '@/economy/perTierEconomy';
import { recommendPricing } from '@/utils/pricingAdvice';
import { getClubReputationTier } from '@/utils/clubReputation';
import { sponsorSeasonPence } from '@/economy/harness/flows';
import { WAGE_TO_TURNOVER_BP } from '@/economy/harness/fixtures';
import type { FacilityTemplate } from '@/types/facility';
import type { GameConfig } from '@/types/gameConfig';

const APP = '/Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-app';
const DOCS = '/Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-docs/economy-loose-ends';
const raw = JSON.parse(readFileSync(`${APP}/game-config-en.LIVE.json`, 'utf8'));
const cfg = (raw.data ?? raw.config ?? raw) as GameConfig;
const templates = ((cfg as unknown as { facilityTemplates?: FacilityTemplate[] }).facilityTemplates ?? []);
if (templates.length === 0) throw new Error('REFUSED: no facilityTemplates in the live config.');

type XClub = { name?: string; country: string; tier: number; reputation?: number; balance?: number; facilities?: Record<string, number> | null };
type XLeague = { country: string; tier: number; tvDeal?: number | null; slots?: number | null };
const loadWorld = (p: string) => JSON.parse(readFileSync(p, 'utf8')) as { exportedAt?: string; clubs: XClub[]; leagues?: XLeague[] };

const WORLDS = {
  'world.json (2026-11-18 22:00, newest)': `${APP}/world.json`,
  'world.2148.json (2026-11-18 21:48)':    `${DOCS}/pre-r2-exports/world.2148.json`,
};

const gbp = (p: number) => `£${Math.round(p / 100).toLocaleString('en-GB')}`;

function matchdayPerGame(club: XClub): number {
  const conditions: Record<string, number> = {};
  for (const t of templates) conditions[t.slug] = 100;
  const reputationTier = getClubReputationTier(club.reputation ?? 0);
  const fanMorale = 60;
  const ticketPence = advisedTicketPricePence({ leagueTier: club.tier, reputationTier, fanMorale, config: cfg });
  return computeMatchdayRevenue({
    templates, levels: (club.facilities ?? {}) as never, conditions: conditions as never,
    reputation: club.reputation ?? 0, reputationTier, ticketPricePence: ticketPence,
    foodDrinksPricePence: recommendPricing(reputationTier, fanMorale).food,
    prepaidSeats: 0, fanMorale, leagueTier: club.tier,
  }).totalPence;
}

const repStringFor = (t: number) => t <= 1 ? 'elite' : t <= 2 ? 'national' : t <= 3 ? 'regional' : 'local';
const maxSponsors = (cfg as unknown as { maxSponsorsByTier?: Record<string, number> }).maxSponsorsByTier ?? {};

function sponsorWeeklyPence(club: XClub, weeks: number): number {
  const tierRow = (cfg.economyTierBaseline?.tiers ?? []).find((t: any) => t.tier === club.tier) as any;
  const b = tierRow?.sponsorBandsPence ?? cfg.economyTierBaseline?.sponsorBandsPence;
  if (!b) return 0;
  const season = sponsorSeasonPence({
    anchorReputation: club.reputation ?? 0,
    sponsorCount: maxSponsors[repStringFor(club.tier)] ?? 2,
    bands: {
      small:  [b.small?.min ?? 0,  b.small?.max ?? 0]  as [number, number],
      medium: [b.medium?.min ?? 0, b.medium?.max ?? 0] as [number, number],
      large:  [b.large?.min ?? 0,  b.large?.max ?? 0]  as [number, number],
    },
  });
  return Math.round(season / weeks);
}

/** VERBATIM copy of `computeNpcFacilityUpkeep` — inlined because npcFinances pulls react-native. */
function upkeepOf(tpls: FacilityTemplate[], levels: Record<string, number>): number {
  return tpls.reduce((sum, t) => {
    const level = levels[t.slug] ?? 0;
    return level > 0 ? sum + calculateFacilityUpkeep(t, level) : sum;
  }, 0);
}

const THRESHOLDS = resolveSolvencyThresholds((cfg as any).npcSolvencyThresholds);

/** The pre-change expression, verbatim from `npcSolvency.ts` at c65bfa91. */
function OLD_weeksRunway(balance: number, income: number, outgoings: number, cap = 52): number {
  const netOutflow = Math.max(0, outgoings - income);
  if (netOutflow <= 0) return cap;
  if (balance <= 0) return 0;
  return Math.min(cap, Math.floor(balance / netOutflow));
}

/** The pre-change expression, verbatim from `npcTransferExecutors.ts:177` at c65bfa91. */
function OLD_sellRunway(balance: number, sponsorsOnly: number, wageBill: number): number {
  const netOutflow = Math.max(0, wageBill - sponsorsOnly);
  return Math.min(netOutflow > 0 ? Math.floor(balance / netOutflow) : 52, 52);
}

interface Row {
  name: string; tier: number; weeks: number; homeGames: number;
  matchday: number; sponsorWeekly: number; tvSeason: number;
  upkeepWeekly: number; wageWeekly: number; balance: number;
}

const BANDS: SolvencyBand[] = ['healthy', 'warn', 'crisis', 'folded'];
const tally = () => ({ healthy: 0, warn: 0, crisis: 0, folded: 0 } as Record<SolvencyBand, number>);

function brainIncome(r: Row): number {
  return npcWeeklyIncomePence({
    sponsorPence: r.sponsorWeekly, matchdayPerHomeGamePence: r.matchday,
    homeGamesPerSeason: r.homeGames, seasonalPence: r.tvSeason, weeksPerSeason: r.weeks,
  });
}

/** The brain's verdict, old derivation and new, on identical inputs. */
function verdicts(r: Row, weekInSeason = 1) {
  const income    = brainIncome(r);
  const outgoings = r.wageWeekly + r.upkeepWeekly;

  const oldRunway = OLD_weeksRunway(r.balance, income, outgoings);
  const newRunway = npcSolvencyAssessment({
    balancePence: r.balance, sponsorPence: r.sponsorWeekly,
    matchdayPerHomeGamePence: r.matchday, homeGamesPerSeason: r.homeGames,
    seasonalPence: r.tvSeason, weeksPerSeason: r.weeks,
    weeklyWageBillPence: r.wageWeekly, weeklyUpkeepPence: r.upkeepWeekly,
  }, THRESHOLDS).weeksRunway;

  // TIMED: the seasonal lump at the boundary, out of weekly income — a literal "mirror the
  // player's chart". `weeksRemainingInSeason` from the club's position in its own season.
  const incomeNoTv = npcWeeklyIncomePence({
    sponsorPence: r.sponsorWeekly, matchdayPerHomeGamePence: r.matchday,
    homeGamesPerSeason: r.homeGames, seasonalPence: 0, weeksPerSeason: r.weeks,
  });
  const timedRunway = Math.floor(runwayWeeks({
    currentBalance: r.balance, weeklyIncome: incomeNoTv, weeklyCosts: outgoings,
    seasonEndIncome: r.tvSeason, weeksRemainingInSeason: Math.max(0, r.weeks - weekInSeason),
    perSeasonRecurringLump: r.tvSeason,
  }));

  // The fire-sale copy: sponsors only, wage bill only.
  const sellOld = OLD_sellRunway(r.balance, r.sponsorWeekly, r.wageWeekly);

  return {
    income, outgoings,
    old:   { runway: oldRunway,   band: solvencyBand(oldRunway,   THRESHOLDS) },
    new:   { runway: newRunway,   band: solvencyBand(newRunway,   THRESHOLDS) },
    timed: { runway: timedRunway, band: solvencyBand(timedRunway, THRESHOLDS) },
    sellOld, sellNew: newRunway,
  };
}

/** Which discount tier `runSellPlayerAction` lands in, on runway alone. */
const discountTier = (runway: number) => runway < 4 ? '25-50%' : runway < 12 ? '20-35%' : 'normal';

for (const [label, path] of Object.entries(WORLDS)) {
  const world = loadWorld(path);
  console.log('\n' + '='.repeat(104));
  console.log(`WORLD EXPORT: ${label}   exportedAt=${world.exportedAt}`);
  console.log('='.repeat(104));

  for (const country of ['EN', 'SC'] as const) {
    const byTier = new Map<number, XClub[]>();
    for (const c of world.clubs.filter((x) => x.country === country)) {
      if (!byTier.has(c.tier)) byTier.set(c.tier, []);
      byTier.get(c.tier)!.push(c);
    }
    const tiers = [...byTier.keys()].sort((a, b) => a - b);

    console.log(`\n${'─'.repeat(104)}\n${country} — every tier, every club\n${'─'.repeat(104)}`);
    console.log('tier  n   BRAIN VERDICT (old → new)                     '
      + 'FIRE-SALE DISCOUNT TIER (old → new)');

    let totalBrainFlips = 0, totalSellFlips = 0;
    for (const tier of tiers) {
      const cs = byTier.get(tier)!;
      const weeks = resolveEconomy(cfg, tier).weeksPerSeason;
      const tierRow = (cfg.economyTierBaseline?.tiers ?? []).find((t: any) => t.tier === tier) as any;
      const tvSeason = (world.leagues ?? []).find((l) => l.country === country && l.tier === tier)?.tvDeal ?? 0;
      const wageWeekly = Math.round(((tierRow?.turnoverPence ?? 0) * WAGE_TO_TURNOVER_BP) / 10_000 / weeks);
      // A12's own count: the AMP's league (the deepest tier) holds the player's reserved place.
      const homeGames = 23;   // GameLoop's reserved constant — untouched by this task.

      const rows: Row[] = cs.map((c) => ({
        name: c.name ?? '?', tier, weeks, homeGames,
        matchday: matchdayPerGame(c), sponsorWeekly: sponsorWeeklyPence(c, weeks),
        tvSeason, upkeepWeekly: upkeepOf(templates, c.facilities ?? {}),
        wageWeekly, balance: c.balance ?? 0,
      }));

      const oldT = tally(), newT = tally();
      const sellOldT: Record<string, number> = {}, sellNewT: Record<string, number> = {};
      let brainFlips = 0, sellFlips = 0;
      const detail: string[] = [];
      for (const r of rows) {
        const v = verdicts(r);
        oldT[v.old.band]++; newT[v.new.band]++;
        const so = discountTier(v.sellOld), sn = discountTier(v.sellNew);
        sellOldT[so] = (sellOldT[so] ?? 0) + 1; sellNewT[sn] = (sellNewT[sn] ?? 0) + 1;
        if (v.old.band !== v.new.band) {
          brainFlips++;
          detail.push(`      BRAIN ${r.name}: ${v.old.band}(${v.old.runway}w) → ${v.new.band}(${v.new.runway}w)`);
        }
        if (so !== sn) sellFlips++;
      }
      totalBrainFlips += brainFlips; totalSellFlips += sellFlips;
      const fmt = (t: Record<string, number>) => BANDS.filter((b) => t[b]).map((b) => `${b} ${t[b]}`).join(' ') || '—';
      const fmt2 = (t: Record<string, number>) => Object.entries(t).sort().map(([k, v]) => `${k} ${v}`).join(' ') || '—';
      console.log(`  ${String(tier).padEnd(3)} ${String(rows.length).padEnd(3)} `
        + `${fmt(oldT).padEnd(22)} → ${fmt(newT).padEnd(22)}  `
        + `${fmt2(sellOldT).padEnd(26)} → ${fmt2(sellNewT)}`);
      for (const d of detail) console.log(d);
    }
    console.log(`  ${country} TOTAL: brain-verdict flips ${totalBrainFlips}, fire-sale-tier flips ${totalSellFlips}`);

    // ── DIRECTION: did ANY club read worse after the change? ────────────────────────────
    {
      let brainWorse = 0, brainBetter = 0, brainSame = 0;
      let sellWorse = 0, sellBetter = 0, sellSame = 0;
      let worstBrain = { name: '', delta: 0 }, worstSell = { name: '', delta: 0 };
      for (const tier of tiers) {
        const cs = byTier.get(tier)!;
        const weeks = resolveEconomy(cfg, tier).weeksPerSeason;
        const tierRow = (cfg.economyTierBaseline?.tiers ?? []).find((t: any) => t.tier === tier) as any;
        const tvSeason = (world.leagues ?? []).find((l) => l.country === country && l.tier === tier)?.tvDeal ?? 0;
        const wageWeekly = Math.round(((tierRow?.turnoverPence ?? 0) * WAGE_TO_TURNOVER_BP) / 10_000 / weeks);
        for (const c of cs) {
          const r: Row = { name: c.name ?? '?', tier, weeks, homeGames: 23, matchday: matchdayPerGame(c),
            sponsorWeekly: sponsorWeeklyPence(c, weeks), tvSeason,
            upkeepWeekly: upkeepOf(templates, c.facilities ?? {}), wageWeekly, balance: c.balance ?? 0 };
          const v = verdicts(r);
          const db = v.new.runway - v.old.runway;
          if (db < 0) { brainWorse++; if (db < worstBrain.delta) worstBrain = { name: `${r.name} (t${tier})`, delta: db }; }
          else if (db > 0) brainBetter++; else brainSame++;
          const ds = v.sellNew - v.sellOld;
          if (ds < 0) { sellWorse++; if (ds < worstSell.delta) worstSell = { name: `${r.name} (t${tier})`, delta: ds }; }
          else if (ds > 0) sellBetter++; else sellSame++;
        }
      }
      console.log(`
${country} — DIRECTION of change, per club (runway weeks)`);
      console.log(`  brain verdict   better ${brainBetter}  same ${brainSame}  WORSE ${brainWorse}`
        + (brainWorse ? `   worst: ${worstBrain.name} ${worstBrain.delta}w` : ''));
      console.log(`  fire-sale copy  better ${sellBetter}  same ${sellSame}  WORSE ${sellWorse}`
        + (sellWorse ? `   worst: ${worstSell.name} ${worstSell.delta}w` : ''));
    }

    // ── The TIMED variant, tier 1 and the deepest tier only ─────────────────────────────
    console.log(`\n${country} — the TIMED variant (seasonal lump at the boundary, not amortised)`);
    for (const tier of [tiers[0]!, tiers[tiers.length - 1]!]) {
      const cs = byTier.get(tier)!;
      const weeks = resolveEconomy(cfg, tier).weeksPerSeason;
      const tierRow = (cfg.economyTierBaseline?.tiers ?? []).find((t: any) => t.tier === tier) as any;
      const tvSeason = (world.leagues ?? []).find((l) => l.country === country && l.tier === tier)?.tvDeal ?? 0;
      const wageWeekly = Math.round(((tierRow?.turnoverPence ?? 0) * WAGE_TO_TURNOVER_BP) / 10_000 / weeks);
      for (const week of [1, Math.round(weeks / 2), weeks - 2]) {
        const t = tally();
        for (const c of cs) {
          const r: Row = { name: c.name ?? '?', tier, weeks, homeGames: 23, matchday: matchdayPerGame(c),
            sponsorWeekly: sponsorWeeklyPence(c, weeks), tvSeason,
            upkeepWeekly: upkeepOf(templates, c.facilities ?? {}), wageWeekly, balance: c.balance ?? 0 };
          t[verdicts(r, week).timed.band]++;
        }
        console.log(`  tier ${String(tier).padEnd(2)} week ${String(week).padStart(2)}/${weeks}:  `
          + BANDS.filter((b) => t[b]).map((b) => `${b} ${t[b]}`).join(' '));
      }
    }

    // ── A12's §3b sensitivity sweep, re-run against BOTH derivations ────────────────────
    console.log(`\n${country} — A12 §3b sweep re-run: home-games 23 → counted, flips vs modelled wage share`);
    for (const tier of [tiers[0]!, tiers[tiers.length - 1]!]) {
      const cs = byTier.get(tier)!;
      const weeks = resolveEconomy(cfg, tier).weeksPerSeason;
      const tierRow = (cfg.economyTierBaseline?.tiers ?? []).find((t: any) => t.tier === tier) as any;
      const tvSeason = (world.leagues ?? []).find((l) => l.country === country && l.tier === tier)?.tvDeal ?? 0;
      const participants = cs.length + (tier === tiers[tiers.length - 1] ? 1 : 0);
      const homeAfter = participants - 1;
      const sweepOld: string[] = [], sweepNew: string[] = [];
      for (const bp of [4000, 5000, 5500, 6000, 6500, 7000]) {
        const wageWeekly = Math.round(((tierRow?.turnoverPence ?? 0) * bp) / 10_000 / weeks);
        let fOld = 0, fNew = 0;
        for (const c of cs) {
          const base = { name: c.name ?? '?', tier, weeks, matchday: matchdayPerGame(c),
            sponsorWeekly: sponsorWeeklyPence(c, weeks), tvSeason,
            upkeepWeekly: upkeepOf(templates, c.facilities ?? {}), wageWeekly, balance: c.balance ?? 0 };
          const b23 = verdicts({ ...base, homeGames: 23 });
          const bAf = verdicts({ ...base, homeGames: homeAfter });
          if (b23.old.band !== bAf.old.band) fOld++;
          if (b23.new.band !== bAf.new.band) fNew++;
        }
        sweepOld.push(`${bp / 100}%:${fOld}`); sweepNew.push(`${bp / 100}%:${fNew}`);
      }
      console.log(`  tier ${String(tier).padEnd(2)} (23 → ${homeAfter} home games)`);
      console.log(`     OLD derivation  ${sweepOld.join('  ')}`);
      console.log(`     NEW derivation  ${sweepNew.join('  ')}`);
    }
  }
}
