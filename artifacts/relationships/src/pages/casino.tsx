import { Link } from "wouter";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GAMES } from "@/lib/catalog";
import { useAuth } from "@/lib/auth-context";
import { CoinDisplay } from "@/components/CoinDisplay";
import { api } from "@/lib/api";
import type { LotteryStatus, GameHistoryEntry } from "@/lib/types";
import { Sparkles, Ticket, Trophy } from "lucide-react";
import { Avatar } from "@/components/Avatar";

function formatTimeLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "0d 0h";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`;
}

export default function CasinoPage() {
  const { user } = useAuth();
  const [lottery, setLottery] = useState<LotteryStatus | null>(null);
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);
  const [leaders, setLeaders] = useState<{ id: string; displayName: string; coins: number }[]>([]);

  useEffect(() => {
    void api.get<LotteryStatus>("/lottery").then(setLottery).catch(() => null);
    void api.get<{ history: GameHistoryEntry[] }>("/history").then((r) => setHistory(r.history)).catch(() => null);
    void api.get<{ users: { id: string; displayName: string; coins: number }[] }>("/leaderboard").then((r) => setLeaders(r.users)).catch(() => null);
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-800 text-slate-100">
          <CardContent className="p-5 flex items-center gap-4">
            {user && <Avatar equipped={user.equippedItems} size={88} />}
            <div className="flex-1">
              <div className="text-sm text-slate-400">Welcome back,</div>
              <div className="text-2xl font-bold tracking-tight">{user?.displayName}</div>
              <div className="mt-2 flex items-center gap-3 text-sm">
                <CoinDisplay amount={user?.coins ?? 0} size={16} className="text-amber-200 font-semibold" />
                {user && user.luckCharges > 0 && (
                  <span className="inline-flex items-center gap-1 text-emerald-300">
                    <Sparkles className="w-4 h-4" /> 2x luck for {user.luckCharges} more games
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Link href="/lottery">
          <Card className="cursor-pointer bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/40 hover:from-amber-500/30 hover:to-orange-500/30 transition-colors text-slate-100">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-amber-300 font-semibold mb-1">
                <Ticket className="w-5 h-5" /> Weekly Lottery
              </div>
              <div className="text-3xl font-extrabold tracking-tight">
                <CoinDisplay amount={lottery?.round.totalCoins ?? 0} size={22} />
              </div>
              <div className="text-xs text-amber-200/80 mt-1">
                {lottery ? `${lottery.round.participants} players · ${formatTimeLeft(lottery.round.endsAt)} left` : "Loading..."}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">Games</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {GAMES.map((g) => (
            <Link key={g.id} href={`/games/${g.id}`}>
              <Card className={`cursor-pointer bg-gradient-to-br ${g.tone} border-slate-800 hover:border-slate-600 transition-colors text-slate-100`}>
                <CardHeader>
                  <CardTitle className="text-xl">{g.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-300">{g.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-slate-900 border-slate-800 text-slate-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="w-4 h-4 text-amber-400" /> Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leaders.length === 0 ? (
              <p className="text-sm text-slate-400">No players yet.</p>
            ) : (
              <ol className="space-y-2">
                {leaders.slice(0, 10).map((u, idx) => (
                  <li key={u.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-5 text-right text-slate-500">{idx + 1}.</span>
                      <span className="font-medium">{u.displayName}</span>
                    </span>
                    <CoinDisplay amount={u.coins} size={12} className="text-amber-200" />
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800 text-slate-100">
          <CardHeader>
            <CardTitle className="text-base">Recent Games</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-slate-400">Play a game to see history.</p>
            ) : (
              <ul className="space-y-1.5">
                {history.slice(0, 8).map((h) => {
                  const net = h.payoutCoins - h.betCoins;
                  return (
                    <li key={h.id} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{h.game}</span>
                      <span className={net > 0 ? "text-emerald-300 font-semibold" : net < 0 ? "text-rose-300" : "text-slate-400"}>
                        {net > 0 ? "+" : ""}{net.toLocaleString()}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
