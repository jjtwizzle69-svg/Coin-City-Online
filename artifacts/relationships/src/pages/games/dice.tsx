import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { PublicUser } from "@/lib/types";
import { Coin, CoinDisplay } from "@/components/CoinDisplay";

export default function DiceGame() {
  const { user, setUser } = useAuth();
  const [bet, setBet] = useState(50);
  const [target, setTarget] = useState(50);
  const [direction, setDirection] = useState<"over" | "under">("over");
  const [last, setLast] = useState<{ roll: number; won: boolean; payout: number; multiplier: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const winChance = direction === "over" ? (100 - target) / 100 : (target - 1) / 100;
  const multiplier = useMemo(() => winChance > 0 ? Number(((1 / winChance) * 0.97).toFixed(2)) : 0, [winChance]);

  async function play() {
    setError(null);
    setBusy(true);
    try {
      const r = await api.post<{ roll: number; won: boolean; payout: number; multiplier: number; user: PublicUser }>("/games/dice", { bet, target, direction });
      setLast({ roll: r.roll, won: r.won, payout: r.payout, multiplier: r.multiplier });
      setUser(r.user);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dice Roll</h1>
      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardHeader><CardTitle className="text-base">Roll {direction} {target} to win</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* Slider visualization */}
          <div className="relative h-3 bg-slate-800 rounded-full">
            <div
              className={`absolute h-3 rounded-full ${direction === "over" ? "bg-emerald-500" : "bg-rose-500"}`}
              style={direction === "over" ? { left: `${target}%`, right: 0 } : { left: 0, width: `${target}%` }}
            />
            <input
              type="range" min={2} max={99} value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
            <div className="absolute -top-2 w-1 h-7 bg-amber-300 rounded" style={{ left: `calc(${target}% - 2px)` }} />
            {last && (
              <div className="absolute -bottom-7 text-sm font-bold" style={{ left: `calc(${last.roll}% - 12px)`, color: last.won ? "#34d399" : "#fb7185" }}>
                {last.roll}
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="bg-slate-950/40 rounded p-2"><div className="text-xs text-slate-400">Win Chance</div><div className="font-semibold">{(winChance * 100).toFixed(1)}%</div></div>
            <div className="bg-slate-950/40 rounded p-2"><div className="text-xs text-slate-400">Multiplier</div><div className="font-semibold">{multiplier.toFixed(2)}x</div></div>
            <div className="bg-slate-950/40 rounded p-2"><div className="text-xs text-slate-400">Win Payout</div><div className="font-semibold text-amber-200">{Math.floor(bet * multiplier).toLocaleString()}</div></div>
          </div>
          <div className="flex gap-3">
            <Button variant={direction === "over" ? "default" : "outline"} className={`flex-1 ${direction === "over" ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950" : "border-slate-700 text-slate-300 hover:bg-slate-800"}`} onClick={() => setDirection("over")}>Roll Over</Button>
            <Button variant={direction === "under" ? "default" : "outline"} className={`flex-1 ${direction === "under" ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950" : "border-slate-700 text-slate-300 hover:bg-slate-800"}`} onClick={() => setDirection("under")}>Roll Under</Button>
          </div>
          <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-slate-300">Bet</Label>
              <Input type="number" min={1} max={user?.coins ?? 1} value={bet} onChange={(e) => setBet(Math.max(1, Math.floor(Number(e.target.value) || 1)))} className="bg-slate-950/60 border-slate-700" />
              <div className="flex gap-2">
                {[10, 100, 500, 1000].map((v) => (
                  <Button key={v} type="button" variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={() => setBet(v)}>
                    <Coin size={12} />&nbsp;{v}
                  </Button>
                ))}
                <Button type="button" variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={() => setBet(user?.coins ?? 1)}>Max</Button>
              </div>
            </div>
            <Button onClick={play} disabled={busy || bet > (user?.coins ?? 0)} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold h-10">
              {busy ? "Rolling..." : "Roll Dice"}
            </Button>
          </div>
          {last && <div className={`text-center text-lg font-semibold ${last.won ? "text-emerald-400" : "text-rose-400"}`}>{last.won ? `+${(last.payout - bet).toLocaleString()} coins` : `-${bet.toLocaleString()} coins`} (rolled {last.roll})</div>}
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <div className="text-sm text-slate-400 flex items-center gap-2">
            Balance: <CoinDisplay amount={user?.coins ?? 0} className="text-amber-200" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
