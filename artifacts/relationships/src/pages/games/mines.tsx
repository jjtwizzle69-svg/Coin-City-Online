import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { PublicUser } from "@/lib/types";
import { Coin, CoinDisplay } from "@/components/CoinDisplay";
import { Bomb, Gem } from "lucide-react";

const TOTAL = 25;

type Phase = "betting" | "playing" | "resolved";

export default function MinesGame() {
  const { user, setUser } = useAuth();
  const [bet, setBet] = useState(50);
  const [mines, setMines] = useState(3);
  const [phase, setPhase] = useState<Phase>("betting");
  const [picks, setPicks] = useState<Set<number>>(new Set());
  const [reveal, setReveal] = useState<{ minePositions: number[]; safePicks: number[]; hitMine: number; multiplier: number; payout: number; won: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function start() {
    setPhase("playing");
    setPicks(new Set());
    setReveal(null);
    setError(null);
  }

  function togglePick(idx: number) {
    if (phase !== "playing") return;
    setPicks((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }

  // Estimated multiplier client-side (matches server formula minus house edge)
  const safeCount = picks.size;
  const estMult = (() => {
    if (safeCount === 0) return 0;
    let m = 1;
    for (let i = 0; i < safeCount; i++) m *= (TOTAL - i) / (TOTAL - mines - i);
    return m * 0.97;
  })();

  async function cashOut() {
    if (picks.size === 0) { setError("Pick at least one tile."); return; }
    setError(null);
    setBusy(true);
    try {
      const r = await api.post<{ minePositions: number[]; safePicks: number[]; hitMine: number; multiplier: number; payout: number; won: boolean; user: PublicUser }>("/games/mines", { bet, mines, picks: [...picks] });
      setReveal(r);
      setUser(r.user);
      setPhase("resolved");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Mines</h1>
      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardHeader><CardTitle className="text-base">Pick safe tiles, then cash out</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <Label className="text-slate-300">Bet</Label>
              <Input type="number" min={1} disabled={phase === "playing"} value={bet} onChange={(e) => setBet(Math.max(1, Math.floor(Number(e.target.value) || 1)))} className="bg-slate-950/60 border-slate-700" />
            </div>
            <div>
              <Label className="text-slate-300">Mines (1-24)</Label>
              <Input type="number" min={1} max={24} disabled={phase === "playing"} value={mines} onChange={(e) => setMines(Math.max(1, Math.min(24, Math.floor(Number(e.target.value) || 1))))} className="bg-slate-950/60 border-slate-700" />
            </div>
          </div>
          <div className="flex gap-2 mb-3">
            {[10, 50, 100, 500].map((v) => (
              <Button key={v} type="button" variant="ghost" size="sm" disabled={phase === "playing"} className="text-slate-400 hover:text-white" onClick={() => setBet(v)}>
                <Coin size={12} />&nbsp;{v}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {Array.from({ length: TOTAL }).map((_, idx) => {
              const picked = picks.has(idx);
              const showMine = reveal?.minePositions.includes(idx);
              const wasHit = reveal?.hitMine === idx;
              const wasSafePick = reveal?.safePicks.includes(idx);
              return (
                <button
                  key={idx}
                  onClick={() => togglePick(idx)}
                  disabled={phase !== "playing"}
                  className={`aspect-square rounded-lg flex items-center justify-center transition-all border ${
                    showMine
                      ? wasHit
                        ? "bg-rose-600 border-rose-300"
                        : "bg-rose-900/60 border-rose-700"
                      : wasSafePick || (picked && phase === "playing")
                      ? "bg-emerald-600 border-emerald-300"
                      : "bg-slate-800 border-slate-700 hover:bg-slate-700"
                  }`}
                >
                  {showMine ? <Bomb className="w-5 h-5 text-white" /> : (wasSafePick || picked) ? <Gem className="w-5 h-5 text-white" /> : null}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm mb-3">
            <div className="bg-slate-950/40 rounded p-2"><div className="text-xs text-slate-400">Picked</div><div className="font-semibold">{safeCount}</div></div>
            <div className="bg-slate-950/40 rounded p-2"><div className="text-xs text-slate-400">Multiplier</div><div className="font-semibold">{estMult.toFixed(2)}x</div></div>
            <div className="bg-slate-950/40 rounded p-2"><div className="text-xs text-slate-400">Cash Out</div><div className="font-semibold text-amber-200">{Math.floor(bet * estMult).toLocaleString()}</div></div>
          </div>
          <div className="flex gap-3">
            {phase !== "playing" ? (
              <Button onClick={start} disabled={(user?.coins ?? 0) < bet} className="flex-1 bg-rose-500 hover:bg-rose-400 text-white font-semibold">Start Round</Button>
            ) : (
              <Button onClick={cashOut} disabled={busy} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold">{busy ? "..." : "Reveal"}</Button>
            )}
          </div>
          {reveal && (
            <div className={`mt-3 text-center font-semibold ${reveal.won ? "text-emerald-400" : "text-rose-400"}`}>
              {reveal.won ? `Cashed out +${(reveal.payout - bet).toLocaleString()} (${reveal.multiplier}x)` : `Hit a mine — lost ${bet.toLocaleString()}`}
            </div>
          )}
          {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
          <div className="mt-2 text-sm text-slate-400 flex items-center gap-2">Balance: <CoinDisplay amount={user?.coins ?? 0} className="text-amber-200" /></div>
        </CardContent>
      </Card>
    </div>
  );
}
