import { Router } from "express";
import { and, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { db, broadcastsTable, friendshipsTable, tradesTable, usersTable } from "@workspace/db";
import { newId, requireAuth, type AuthedRequest } from "../lib/auth";
import { ITEM_BY_ID, isInappropriate } from "../lib/catalog";
import { toPublicUser } from "../lib/userPublic";

const router = Router();

router.get("/users/search", requireAuth, async (req: AuthedRequest, res) => {
  const q = String(req.query?.q ?? "").trim();
  if (!q) { res.json({ users: [] }); return; }
  const rows = await db.select().from(usersTable)
    .where(and(or(ilike(usersTable.username, `%${q}%`), ilike(usersTable.displayName, `%${q}%`))!, ne(usersTable.id, req.user!.id)))
    .limit(20);
  res.json({ users: rows.map(toPublicUser) });
});

router.get("/users/:id", requireAuth, async (req: AuthedRequest, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, String(req.params.id)));
  if (!user) { res.status(404).json({ error: "Not found." }); return; }
  res.json({ user: toPublicUser(user) });
});

// FRIENDSHIPS
async function getFriendshipBetween(a: string, b: string) {
  const [row] = await db.select().from(friendshipsTable)
    .where(or(
      and(eq(friendshipsTable.userId, a), eq(friendshipsTable.friendId, b)),
      and(eq(friendshipsTable.userId, b), eq(friendshipsTable.friendId, a)),
    )!);
  return row ?? null;
}

router.get("/friends", requireAuth, async (req: AuthedRequest, res) => {
  const me = req.user!.id;
  const all = await db.select().from(friendshipsTable)
    .where(or(eq(friendshipsTable.userId, me), eq(friendshipsTable.friendId, me))!);
  const friendIds = new Set<string>();
  for (const f of all) {
    friendIds.add(f.userId === me ? f.friendId : f.userId);
  }
  if (friendIds.size === 0) {
    res.json({ accepted: [], incoming: [], outgoing: [] });
    return;
  }
  const users = await db.select().from(usersTable).where(inArray(usersTable.id, [...friendIds]));
  const byId = new Map(users.map(u => [u.id, u]));
  const accepted: { user: ReturnType<typeof toPublicUser>; friendshipId: string }[] = [];
  const incoming: { user: ReturnType<typeof toPublicUser>; friendshipId: string }[] = [];
  const outgoing: { user: ReturnType<typeof toPublicUser>; friendshipId: string }[] = [];
  for (const f of all) {
    const otherId = f.userId === me ? f.friendId : f.userId;
    const other = byId.get(otherId);
    if (!other) continue;
    const pub = { user: toPublicUser(other), friendshipId: f.id };
    if (f.status === "accepted") accepted.push(pub);
    else if (f.status === "pending") {
      if (f.requestedBy === me) outgoing.push(pub);
      else incoming.push(pub);
    }
  }
  res.json({ accepted, incoming, outgoing });
});

router.post("/friends/request", requireAuth, async (req: AuthedRequest, res) => {
  const targetId = String(req.body?.userId ?? "");
  if (!targetId || targetId === req.user!.id) { res.status(400).json({ error: "Invalid target." }); return; }
  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, targetId));
  if (!target) { res.status(404).json({ error: "User not found." }); return; }
  const existing = await getFriendshipBetween(req.user!.id, targetId);
  if (existing) { res.status(409).json({ error: "Friendship already exists." }); return; }
  const id = newId("fr");
  await db.insert(friendshipsTable).values({
    id,
    userId: req.user!.id,
    friendId: targetId,
    status: "pending",
    requestedBy: req.user!.id,
  });
  res.json({ id });
});

router.post("/friends/:id/accept", requireAuth, async (req: AuthedRequest, res) => {
  const [f] = await db.select().from(friendshipsTable).where(eq(friendshipsTable.id, String(req.params.id)));
  if (!f) { res.status(404).json({ error: "Not found." }); return; }
  if (f.status !== "pending" || f.requestedBy === req.user!.id) {
    res.status(400).json({ error: "Cannot accept this." }); return;
  }
  if (f.userId !== req.user!.id && f.friendId !== req.user!.id) {
    res.status(403).json({ error: "Not yours." }); return;
  }
  await db.update(friendshipsTable).set({ status: "accepted" }).where(eq(friendshipsTable.id, f.id));
  res.json({ ok: true });
});

router.delete("/friends/:id", requireAuth, async (req: AuthedRequest, res) => {
  const [f] = await db.select().from(friendshipsTable).where(eq(friendshipsTable.id, String(req.params.id)));
  if (!f) { res.status(404).json({ error: "Not found." }); return; }
  if (f.userId !== req.user!.id && f.friendId !== req.user!.id) {
    res.status(403).json({ error: "Not yours." }); return;
  }
  await db.delete(friendshipsTable).where(eq(friendshipsTable.id, f.id));
  res.json({ ok: true });
});

// BROADCASTS — admin only, ephemeral. Frontend polls and shows for 5s.
router.get("/broadcasts", requireAuth, async (_req, res) => {
  const since = new Date(Date.now() - 6000);
  const rows = await db.select({
    id: broadcastsTable.id,
    fromUserId: broadcastsTable.fromUserId,
    message: broadcastsTable.message,
    createdAt: broadcastsTable.createdAt,
    fromUsername: usersTable.username,
    fromDisplayName: usersTable.displayName,
    fromTagId: usersTable.equippedTagId,
  })
  .from(broadcastsTable)
  .innerJoin(usersTable, eq(broadcastsTable.fromUserId, usersTable.id))
  .where(sql`${broadcastsTable.createdAt} >= ${since.toISOString()}`)
  .orderBy(desc(broadcastsTable.createdAt))
  .limit(20);
  res.json({ broadcasts: rows.map(r => ({
    id: r.id,
    fromUserId: r.fromUserId,
    fromUsername: r.fromUsername,
    fromDisplayName: r.fromDisplayName,
    fromTagId: r.fromTagId,
    message: r.message,
    createdAt: r.createdAt.toISOString(),
  })) });
});

router.post("/broadcasts", requireAuth, async (req: AuthedRequest, res) => {
  if (!req.user!.isAdmin) { res.status(403).json({ error: "Admins only." }); return; }
  const message = String(req.body?.message ?? "").trim();
  if (!message || message.length > 200) { res.status(400).json({ error: "Message must be 1-200 chars." }); return; }
  const id = newId("bc");
  await db.insert(broadcastsTable).values({ id, fromUserId: req.user!.id, message });
  res.json({ id });
});

// TRADES
router.get("/trades", requireAuth, async (req: AuthedRequest, res) => {
  const me = req.user!.id;
  const rows = await db.select().from(tradesTable)
    .where(or(eq(tradesTable.fromUserId, me), eq(tradesTable.toUserId, me))!)
    .orderBy(desc(tradesTable.createdAt))
    .limit(50);
  const otherIds = new Set(rows.map(r => (r.fromUserId === me ? r.toUserId : r.fromUserId)));
  const users = otherIds.size ? await db.select().from(usersTable).where(inArray(usersTable.id, [...otherIds])) : [];
  const byId = new Map(users.map(u => [u.id, u]));
  res.json({ trades: rows.map(t => ({
    id: t.id,
    fromUserId: t.fromUserId,
    toUserId: t.toUserId,
    status: t.status,
    offeredCoins: t.offeredCoins,
    requestedCoins: t.requestedCoins,
    offeredItems: t.offeredItems,
    requestedItems: t.requestedItems,
    message: t.message,
    createdAt: t.createdAt.toISOString(),
    direction: t.fromUserId === me ? "outgoing" : "incoming",
    other: byId.has(t.fromUserId === me ? t.toUserId : t.fromUserId) ? toPublicUser(byId.get(t.fromUserId === me ? t.toUserId : t.fromUserId)!) : null,
  })) });
});

router.post("/trades", requireAuth, async (req: AuthedRequest, res) => {
  const toUserId = String(req.body?.toUserId ?? "");
  if (!toUserId || toUserId === req.user!.id) { res.status(400).json({ error: "Invalid target." }); return; }
  const [other] = await db.select().from(usersTable).where(eq(usersTable.id, toUserId));
  if (!other) { res.status(404).json({ error: "User not found." }); return; }
  const offeredCoins = Math.max(0, Math.floor(Number(req.body?.offeredCoins ?? 0)));
  const requestedCoins = Math.max(0, Math.floor(Number(req.body?.requestedCoins ?? 0)));
  const offeredItems = Array.isArray(req.body?.offeredItems) ? req.body.offeredItems.map(String) : [];
  const requestedItems = Array.isArray(req.body?.requestedItems) ? req.body.requestedItems.map(String) : [];
  for (const it of offeredItems) {
    if (!ITEM_BY_ID.has(it)) { res.status(400).json({ error: `Unknown item ${it}` }); return; }
    if (!req.user!.ownedItems.includes(it) && !req.user!.isAdmin) { res.status(400).json({ error: "You don't own all offered items." }); return; }
  }
  for (const it of requestedItems) {
    if (!ITEM_BY_ID.has(it)) { res.status(400).json({ error: `Unknown item ${it}` }); return; }
  }
  if (offeredCoins > req.user!.coins) { res.status(400).json({ error: "Not enough coins to offer." }); return; }
  const message = req.body?.message ? String(req.body.message).slice(0, 200) : null;
  const id = newId("tr");
  await db.insert(tradesTable).values({
    id, fromUserId: req.user!.id, toUserId, offeredCoins, requestedCoins, offeredItems, requestedItems, message, status: "pending",
  });
  res.json({ id });
});

router.post("/trades/:id/respond", requireAuth, async (req: AuthedRequest, res) => {
  const action = req.body?.action === "accept" ? "accept" : req.body?.action === "decline" ? "decline" : null;
  if (!action) { res.status(400).json({ error: "Action must be accept or decline." }); return; }
  const [trade] = await db.select().from(tradesTable).where(eq(tradesTable.id, String(req.params.id)));
  if (!trade) { res.status(404).json({ error: "Not found." }); return; }
  if (trade.status !== "pending") { res.status(400).json({ error: "Trade not pending." }); return; }
  if (trade.toUserId !== req.user!.id) { res.status(403).json({ error: "Not yours to respond." }); return; }

  if (action === "decline") {
    await db.update(tradesTable).set({ status: "declined", resolvedAt: new Date() }).where(eq(tradesTable.id, trade.id));
    res.json({ ok: true });
    return;
  }

  // accept — atomically move items + coins
  const [from] = await db.select().from(usersTable).where(eq(usersTable.id, trade.fromUserId));
  const [to] = await db.select().from(usersTable).where(eq(usersTable.id, trade.toUserId));
  if (!from || !to) { res.status(404).json({ error: "Users gone." }); return; }
  if (from.coins < trade.offeredCoins) { res.status(400).json({ error: "Sender no longer has the offered coins." }); return; }
  if (to.coins < trade.requestedCoins) { res.status(400).json({ error: "You don't have the requested coins." }); return; }
  for (const it of trade.offeredItems) {
    if (!from.ownedItems.includes(it) && !from.isAdmin) { res.status(400).json({ error: "Sender no longer owns offered items." }); return; }
  }
  for (const it of trade.requestedItems) {
    if (!to.ownedItems.includes(it) && !to.isAdmin) { res.status(400).json({ error: "You don't own all requested items." }); return; }
  }

  // remove offered from `from`, add to `to`. Skip movement of items the recipient already has.
  const fromOwnedAfter = from.ownedItems.filter(i => !trade.offeredItems.includes(i));
  const toOwnedAfter = Array.from(new Set([...to.ownedItems, ...trade.offeredItems]));
  // remove requested from `to`, add to `from`
  const toOwned2 = toOwnedAfter.filter(i => !trade.requestedItems.includes(i));
  const fromOwned2 = Array.from(new Set([...fromOwnedAfter, ...trade.requestedItems]));

  // Check that removed equipped items get reset to defaults if needed
  function fixEquipped(u: typeof from, removed: string[]) {
    const eq = { ...u.equippedItems };
    for (const slot of Object.keys(eq) as (keyof typeof eq)[]) {
      if (removed.includes(eq[slot])) {
        // fall back to default by slot
        if (slot === "skin") eq.skin = "skin_light";
        else if (slot === "hair") eq.hair = "hair_short_brown";
        else if (slot === "shirt") eq.shirt = "shirt_white";
        else if (slot === "pants") eq.pants = "pants_jeans";
        else if (slot === "face") eq.face = "face_smile";
      }
    }
    return eq;
  }
  const fromEquipped = fixEquipped(from, trade.offeredItems);
  const toEquipped = fixEquipped(to, trade.requestedItems);

  await db.transaction(async (tx) => {
    await tx.update(usersTable).set({
      coins: from.coins - trade.offeredCoins + trade.requestedCoins,
      ownedItems: fromOwned2,
      equippedItems: fromEquipped,
    }).where(eq(usersTable.id, from.id));
    await tx.update(usersTable).set({
      coins: to.coins - trade.requestedCoins + trade.offeredCoins,
      ownedItems: toOwned2,
      equippedItems: toEquipped,
    }).where(eq(usersTable.id, to.id));
    await tx.update(tradesTable).set({ status: "accepted", resolvedAt: new Date() }).where(eq(tradesTable.id, trade.id));
  });

  res.json({ ok: true });
});

router.post("/trades/:id/cancel", requireAuth, async (req: AuthedRequest, res) => {
  const [trade] = await db.select().from(tradesTable).where(eq(tradesTable.id, String(req.params.id)));
  if (!trade) { res.status(404).json({ error: "Not found." }); return; }
  if (trade.status !== "pending") { res.status(400).json({ error: "Trade not pending." }); return; }
  if (trade.fromUserId !== req.user!.id) { res.status(403).json({ error: "Not yours to cancel." }); return; }
  await db.update(tradesTable).set({ status: "cancelled", resolvedAt: new Date() }).where(eq(tradesTable.id, trade.id));
  res.json({ ok: true });
});

// Leaderboard — top by coins
router.get("/leaderboard", requireAuth, async (_req, res) => {
  const rows = await db.select().from(usersTable).orderBy(desc(usersTable.coins)).limit(20);
  res.json({ users: rows.map(toPublicUser) });
});

export default router;
