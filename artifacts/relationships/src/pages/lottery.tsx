import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { LotteryStatus, PublicUser } from "@/lib/types";
import { CoinDisplay } from "@/components/CoinDisplay";
import { Sparkles, Ticket, Trophy } from "lucide-react";

function formatTimeLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "ending soon";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${d}d ${h}h ${m}m`;
}

export default function LotteryPage() {
  const { user, setUser } = useAuth();
  const [data, setData] = useState<LotteryStatus | null>(null);
  const [coins, setCoins] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get<LotteryStatus>("/lottery");
      setData(r);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { void load(); const id = setInterval(load, 15000); return () => clearInterval(id); }, [load]);

  async function buy() {
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const r = await api.post<{ user: PublicUser }>("/lottery/buy", { coins });
      setUser(r.user);
      setSuccess(`Entered ${coins.toLocaleString()} coins. +10 games of 2x luck!`);
      await load();
    } catch (e) { setError(e instanceof ApiError ? e.message : "Failed."); }
    finally { setBusy(false); }
  }

  async function settleNow() {
    if (!confirm("Settle this round now?")) return;
    try { await api.post("/lottery/settle-now"); await load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Failed."); }
  }

  if (!data) return <div className="text-slate-400">Loading lottery...</div>;
  const myShare = data.round.totalCoins > 0 ? (data.round.myCoins / data.round.totalCoins) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-amber-500/20 to-orange-600/20 border-amber-500/40 text-slate-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Ticket className="w-5 h-5 text-amber-300" /> Weekly Lottery</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-3 text-center">
            <div><div className="text-xs text-amber-200/80">Pot</div><div className="text-2xl font-extrabold"><CoinDisplay amount={data.round.totalCoins} size={20} /></div></div>
            <div><div className="text-xs text-amber-200/80">Players</div><div className="text-2xl font-extrabold">{data.round.participants}</div></div>
            <div><div className="text-xs text-amber-200/80">Time Left</div><div className="text-2xl font-extrabold">{formatTimeLeft(data.round.endsAt)}</div></div>
          </div>
          <div className="mt-4 text-sm text-slate-200">Your stake: <CoinDisplay amount={data.round.myCoins} size={12} className="text-amber-200" /> ({myShare.toFixed(2)}% odds for grand prize)</div>
          <p className="mt-2 text-xs text-amber-100/80">80% to a random weighted winner · 9% / 9% to two more · 2% to Noah · resets every 7 days. Buying entries grants <span className="text-emerald-300">2x luck</span> for your next 10 games.</p>

          <div className="mt-4 grid sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <Label className="text-amber-200/90">Buy entries</Label>
              <Input type="number" min={1} max={user?.coins ?? 1} value={coins} onChange={(e) => setCoins(Math.max(1, Math.floor(Number(e.target.value) || 1)))} className="bg-slate-950/60 border-amber-700/40" />
              <div className="flex gap-2 mt-2">
                {[100, 500, 1000, 5000].map((v) => <Button key={v} type="button" variant="ghost" size="sm" className="text-amber-200 hover:bg-amber-500/10" onClick={() => setCoins(v)}>{v}</Button>)}
              </div>
            </div>
            <Button onClick={buy} disabled={busy || coins > (user?.coins ?? 0)} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold h-10">
              <Sparkles className="w-4 h-4 mr-1" /> Buy Entries
            </Button>
          </div>
          {success && <p className="text-sm text-emerald-300 mt-2">{success}</p>}
          {error && <p className="text-sm text-rose-400 mt-2">{error}</p>}
          {user?.isAdmin && <Button onClick={settleNow} variant="outline" size="sm" className="mt-4 border-amber-500/40 text-amber-200 hover:bg-amber-500/10">Force Settle Round (admin)</Button>}
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-300" /> Past Rounds</CardTitle></CardHeader>
        <CardContent>
          {data.pastWinners.length === 0 ? <p className="text-sm text-slate-400">No past rounds yet.</p> : (
            <div className="space-y-3">
              {data.pastWinners.map((p) => (
                <div key={p.id} className="rounded border border-slate-800 bg-slate-950/40 p-3 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Pot</span><CoinDisplay amount={p.totalCoins} size={12} className="text-amber-200" /></div>
                  <div className="text-xs text-slate-500 mt-1">{new Date(p.endedAt).toLocaleString()}</div>
                  <ul className="mt-2 space-y-1">
                    {p.winners.map((w, i) => (
                      <li key={i} className="flex justify-between"><span>{w.displayName} <span className="text-xs text-slate-500">({(w.share * 100).toFixed(0)}%)</span></span><CoinDisplay amount={w.coins} size={11} className="text-amber-300" /></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
