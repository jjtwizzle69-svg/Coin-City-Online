import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, sessionsTable, usersTable, type UserRow } from "@workspace/db";

export function newId(prefix = "id"): string {
  return `${prefix}_${randomBytes(9).toString("base64url")}`;
}

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const useSalt = salt ?? randomBytes(16).toString("hex");
  const hash = scryptSync(password, useSalt, 64).toString("hex");
  return { hash, salt: useSalt };
}

export function verifyPassword(password: string, expectedHash: string, salt: string): boolean {
  const { hash } = hashPassword(password, salt);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(expectedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.insert(sessionsTable).values({ token, userId });
  return token;
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
}

export type AuthedRequest = Request & { user?: UserRow };

export function readToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    return auth.slice(7);
  }
  return null;
}

export async function loadUserFromRequest(req: Request): Promise<UserRow | null> {
  const token = readToken(req);
  if (!token) return null;
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, token));
  if (!session) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  return user ?? null;
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  const user = await loadUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.user = user;
  next();
}

export async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  const user = await loadUserFromRequest(req);
  if (!user || !user.isAdmin) {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  req.user = user;
  next();
}
