import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../lib/auth";
import { consumeLuckIfActive, playBlackjack, playCoinflip, playDice, playFreeThrow, playMines, playPlinko, recordGame, PLINKO_PAYOUTS_EXPORT } from "../lib/games";
import { toPublicUser } from "../lib/userPublic";
import { grantXp } from "../lib/xp";
import { recordTournamentScore } from "./tournaments";
import type { Response } from "express";

const XP_PER_GAME = 5;
const XP_PER_WIN = 10;

const router = Router();

async function finishGame(opts: {
  user: Parameters<typeof recordGame>[0]["user"];
  game: string;
  bet: number;
  payout: number;
  won: boolean;
  consumedLuck: boolean;
}) {
  const updated = await recordGame(opts);
  const xp = XP_PER_GAME + (opts.won ? XP_PER_WIN : 0);
  const { user: withXp } = await grantXp(updated.id, xp);
  await recordTournamentScore({ userId: updated.id, game: opts.game, won: opts.won, netWin: opts.payout - opts.bet });
  return withXp;
}

function reqInt(v: unknown, name: string, min: number, max: number): { ok: true; value: number } | { ok: false; error: string } {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return { ok: false, error: `${name} must be an integer.` };
  if (n < min || n > max) return { ok: false, error: `${name} must be between ${min} and ${max}.` };
  return { ok: true, value: n };
}

function checkBet(req: AuthedRequest, res: Response, max = 1_000_000): number | null {
  const r = reqInt(req.body?.bet, "bet", 1, max);
  if (!r.ok) { res.status(400).json({ error: r.error }); return null; }
  if (r.value > req.user!.coins) { res.status(400).json({ error: "Not enough coins." }); return null; }
  return r.value;
}

router.post("/games/coinflip", requireAuth, async (req: AuthedRequest, res) => {
  const bet = checkBet(req, res);
  if (bet == null) return;
  const pick = req.body?.pick === "tails" ? "tails" : "heads";
  const lucky = consumeLuckIfActive(req.user!);
  const r = playCoinflip({ bet, pick, lucky });
  const updated = await finishGame({ user: req.user!, game: "coinflip", bet, payout: r.payout, won: r.won, consumedLuck: lucky });
  res.json({ ...r, lucky, user: toPublicUser(updated) });
});

router.post("/games/dice", requireAuth, async (req: AuthedRequest, res) => {
  const bet = checkBet(req, res);
  if (bet == null) return;
  const target = reqInt(req.body?.target, "target", 2, 99);
  if (!target.ok) { res.status(400).json({ error: target.error }); return; }
  const direction = req.body?.direction === "under" ? "under" : "over";
  const lucky = consumeLuckIfActive(req.user!);
  const r = playDice({ bet, target: target.value, direction, lucky });
  const updated = await finishGame({ user: req.user!, game: "dice", bet, payout: r.payout, won: r.won, consumedLuck: lucky });
  res.json({ ...r, lucky, user: toPublicUser(updated) });
});

router.post("/games/plinko", requireAuth, async (req: AuthedRequest, res) => {
  const bet = checkBet(req, res);
  if (bet == null) return;
  const lucky = consumeLuckIfActive(req.user!);
  const r = playPlinko({ bet, lucky });
  const updated = await finishGame({ user: req.user!, game: "plinko", bet, payout: r.payout, won: r.won, consumedLuck: lucky });
  res.json({ ...r, lucky, user: toPublicUser(updated) });
});

router.get("/games/plinko/config", (_req, res) => {
  res.json({ payouts: PLINKO_PAYOUTS_EXPORT, rows: 12 });
});

router.post("/games/mines", requireAuth, async (req: AuthedRequest, res) => {
  const bet = checkBet(req, res);
  if (bet == null) return;
  const mines = reqInt(req.body?.mines, "mines", 1, 24);
  if (!mines.ok) { res.status(400).json({ error: mines.error }); return; }
  const picked = Array.isArray(req.body?.picks) ? req.body.picks.map((x: unknown) => Number(x)).filter((n: number) => Number.isInteger(n)) : [];
  if (picked.length === 0) { res.status(400).json({ error: "Pick at least one tile." }); return; }
  const lucky = consumeLuckIfActive(req.user!);
  const r = playMines({ bet, mines: mines.value, pickedIndexes: picked, lucky });
  const updated = await finishGame({ user: req.user!, game: "mines", bet, payout: r.payout, won: r.won, consumedLuck: lucky });
  res.json({ ...r, lucky, user: toPublicUser(updated) });
});

router.post("/games/freethrow", requireAuth, async (req: AuthedRequest, res) => {
  const bet = checkBet(req, res);
  if (bet == null) return;
  const lucky = consumeLuckIfActive(req.user!);
  const r = playFreeThrow({ bet, lucky });
  const updated = await finishGame({ user: req.user!, game: "freethrow", bet, payout: r.payout, won: r.won, consumedLuck: lucky });
  res.json({ ...r, lucky, user: toPublicUser(updated) });
});

router.post("/games/blackjack", requireAuth, async (req: AuthedRequest, res) => {
  const bet = checkBet(req, res);
  if (bet == null) return;
  const lucky = consumeLuckIfActive(req.user!);
  const r = playBlackjack({ bet, lucky });
  const updated = await finishGame({ user: req.user!, game: "blackjack", bet, payout: r.payout, won: r.won, consumedLuck: lucky });
  res.json({ ...r, lucky, user: toPublicUser(updated) });
});

export default router;
