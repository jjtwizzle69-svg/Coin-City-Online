import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { PublicUser } from "@/lib/types";
import { Coin, CoinDisplay } from "@/components/CoinDisplay";

export default function FreeThrowGame() {
  const { user, setUser } = useAuth();
  const [bet, setBet] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shooting, setShooting] = useState(false);
  const [result, setResult] = useState<{ made: boolean; multiplier: number; payout: number } | null>(null);

  async function shoot() {
    setError(null);
    setBusy(true);
    setShooting(true);
    setResult(null);
    try {
      const r = await api.post<{ made: boolean; multiplier: number; payout: number; user: PublicUser }>("/games/freethrow", { bet });
      await new Promise((res) => setTimeout(res, 1100));
      setResult({ made: r.made, multiplier: r.multiplier, payout: r.payout });
      setUser(r.user);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed.");
    } finally {
      setBusy(false);
      setShooting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Free Throw</h1>
      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardHeader><CardTitle className="text-base">~6% chance · 5x to 25x payout on a make</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="relative h-72 bg-gradient-to-b from-sky-900/50 to-slate-900 rounded-lg overflow-hidden">
            {/* Hoop */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 w-32 h-16">
              <div className="w-full h-3 bg-zinc-300 rounded" />
              <div className="mx-auto w-24 border-2 border-rose-500 mt-1 h-2 rounded-b-md" />
              <div className="mx-auto w-20 h-10 border-x border-b border-zinc-200/40 rounded-b-md" />
            </div>
            {/* Ball */}
            <div
              className="absolute w-10 h-10 rounded-full bg-gradient-to-br from-orange-300 to-orange-700 border-2 border-orange-900 transition-all"
              style={{
                left: "50%",
                bottom: shooting ? "calc(100% - 110px)" : "20px",
                transform: shooting ? "translate(-50%, 0) rotate(900deg)" : "translate(-50%, 0)",
                transitionDuration: "1100ms",
                transitionTimingFunction: "cubic-bezier(0.2, 0.7, 0.3, 1)",
              }}
            >
              <div className="absolute inset-0 rounded-full border border-orange-900/50" />
              <div className="absolute inset-x-0 top-1/2 h-px bg-orange-900/50" />
            </div>
            {result && !shooting && (
              <div className={`absolute inset-x-0 bottom-2 text-center text-xl font-bold ${result.made ? "text-amber-300" : "text-rose-300"}`}>
                {result.made ? `SWISH! ${result.multiplier}x = +${(result.payout - bet).toLocaleString()}` : `Brick! -${bet.toLocaleString()}`}
              </div>
            )}
          </div>
          <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-slate-300">Bet</Label>
              <Input type="number" min={1} value={bet} onChange={(e) => setBet(Math.max(1, Math.floor(Number(e.target.value) || 1)))} className="bg-slate-950/60 border-slate-700" />
              <div className="flex gap-2">
                {[5, 20, 50, 100].map((v) => (
                  <Button key={v} type="button" variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={() => setBet(v)}><Coin size={12} />&nbsp;{v}</Button>
                ))}
              </div>
            </div>
            <Button onClick={shoot} disabled={busy || bet > (user?.coins ?? 0)} className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold h-10">{busy ? "Shooting..." : "Shoot"}</Button>
          </div>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <div className="text-sm text-slate-400 flex items-center gap-2">Balance: <CoinDisplay amount={user?.coins ?? 0} className="text-amber-200" /></div>
        </CardContent>
      </Card>
    </div>
  );
}
