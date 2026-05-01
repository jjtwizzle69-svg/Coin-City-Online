import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../lib/auth";
import { ITEM_BY_ID, TAGS, ITEMS, isInappropriate, DAILY_WHEEL_REWARDS } from "../lib/catalog";
import { toPublicUser } from "../lib/userPublic";

const router = Router();

router.get("/catalog", (_req, res) => {
  res.json({ items: ITEMS, tags: TAGS, dailyWheel: DAILY_WHEEL_REWARDS });
});

router.put("/profile/equip", requireAuth, async (req: AuthedRequest, res) => {
  const itemId = String(req.body?.itemId ?? "");
  const item = ITEM_BY_ID.get(itemId);
  if (!item) { res.status(400).json({ error: "Unknown item." }); return; }
  const owns = item.cost === 0 || req.user!.ownedItems.includes(itemId) || req.user!.isAdmin;
  if (!owns) { res.status(403).json({ error: "You don't own this item." }); return; }
  const equipped = { ...req.user!.equippedItems, [item.slot]: itemId };
  const [updated] = await db.update(usersTable).set({ equippedItems: equipped }).where(eq(usersTable.id, req.user!.id)).returning();
  res.json({ user: toPublicUser(updated!) });
});

router.put("/profile/tag", requireAuth, async (req: AuthedRequest, res) => {
  const tagId = String(req.body?.tagId ?? "noob");
  const owns = req.user!.ownedTags.includes(tagId) || req.user!.isAdmin || tagId === "noob";
  if (!owns) { res.status(403).json({ error: "You haven't earned that tag." }); return; }
  const [updated] = await db.update(usersTable).set({ equippedTagId: tagId }).where(eq(usersTable.id, req.user!.id)).returning();
  res.json({ user: toPublicUser(updated!) });
});

router.put("/profile/display-name", requireAuth, async (req: AuthedRequest, res) => {
  const raw = String(req.body?.displayName ?? "").trim();
  if (raw.length < 2 || raw.length > 15) { res.status(400).json({ error: "Display name must be 2-15 characters." }); return; }
  if (isInappropriate(raw)) { res.status(400).json({ error: "Display name is not allowed." }); return; }
  const [updated] = await db.update(usersTable).set({ displayName: raw }).where(eq(usersTable.id, req.user!.id)).returning();
  res.json({ user: toPublicUser(updated!) });
});

router.post("/shop/buy", requireAuth, async (req: AuthedRequest, res) => {
  const itemId = String(req.body?.itemId ?? "");
  const item = ITEM_BY_ID.get(itemId);
  if (!item) { res.status(400).json({ error: "Unknown item." }); return; }
  if (req.user!.ownedItems.includes(itemId) || item.cost === 0) {
    res.status(400).json({ error: "Already owned." }); return;
  }
  if (req.user!.coins < item.cost) { res.status(400).json({ error: "Not enough coins." }); return; }
  const owned = [...req.user!.ownedItems, itemId];
  const [updated] = await db.update(usersTable)
    .set({ ownedItems: owned, coins: sql`${usersTable.coins} - ${item.cost}` })
    .where(eq(usersTable.id, req.user!.id))
    .returning();
  res.json({ user: toPublicUser(updated!) });
});

const DAILY_WHEEL_COOLDOWN_MS = 22 * 60 * 60 * 1000; // 22 hours so it's roughly daily

router.post("/wheel/spin", requireAuth, async (req: AuthedRequest, res) => {
  const now = Date.now();
  const last = req.user!.lastDailyWheelAt ? req.user!.lastDailyWheelAt.getTime() : 0;
  if (now - last < DAILY_WHEEL_COOLDOWN_MS) {
    const nextAt = new Date(last + DAILY_WHEEL_COOLDOWN_MS).toISOString();
    res.status(400).json({ error: "Already spun. Try again later.", nextAt });
    return;
  }
  const reward = DAILY_WHEEL_REWARDS[Math.floor(Math.random() * DAILY_WHEEL_REWARDS.length)]!;
  const rewards = DAILY_WHEEL_REWARDS;
  const [updated] = await db.update(usersTable)
    .set({ coins: sql`${usersTable.coins} + ${reward}`, lastDailyWheelAt: new Date(now) })
    .where(eq(usersTable.id, req.user!.id))
    .returning();
  res.json({ reward, rewards, user: toPublicUser(updated!) });
});

router.get("/wheel/status", requireAuth, async (req: AuthedRequest, res) => {
  const last = req.user!.lastDailyWheelAt ? req.user!.lastDailyWheelAt.getTime() : 0;
  const nextAt = last + DAILY_WHEEL_COOLDOWN_MS;
  const available = Date.now() >= nextAt;
  res.json({ available, nextAt: new Date(nextAt).toISOString(), rewards: DAILY_WHEEL_REWARDS });
});

export default router;
