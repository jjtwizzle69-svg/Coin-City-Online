import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/components/Avatar";
import { TagBadge } from "@/components/TagBadge";
import { CoinDisplay } from "@/components/CoinDisplay";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useCatalog } from "@/lib/catalog-context";
import type { FriendsResponse, PublicUser, Trade } from "@/lib/types";
import { Search, UserPlus, Check, X, Repeat, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function FriendsPage() {
  const { user, setUser } = useAuth();
  const { tags, items } = useCatalog();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PublicUser[]>([]);
  const [friends, setFriends] = useState<FriendsResponse>({ accepted: [], incoming: [], outgoing: [] });
  const [trades, setTrades] = useState<Trade[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tradeWith, setTradeWith] = useState<PublicUser | null>(null);

  const tagsById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);
  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const loadFriends = useCallback(async () => {
    try {
      const r = await api.get<FriendsResponse>("/friends");
      setFriends(r);
    } catch { /* ignore */ }
  }, []);
  const loadTrades = useCallback(async () => {
    try {
      const r = await api.get<{ trades: Trade[] }>("/trades");
      setTrades(r.trades);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { void loadFriends(); void loadTrades(); }, [loadFriends, loadTrades]);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const id = setTimeout(async () => {
      try {
        const r = await api.get<{ users: PublicUser[] }>(`/users/search?q=${encodeURIComponent(search)}`);
        setResults(r.users);
      } catch { /* ignore */ }
    }, 250);
    return () => clearTimeout(id);
  }, [search]);

  async function sendRequest(uid: string) {
    setError(null);
    try { await api.post("/friends/request", { userId: uid }); void loadFriends(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Failed."); }
  }
  async function accept(id: string) { try { await api.post(`/friends/${id}/accept`); void loadFriends(); } catch (e) { setError(e instanceof ApiError ? e.message : "Failed."); } }
  async function remove(id: string) { try { await api.del(`/friends/${id}`); void loadFriends(); } catch (e) { setError(e instanceof ApiError ? e.message : "Failed."); } }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Search className="w-4 h-4" /> Find Players</CardTitle></CardHeader>
        <CardContent>
          <Input placeholder="Search by username or display name" value={search} onChange={(e) => setSearch(e.target.value)} className="bg-slate-950/60 border-slate-700" />
          {results.length > 0 && (
            <div className="mt-3 space-y-2">
              {results.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-2 rounded border border-slate-800 bg-slate-950/40">
                  <Avatar equipped={u.equippedItems} size={48} />
                  <div className="flex-1">
                    <Link href={`/users/${u.id}`} className="font-medium hover:underline">{u.displayName}</Link>
                    <div className="text-xs text-slate-400">@{u.username}</div>
                  </div>
                  <TagBadge tag={tagsById.get(u.equippedTagId) ?? null} />
                  <Button size="sm" onClick={() => sendRequest(u.id)} className="bg-amber-500 hover:bg-amber-400 text-slate-950">
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="friends">
        <TabsList className="bg-slate-800">
          <TabsTrigger value="friends" className="data-[state=active]:bg-slate-700 data-[state=active]:text-amber-300">Friends ({friends.accepted.length})</TabsTrigger>
          <TabsTrigger value="incoming" className="data-[state=active]:bg-slate-700 data-[state=active]:text-amber-300">Incoming ({friends.incoming.length})</TabsTrigger>
          <TabsTrigger value="outgoing" className="data-[state=active]:bg-slate-700 data-[state=active]:text-amber-300">Outgoing ({friends.outgoing.length})</TabsTrigger>
          <TabsTrigger value="trades" className="data-[state=active]:bg-slate-700 data-[state=active]:text-amber-300">Trades</TabsTrigger>
        </TabsList>
        <TabsContent value="friends" className="mt-4">
          {friends.accepted.length === 0 ? <p className="text-sm text-slate-400">No friends yet. Search above to find players.</p> : (
            <div className="grid sm:grid-cols-2 gap-3">
              {friends.accepted.map(({ user: u, friendshipId }) => (
                <Card key={friendshipId} className="bg-slate-900 border-slate-800 text-slate-100">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Avatar equipped={u.equippedItems} size={64} />
                    <div className="flex-1">
                      <Link href={`/users/${u.id}`} className="font-medium hover:underline">{u.displayName}</Link>
                      <div className="text-xs text-slate-400">@{u.username}</div>
                      <div className="mt-1 flex items-center gap-2"><TagBadge tag={tagsById.get(u.equippedTagId) ?? null} /><CoinDisplay amount={u.coins} size={12} className="text-amber-200" /></div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button size="sm" variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" onClick={() => setTradeWith(u)}><Repeat className="w-3 h-3" /></Button>
                      <Button size="sm" variant="outline" className="border-slate-700 text-rose-400 hover:bg-slate-800" onClick={() => remove(friendshipId)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="incoming" className="mt-4">
          {friends.incoming.length === 0 ? <p className="text-sm text-slate-400">No incoming requests.</p> : (
            <div className="space-y-2">
              {friends.incoming.map(({ user: u, friendshipId }) => (
                <div key={friendshipId} className="flex items-center gap-3 p-2 rounded border border-slate-800 bg-slate-950/40">
                  <Avatar equipped={u.equippedItems} size={48} />
                  <div className="flex-1"><div className="font-medium">{u.displayName}</div><div className="text-xs text-slate-400">@{u.username}</div></div>
                  <Button size="sm" onClick={() => accept(friendshipId)} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950"><Check className="w-4 h-4" /></Button>
                  <Button size="sm" variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" onClick={() => remove(friendshipId)}><X className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="outgoing" className="mt-4">
          {friends.outgoing.length === 0 ? <p className="text-sm text-slate-400">No outgoing requests.</p> : (
            <div className="space-y-2">
              {friends.outgoing.map(({ user: u, friendshipId }) => (
                <div key={friendshipId} className="flex items-center gap-3 p-2 rounded border border-slate-800 bg-slate-950/40">
                  <Avatar equipped={u.equippedItems} size={48} />
                  <div className="flex-1"><div className="font-medium">{u.displayName}</div><div className="text-xs text-slate-400">@{u.username}</div></div>
                  <Button size="sm" variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" onClick={() => remove(friendshipId)}>Cancel</Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="trades" className="mt-4">
          {trades.length === 0 ? <p className="text-sm text-slate-400">No trades.</p> : (
            <div className="space-y-2">
              {trades.map((t) => (
                <Card key={t.id} className="bg-slate-900 border-slate-800 text-slate-100">
                  <CardContent className="p-3 text-sm">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div>
                        <span className="text-slate-400">{t.direction === "incoming" ? "From " : "To "}</span>
                        <span className="font-medium">{t.other?.displayName ?? "?"}</span>
                        <span className="text-xs text-slate-500 ml-2">{new Date(t.createdAt).toLocaleString()}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        t.status === "pending" ? "border-amber-500/40 text-amber-300" :
                        t.status === "accepted" ? "border-emerald-500/40 text-emerald-300" :
                        "border-slate-700 text-slate-400"
                      }`}>{t.status}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-slate-400 mb-1">{t.direction === "incoming" ? "They offer" : "You offer"}</div>
                        <CoinDisplay amount={t.offeredCoins} size={12} className="text-amber-200" />
                        <ul className="text-xs mt-1">{t.offeredItems.map((i) => <li key={i}>· {itemsById.get(i)?.name ?? i}</li>)}</ul>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-1">{t.direction === "incoming" ? "They want" : "You want"}</div>
                        <CoinDisplay amount={t.requestedCoins} size={12} className="text-amber-200" />
                        <ul className="text-xs mt-1">{t.requestedItems.map((i) => <li key={i}>· {itemsById.get(i)?.name ?? i}</li>)}</ul>
                      </div>
                    </div>
                    {t.message && <div className="mt-2 text-xs text-slate-300 italic">"{t.message}"</div>}
                    {t.status === "pending" && t.direction === "incoming" && (
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950" onClick={async () => { await api.post(`/trades/${t.id}/respond`, { action: "accept" }); void loadTrades(); void api.get<{ user: PublicUser }>("/auth/me").then(r => setUser(r.user)).catch(() => null); }}>Accept</Button>
                        <Button size="sm" variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" onClick={async () => { await api.post(`/trades/${t.id}/respond`, { action: "decline" }); void loadTrades(); }}>Decline</Button>
                      </div>
                    )}
                    {t.status === "pending" && t.direction === "outgoing" && (
                      <div className="mt-2"><Button size="sm" variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" onClick={async () => { await api.post(`/trades/${t.id}/cancel`); void loadTrades(); }}>Cancel</Button></div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      {error && <p className="text-sm text-rose-400">{error}</p>}

      {tradeWith && user && <TradeDialog onClose={() => setTradeWith(null)} other={tradeWith} me={user} onSent={() => { setTradeWith(null); void loadTrades(); }} />}
    </div>
  );
}

function TradeDialog({ other, me, onClose, onSent }: { other: PublicUser; me: PublicUser; onClose: () => void; onSent: () => void }) {
  const { items } = useCatalog();
  const [offeredCoins, setOfferedCoins] = useState(0);
  const [requestedCoins, setRequestedCoins] = useState(0);
  const [offeredItems, setOfferedItems] = useState<string[]>([]);
  const [requestedItems, setRequestedItems] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const myOwned = useMemo(() => items.filter((i) => me.ownedItems.includes(i.id)), [items, me.ownedItems]);
  const theirOwned = useMemo(() => items.filter((i) => other.ownedItems.includes(i.id)), [items, other.ownedItems]);

  function toggle(arr: string[], setArr: (a: string[]) => void, id: string) {
    setArr(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  }

  async function send() {
    setError(null);
    try {
      await api.post("/trades", { toUserId: other.id, offeredCoins, requestedCoins, offeredItems, requestedItems, message });
      onSent();
    } catch (e) { setError(e instanceof ApiError ? e.message : "Failed."); }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-2xl">
        <DialogHeader><DialogTitle>Trade with {other.displayName}</DialogTitle></DialogHeader>
        <div className="grid sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
          <div>
            <div className="text-sm font-semibold mb-2">Your offer</div>
            <Label className="text-xs">Coins</Label>
            <Input type="number" min={0} value={offeredCoins} onChange={(e) => setOfferedCoins(Math.max(0, Math.floor(Number(e.target.value) || 0)))} className="bg-slate-950/60 border-slate-700" />
            <div className="text-xs text-slate-400 mt-2 mb-1">Items (your owned)</div>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {myOwned.length === 0 ? <p className="text-xs text-slate-500">No tradable items.</p> : myOwned.map((it) => (
                <label key={it.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={offeredItems.includes(it.id)} onChange={() => toggle(offeredItems, setOfferedItems, it.id)} />
                  <span>{it.name}</span><span className="text-xs text-slate-500">({it.slot})</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold mb-2">You ask for</div>
            <Label className="text-xs">Coins</Label>
            <Input type="number" min={0} value={requestedCoins} onChange={(e) => setRequestedCoins(Math.max(0, Math.floor(Number(e.target.value) || 0)))} className="bg-slate-950/60 border-slate-700" />
            <div className="text-xs text-slate-400 mt-2 mb-1">Items (their owned)</div>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {theirOwned.length === 0 ? <p className="text-xs text-slate-500">No tradable items.</p> : theirOwned.map((it) => (
                <label key={it.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={requestedItems.includes(it.id)} onChange={() => toggle(requestedItems, setRequestedItems, it.id)} />
                  <span>{it.name}</span><span className="text-xs text-slate-500">({it.slot})</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div>
          <Label className="text-xs">Message (optional)</Label>
          <Input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={200} className="bg-slate-950/60 border-slate-700" />
        </div>
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-200 hover:bg-slate-800">Cancel</Button>
          <Button onClick={send} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">Send Trade</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
