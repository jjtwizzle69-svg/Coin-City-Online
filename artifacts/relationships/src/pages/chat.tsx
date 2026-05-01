import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { levelColor } from "@/lib/xp";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Send, MessageSquare, User } from "lucide-react";

type WorldMessage = {
  id: string;
  message: string;
  createdAt: string;
  userId: string;
  username: string;
  displayName: string;
  isAdmin: boolean;
  level: number;
  equippedTagId: string;
};

type Thread = {
  friendId: string;
  friend: { id: string; username: string; displayName: string; level: number } | null;
  lastMessage: { id: string; message: string; createdAt: string; fromUserId: string } | null;
};

type DM = {
  id: string;
  fromUserId: string;
  toUserId: string;
  message: string;
  createdAt: string;
};

export default function ChatPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"world" | "dm">("world");
  const [worldMessages, setWorldMessages] = useState<WorldMessage[]>([]);
  const [input, setInput] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeDmId, setActiveDmId] = useState<string | null>(null);
  const [dmMessages, setDmMessages] = useState<DM[]>([]);
  const [dmInput, setDmInput] = useState("");
  const [dmError, setDmError] = useState<string | null>(null);
  const worldBottom = useRef<HTMLDivElement>(null);
  const dmBottom = useRef<HTMLDivElement>(null);
  const isBanned = user?.chatBannedUntil && new Date(user.chatBannedUntil).getTime() > Date.now();

  useEffect(() => {
    if (tab !== "world") return;
    let cancelled = false;
    async function load() {
      const r = await api.get<{ messages: WorldMessage[] }>("/chat/world");
      if (!cancelled) setWorldMessages(r.messages);
    }
    load();
    const id = setInterval(load, 3000);
    return () => { cancelled = true; clearInterval(id); };
  }, [tab]);

  useEffect(() => {
    worldBottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [worldMessages]);

  useEffect(() => {
    if (tab !== "dm") return;
    let cancelled = false;
    async function load() {
      const r = await api.get<{ threads: Thread[] }>("/chat/threads");
      if (!cancelled) setThreads(r.threads);
    }
    load();
    const id = setInterval(load, 3000);
    return () => { cancelled = true; clearInterval(id); };
  }, [tab]);

  useEffect(() => {
    if (!activeDmId) return;
    let cancelled = false;
    async function load() {
      const r = await api.get<{ messages: DM[] }>(`/chat/dm/${activeDmId}`);
      if (!cancelled) setDmMessages(r.messages);
    }
    load();
    const id = setInterval(load, 3000);
    return () => { cancelled = true; clearInterval(id); };
  }, [activeDmId]);

  useEffect(() => {
    dmBottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [dmMessages]);

  async function sendWorld(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setSendError(null);
    try {
      const r = await api.post<{ message: WorldMessage }>("/chat/world", { message: input.trim() });
      setWorldMessages(prev => [...prev.filter(m => m.id !== r.message.id), r.message]);
      setInput("");
    } catch (e) {
      setSendError(e instanceof ApiError ? e.message : "Failed to send.");
    }
  }

  async function sendDm(e: React.FormEvent) {
    e.preventDefault();
    if (!dmInput.trim() || !activeDmId) return;
    setDmError(null);
    try {
      const r = await api.post<{ message: DM }>(`/chat/dm/${activeDmId}`, { message: dmInput.trim() });
      setDmMessages(prev => [...prev.filter(m => m.id !== r.message.id), r.message]);
      setDmInput("");
    } catch (e) {
      setDmError(e instanceof ApiError ? e.message : "Failed to send.");
    }
  }

  const activeFriend = threads.find(t => t.friendId === activeDmId)?.friend;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-amber-400" /> Chat
      </h1>

      <div className="flex gap-2">
        <Button size="sm" onClick={() => setTab("world")} className={tab === "world" ? "bg-amber-500 text-slate-950 font-bold" : "bg-slate-800 text-slate-200 hover:bg-slate-700"}>World Chat</Button>
        <Button size="sm" onClick={() => setTab("dm")} className={tab === "dm" ? "bg-amber-500 text-slate-950 font-bold" : "bg-slate-800 text-slate-200 hover:bg-slate-700"}>Friend DMs</Button>
      </div>

      {tab === "world" && (
        <Card className="bg-slate-900/60 border-slate-700 flex flex-col" style={{ height: "70vh" }}>
          {isBanned && (
            <div className="bg-rose-900/40 border-b border-rose-700 px-4 py-2 text-rose-300 text-sm">
              You are suspended from world chat. {user?.chatBanReason && `Reason: ${user.chatBanReason}`}
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
            {worldMessages.length === 0 && (
              <div className="text-slate-500 text-sm text-center mt-8">No messages yet. Say hello!</div>
            )}
            {worldMessages.map((m) => (
              <div key={m.id} className={`flex gap-2 ${m.userId === user?.id ? "flex-row-reverse" : ""}`}>
                <div className="shrink-0 w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
                <div className={`max-w-xs sm:max-w-md ${m.userId === user?.id ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                  <div className="flex items-center gap-1.5">
                    {m.isAdmin && <Shield className="w-3 h-3 text-amber-400" />}
                    <span className={`text-xs font-semibold ${levelColor(m.level)}`}>{m.displayName}</span>
                    <span className="text-[10px] text-slate-600">Lvl {m.level}</span>
                  </div>
                  <div className={`rounded-xl px-3 py-1.5 text-sm break-words ${m.userId === user?.id ? "bg-amber-500/20 text-amber-100" : "bg-slate-800 text-slate-100"}`}>
                    {m.message}
                  </div>
                  <span className="text-[10px] text-slate-600">{new Date(m.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
            <div ref={worldBottom} />
          </div>
          <form onSubmit={sendWorld} className="border-t border-slate-700 p-3 flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={isBanned ? "You are suspended from chat." : "Say something nice…"}
              disabled={!!isBanned}
              maxLength={300}
              className="bg-slate-950/60 border-slate-700 flex-1"
            />
            <Button type="submit" disabled={!!isBanned || !input.trim()} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
              <Send className="w-4 h-4" />
            </Button>
          </form>
          {sendError && <p className="text-xs text-rose-400 px-3 pb-2">{sendError}</p>}
        </Card>
      )}

      {tab === "dm" && (
        <div className="grid md:grid-cols-3 gap-4" style={{ height: "70vh" }}>
          <Card className="bg-slate-900/60 border-slate-700 overflow-y-auto">
            <div className="p-3 border-b border-slate-700 text-xs font-semibold text-slate-400 uppercase tracking-wide">Friends</div>
            {threads.length === 0 && (
              <div className="text-slate-500 text-sm text-center p-4">No friends yet. Add some first!</div>
            )}
            {threads.map((t) => (
              <button
                key={t.friendId}
                onClick={() => setActiveDmId(t.friendId)}
                className={`w-full text-left p-3 border-b border-slate-800 hover:bg-slate-800/50 transition-colors ${activeDmId === t.friendId ? "bg-slate-800" : ""}`}
              >
                <div className={`font-semibold text-sm ${levelColor(t.friend?.level ?? 1)}`}>{t.friend?.displayName ?? "Unknown"}</div>
                <div className="text-xs text-slate-500 truncate">{t.lastMessage?.message ?? "No messages yet"}</div>
              </button>
            ))}
          </Card>

          <Card className="md:col-span-2 bg-slate-900/60 border-slate-700 flex flex-col">
            {!activeDmId ? (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Select a friend to start chatting.</div>
            ) : (
              <>
                <div className="p-3 border-b border-slate-700 font-semibold text-sm text-slate-100">
                  {activeFriend?.displayName ?? "Chat"} <span className="text-slate-500 font-normal text-xs">@{activeFriend?.username}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
                  {dmMessages.map((m) => (
                    <div key={m.id} className={`flex gap-2 ${m.fromUserId === user?.id ? "flex-row-reverse" : ""}`}>
                      <div className={`max-w-xs rounded-xl px-3 py-1.5 text-sm break-words ${m.fromUserId === user?.id ? "bg-amber-500/20 text-amber-100" : "bg-slate-800 text-slate-100"}`}>
                        {m.message}
                      </div>
                    </div>
                  ))}
                  <div ref={dmBottom} />
                </div>
                <form onSubmit={sendDm} className="border-t border-slate-700 p-3 flex gap-2">
                  <Input
                    value={dmInput}
                    onChange={e => setDmInput(e.target.value)}
                    placeholder="Type a message…"
                    maxLength={1000}
                    className="bg-slate-950/60 border-slate-700 flex-1"
                  />
                  <Button type="submit" disabled={!dmInput.trim()} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
                {dmError && <p className="text-xs text-rose-400 px-3 pb-2">{dmError}</p>}
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
