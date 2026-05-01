import { Router } from "express";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import {
  db, usersTable, tournamentsTable, tournamentEntriesTable,
  type TournamentRow, type TournamentRewards,
} from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../lib/auth";
import { newId } from "../lib/auth";
import { grantXp } from "../lib/xp";

const router = Router();

const VALID_GAMES = ["coinflip", "dice", "plinko", "mines", "freethrow", "blackjack", "any"];

// Auto-settle a tournament that has ended
async function settleTournament(t: TournamentRow): Promise<void> {
  if (t.settled) return;

  const entries = await db.select().from(tournamentEntriesTable)
    .where(eq(tournamentEntriesTable.tournamentId, t.id))
    .orderBy(desc(tournamentEntriesTable.score));

  const rewards: TournamentRewards = t.rewards as TournamentRewards;
  const now = new Date();

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    let coinReward = rewards.participation.coins;
    let xpReward = rewards.participation.xp;
    let tagId: string | undefined;
    let itemId: string | undefined;

    if (i === 0) { coinReward = rewards.first.coins; xpReward = rewards.first.xp; tagId = rewards.first.tagId; itemId = rewards.first.itemId; }
    else if (i === 1) { coinReward = rewards.second.coins; xpReward = rewards.second.xp; }
    else if (i === 2) { coinReward = rewards.third.coins; xpReward = rewards.third.xp; }

    const updateFields: Record<string, unknown> = {
      coins: sql`${usersTable.coins} + ${coinReward}`,
    };
    if (tagId) {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, entry.userId));
      if (u && !u.ownedTags.includes(tagId)) {
        updateFields.ownedTags = [...u.ownedTags, tagId];
      }
    }
    if (itemId) {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, entry.userId));
      if (u && !u.ownedItems.includes(itemId)) {
        updateFields.ownedItems = [...u.ownedItems, itemId];
      }
    }

    await db.update(usersTable).set(updateFields).where(eq(usersTable.id, entry.userId));
    await grantXp(entry.userId, xpReward);
    await db.update(tournamentEntriesTable)
      .set({ settledAt: now })
      .where(eq(tournamentEntriesTable.id, entry.id));
  }

  await db.update(tournamentsTable).set({ settled: true }).where(eq(tournamentsTable.id, t.id));
}

// ── List tournaments ─────────────────────────────────────────────────────────

router.get("/tournaments", requireAuth, async (req: AuthedRequest, res) => {
  const now = new Date();
  const all = await db.select().from(tournamentsTable).orderBy(desc(tournamentsTable.startAt)).limit(20);

  // Auto-settle ended unsettled ones
  for (const t of all) {
    if (!t.settled && t.endAt < now) {
      await settleTournament(t);
    }
  }

  const fresh = await db.select().from(tournamentsTable).orderBy(desc(tournamentsTable.startAt)).limit(20);

  res.json({ tournaments: fresh.map(t => ({
    ...t,
    startAt: t.startAt.toISOString(),
    endAt: t.endAt.toISOString(),
    createdAt: t.createdAt.toISOString(),
    status: now < t.startAt ? "upcoming" : now < t.endAt ? "active" : "ended",
  })) });
});

// ── Tournament detail + leaderboard ─────────────────────────────────────────

router.get("/tournaments/:id", requireAuth, async (req: AuthedRequest, res) => {
  const tid = String(req.params.id);
  const [t] = await db.select().from(tournamentsTable).where(eq(tournamentsTable.id, tid));
  if (!t) { res.status(404).json({ error: "Not found." }); return; }

  const now = new Date();
  if (!t.settled && t.endAt < now) await settleTournament(t);

  const entries = await db.select({
    entryId: tournamentEntriesTable.id,
    userId: tournamentEntriesTable.userId,
    score: tournamentEntriesTable.score,
    wins: tournamentEntriesTable.wins,
    username: usersTable.username,
    displayName: usersTable.displayName,
    level: usersTable.level,
    equippedTagId: usersTable.equippedTagId,
  }).from(tournamentEntriesTable)
    .innerJoin(usersTable, eq(tournamentEntriesTable.userId, usersTable.id))
    .where(eq(tournamentEntriesTable.tournamentId, tid))
    .orderBy(desc(tournamentEntriesTable.score))
    .limit(100);

  const me = req.user!.id;
  const myRank = entries.findIndex(e => e.userId === me) + 1;

  res.json({
    tournament: {
      ...t,
      startAt: t.startAt.toISOString(),
      endAt: t.endAt.toISOString(),
      createdAt: t.createdAt.toISOString(),
      status: now < t.startAt ? "upcoming" : now < t.endAt ? "active" : "ended",
    },
    leaderboard: entries,
    myRank: myRank || null,
    myEntry: entries.find(e => e.userId === me) ?? null,
  });
});

// ── Admin: create tournament ─────────────────────────────────────────────────

router.post("/admin/tournaments", requireAuth, async (req: AuthedRequest, res) => {
  if (!req.user!.isAdmin) { res.status(403).json({ error: "Admin only." }); return; }

  const name = String(req.body?.name ?? "").trim();
  const game = String(req.body?.game ?? "any");
  const durationMinutes = Math.floor(Number(req.body?.durationMinutes ?? 60));
  const startOffset = Math.floor(Number(req.body?.startOffsetMinutes ?? 0));

  if (!name || name.length < 3 || name.length > 60) {
    res.status(400).json({ error: "Name must be 3–60 chars." }); return;
  }
  if (!VALID_GAMES.includes(game)) {
    res.status(400).json({ error: `game must be one of: ${VALID_GAMES.join(", ")}` }); return;
  }
  if (durationMinutes < 5 || durationMinutes > 60 * 24 * 7) {
    res.status(400).json({ error: "durationMinutes must be 5–10080." }); return;
  }

  const startAt = new Date(Date.now() + startOffset * 60_000);
  const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);

  const rewards: TournamentRewards = req.body?.rewards ?? {
    first: { coins: 5000, xp: 500, tagId: req.body?.firstTagId },
    second: { coins: 2500, xp: 250 },
    third: { coins: 1000, xp: 100 },
    participation: { coins: 100, xp: 25 },
  };

  const [t] = await db.insert(tournamentsTable).values({
    id: newId("t"),
    name,
    game,
    startAt,
    endAt,
    rewards,
  }).returning();

  res.json({ tournament: { ...t!, startAt: t!.startAt.toISOString(), endAt: t!.endAt.toISOString(), createdAt: t!.createdAt.toISOString() } });
});

// ── Record tournament score (called by games route) ──────────────────────────

export async function recordTournamentScore(opts: {
  userId: string;
  game: string;
  won: boolean;
  netWin: number;
}): Promise<void> {
  const now = new Date();

  // Find active tournaments matching this game
  const active = await db.select().from(tournamentsTable)
    .where(and(
      eq(tournamentsTable.settled, false),
      lte(tournamentsTable.startAt, now),
      gte(tournamentsTable.endAt, now),
    ));

  for (const t of active) {
    if (t.game !== "any" && t.game !== opts.game) continue;

    // Upsert entry
    const [existing] = await db.select().from(tournamentEntriesTable)
      .where(and(
        eq(tournamentEntriesTable.tournamentId, t.id),
        eq(tournamentEntriesTable.userId, opts.userId),
      ));

    if (existing) {
      await db.update(tournamentEntriesTable).set({
        score: existing.score + Math.max(0, opts.netWin),
        wins: opts.won ? existing.wins + 1 : existing.wins,
      }).where(eq(tournamentEntriesTable.id, existing.id));
    } else {
      await db.insert(tournamentEntriesTable).values({
        id: newId("te"),
        tournamentId: t.id,
        userId: opts.userId,
        score: Math.max(0, opts.netWin),
        wins: opts.won ? 1 : 0,
      });
    }
  }
}

export default router;
