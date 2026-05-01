import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db, gameHistoryTable, dailyQuestStateTable, careerQuestStateTable, friendshipsTable, usersTable, type UserRow } from "@workspace/db";
import { CAREER_QUESTS, DAILY_QUESTS, type DailyQuest, type CareerQuest } from "./catalog";
import { newId } from "./auth";

export function todayKeyUtc(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export type DailyProgress = {
  gamesToday: number;
  winsToday: number;
  betToday: number;
  biggestWinToday: number;
};

export async function getDailyProgress(userId: string): Promise<DailyProgress> {
  const today = new Date();
  const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const rows = await db.select().from(gameHistoryTable)
    .where(and(eq(gameHistoryTable.userId, userId), gte(gameHistoryTable.createdAt, startOfDay)));
  let gamesToday = 0, winsToday = 0, betToday = 0, biggestWinToday = 0;
  for (const r of rows) {
    gamesToday += 1;
    if (r.won) winsToday += 1;
    betToday += r.betCoins;
    const net = r.payoutCoins - r.betCoins;
    if (net > biggestWinToday) biggestWinToday = net;
  }
  return { gamesToday, winsToday, betToday, biggestWinToday };
}

export type DailyQuestStatus = {
  quest: DailyQuest;
  progress: number;
  target: number;
  complete: boolean;
  claimed: boolean;
};

export async function getDailyQuestStatuses(user: UserRow): Promise<DailyQuestStatus[]> {
  const dateKey = todayKeyUtc();
  const states = await db.select().from(dailyQuestStateTable)
    .where(and(eq(dailyQuestStateTable.userId, user.id), eq(dailyQuestStateTable.dateKey, dateKey)));
  const claimedMap = new Map(states.filter(s => s.claimed).map(s => [s.questKey, true]));
  const progress = await getDailyProgress(user.id);
  return DAILY_QUESTS.map(q => {
    const value = progress[q.metric];
    return {
      quest: q,
      progress: Math.min(value, q.target),
      target: q.target,
      complete: value >= q.target,
      claimed: claimedMap.has(q.key),
    };
  });
}

export async function claimDailyQuest(user: UserRow, key: string): Promise<{ ok: boolean; error?: string; rewardCoins?: number; newCoins?: number }> {
  const quest = DAILY_QUESTS.find(q => q.key === key);
  if (!quest) return { ok: false, error: "Unknown quest." };
  const dateKey = todayKeyUtc();
  const [existing] = await db.select().from(dailyQuestStateTable)
    .where(and(eq(dailyQuestStateTable.userId, user.id), eq(dailyQuestStateTable.dateKey, dateKey), eq(dailyQuestStateTable.questKey, key)));
  if (existing?.claimed) return { ok: false, error: "Already claimed." };
  const progress = await getDailyProgress(user.id);
  if (progress[quest.metric] < quest.target) return { ok: false, error: "Not complete yet." };

  if (existing) {
    await db.update(dailyQuestStateTable)
      .set({ claimed: true, claimedAt: new Date() })
      .where(eq(dailyQuestStateTable.id, existing.id));
  } else {
    await db.insert(dailyQuestStateTable).values({
      id: newId("dq"),
      userId: user.id,
      dateKey,
      questKey: key,
      claimed: true,
      claimedAt: new Date(),
    });
  }
  const [updated] = await db.update(usersTable)
    .set({ coins: sql`${usersTable.coins} + ${quest.rewardCoins}` })
    .where(eq(usersTable.id, user.id))
    .returning({ coins: usersTable.coins });
  return { ok: true, rewardCoins: quest.rewardCoins, newCoins: updated?.coins ?? user.coins };
}

export type CareerProgress = {
  coins: number;
  totalBet: number;
  bestWinStreak: number;
  plinkoWins: number;
  minesWins: number;
  freeThrowMakes: number;
  blackjackWins: number;
  friends: number;
};

export async function getCareerProgress(user: UserRow): Promise<CareerProgress> {
  const friendCount = await db.select({ c: sql<number>`count(*)::int` }).from(friendshipsTable)
    .where(and(eq(friendshipsTable.userId, user.id), eq(friendshipsTable.status, "accepted")));
  return {
    coins: user.coins,
    totalBet: user.totalBet,
    bestWinStreak: user.bestWinStreak,
    plinkoWins: user.plinkoWins,
    minesWins: user.minesWins,
    freeThrowMakes: user.freeThrowMakes,
    blackjackWins: user.blackjackWins,
    friends: friendCount[0]?.c ?? 0,
  };
}

export type CareerQuestStatus = {
  quest: CareerQuest;
  progress: number;
  target: number;
  complete: boolean;
  claimed: boolean;
};

export async function getCareerQuestStatuses(user: UserRow): Promise<CareerQuestStatus[]> {
  const states = await db.select().from(careerQuestStateTable)
    .where(eq(careerQuestStateTable.userId, user.id));
  const claimed = new Map(states.filter(s => s.claimed).map(s => [s.questKey, true]));
  const progress = await getCareerProgress(user);
  return CAREER_QUESTS.map(q => {
    const value = progress[q.metric];
    return {
      quest: q,
      progress: Math.min(value, q.target),
      target: q.target,
      complete: value >= q.target,
      claimed: claimed.has(q.key),
    };
  });
}

export async function claimCareerQuest(user: UserRow, key: string): Promise<{ ok: boolean; error?: string; rewardCoins?: number; tagId?: string; newCoins?: number; ownedTags?: string[] }> {
  const quest = CAREER_QUESTS.find(q => q.key === key);
  if (!quest) return { ok: false, error: "Unknown quest." };
  const [existing] = await db.select().from(careerQuestStateTable)
    .where(and(eq(careerQuestStateTable.userId, user.id), eq(careerQuestStateTable.questKey, key)));
  if (existing?.claimed) return { ok: false, error: "Already claimed." };
  const progress = await getCareerProgress(user);
  if (progress[quest.metric] < quest.target) return { ok: false, error: "Not complete yet." };

  if (existing) {
    await db.update(careerQuestStateTable)
      .set({ claimed: true, claimedAt: new Date() })
      .where(eq(careerQuestStateTable.id, existing.id));
  } else {
    await db.insert(careerQuestStateTable).values({
      id: newId("cq"),
      userId: user.id,
      questKey: key,
      claimed: true,
      claimedAt: new Date(),
    });
  }
  const ownedTags = Array.from(new Set([...user.ownedTags, quest.tagId]));
  const [updated] = await db.update(usersTable)
    .set({
      coins: sql`${usersTable.coins} + ${quest.rewardCoins}`,
      ownedTags,
    })
    .where(eq(usersTable.id, user.id))
    .returning({ coins: usersTable.coins, ownedTags: usersTable.ownedTags });
  return { ok: true, rewardCoins: quest.rewardCoins, tagId: quest.tagId, newCoins: updated?.coins ?? user.coins, ownedTags: updated?.ownedTags ?? ownedTags };
}

export async function recentGameHistory(userId: string, limit = 20) {
  return db.select().from(gameHistoryTable)
    .where(eq(gameHistoryTable.userId, userId))
    .orderBy(desc(gameHistoryTable.createdAt))
    .limit(limit);
}
