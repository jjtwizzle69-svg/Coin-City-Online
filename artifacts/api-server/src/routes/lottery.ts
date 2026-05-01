import { Router } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, lotteryEntriesTable, lotteryRoundsTable, usersTable } from "@workspace/db";
import { newId, requireAuth, type AuthedRequest } from "../lib/auth";
import { toPublicUser } from "../lib/userPublic";

const router = Router();

const ROUND_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const LUCK_CHARGES_FOR_PARTICIPATING = 10;

async function findOrCreateActiveRound() {
  const now = new Date();
  const [active] = await db.select().from(lotteryRoundsTable)
    .where(eq(lotteryRoundsTable.status, "active"))
    .orderBy(desc(lotteryRoundsTable.startedAt))
    .limit(1);
  if (active) {
    if (active.endsAt.getTime() <= now.getTime()) {
      // settle then create a new one
      await settleRound(active.id);
      return findOrCreateActiveRound();
    }
    return active;
  }
  const id = newId("lot");
  const [created] = await db.insert(lotteryRoundsTable).values({
    id,
    startedAt: now,
    endsAt: new Date(now.getTime() + ROUND_DURATION_MS),
    totalCoins: 0,
    status: "active",
    winners: [],
  }).returning();
  return created!;
}

async function settleRound(roundId: string) {
  const [round] = await db.select().from(lotteryRoundsTable).where(eq(lotteryRoundsTable.id, roundId));
  if (!round || round.status !== "active") return;
  const entries = await db.select().from(lotteryEntriesTable).where(eq(lotteryEntriesTable.roundId, roundId));
  if (entries.length === 0 || round.totalCoins === 0) {
    await db.update(lotteryRoundsTable).set({ status: "complete", resolvedAt: new Date(), winners: [] }).where(eq(lotteryRoundsTable.id, roundId));
    return;
  }
  // Aggregate per-user
  const perUser = new Map<string, number>();
  for (const e of entries) perUser.set(e.userId, (perUser.get(e.userId) ?? 0) + e.coins);
  // pick weighted-random winner without replacement (3 winners)
  function pickWeighted(weights: Map<string, number>): string | null {
    const total = [...weights.values()].reduce((a, b) => a + b, 0);
    if (total <= 0) return null;
    let r = Math.random() * total;
    for (const [k, w] of weights) {
      r -= w;
      if (r <= 0) return k;
    }
    return [...weights.keys()][weights.size - 1] ?? null;
  }
  const remaining = new Map(perUser);
  const winnerIds: string[] = [];
  for (let i = 0; i < 3 && remaining.size > 0; i++) {
    const w = pickWeighted(remaining);
    if (!w) break;
    winnerIds.push(w);
    remaining.delete(w);
  }

  // Find Noah (admin) — gets fixed 2%.
  const [noah] = await db.select().from(usersTable).where(eq(usersTable.isAdmin, true)).limit(1);
  const total = round.totalCoins;
  const grandShare = Math.floor(total * 0.80);
  const secondShare = Math.floor(total * 0.09);
  const thirdShare = Math.floor(total * 0.09);
  const noahShare = total - grandShare - secondShare - thirdShare; // remainder ~2%

  type Winner = { userId: string; username: string; displayName: string; coins: number; share: number };
  const winners: Winner[] = [];
  async function payout(uid: string, coins: number, share: number) {
    if (coins <= 0) return;
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, uid));
    if (!u) return;
    await db.update(usersTable)
      .set({ coins: sql`${usersTable.coins} + ${coins}` })
      .where(eq(usersTable.id, uid));
    winners.push({ userId: u.id, username: u.username, displayName: u.displayName, coins, share });
  }

  if (winnerIds[0]) await payout(winnerIds[0], grandShare, 0.80);
  if (winnerIds[1]) await payout(winnerIds[1], secondShare, 0.09);
  if (winnerIds[2]) await payout(winnerIds[2], thirdShare, 0.09);
  if (noah) await payout(noah.id, noahShare, 0.02);

  await db.update(lotteryRoundsTable).set({ status: "complete", resolvedAt: new Date(), winners }).where(eq(lotteryRoundsTable.id, roundId));
}

router.get("/lottery", requireAuth, async (req: AuthedRequest, res) => {
  const round = await findOrCreateActiveRound();
  const entries = await db.select().from(lotteryEntriesTable).where(eq(lotteryEntriesTable.roundId, round.id));
  const myEntries = entries.filter(e => e.userId === req.user!.id);
  const myCoins = myEntries.reduce((a, b) => a + b.coins, 0);
  const total = entries.reduce((a, b) => a + b.coins, 0);
  // distinct participants
  const participantIds = Array.from(new Set(entries.map(e => e.userId)));
  const past = await db.select().from(lotteryRoundsTable)
    .where(eq(lotteryRoundsTable.status, "complete"))
    .orderBy(desc(lotteryRoundsTable.resolvedAt))
    .limit(5);
  res.json({
    round: {
      id: round.id,
      startedAt: round.startedAt.toISOString(),
      endsAt: round.endsAt.toISOString(),
      totalCoins: total,
      myCoins,
      participants: participantIds.length,
    },
    pastWinners: past.map(p => ({
      id: p.id,
      endedAt: p.resolvedAt?.toISOString() ?? p.endsAt.toISOString(),
      totalCoins: p.totalCoins,
      winners: p.winners,
    })),
  });
});

router.post("/lottery/buy", requireAuth, async (req: AuthedRequest, res) => {
  const coins = Math.max(1, Math.floor(Number(req.body?.coins ?? 0)));
  if (!Number.isFinite(coins) || coins <= 0) { res.status(400).json({ error: "Coins must be positive." }); return; }
  if (coins > req.user!.coins) { res.status(400).json({ error: "Not enough coins." }); return; }
  const round = await findOrCreateActiveRound();
  const id = newId("le");
  await db.transaction(async (tx) => {
    await tx.insert(lotteryEntriesTable).values({ id, roundId: round.id, userId: req.user!.id, coins });
    await tx.update(lotteryRoundsTable).set({ totalCoins: sql`${lotteryRoundsTable.totalCoins} + ${coins}` }).where(eq(lotteryRoundsTable.id, round.id));
    await tx.update(usersTable).set({
      coins: sql`${usersTable.coins} - ${coins}`,
      luckCharges: sql`${usersTable.luckCharges} + ${LUCK_CHARGES_FOR_PARTICIPATING}`,
    }).where(eq(usersTable.id, req.user!.id));
  });
  const [updated] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
  res.json({ ok: true, user: toPublicUser(updated!) });
});

// Admin endpoint to force-settle (for testing / immediate)
router.post("/lottery/settle-now", requireAuth, async (req: AuthedRequest, res) => {
  if (!req.user!.isAdmin) { res.status(403).json({ error: "Admin only" }); return; }
  const round = await findOrCreateActiveRound();
  await settleRound(round.id);
  res.json({ ok: true });
});

export default router;
