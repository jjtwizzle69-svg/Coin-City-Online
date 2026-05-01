import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trophy, Clock, Medal, Star } from "lucide-react";
import { levelColor } from "@/lib/xp";

type TournamentRewards = {
  first: { coins: number; xp: number; tagId?: string };
  second: { coins: number; xp: number };
  third: { coins: number; xp: number };
  participation: { coins: number; xp: number };
};

type Tournament = {
  id: string;
  name: string;
  game: string;
  startAt: string;
  endAt: string;
  settled: boolean;
  rewards: TournamentRewards;
  status: "upcoming" | "active" | "ended";
};

type LeaderboardEntry = {
  entryId: string;
  userId: string;
  score: number;
  wins: number;
  username: string;
  displayName: string;
  level: number;
  equippedTagId: string;
};

const GAME_LABELS: Record<string, string> = {
  coinflip: "Coin Flip",
  dice: "Dice",
  plinko: "Plinko",
  mines: "Mines",
  freethrow: "Free Throw",
  blackjack: "Blackjack",
  any: "All Games",
};

const STATUS_COLORS: Record<string, string> = {
  active: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  upcoming: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  ended: "text-slate-400 bg-slate-800 border-slate-700",
};

function timeLeft(endAt: string): string {
  const ms = new Date(endAt).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function timeUntil(startAt: string): string {
  const ms = new Date(startAt).getTime() - Date.now();
  if (ms <= 0) return "Starting now";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 24) return `Starts in ${Math.floor(h / 24)}d`;
  if (h > 0) return `Starts in ${h}h ${m}m`;
  return `Starts in ${m}m`;
}

export default function TournamentsPage() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selected, setSelected] = useState<Tournament | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Admin create form
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createGame, setCreateGame] = useState("any");
  const [createDuration, setCreateDuration] = useState(60);
  const [createStartOffset, setCreateStartOffset] = useState(0);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ tournaments: Tournament[] }>("/tournaments")
      .then(r => setTournaments(r.tournaments))
      .catch(() => {});
  }, []);

  async function openTournament(t: Tournament) {
    setSelected(t);
    try {
      const r = await api.get<{ leaderboard: LeaderboardEntry[]; myRank: number | null }>(`/tournaments/${t.id}`);
      setLeaderboard(r.leaderboard);
      setMyRank(r.myRank);
    } catch { setError("Failed to load leaderboard."); }
  }

  async function createTournament() {
    setCreateError(null);
    try {
      const r = await api.post<{ tournament: Tournament }>("/admin/tournaments", {
        name: createName,
        game: createGame,
        durationMinutes: createDuration,
        startOffsetMinutes: createStartOffset,
      });
      setTournaments(prev => [{ ...r.tournament, status: "upcoming" }, ...prev]);
      setShowCreate(false);
      setCreateName("");
    } catch (e) { setCreateError(e instanceof ApiError ? e.message : "Failed."); }
  }

  const active = tournaments.filter(t => t.status === "active");
  const upcoming = tournaments.filter(t => t.status === "upcoming");
  const ended = tournaments.filter(t => t.status === "ended");

  const rankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-4 h-4 text-amber-400" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-slate-300" />;
    if (rank === 3) return <Medal className="w-4 h-4 text-amber-700" />;
    return <span className="text-xs text-slate-500 w-4 text-center">#{rank}</span>;
  };

  if (selected) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelected(null)} className="text-sm text-slate-400 hover:text-white flex items-center gap-1">← Back to tournaments</button>
        <Card className="bg-slate-900/60 border-slate-700 text-slate-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              {selected.name}
            </CardTitle>
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${STATUS_COLORS[selected.status]}`}>{selected.status.toUpperCase()}</span>
              <span>{GAME_LABELS[selected.game] ?? selected.game}</span>
              {selected.status === "active" && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeLeft(selected.endAt)} left</span>}
              {selected.status === "upcoming" && <span>{timeUntil(selected.startAt)}</span>}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-4 gap-2 text-center text-xs">
              {[
                { label: "🥇 1st", coins: selected.rewards.first.coins, xp: selected.rewards.first.xp },
                { label: "🥈 2nd", coins: selected.rewards.second.coins, xp: selected.rewards.second.xp },
                { label: "🥉 3rd", coins: selected.rewards.third.coins, xp: selected.rewards.third.xp },
                { label: "Others", coins: selected.rewards.participation.coins, xp: selected.rewards.participation.xp },
              ].map(r => (
                <div key={r.label} className="bg-slate-800/60 rounded p-2 space-y-1">
                  <div className="font-semibold">{r.label}</div>
                  <div className="text-amber-300">{r.coins.toLocaleString()} coins</div>
                  <div className="text-blue-300">{r.xp} XP</div>
                </div>
              ))}
            </div>
            {myRank && <p className="text-emerald-300 text-sm font-medium">Your rank: #{myRank}</p>}
            {error && <p className="text-rose-400 text-sm">{error}</p>}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Leaderboard</div>
              {leaderboard.length === 0 && (
                <div className="text-slate-500 text-sm py-4 text-center">No players yet. Play {GAME_LABELS[selected.game] ?? selected.game} to enter!</div>
              )}
              {leaderboard.map((e, i) => (
                <div key={e.entryId} className={`flex items-center gap-3 p-2 rounded border ${e.userId === user?.id ? "border-amber-500/40 bg-amber-500/5" : "border-slate-800 bg-slate-950/30"}`}>
                  <div className="w-6 flex justify-center">{rankIcon(i + 1)}</div>
                  <div className="flex-1">
                    <span className={`font-semibold text-sm ${levelColor(e.level)}`}>{e.displayName}</span>
                    <span className="text-xs text-slate-500 ml-1">@{e.username} · Lvl {e.level}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-300 text-sm font-semibold">{e.score.toLocaleString()} coins won</div>
                    <div className="text-xs text-slate-500">{e.wins} wins</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-400" /> Tournaments
        </h1>
        {user?.isAdmin && (
          <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
            {showCreate ? "Cancel" : "+ Create"}
          </Button>
        )}
      </div>

      {showCreate && (
        <Card className="bg-amber-500/10 border-amber-500/30 text-slate-100">
          <CardHeader><CardTitle className="text-base">Create Tournament</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Name</Label>
                <Input value={createName} onChange={e => setCreateName(e.target.value)} placeholder="Weekly Blackjack Bash" className="bg-slate-950/60 border-slate-700" />
              </div>
              <div>
                <Label>Game</Label>
                <select value={createGame} onChange={e => setCreateGame(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-950/60 text-slate-100 px-3 py-2 text-sm">
                  {Object.entries(GAME_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <Input type="number" min={5} max={10080} value={createDuration} onChange={e => setCreateDuration(Math.max(5, Number(e.target.value) || 60))} className="bg-slate-950/60 border-slate-700" />
              </div>
              <div>
                <Label>Starts in (minutes, 0 = now)</Label>
                <Input type="number" min={0} value={createStartOffset} onChange={e => setCreateStartOffset(Math.max(0, Number(e.target.value) || 0))} className="bg-slate-950/60 border-slate-700" />
              </div>
            </div>
            {createError && <p className="text-rose-400 text-sm">{createError}</p>}
            <Button onClick={createTournament} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">Create Tournament</Button>
          </CardContent>
        </Card>
      )}

      {active.length === 0 && upcoming.length === 0 && ended.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No tournaments yet. Check back soon!</p>
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide">Active</h2>
          {active.map(t => <TournamentCard key={t.id} t={t} onClick={() => openTournament(t)} />)}
        </div>
      )}
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wide">Upcoming</h2>
          {upcoming.map(t => <TournamentCard key={t.id} t={t} onClick={() => openTournament(t)} />)}
        </div>
      )}
      {ended.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Recent</h2>
          {ended.map(t => <TournamentCard key={t.id} t={t} onClick={() => openTournament(t)} />)}
        </div>
      )}
    </div>
  );
}

function TournamentCard({ t, onClick }: { t: Tournament; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left">
      <Card className={`bg-slate-900/60 border-slate-700 hover:border-amber-500/30 transition-colors text-slate-100`}>
        <CardContent className="p-4 flex items-center gap-4">
          <Trophy className={`w-8 h-8 shrink-0 ${t.status === "active" ? "text-amber-400" : t.status === "upcoming" ? "text-blue-400" : "text-slate-600"}`} />
          <div className="flex-1 min-w-0">
            <div className="font-semibold">{t.name}</div>
            <div className="text-sm text-slate-400">{GAME_LABELS[t.game] ?? t.game}</div>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-xs px-2 py-0.5 rounded border font-semibold ${STATUS_COLORS[t.status]}`}>{t.status.toUpperCase()}</div>
            {t.status === "active" && <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 justify-end"><Clock className="w-3 h-3" />{timeLeft(t.endAt)}</div>}
            {t.status === "upcoming" && <div className="text-xs text-slate-400 mt-1">{timeUntil(t.startAt)}</div>}
          </div>
          <div className="text-right shrink-0">
            <div className="text-amber-300 text-sm font-semibold">{t.rewards.first.coins.toLocaleString()}</div>
            <div className="text-xs text-slate-500">1st prize</div>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
