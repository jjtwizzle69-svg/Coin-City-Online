import { Router } from "express";
import { and, desc, eq, lt, or } from "drizzle-orm";
import { db, usersTable, worldChatTable, directMessagesTable, friendshipsTable } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../lib/auth";
import { newId } from "../lib/auth";
import { isInappropriate } from "../lib/catalog";

const router = Router();

// ── World Chat ──────────────────────────────────────────────────────────────

router.get("/chat/world", requireAuth, async (req: AuthedRequest, res) => {
  const before = req.query.before ? new Date(String(req.query.before)) : null;
  const rows = await db
    .select({
      id: worldChatTable.id,
      message: worldChatTable.message,
      createdAt: worldChatTable.createdAt,
      userId: worldChatTable.userId,
      username: usersTable.username,
      displayName: usersTable.displayName,
      isAdmin: usersTable.isAdmin,
      level: usersTable.level,
      equippedTagId: usersTable.equippedTagId,
    })
    .from(worldChatTable)
    .innerJoin(usersTable, eq(worldChatTable.userId, usersTable.id))
    .where(before ? lt(worldChatTable.createdAt, before) : undefined)
    .orderBy(desc(worldChatTable.createdAt))
    .limit(50);

  res.json({ messages: rows.reverse().map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  })) });
});

router.post("/chat/world", requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  const now = Date.now();

  // Check chat ban
  if (user.chatBannedUntil) {
    const bannedMs = user.chatBannedUntil.getTime();
    if (bannedMs > now) {
      const isPermanent = bannedMs > now + 1000 * 60 * 60 * 24 * 365 * 10;
      res.status(403).json({
        error: isPermanent
          ? `You are permanently banned from world chat. Reason: ${user.chatBanReason ?? "Violation of chat rules."}`
          : `You are suspended from world chat until ${user.chatBannedUntil.toISOString()}. Reason: ${user.chatBanReason ?? "Violation of chat rules."}`,
      });
      return;
    }
  }

  const message = String(req.body?.message ?? "").trim();
  if (!message || message.length < 1 || message.length > 300) {
    res.status(400).json({ error: "Message must be 1–300 characters." });
    return;
  }
  if (isInappropriate(message)) {
    res.status(400).json({ error: "Message contains banned words." });
    return;
  }

  const [row] = await db.insert(worldChatTable).values({
    id: newId("wc"),
    userId: user.id,
    message,
  }).returning();

  res.json({
    message: {
      id: row!.id,
      message: row!.message,
      createdAt: row!.createdAt.toISOString(),
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      isAdmin: user.isAdmin,
      level: user.level,
      equippedTagId: user.equippedTagId,
    },
  });
});

// ── DMs ──────────────────────────────────────────────────────────────────────

router.get("/chat/threads", requireAuth, async (req: AuthedRequest, res) => {
  const me = req.user!.id;
  // Get all accepted friends
  const friends = await db.select().from(friendshipsTable)
    .where(and(
      or(eq(friendshipsTable.userId, me), eq(friendshipsTable.friendId, me)),
      eq(friendshipsTable.status, "accepted"),
    ));

  const friendIds = friends.map(f => f.userId === me ? f.friendId : f.userId);

  if (friendIds.length === 0) { res.json({ threads: [] }); return; }

  // Last message per thread
  const threads = await Promise.all(friendIds.map(async (fid) => {
    const [last] = await db.select({
      id: directMessagesTable.id,
      message: directMessagesTable.message,
      createdAt: directMessagesTable.createdAt,
      fromUserId: directMessagesTable.fromUserId,
    }).from(directMessagesTable)
      .where(or(
        and(eq(directMessagesTable.fromUserId, me), eq(directMessagesTable.toUserId, fid)),
        and(eq(directMessagesTable.fromUserId, fid), eq(directMessagesTable.toUserId, me)),
      ))
      .orderBy(desc(directMessagesTable.createdAt))
      .limit(1);

    const [friendUser] = await db.select({
      id: usersTable.id,
      username: usersTable.username,
      displayName: usersTable.displayName,
      level: usersTable.level,
      equippedTagId: usersTable.equippedTagId,
    }).from(usersTable).where(eq(usersTable.id, fid));

    return {
      friendId: fid,
      friend: friendUser ?? null,
      lastMessage: last ? { ...last, createdAt: last.createdAt.toISOString() } : null,
    };
  }));

  res.json({ threads: threads.sort((a, b) => {
    const aTime = a.lastMessage?.createdAt ?? "";
    const bTime = b.lastMessage?.createdAt ?? "";
    return bTime.localeCompare(aTime);
  }) });
});

router.get("/chat/dm/:friendId", requireAuth, async (req: AuthedRequest, res) => {
  const me = req.user!.id;
  const fid = String(req.params.friendId);

  // Must be friends
  const [friendship] = await db.select().from(friendshipsTable)
    .where(and(
      or(
        and(eq(friendshipsTable.userId, me), eq(friendshipsTable.friendId, fid)),
        and(eq(friendshipsTable.userId, fid), eq(friendshipsTable.friendId, me)),
      ),
      eq(friendshipsTable.status, "accepted"),
    ));
  if (!friendship) { res.status(403).json({ error: "Not friends." }); return; }

  const before = req.query.before ? new Date(String(req.query.before)) : null;

  const rows = await db.select().from(directMessagesTable)
    .where(and(
      or(
        and(eq(directMessagesTable.fromUserId, me), eq(directMessagesTable.toUserId, fid)),
        and(eq(directMessagesTable.fromUserId, fid), eq(directMessagesTable.toUserId, me)),
      ),
      before ? lt(directMessagesTable.createdAt, before) : undefined,
    ))
    .orderBy(desc(directMessagesTable.createdAt))
    .limit(50);

  res.json({ messages: rows.reverse().map(r => ({ ...r, createdAt: r.createdAt.toISOString() })) });
});

router.post("/chat/dm/:friendId", requireAuth, async (req: AuthedRequest, res) => {
  const me = req.user!;
  const fid = String(req.params.friendId);

  const [friendship] = await db.select().from(friendshipsTable)
    .where(and(
      or(
        and(eq(friendshipsTable.userId, me.id), eq(friendshipsTable.friendId, fid)),
        and(eq(friendshipsTable.userId, fid), eq(friendshipsTable.friendId, me.id)),
      ),
      eq(friendshipsTable.status, "accepted"),
    ));
  if (!friendship) { res.status(403).json({ error: "Not friends." }); return; }

  const message = String(req.body?.message ?? "").trim();
  if (!message || message.length < 1 || message.length > 1000) {
    res.status(400).json({ error: "Message must be 1–1000 characters." });
    return;
  }
  if (isInappropriate(message)) {
    res.status(400).json({ error: "Message contains banned words." });
    return;
  }

  const [row] = await db.insert(directMessagesTable).values({
    id: newId("dm"),
    fromUserId: me.id,
    toUserId: fid,
    message,
  }).returning();

  res.json({ message: { ...row!, createdAt: row!.createdAt.toISOString() } });
});

// ── Admin moderation ─────────────────────────────────────────────────────────

router.post("/admin/chat-moderate", requireAuth, async (req: AuthedRequest, res) => {
  if (!req.user!.isAdmin) { res.status(403).json({ error: "Admin only." }); return; }
  const targetId = String(req.body?.userId ?? "");
  const action = String(req.body?.action ?? "");
  const reason = String(req.body?.reason ?? "").trim();
  const minutes = Math.floor(Number(req.body?.minutes ?? 0));

  if (!targetId) { res.status(400).json({ error: "userId required." }); return; }
  if (!["suspend", "ban", "unban"].includes(action)) { res.status(400).json({ error: "action must be suspend, ban, or unban." }); return; }
  if (action !== "unban" && !reason) { res.status(400).json({ error: "reason required." }); return; }

  let chatBannedUntil: Date | null = null;
  if (action === "suspend") {
    if (minutes < 1) { res.status(400).json({ error: "minutes must be >= 1 for suspend." }); return; }
    chatBannedUntil = new Date(Date.now() + minutes * 60_000);
  } else if (action === "ban") {
    chatBannedUntil = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 100); // ~100 years = permanent
  }

  const [updated] = await db.update(usersTable).set({
    chatBannedUntil,
    chatBanReason: action === "unban" ? null : reason,
  }).where(eq(usersTable.id, targetId)).returning();

  if (!updated) { res.status(404).json({ error: "User not found." }); return; }

  res.json({
    ok: true,
    action,
    chatBannedUntil: updated.chatBannedUntil ? updated.chatBannedUntil.toISOString() : null,
  });
});

export default router;
