import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { ITEMS, TAGS } from "../lib/catalog";
import { requireAdmin, type AuthedRequest } from "../lib/auth";
import { toPublicUser } from "../lib/userPublic";

const router = Router();

router.post("/admin/set-coins", requireAdmin, async (req: AuthedRequest, res) => {
  const userIdRaw = req.body?.userId;
  const targetId = (typeof userIdRaw === "string" && userIdRaw) ? userIdRaw : req.user!.id;
  const coins = Math.max(0, Math.floor(Number(req.body?.coins ?? 0)));
  if (!Number.isFinite(coins)) { res.status(400).json({ error: "Invalid coins." }); return; }
  const [updated] = await db.update(usersTable).set({ coins }).where(eq(usersTable.id, targetId)).returning();
  if (!updated) { res.status(404).json({ error: "User not found." }); return; }
  res.json({ user: toPublicUser(updated) });
});

router.post("/admin/gift", requireAdmin, async (req: AuthedRequest, res) => {
  const targetId = String(req.body?.userId ?? "");
  const coins = Math.max(1, Math.floor(Number(req.body?.coins ?? 0)));
  if (!targetId || !Number.isFinite(coins)) { res.status(400).json({ error: "Invalid input." }); return; }
  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, targetId));
  if (!target) { res.status(404).json({ error: "User not found." }); return; }
  const [updated] = await db.update(usersTable).set({ coins: target.coins + coins }).where(eq(usersTable.id, targetId)).returning();
  res.json({ user: toPublicUser(updated!) });
});

router.post("/admin/set-luck", requireAdmin, async (req: AuthedRequest, res) => {
  const userIdRaw = req.body?.userId;
  const targetId = (typeof userIdRaw === "string" && userIdRaw) ? userIdRaw : req.user!.id;
  const minutes = Math.floor(Number(req.body?.minutes ?? 0));
  if (!Number.isFinite(minutes) || minutes < 0 || minutes > 60 * 24 * 30) {
    res.status(400).json({ error: "Minutes must be between 0 and 43200." }); return;
  }
  const luckUntil = minutes > 0 ? new Date(Date.now() + minutes * 60_000) : null;
  const [updated] = await db.update(usersTable).set({ luckUntil }).where(eq(usersTable.id, targetId)).returning();
  if (!updated) { res.status(404).json({ error: "User not found." }); return; }
  res.json({ user: toPublicUser(updated) });
});

router.post("/admin/grant-all", requireAdmin, async (req: AuthedRequest, res) => {
  const targetId = String(req.body?.userId ?? req.user!.id);
  const allItemIds = ITEMS.map(i => i.id);
  const allTagIds = TAGS.map(t => t.id);
  const [updated] = await db.update(usersTable).set({ ownedItems: allItemIds, ownedTags: allTagIds }).where(eq(usersTable.id, targetId)).returning();
  if (!updated) { res.status(404).json({ error: "User not found." }); return; }
  res.json({ user: toPublicUser(updated) });
});

export default router;
