import { eq, sql } from "drizzle-orm";
import { db, usersTable, type UserRow } from "@workspace/db";
import { ITEMS, TAGS } from "./catalog";

// XP required to reach level N from level N-1.
// Easy early, exponential later: roughly 100 * (n-1)^1.8
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(100 * Math.pow(level - 1, 1.8));
}

// Total XP needed to reach a given level from 0
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let l = 2; l <= level; l++) total += xpForLevel(l);
  return total;
}

// What level does a given total XP correspond to?
export function levelFromXp(xp: number): number {
  let level = 1;
  while (true) {
    const needed = totalXpForLevel(level + 1);
    if (xp < needed) return level;
    level++;
    if (level >= 200) return 200;
  }
}

export type LevelReward = {
  coins?: number;
  luckCharges?: number;
  itemId?: string;
  tagId?: string;
  message: string;
};

// Rewards granted when you reach a specific level
export function rewardsForLevel(level: number): LevelReward[] {
  const rewards: LevelReward[] = [];

  // Every level: small coin bonus
  const coinBonus = level * 50;
  rewards.push({ coins: coinBonus, message: `${coinBonus.toLocaleString()} coins for reaching level ${level}!` });

  // Every 5 levels: luck charges
  if (level % 5 === 0) {
    rewards.push({ luckCharges: 5, message: `5 luck charges for reaching level ${level}!` });
  }

  // Level-specific item unlocks
  const itemUnlocks: Record<number, string> = {
    5: "hair_long_blonde",
    10: "hair_mohawk_red",
    15: "shirt_neon",
    20: "hair_neon",
    25: "pants_neon",
    30: "face_shades",
    40: "shirt_gold",
    50: "pants_gold",
    75: "hair_galaxy",
    100: "shirt_diamond",
  };
  if (itemUnlocks[level]) {
    const item = ITEMS.find(i => i.id === itemUnlocks[level]);
    rewards.push({ itemId: itemUnlocks[level], message: `Unlocked avatar item "${item?.name ?? itemUnlocks[level]}"!` });
  }

  // Level-specific tag unlocks
  const tagUnlocks: Record<number, string> = {
    10: "high_roller",
    25: "lucky",
    50: "millionaire",
  };
  if (tagUnlocks[level]) {
    const tag = TAGS.find(t => t.id === tagUnlocks[level]);
    rewards.push({ tagId: tagUnlocks[level], message: `Unlocked tag "${tag?.name ?? tagUnlocks[level]}"!` });
  }

  return rewards;
}

export type XpResult = {
  user: UserRow;
  xpGained: number;
  leveledUp: boolean;
  newLevel: number;
  levelRewards: LevelReward[];
};

// Grant XP, handle level-ups, apply rewards
export async function grantXp(userId: string, amount: number): Promise<XpResult> {
  const [before] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!before) throw new Error("User not found");

  const newXp = before.xp + amount;
  const newLevel = levelFromXp(newXp);
  const leveledUp = newLevel > before.level;
  const levelRewards: LevelReward[] = [];

  if (leveledUp) {
    for (let l = before.level + 1; l <= newLevel; l++) {
      levelRewards.push(...rewardsForLevel(l));
    }
  }

  // Accumulate reward values
  let bonusCoins = 0;
  let bonusLuck = 0;
  const newItems = new Set(before.ownedItems);
  const newTags = new Set(before.ownedTags);

  for (const r of levelRewards) {
    if (r.coins) bonusCoins += r.coins;
    if (r.luckCharges) bonusLuck += r.luckCharges;
    if (r.itemId) newItems.add(r.itemId);
    if (r.tagId) newTags.add(r.tagId);
  }

  const updates: Record<string, unknown> = {
    xp: newXp,
    level: newLevel,
  };
  if (bonusCoins > 0) updates.coins = sql`${usersTable.coins} + ${bonusCoins}`;
  if (bonusLuck > 0) updates.luckCharges = sql`${usersTable.luckCharges} + ${bonusLuck}`;
  if (newItems.size !== before.ownedItems.length) updates.ownedItems = [...newItems];
  if (newTags.size !== before.ownedTags.length) updates.ownedTags = [...newTags];

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, userId)).returning();

  return {
    user: updated!,
    xpGained: amount,
    leveledUp,
    newLevel,
    levelRewards,
  };
}
