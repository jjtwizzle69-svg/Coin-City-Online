import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { PublicUser } from "@/lib/types";
import { Megaphone, Coins, Gift, Sparkles, MessageSquareOff } from "lucide-react";

export default function AdminPage() {
  const { user, setUser } = useAuth();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PublicUser[]>([]);
  const [target, setTarget] = useState<PublicUser | null>(null);
  const [coinsValue, setCoinsValue] = useState(1000);
  const [giftAmount, setGiftAmount] = useState(1000);
  const [broadcast, setBroadcast] = useState("");
  const [selfCoinsValue, setSelfCoinsValue] = useState(0);
  const [selfLuckMin, setSelfLuckMin] = useState(30);
  const [targetLuckMin, setTargetLuckMin] = useState(30);
  const [chatSearch, setChatSearch] = useState("");
  const [chatResults, setChatResults] = useState<PublicUser[]>([]);
  const [chatTarget, setChatTarget] = useState<PublicUser | null>(null);
  const [chatAction, setChatAction] = useState<"suspend" | "ban" | "unban">("suspend");
  const [chatMinutes, setChatMinutes] = useState(60);
  const [chatReason, setChatReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  function formatRemaining(until: string | null): string | null {
    if (!until) return null;
    const ms = new Date(until).getTime() - now;
    if (ms <= 0) return null;
    const total = Math.ceil(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  useEffect(() => { setSelfCoinsValue(user?.coins ?? 0); }, [user?.coins]);

  useEffect(() => {
    if (!search) { setResults([]); return; }
    const id = setTimeout(async () => {
      try {
        const r = await api.get<{ users: PublicUser[] }>(`/users/search?q=${encodeURIComponent(search)}`);
        setResults(r.users);
      } catch { /* ignore */ }
    }, 250);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    if (!chatSearch) { setChatResults([]); return; }
    const id = setTimeout(async () => {
      try {
        const r = await api.get<{ users: PublicUser[] }>(`/users/search?q=${encodeURIComponent(chatSearch)}`);
        setChatResults(r.users);
      } catch { /* ignore */ }
    }, 250);
    return () => clearTimeout(id);
  }, [chatSearch]);

  if (!user?.isAdmin) return <div className="text-slate-400">Admin only.</div>;

  async function setSelf() {
    setError(null); setInfo(null);
    try {
      const r = await api.post<{ user: PublicUser }>("/admin/set-coins", { coins: selfCoinsValue });
      setUser(r.user);
      setInfo(`Set your coins to ${r.user.coins.toLocaleString()}.`);
    } catch (e) { setError(e instanceof ApiError ? e.message : "Failed."); }
  }

  async function setSelfLuck(minutes: number) {
    setError(null); setInfo(null);
    try {
      const r = await api.post<{ user: PublicUser }>("/admin/set-luck", { minutes });
      setUser(r.user);
      setInfo(minutes > 0 ? `2x luck active for ${minutes} minute${minutes === 1 ? "" : "s"}.` : "Cleared your timed luck.");
    } catch (e) { setError(e instanceof ApiError ? e.message : "Failed."); }
  }

  async function setTargetLuck(minutes: number) {
    if (!target) return;
    setError(null); setInfo(null);
    try {
      const r = await api.post<{ user: PublicUser }>("/admin/set-luck", { userId: target.id, minutes });
      setTarget(r.user);
      setInfo(minutes > 0 ? `Gave @${r.user.username} 2x luck for ${minutes} minute${minutes === 1 ? "" : "s"}.` : `Cleared @${r.user.username}'s timed luck.`);
    } catch (e) { setError(e instanceof ApiError ? e.message : "Failed."); }
  }

  async function setForTarget() {
    if (!target) return;
    setError(null); setInfo(null);
    try {
      const r = await api.post<{ user: PublicUser }>("/admin/set-coins", { userId: target.id, coins: coinsValue });
      setTarget(r.user);
      setInfo(`Set @${r.user.username} to ${r.user.coins.toLocaleString()}.`);
    } catch (e) { setError(e instanceof ApiError ? e.message : "Failed."); }
  }

  async function gift() {
    if (!target) return;
    setError(null); setInfo(null);
    try {
      const r = await api.post<{ user: PublicUser }>("/admin/gift", { userId: target.id, coins: giftAmount });
      setTarget(r.user);
      setInfo(`Gifted ${giftAmount.toLocaleString()} to @${r.user.username}.`);
    } catch (e) { setError(e instanceof ApiError ? e.message : "Failed."); }
  }

  async function send() {
    setError(null); setInfo(null);
    try {
      await api.post("/broadcasts", { message: broadcast });
      setBroadcast("");
      setInfo("Broadcast sent!");
    } catch (e) { setError(e instanceof ApiError ? e.message : "Failed."); }
  }

  async function chatModerate() {
    if (!chatTarget) return;
    setError(null); setInfo(null);
    if (chatAction !== "unban" && !chatReason.trim()) { setError("Reason is required."); return; }
    try {
      await api.post("/admin/chat-moderate", {
        userId: chatTarget.id,
        action: chatAction,
        reason: chatReason.trim() || undefined,
        minutes: chatAction === "suspend" ? chatMinutes : undefined,
      });
      setInfo(chatAction === "ban" ? `@${chatTarget.username} permanently banned from world chat.` : chatAction === "suspend" ? `@${chatTarget.username} suspended for ${chatMinutes} minutes.` : `@${chatTarget.username} unbanned.`);
      setChatTarget(null);
      setChatSearch("");
      setChatReason("");
    } catch (e) { setError(e instanceof ApiError ? e.message : "Failed."); }
  }

  async function grantAll() {
    if (!target) return;
    try {
      const r = await api.post<{ user: PublicUser }>("/admin/grant-all", { userId: target.id });
      setTarget(r.user);
      setInfo(`Granted all items/tags to @${r.user.username}.`);
    } catch (e) { setError(e instanceof ApiError ? e.message : "Failed."); }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-amber-500/10 border-amber-500/40 text-slate-100">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Coins className="w-4 h-4 text-amber-300" /> Set Your Coins</CardTitle></CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2 items-end">
          <div className="flex-1">
            <Label>Coins</Label>
            <Input type="number" min={0} value={selfCoinsValue} onChange={(e) => setSelfCoinsValue(Math.max(0, Math.floor(Number(e.target.value) || 0)))} className="bg-slate-950/60 border-slate-700" />
          </div>
          <Button onClick={setSelf} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">Apply</Button>
        </CardContent>
      </Card>

      <Card className="bg-emerald-500/10 border-emerald-500/40 text-slate-100">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-300" /> Your 2x Luck Timer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(() => {
            const remaining = formatRemaining(user.luckUntil);
            return remaining
              ? <p className="text-sm text-emerald-300">Active — every game is 2x luck for the next <span className="font-semibold">{remaining}</span>.</p>
              : <p className="text-sm text-slate-400">Inactive. Pick a duration below to enable.</p>;
          })()}
          <div className="flex flex-col sm:flex-row gap-2 items-end">
            <div className="flex-1">
              <Label>Minutes (0 turns it off, max 43200)</Label>
              <Input type="number" min={0} max={43200} value={selfLuckMin} onChange={(e) => setSelfLuckMin(Math.max(0, Math.floor(Number(e.target.value) || 0)))} className="bg-slate-950/60 border-slate-700" />
            </div>
            <Button onClick={() => setSelfLuck(selfLuckMin)} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold">Enable</Button>
            <Button variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" onClick={() => setSelfLuck(0)}>Turn Off</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {[5, 15, 30, 60, 180, 720].map((m) => (
              <Button key={m} size="sm" variant="outline" className="border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/20" onClick={() => setSelfLuck(m)}>
                {m < 60 ? `${m}m` : `${m / 60}h`}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-amber-500/10 border-amber-500/40 text-slate-100">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Megaphone className="w-4 h-4 text-amber-300" /> Send Broadcast</CardTitle></CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2 items-end">
          <div className="flex-1">
            <Label>Message (visible to all for 5s)</Label>
            <Input value={broadcast} onChange={(e) => setBroadcast(e.target.value)} maxLength={200} className="bg-slate-950/60 border-slate-700" />
          </div>
          <Button onClick={send} disabled={!broadcast.trim()} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">Send</Button>
        </CardContent>
      </Card>

      <Card className="bg-amber-500/10 border-amber-500/40 text-slate-100">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Gift className="w-4 h-4 text-amber-300" /> Gift / Set Coins for User</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Search by username or display name" value={search} onChange={(e) => setSearch(e.target.value)} className="bg-slate-950/60 border-slate-700" />
          {results.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-auto">
              {results.map((u) => (
                <button key={u.id} onClick={() => { setTarget(u); setSearch(""); setResults([]); }} className="w-full text-left p-2 rounded border border-slate-800 bg-slate-950/40 hover:bg-slate-800">
                  <span className="font-medium">{u.displayName}</span> <span className="text-xs text-slate-400">@{u.username}</span> · {u.coins.toLocaleString()} coins
                </button>
              ))}
            </div>
          )}
          {target && (
            <div className="rounded border border-slate-800 bg-slate-950/40 p-3 space-y-3">
              <div className="text-sm">Selected: <span className="font-medium">{target.displayName}</span> <span className="text-xs text-slate-400">@{target.username}</span> · {target.coins.toLocaleString()} coins</div>
              <div className="grid sm:grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Set coins to</Label>
                  <div className="flex gap-2"><Input type="number" min={0} value={coinsValue} onChange={(e) => setCoinsValue(Math.max(0, Math.floor(Number(e.target.value) || 0)))} className="bg-slate-950/60 border-slate-700" /><Button size="sm" onClick={setForTarget} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">Set</Button></div>
                </div>
                <div>
                  <Label className="text-xs">Gift coins (free for you)</Label>
                  <div className="flex gap-2"><Input type="number" min={1} value={giftAmount} onChange={(e) => setGiftAmount(Math.max(1, Math.floor(Number(e.target.value) || 1)))} className="bg-slate-950/60 border-slate-700" /><Button size="sm" onClick={gift} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold">Gift</Button></div>
                </div>
              </div>
              <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-2 space-y-2">
                <div className="text-xs flex items-center gap-1 text-emerald-200"><Sparkles className="w-3 h-3" /> 2x Luck Timer</div>
                {(() => {
                  const remaining = formatRemaining(target.luckUntil);
                  return remaining
                    ? <div className="text-xs text-emerald-300">Active for the next <span className="font-semibold">{remaining}</span>.</div>
                    : <div className="text-xs text-slate-400">Inactive.</div>;
                })()}
                <div className="flex gap-2">
                  <Input type="number" min={0} max={43200} value={targetLuckMin} onChange={(e) => setTargetLuckMin(Math.max(0, Math.floor(Number(e.target.value) || 0)))} className="bg-slate-950/60 border-slate-700" />
                  <Button size="sm" onClick={() => setTargetLuck(targetLuckMin)} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold">Set Min</Button>
                  <Button size="sm" variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" onClick={() => setTargetLuck(0)}>Off</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[5, 15, 30, 60, 180, 720].map((m) => (
                    <Button key={m} size="sm" variant="outline" className="border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/20" onClick={() => setTargetLuck(m)}>
                      {m < 60 ? `${m}m` : `${m / 60}h`}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" onClick={grantAll}>Grant ALL items + tags</Button>
                <Button size="sm" variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" onClick={() => setTarget(null)}>Clear</Button>
              </div>
            </div>
          )}
          {info && <p className="text-sm text-emerald-300">{info}</p>}
          {error && <p className="text-sm text-rose-400">{error}</p>}
        </CardContent>
      </Card>

      <Card className="bg-rose-900/10 border-rose-700/30 text-slate-100">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquareOff className="w-4 h-4 text-rose-400" /> Chat Moderation</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Search user to moderate" value={chatSearch} onChange={e => setChatSearch(e.target.value)} className="bg-slate-950/60 border-slate-700" />
          {chatResults.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-auto">
              {chatResults.map(u => (
                <button key={u.id} onClick={() => { setChatTarget(u); setChatSearch(""); setChatResults([]); }} className="w-full text-left p-2 rounded border border-slate-800 bg-slate-950/40 hover:bg-slate-800">
                  <span className="font-medium">{u.displayName}</span> <span className="text-xs text-slate-400">@{u.username}</span>
                  {u.chatBannedUntil && new Date(u.chatBannedUntil).getTime() > Date.now() && (
                    <span className="ml-2 text-xs text-rose-400">Currently restricted</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {chatTarget && (
            <div className="rounded border border-rose-700/30 bg-rose-900/10 p-3 space-y-3">
              <div className="text-sm font-medium">{chatTarget.displayName} <span className="text-xs text-slate-400">@{chatTarget.username}</span></div>
              {chatTarget.chatBannedUntil && new Date(chatTarget.chatBannedUntil).getTime() > Date.now() && (
                <div className="text-xs text-rose-300">Currently restricted. Reason: {chatTarget.chatBanReason ?? "none"}</div>
              )}
              <div className="flex gap-2">
                {(["suspend", "ban", "unban"] as const).map(a => (
                  <Button key={a} size="sm" onClick={() => setChatAction(a)}
                    className={chatAction === a ? "bg-rose-600 text-white" : "bg-slate-800 text-slate-200 hover:bg-slate-700"}>
                    {a.charAt(0).toUpperCase() + a.slice(1)}
                  </Button>
                ))}
              </div>
              {chatAction === "suspend" && (
                <div>
                  <Label className="text-xs">Duration (minutes)</Label>
                  <Input type="number" min={1} value={chatMinutes} onChange={e => setChatMinutes(Math.max(1, Number(e.target.value) || 60))} className="bg-slate-950/60 border-slate-700" />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[30, 60, 180, 720, 1440, 10080].map(m => (
                      <Button key={m} size="sm" variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" onClick={() => setChatMinutes(m)}>
                        {m < 60 ? `${m}m` : m < 1440 ? `${m / 60}h` : `${m / 1440}d`}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {chatAction !== "unban" && (
                <div>
                  <Label className="text-xs">Reason (required)</Label>
                  <Input value={chatReason} onChange={e => setChatReason(e.target.value)} placeholder="e.g. Harassment, slurs, spam…" className="bg-slate-950/60 border-slate-700" />
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={chatModerate} className="bg-rose-600 hover:bg-rose-500 text-white font-semibold">
                  Confirm
                </Button>
                <Button size="sm" variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" onClick={() => setChatTarget(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
