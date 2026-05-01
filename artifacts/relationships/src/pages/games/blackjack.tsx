import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { PublicUser } from "@/lib/types";
import { Coin, CoinDisplay } from "@/components/CoinDisplay";

type CardT = { rank: string; value: number; suit: "S" | "H" | "D" | "C" };
type PlayResult = { player: CardT[]; dealer: CardT[]; playerTotal: number; dealerTotal: number; outcome: "win" | "lose" | "push" | "blackjack"; payout: number; won: boolean };

const SUIT_SYMBOL: Record<CardT["suit"], string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
const SUIT_COLOR: Record<CardT["suit"], string> = { S: "text-slate-900", H: "text-rose-600", D: "text-rose-600", C: "text-slate-900" };

function CardView({ card }: { card: CardT }) {
  return (
    <div className={`w-14 h-20 rounded-md bg-white shadow-md border border-slate-300 flex flex-col items-center justify-center font-bold ${SUIT_COLOR[card.suit]}`}>
      <span className="text-base">{card.rank}</span>
      <span className="text-xl leading-none">{SUIT_SYMBOL[card.suit]}</span>
    </div>
  );
}

export default function BlackjackGame() {
  const { user, setUser } = useAuth();
  const [bet, setBet] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlayResult | null>(null);

  async function play() {
    setError(null);
    setBusy(true);
    setResult(null);
    try {
      const r = await api.post<PlayResult & { user: PublicUser }>("/games/blackjack", { bet });
      setResult(r);
      setUser(r.user);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Blackjack</h1>
      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardHeader><CardTitle className="text-base">Auto-play vs dealer (dealer hits to 17)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-emerald-900/40 border border-emerald-800/60 rounded-lg p-4 min-h-[280px] flex flex-col gap-4">
            <div>
              <div className="text-xs text-emerald-200/70 mb-1">Dealer {result ? `(${result.dealerTotal})` : ""}</div>
              <div className="flex gap-2 flex-wrap min-h-[80px]">
                {result?.dealer.map((c, i) => <CardView key={i} card={c} />)}
              </div>
            </div>
            <div>
              <div className="text-xs text-emerald-200/70 mb-1">You {result ? `(${result.playerTotal})` : ""}</div>
              <div className="flex gap-2 flex-wrap min-h-[80px]">
                {result?.player.map((c, i) => <CardView key={i} card={c} />)}
              </div>
            </div>
            {result && (
              <div className={`text-center text-lg font-semibold ${result.won ? "text-amber-300" : result.outcome === "push" ? "text-slate-300" : "text-rose-300"}`}>
                {result.outcome === "blackjack" && `Blackjack! +${(result.payout - bet).toLocaleString()}`}
                {result.outcome === "win" && `You win +${(result.payout - bet).toLocaleString()}`}
                {result.outcome === "push" && `Push (returned ${result.payout.toLocaleString()})`}
                {result.outcome === "lose" && `Dealer wins -${bet.toLocaleString()}`}
              </div>
            )}
          </div>
          <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-slate-300">Bet</Label>
              <Input type="number" min={1} value={bet} onChange={(e) => setBet(Math.max(1, Math.floor(Number(e.target.value) || 1)))} className="bg-slate-950/60 border-slate-700" />
              <div className="flex gap-2">
                {[50, 100, 500, 1000].map((v) => (
                  <Button key={v} type="button" variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={() => setBet(v)}><Coin size={12} />&nbsp;{v}</Button>
                ))}
              </div>
            </div>
            <Button onClick={play} disabled={busy || bet > (user?.coins ?? 0)} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold h-10">{busy ? "Dealing..." : "Deal"}</Button>
          </div>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <div className="text-sm text-slate-400 flex items-center gap-2">Balance: <CoinDisplay amount={user?.coins ?? 0} className="text-amber-200" /></div>
        </CardContent>
      </Card>
    </div>
  );
}
