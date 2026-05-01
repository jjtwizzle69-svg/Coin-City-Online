import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { PublicUser } from "@/lib/types";
import { Coin, CoinDisplay } from "@/components/CoinDisplay";

export default function CoinflipGame() {
  const { user, setUser } = useAuth();
  const [bet, setBet] = useState(50);
  const [pick, setPick] = useState<"heads" | "tails">("heads");
  const [result, setResult] = useState<{ result: "heads" | "tails"; won: boolean; payout: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function play() {
    setError(null);
    setResult(null);
    setBusy(true);
    setFlipping(true);
    try {
      const r = await api.post<{ result: "heads" | "tails"; won: boolean; payout: number; user: PublicUser }>("/games/coinflip", { bet, pick });
      // brief animation
      await new Promise((res) => setTimeout(res, 1500));
      setResult({ result: r.result, won: r.won, payout: r.payout });
      setUser(r.user);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to play.");
    } finally {
      setBusy(false);
      setFlipping(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Heads or Tails</h1>
      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardHeader>
          <CardTitle className="text-base">Pick a side · 2x payout on win</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-6 py-6">
            <div className="relative w-32 h-32" style={{ perspective: "800px" }}>
              <div
                className="w-32 h-32 rounded-full transition-transform duration-[1500ms]"
                style={{
                  transformStyle: "preserve-3d",
                  transform: flipping
                    ? "rotateY(1800deg)"
                    : `rotateY(${result ? (result.result === "heads" ? 0 : 180) : 0}deg)`,
                }}
              >
                <div className="absolute inset-0 rounded-full flex items-center justify-center font-extrabold text-4xl bg-gradient-to-br from-amber-300 to-amber-600 text-amber-900 border-4 border-amber-700" style={{ backfaceVisibility: "hidden" }}>H</div>
                <div className="absolute inset-0 rounded-full flex items-center justify-center font-extrabold text-4xl bg-gradient-to-br from-amber-300 to-amber-600 text-amber-900 border-4 border-amber-700" style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}>T</div>
              </div>
            </div>
            {result && !flipping && (
              <div className="text-center">
                <div className={`text-xl font-semibold ${result.won ? "text-emerald-400" : "text-rose-400"}`}>{result.won ? `Won +${(result.payout - bet).toLocaleString()}` : `Lost -${bet.toLocaleString()}`}</div>
                <div className="text-sm text-slate-400">It landed on {result.result.toUpperCase()}</div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant={pick === "heads" ? "default" : "outline"} className={pick === "heads" ? "bg-amber-500 hover:bg-amber-400 text-slate-950" : "border-slate-700 text-slate-300 hover:bg-slate-800"} onClick={() => setPick("heads")}>Heads</Button>
            <Button variant={pick === "tails" ? "default" : "outline"} className={pick === "tails" ? "bg-amber-500 hover:bg-amber-400 text-slate-950" : "border-slate-700 text-slate-300 hover:bg-slate-800"} onClick={() => setPick("tails")}>Tails</Button>
          </div>
          <div className="mt-4 grid sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-slate-300">Bet</Label>
              <Input type="number" min={1} max={user?.coins ?? 1} value={bet} onChange={(e) => setBet(Math.max(1, Math.floor(Number(e.target.value) || 1)))} className="bg-slate-950/60 border-slate-700" />
              <div className="flex gap-2">
                {[10, 100, 500, 1000].map((v) => (
                  <Button key={v} type="button" variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={() => setBet(v)}>
                    <Coin size={12} />&nbsp;{v}
                  </Button>
                ))}
                <Button type="button" variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={() => setBet(Math.floor((user?.coins ?? 0) / 2))}>½</Button>
                <Button type="button" variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={() => setBet(user?.coins ?? 1)}>Max</Button>
              </div>
            </div>
            <Button onClick={play} disabled={busy || !user || bet > (user?.coins ?? 0)} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold h-10">
              {busy ? "Flipping..." : "Flip Coin"}
            </Button>
          </div>
          {error && <p className="text-sm text-rose-400 mt-2">{error}</p>}
          {user && user.luckCharges > 0 && <p className="text-xs text-emerald-300 mt-2">2x luck active ({user.luckCharges} games left)</p>}
          <div className="mt-3 text-sm text-slate-400 flex items-center gap-2">
            Balance: <CoinDisplay amount={user?.coins ?? 0} className="text-amber-200" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
