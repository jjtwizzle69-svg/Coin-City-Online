import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { CareerQuestStatus, DailyQuestStatus, PublicUser } from "@/lib/types";
import { CoinDisplay } from "@/components/CoinDisplay";
import { TagBadge } from "@/components/TagBadge";
import { useCatalog } from "@/lib/catalog-context";

export default function QuestsPage() {
  const { setUser } = useAuth();
  const { tags } = useCatalog();
  const [daily, setDaily] = useState<DailyQuestStatus[]>([]);
  const [career, setCareer] = useState<CareerQuestStatus[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ daily: DailyQuestStatus[]; career: CareerQuestStatus[] }>("/quests");
      setDaily(r.daily);
      setCareer(r.career);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function claimDaily(key: string) {
    setError(null);
    try {
      const r = await api.post<{ rewardCoins: number; user: PublicUser }>(`/quests/daily/${key}/claim`);
      setUser(r.user);
      await load();
    } catch (e) { setError(e instanceof ApiError ? e.message : "Failed."); }
  }
  async function claimCareer(key: string) {
    setError(null);
    try {
      const r = await api.post<{ rewardCoins: number; tagId: string; user: PublicUser }>(`/quests/career/${key}/claim`);
      setUser(r.user);
      await load();
    } catch (e) { setError(e instanceof ApiError ? e.message : "Failed."); }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardHeader><CardTitle className="text-base">Daily Quests</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {daily.map((q) => (
            <div key={q.quest.key} className="flex items-center gap-3 p-3 rounded border border-slate-800 bg-slate-950/40">
              <div className="flex-1">
                <div className="font-medium">{q.quest.name}</div>
                <div className="text-xs text-slate-400">{q.quest.description}</div>
                <div className="mt-1 h-1.5 bg-slate-800 rounded overflow-hidden"><div className="h-full bg-amber-400" style={{ width: `${Math.min(100, (q.progress / q.target) * 100)}%` }} /></div>
                <div className="mt-1 text-xs text-slate-500 tabular-nums">{q.progress.toLocaleString()} / {q.target.toLocaleString()}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <CoinDisplay amount={q.quest.rewardCoins} size={12} className="text-amber-200" />
                {q.claimed ? (
                  <span className="text-xs text-emerald-300">Claimed</span>
                ) : q.complete ? (
                  <Button size="sm" onClick={() => claimDaily(q.quest.key)} className="bg-amber-500 hover:bg-amber-400 text-slate-950">Claim</Button>
                ) : (
                  <Button size="sm" disabled className="bg-slate-700 text-slate-400">In Progress</Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardHeader><CardTitle className="text-base">Career Quests</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {career.map((q) => {
            const tag = tags.find((t) => t.id === q.quest.tagId);
            return (
              <div key={q.quest.key} className="flex items-center gap-3 p-3 rounded border border-slate-800 bg-slate-950/40">
                <div className="flex-1">
                  <div className="flex items-center gap-2"><span className="font-medium">{q.quest.name}</span>{tag && <TagBadge tag={tag} />}</div>
                  <div className="text-xs text-slate-400">{q.quest.description}</div>
                  <div className="mt-1 h-1.5 bg-slate-800 rounded overflow-hidden"><div className="h-full bg-violet-400" style={{ width: `${Math.min(100, (q.progress / q.target) * 100)}%` }} /></div>
                  <div className="mt-1 text-xs text-slate-500 tabular-nums">{q.progress.toLocaleString()} / {q.target.toLocaleString()}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <CoinDisplay amount={q.quest.rewardCoins} size={12} className="text-amber-200" />
                  {q.claimed ? (
                    <span className="text-xs text-emerald-300">Claimed</span>
                  ) : q.complete ? (
                    <Button size="sm" onClick={() => claimCareer(q.quest.key)} className="bg-amber-500 hover:bg-amber-400 text-slate-950">Claim</Button>
                  ) : (
                    <Button size="sm" disabled className="bg-slate-700 text-slate-400">Locked</Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
      {error && <p className="text-sm text-rose-400">{error}</p>}
    </div>
  );
}
