import { eq, sql } from "drizzle-orm";
import { db, gameHistoryTable, usersTable, type UserRow } from "@workspace/db";
import { newId } from "./auth";

// Apply 2x luck: increase win probability toward 1 (favorable for player).
// Used for binary win/loss games. For payout-multiplier games, we apply it
// differently per-game.
export function consumeLuckIfActive(user: UserRow): boolean {
  if (user.luckUntil && user.luckUntil.getTime() > Date.now()) return true;
  return user.luckCharges > 0;
}

export function isTimedLuckActive(user: UserRow): boolean {
  return !!(user.luckUntil && user.luckUntil.getTime() > Date.now());
}

export async function recordGame(opts: {
  user: UserRow;
  game: string;
  bet: number;
  payout: number;
  won: boolean;
  consumedLuck: boolean;
}): Promise<UserRow> {
  const { user, game, bet, payout, won, consumedLuck } = opts;
  await db.insert(gameHistoryTable).values({
    id: newId("gh"),
    userId: user.id,
    game,
    betCoins: bet,
    payoutCoins: payout,
    won,
  });

  const newStreak = won ? user.currentWinStreak + 1 : 0;
  const newBestStreak = Math.max(user.bestWinStreak, newStreak);

  const updates: Record<string, unknown> = {
    coins: sql`${usersTable.coins} - ${bet} + ${payout}`,
    totalBet: sql`${usersTable.totalBet} + ${bet}`,
    totalWon: sql`${usersTable.totalWon} + ${payout}`,
    gamesPlayed: sql`${usersTable.gamesPlayed} + 1`,
    gamesWon: won ? sql`${usersTable.gamesWon} + 1` : usersTable.gamesWon,
    currentWinStreak: newStreak,
    bestWinStreak: newBestStreak,
    luckCharges: (consumedLuck && !isTimedLuckActive(user)) ? sql`GREATEST(${usersTable.luckCharges} - 1, 0)` : usersTable.luckCharges,
  };
  if (won) {
    if (game === "plinko") updates.plinkoWins = sql`${usersTable.plinkoWins} + 1`;
    if (game === "mines") updates.minesWins = sql`${usersTable.minesWins} + 1`;
    if (game === "dice") updates.diceWins = sql`${usersTable.diceWins} + 1`;
    if (game === "blackjack") updates.blackjackWins = sql`${usersTable.blackjackWins} + 1`;
    if (game === "coinflip") updates.coinflipWins = sql`${usersTable.coinflipWins} + 1`;
    if (game === "freethrow") updates.freeThrowMakes = sql`${usersTable.freeThrowMakes} + 1`;
  }

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id)).returning();
  return updated!;
}

// Random helpers
export function rand(): number { return Math.random(); }
export function randInt(maxExclusive: number): number { return Math.floor(Math.random() * maxExclusive); }

// Coinflip
export function playCoinflip(opts: { bet: number; pick: "heads" | "tails"; lucky: boolean }) {
  const result = rand() < (opts.lucky ? 0.6 : 0.5) ? opts.pick : (opts.pick === "heads" ? "tails" : "heads");
  // wait, that's biased toward picked side when lucky — that's the desired effect.
  const won = result === opts.pick;
  const payout = won ? opts.bet * 2 : 0;
  return { result, won, payout };
}

// Dice — pick over/under target. Player picks target (2-99) and direction. Payout multiplier scales with rarity.
// Server rolls 1-100. lucky biases roll to be near 50 (still random, but tighter distribution toward the player's side).
export function playDice(opts: { bet: number; target: number; direction: "over" | "under"; lucky: boolean }) {
  const target = Math.max(2, Math.min(99, Math.floor(opts.target)));
  const winChance = opts.direction === "over" ? (100 - target) / 100 : (target - 1) / 100;
  const baseMultiplier = (1 / winChance) * 0.97;
  let roll = Math.floor(rand() * 100) + 1;
  if (opts.lucky) {
    // re-roll once; keep more favorable
    const r2 = Math.floor(rand() * 100) + 1;
    const isWin1 = opts.direction === "over" ? roll > target : roll < target;
    const isWin2 = opts.direction === "over" ? r2 > target : r2 < target;
    if (!isWin1 && isWin2) roll = r2;
  }
  const won = opts.direction === "over" ? roll > target : roll < target;
  const payout = won ? Math.floor(opts.bet * baseMultiplier) : 0;
  return { roll, won, payout, multiplier: Number(baseMultiplier.toFixed(2)) };
}

// Plinko — drop a ball through 12 rows of pegs; final bucket payout from a 13-bucket array.
// Buckets symmetric, edges high. With lucky, biased toward edges.
const PLINKO_ROWS = 12;
const PLINKO_PAYOUTS = [10, 4, 2, 1.1, 0.6, 0.4, 0.2, 0.4, 0.6, 1.1, 2, 4, 10];
export function playPlinko(opts: { bet: number; lucky: boolean }) {
  let position = 0; // path from -ROWS/2 to +ROWS/2 in halves
  const path: ("L" | "R")[] = [];
  const rightBias = opts.lucky ? 0.55 : 0.5;
  for (let i = 0; i < PLINKO_ROWS; i++) {
    // lucky tries to push toward edge — alternate biases away from center
    let p = 0.5;
    if (opts.lucky) {
      if (position >= 0) p = rightBias; else p = 1 - rightBias;
    }
    if (rand() < p) { position += 1; path.push("R"); }
    else { position -= 1; path.push("L"); }
  }
  // bucket index 0..PLINKO_ROWS = (position + ROWS) / 2
  const bucket = (position + PLINKO_ROWS) / 2;
  const mult = PLINKO_PAYOUTS[bucket]!;
  const payout = Math.floor(opts.bet * mult);
  const won = payout > opts.bet;
  return { path, bucket, multiplier: mult, payout, won };
}
export const PLINKO_PAYOUTS_EXPORT = PLINKO_PAYOUTS;

// Mines — 5x5 grid, N mines. Player picks K tiles. If any mine -> lose. Multiplier grows per safe pick.
// Lucky biases mine placement away from likely first picks (we just reduce mine count by 1 if charges available, capped at 1 mine min).
export function playMines(opts: { bet: number; mines: number; pickedIndexes: number[]; lucky: boolean }) {
  const total = 25;
  const minesCount = Math.max(1, Math.min(24, Math.floor(opts.mines)));
  const effectiveMines = opts.lucky ? Math.max(1, minesCount - 1) : minesCount;
  // unique-shuffle to choose mine positions
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let i = total - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [indices[i], indices[j]] = [indices[j]!, indices[i]!];
  }
  const minePositions = new Set(indices.slice(0, effectiveMines));
  const picks = Array.from(new Set(opts.pickedIndexes.filter(i => Number.isInteger(i) && i >= 0 && i < total)));
  const safePicks: number[] = [];
  let hitMine = -1;
  for (const p of picks) {
    if (minePositions.has(p)) { hitMine = p; break; }
    safePicks.push(p);
  }
  // multiplier formula: product of (total - i) / (total - minesCount - i) for i = 0..safe-1, with house edge
  let mult = 1;
  for (let i = 0; i < safePicks.length; i++) {
    mult *= (total - i) / (total - minesCount - i);
  }
  mult *= 0.97;
  const won = hitMine === -1 && safePicks.length > 0;
  const payout = won ? Math.floor(opts.bet * mult) : 0;
  return { minePositions: Array.from(minePositions), safePicks, hitMine, multiplier: Number(mult.toFixed(2)), payout, won };
}

// Free throw — very low base chance, random reward 5x-25x bet on hit.
export function playFreeThrow(opts: { bet: number; lucky: boolean }) {
  const baseChance = 0.06; // 6%
  const chance = opts.lucky ? baseChance * 2 : baseChance;
  const made = rand() < chance;
  const multiplier = made ? 5 + Math.floor(rand() * 21) : 0;
  return { made, multiplier, payout: made ? opts.bet * multiplier : 0, won: made };
}

// Blackjack — single round, dealer hits to 17. Returns full state for animation.
type Card = { rank: string; value: number; suit: "S" | "H" | "D" | "C" };
const RANKS: { rank: string; value: number }[] = [
  { rank: "A", value: 11 }, { rank: "2", value: 2 }, { rank: "3", value: 3 }, { rank: "4", value: 4 },
  { rank: "5", value: 5 }, { rank: "6", value: 6 }, { rank: "7", value: 7 }, { rank: "8", value: 8 },
  { rank: "9", value: 9 }, { rank: "10", value: 10 }, { rank: "J", value: 10 }, { rank: "Q", value: 10 }, { rank: "K", value: 10 },
];
function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of ["S", "H", "D", "C"] as const) {
    for (const r of RANKS) deck.push({ rank: r.rank, value: r.value, suit: s });
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  return deck;
}
function handTotal(cards: Card[]): number {
  let total = cards.reduce((s, c) => s + c.value, 0);
  let aces = cards.filter(c => c.rank === "A").length;
  while (total > 21 && aces > 0) { total -= 10; aces -= 1; }
  return total;
}
export function playBlackjack(opts: { bet: number; lucky: boolean }) {
  const deck = buildDeck();
  // lucky: peek at first 4 cards; if dealer would beat us, swap player cards with next pair
  let player: Card[] = [deck.shift()!, deck.shift()!];
  let dealer: Card[] = [deck.shift()!, deck.shift()!];
  if (opts.lucky) {
    if (handTotal(dealer) > handTotal(player) && deck.length >= 2) {
      player = [deck.shift()!, deck.shift()!];
    }
  }
  // Auto-play: player hits to 17 unless 17+
  while (handTotal(player) < 17) player.push(deck.shift()!);
  while (handTotal(dealer) < 17) dealer.push(deck.shift()!);
  const pTotal = handTotal(player);
  const dTotal = handTotal(dealer);
  let outcome: "win" | "lose" | "push" | "blackjack";
  let payout = 0;
  if (pTotal === 21 && player.length === 2) { outcome = "blackjack"; payout = Math.floor(opts.bet * 2.5); }
  else if (pTotal > 21) { outcome = "lose"; }
  else if (dTotal > 21) { outcome = "win"; payout = opts.bet * 2; }
  else if (pTotal > dTotal) { outcome = "win"; payout = opts.bet * 2; }
  else if (pTotal < dTotal) { outcome = "lose"; }
  else { outcome = "push"; payout = opts.bet; }
  const won = payout > opts.bet;
  return { player, dealer, playerTotal: pTotal, dealerTotal: dTotal, outcome, payout, won };
}
