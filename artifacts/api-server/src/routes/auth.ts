import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { createSession, deleteSession, hashPassword, loadUserFromRequest, newId, readToken, verifyPassword } from "../lib/auth";
import { isInappropriate } from "../lib/catalog";
import { toPublicUser } from "../lib/userPublic";

const router = Router();

const USERNAME_RE = /^[a-zA-Z0-9_]+$/;

function validateUsername(raw: unknown, allowReserved = false): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof raw !== "string") return { ok: false, error: "Username is required." };
  const v = raw.trim();
  if (v.length < 5 || v.length > 24) return { ok: false, error: "Username must be 5-24 characters." };
  if (!USERNAME_RE.test(v)) return { ok: false, error: "Username can only contain letters, numbers, and underscores." };
  if (!allowReserved && isInappropriate(v)) return { ok: false, error: "Username is not allowed." };
  return { ok: true, value: v };
}

function validateDisplayName(raw: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof raw !== "string") return { ok: false, error: "Display name is required." };
  const v = raw.trim();
  if (v.length < 2 || v.length > 15) return { ok: false, error: "Display name must be 2-15 characters." };
  if (isInappropriate(v)) return { ok: false, error: "Display name is not allowed." };
  return { ok: true, value: v };
}

function validatePassword(raw: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof raw !== "string") return { ok: false, error: "Password is required." };
  if (raw.length < 8 || raw.length > 64) return { ok: false, error: "Password must be 8-64 characters." };
  if (!/[a-zA-Z]/.test(raw) || !/[0-9]/.test(raw)) {
    return { ok: false, error: "Password must include at least one letter and one number." };
  }
  return { ok: true, value: raw };
}

router.post("/auth/signup", async (req, res) => {
  const u = validateUsername(req.body?.username);
  if (!u.ok) { res.status(400).json({ error: u.error }); return; }
  const d = validateDisplayName(req.body?.displayName);
  if (!d.ok) { res.status(400).json({ error: d.error }); return; }
  const p = validatePassword(req.body?.password);
  if (!p.ok) { res.status(400).json({ error: p.error }); return; }

  const usernameLower = u.value.toLowerCase();
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.usernameLower, usernameLower));
  if (existing) { res.status(409).json({ error: "Username is taken." }); return; }

  const { hash, salt } = hashPassword(p.value);
  const id = newId("usr");
  const [created] = await db.insert(usersTable).values({
    id,
    username: u.value,
    usernameLower,
    displayName: d.value,
    passwordHash: hash,
    passwordSalt: salt,
    coins: 1500,
    luckCharges: 0,
  }).returning();

  if (!created) { res.status(500).json({ error: "Failed to create user." }); return; }

  const token = await createSession(created.id);
  res.json({ token, user: toPublicUser(created) });
});

router.post("/auth/login", async (req, res) => {
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!username || !password) { res.status(400).json({ error: "Username and password required." }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.usernameLower, username.toLowerCase()));
  if (!user) { res.status(401).json({ error: "Invalid credentials." }); return; }
  if (!verifyPassword(password, user.passwordHash, user.passwordSalt)) {
    res.status(401).json({ error: "Invalid credentials." }); return;
  }

  const token = await createSession(user.id);
  res.json({ token, user: toPublicUser(user) });
});

router.post("/auth/logout", async (req, res) => {
  const token = readToken(req);
  if (token) await deleteSession(token);
  res.json({ ok: true });
});

router.get("/auth/me", async (req, res) => {
  const user = await loadUserFromRequest(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  res.json({ user: toPublicUser(user) });
});

router.post("/auth/check-username", async (req, res) => {
  const u = validateUsername(req.body?.username);
  if (!u.ok) { res.json({ available: false, error: u.error }); return; }
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.usernameLower, u.value.toLowerCase()));
  res.json({ available: !existing });
});

export default router;
