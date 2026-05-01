import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { useCatalog } from "@/lib/catalog-context";
import { Avatar } from "@/components/Avatar";
import { TagBadge } from "@/components/TagBadge";
import { CoinDisplay, Coin } from "@/components/CoinDisplay";
import { api, ApiError } from "@/lib/api";
import { FACE, HAIR, PANTS, SHIRT, SKIN_COLORS, SLOT_LABELS } from "@/lib/catalog";
import type { ItemSlot, PublicUser } from "@/lib/types";
import { Lock, Sparkles } from "lucide-react";
import LevelBadge from "@/components/LevelBadge";
import { xpProgress } from "@/lib/xp";

const SLOTS: ItemSlot[] = ["skin", "hair", "shirt", "pants", "face"];

function ItemPreview({ id, slot }: { id: string; slot: ItemSlot }) {
  if (slot === "skin") {
    return <div className="w-10 h-10 rounded-full" style={{ background: SKIN_COLORS[id] ?? "#ccc" }} />;
  }
  if (slot === "hair") {
    const h = HAIR[id];
    if (!h) return null;
    return <div className="w-10 h-10 rounded-full" style={{ background: h.gradient ? `linear-gradient(135deg, ${h.gradient[0]}, ${h.gradient[1]})` : h.color }} />;
  }
  if (slot === "shirt") {
    const s = SHIRT[id];
    if (!s) return null;
    return <div className="w-10 h-10 rounded" style={{ background: s.gradient ? `linear-gradient(135deg, ${s.gradient[0]}, ${s.gradient[1]})` : s.color }} />;
  }
  if (slot === "pants") {
    const p = PANTS[id];
    if (!p) return null;
    return <div className="w-10 h-10 rounded" style={{ background: p.gradient ? `linear-gradient(135deg, ${p.gradient[0]}, ${p.gradient[1]})` : p.color }} />;
  }
  if (slot === "face") {
    const f = FACE[id];
    if (!f) return null;
    return <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-xs font-semibold text-slate-900">{f.eyes === "shades" ? "😎" : f.eyes === "money" ? "💰" : f.eyes === "galaxy" ? "✨" : f.mouth === "smirk" ? "😏" : "🙂"}</div>;
  }
  return null;
}

export default function ProfilePage() {
  const { user, setUser, refresh } = useAuth();
  const { items, tags } = useCatalog();
  const [activeSlot, setActiveSlot] = useState<ItemSlot>("hair");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wheelStatus, setWheelStatus] = useState<{ available: boolean; nextAt: string; rewards: number[] } | null>(null);
  const [spinResult, setSpinResult] = useState<{ reward: number } | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");

  useEffect(() => { void api.get<{ available: boolean; nextAt: string; rewards: number[] }>("/wheel/status").then(setWheelStatus).catch(() => null); }, [user?.lastDailyWheelAt]);
  useEffect(() => { setDisplayName(user?.displayName ?? ""); }, [user?.displayName]);

  const itemsBySlot = useMemo(() => {
    const m: Record<ItemSlot, typeof items> = { skin: [], hair: [], shirt: [], pants: [], face: [] };
    for (const it of items) m[it.slot].push(it);
    return m;
  }, [items]);

  if (!user) return null;

  async function equip(itemId: string) {
    setError(null);
    try {
      const r = await api.put<{ user: PublicUser }>("/profile/equip", { itemId });
      setUser(r.user);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed.");
    }
  }
  async function buy(itemId: string) {
    setError(null);
    setBusy(true);
    try {
      const r = await api.post<{ user: PublicUser }>("/shop/buy", { itemId });
      setUser(r.user);
      await equip(itemId);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed.");
    } finally { setBusy(false); }
  }
  async function selectTag(tagId: string) {
    setError(null);
    try {
      const r = await api.put<{ user: PublicUser }>("/profile/tag", { tagId });
      setUser(r.user);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed.");
    }
  }
  async function saveName() {
    setError(null);
    try {
      const r = await api.put<{ user: PublicUser }>("/profile/display-name", { displayName });
      setUser(r.user);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed.");
    }
  }
  async function spin() {
    setError(null);
    setSpinning(true);
    setSpinResult(null);
    try {
      const r = await api.post<{ reward: number; user: PublicUser }>("/wheel/spin");
      setTimeout(() => {
        setSpinResult({ reward: r.reward });
        setUser(r.user);
        void refresh();
      }, 2000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed.");
    } finally {
      setTimeout(() => setSpinning(false), 2000);
    }
  }

  const wheelRewards = wheelStatus?.rewards ?? [];

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-slate-900 border-slate-800 text-slate-100">
          <CardContent className="p-5 flex flex-col items-center text-center">
            <Avatar equipped={user.equippedItems} size={160} />
            <div className="mt-2 font-semibold text-lg">{user.displayName}</div>
            <div className="text-xs text-slate-400">@{user.username}</div>
            <TagBadge tag={tags.find((t) => t.id === user.equippedTagId) ?? null} size="md" />
            <div className="mt-2"><CoinDisplay amount={user.coins} size={16} className="text-amber-200 font-semibold" /></div>
            {user.luckCharges > 0 && <div className="mt-1 text-xs text-emerald-300 inline-flex items-center gap-1"><Sparkles className="w-3 h-3" /> 2x luck for {user.luckCharges} games</div>}
            <div className="mt-3 w-full">
              <LevelBadge level={user.level} xp={user.xp} showBar />
              <div className="mt-1 text-[11px] text-slate-500">{user.xp.toLocaleString()} total XP · {(() => { const p = xpProgress(user.xp, user.level); return `${p.current.toLocaleString()} / ${p.needed.toLocaleString()} to level ${user.level + 1}`; })()}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="md:col-span-2 bg-slate-900 border-slate-800 text-slate-100">
          <CardHeader><CardTitle className="text-base">Stats</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <Stat label="Games Played" value={user.gamesPlayed} />
              <Stat label="Games Won" value={user.gamesWon} />
              <Stat label="Best Streak" value={user.bestWinStreak} />
              <Stat label="Total Bet" value={user.totalBet} />
              <Stat label="Total Won" value={user.totalWon} />
              <Stat label="Plinko Wins" value={user.plinkoWins} />
              <Stat label="Mines Wins" value={user.minesWins} />
              <Stat label="Blackjack Wins" value={user.blackjackWins} />
              <Stat label="Dice Wins" value={user.diceWins} />
              <Stat label="Coinflip Wins" value={user.coinflipWins} />
              <Stat label="Free Throws Made" value={user.freeThrowMakes} />
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Input className="bg-slate-950/60 border-slate-700" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={15} />
              <Button onClick={saveName} disabled={!displayName || displayName === user.displayName} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">Save Name</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardHeader><CardTitle className="text-base">Daily Wheel Spin</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-6 flex-wrap">
          <div className="relative w-44 h-44">
            <div
              className="w-full h-full rounded-full border-4 border-amber-500 shadow-[0_0_30px_rgba(251,191,36,0.4)] transition-transform overflow-hidden"
              style={{ transform: spinning ? "rotate(2160deg)" : "rotate(0deg)", transitionDuration: "2000ms", transitionTimingFunction: "cubic-bezier(0.2, 0.7, 0.2, 1)" }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {wheelRewards.map((r, i) => {
                  const slice = 360 / wheelRewards.length;
                  const start = i * slice - 90;
                  const end = start + slice;
                  const a1 = (start * Math.PI) / 180;
                  const a2 = (end * Math.PI) / 180;
                  const x1 = 50 + 50 * Math.cos(a1);
                  const y1 = 50 + 50 * Math.sin(a1);
                  const x2 = 50 + 50 * Math.cos(a2);
                  const y2 = 50 + 50 * Math.sin(a2);
                  const fill = i % 2 === 0 ? "#1e293b" : "#7c2d12";
                  const tx = 50 + 30 * Math.cos((a1 + a2) / 2);
                  const ty = 50 + 30 * Math.sin((a1 + a2) / 2);
                  return (
                    <g key={i}>
                      <path d={`M50,50 L${x1},${y1} A50,50 0 0,1 ${x2},${y2} Z`} fill={fill} />
                      <text x={tx} y={ty} fontSize="6" fill="#fbbf24" fontWeight="700" textAnchor="middle" dominantBaseline="central">{r}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-[14px] border-l-transparent border-r-transparent border-b-amber-300" />
          </div>
          <div className="flex-1">
            {wheelStatus?.available || !wheelStatus ? (
              <Button onClick={spin} disabled={spinning || (wheelStatus !== null && !wheelStatus.available)} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
                {spinning ? "Spinning..." : "Spin the Wheel"}
              </Button>
            ) : (
              <div className="text-sm text-slate-400">Next spin available {new Date(wheelStatus.nextAt).toLocaleString()}.</div>
            )}
            {spinResult && <div className="mt-2 text-amber-300 font-semibold">+{spinResult.reward.toLocaleString()} coins!</div>}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardHeader><CardTitle className="text-base">Avatar Customizer</CardTitle></CardHeader>
        <CardContent>
          <Tabs value={activeSlot} onValueChange={(v) => setActiveSlot(v as ItemSlot)}>
            <TabsList className="bg-slate-800">
              {SLOTS.map((s) => <TabsTrigger key={s} value={s} className="data-[state=active]:bg-slate-700 data-[state=active]:text-amber-300">{SLOT_LABELS[s]}</TabsTrigger>)}
            </TabsList>
            {SLOTS.map((slot) => (
              <TabsContent key={slot} value={slot} className="mt-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {itemsBySlot[slot].map((it) => {
                    const owned = it.cost === 0 || user.ownedItems.includes(it.id) || user.isAdmin;
                    const equipped = user.equippedItems[slot] === it.id;
                    return (
                      <div key={it.id} className={`rounded-lg border p-3 ${equipped ? "border-amber-400 bg-amber-500/10" : "border-slate-700 bg-slate-950/40"}`}>
                        <div className="flex items-center gap-2 mb-2"><ItemPreview id={it.id} slot={slot} /><div><div className="text-sm font-medium">{it.name}</div>{!owned && <div className="text-xs text-amber-200 inline-flex items-center gap-1"><Coin size={10} /> {it.cost.toLocaleString()}</div>}</div></div>
                        {equipped ? (
                          <Button disabled className="w-full bg-amber-500 text-slate-950">Equipped</Button>
                        ) : owned ? (
                          <Button onClick={() => equip(it.id)} className="w-full bg-slate-700 hover:bg-slate-600 text-white">Equip</Button>
                        ) : (
                          <Button onClick={() => buy(it.id)} disabled={busy || user.coins < it.cost} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
                            <Lock className="w-3 h-3 mr-1" /> Buy {it.cost.toLocaleString()}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
          {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardHeader><CardTitle className="text-base">Tags</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tags.map((t) => {
            const owned = user.ownedTags.includes(t.id);
            const equipped = user.equippedTagId === t.id;
            return (
              <div key={t.id} className={`rounded-lg border p-3 ${equipped ? "border-amber-400 bg-amber-500/10" : owned ? "border-slate-700 bg-slate-950/40" : "border-slate-800 bg-slate-950/20 opacity-60"}`}>
                <div className="flex items-center gap-3 mb-2">
                  <TagBadge tag={t} size="md" />
                  <div className="text-xs text-slate-400">{t.description}</div>
                </div>
                {owned ? (
                  equipped ? <Button disabled className="w-full bg-amber-500 text-slate-950">Equipped</Button>
                  : <Button onClick={() => selectTag(t.id)} className="w-full bg-slate-700 hover:bg-slate-600 text-white">Equip</Button>
                ) : (
                  <Button disabled className="w-full bg-slate-800 text-slate-500"><Lock className="w-3 h-3 mr-1" /> Locked</Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-slate-950/40 rounded p-2 border border-slate-800">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="font-semibold tabular-nums">{value.toLocaleString()}</div>
    </div>
  );
}
