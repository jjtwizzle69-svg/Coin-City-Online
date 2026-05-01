import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../lib/auth";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { claimCareerQuest, claimDailyQuest, getCareerQuestStatuses, getDailyQuestStatuses, recentGameHistory } from "../lib/quests";
import { toPublicUser } from "../lib/userPublic";
import { grantXp } from "../lib/xp";

const router = Router();

router.get("/quests", requireAuth, async (req: AuthedRequest, res) => {
  const [daily, career] = await Promise.all([
    getDailyQuestStatuses(req.user!),
    getCareerQuestStatuses(req.user!),
  ]);
  res.json({ daily, career });
});

router.post("/quests/daily/:key/claim", requireAuth, async (req: AuthedRequest, res) => {
  const r = await claimDailyQuest(req.user!, String(req.params.key));
  if (!r.ok) { res.status(400).json({ error: r.error }); return; }
  const xp = Math.max(50, Math.round((r.rewardCoins ?? 0) / 4));
  const { user: withXp } = await grantXp(req.user!.id, xp);
  res.json({ rewardCoins: r.rewardCoins, xpGained: xp, user: toPublicUser(withXp) });
});

router.post("/quests/career/:key/claim", requireAuth, async (req: AuthedRequest, res) => {
  const r = await claimCareerQuest(req.user!, String(req.params.key));
  if (!r.ok) { res.status(400).json({ error: r.error }); return; }
  const xp = Math.max(150, Math.round((r.rewardCoins ?? 0) / 3));
  const { user: withXp } = await grantXp(req.user!.id, xp);
  res.json({ rewardCoins: r.rewardCoins, xpGained: xp, tagId: r.tagId, user: toPublicUser(withXp) });
});

router.get("/history", requireAuth, async (req: AuthedRequest, res) => {
  const history = await recentGameHistory(req.user!.id, 30);
  res.json({ history: history.map(h => ({
    id: h.id,
    game: h.game,
    betCoins: h.betCoins,
    payoutCoins: h.payoutCoins,
    won: h.won,
    createdAt: h.createdAt.toISOString(),
  })) });
});

export default router;
