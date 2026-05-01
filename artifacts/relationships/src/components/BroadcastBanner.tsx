import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Broadcast } from "@/lib/types";
import { TagBadge } from "./TagBadge";
import { useCatalog } from "@/lib/catalog-context";

export function BroadcastBanner() {
  const { user } = useAuth();
  const { tags } = useCatalog();
  const [active, setActive] = useState<{ b: Broadcast; expires: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    const seen = new Set<string>();
    let cancelled = false;
    async function poll() {
      try {
        const r = await api.get<{ broadcasts: Broadcast[] }>("/broadcasts");
        if (cancelled) return;
        const now = Date.now();
        const incoming: { b: Broadcast; expires: number }[] = [];
        for (const b of r.broadcasts) {
          if (seen.has(b.id)) continue;
          seen.add(b.id);
          incoming.push({ b, expires: now + 5000 });
        }
        if (incoming.length) setActive((prev) => [...incoming, ...prev]);
      } catch { /* ignore */ }
    }
    void poll();
    const id = setInterval(poll, 1500);
    const cleanup = setInterval(() => {
      const now = Date.now();
      setActive((prev) => prev.filter((x) => x.expires > now));
    }, 250);
    return () => { cancelled = true; clearInterval(id); clearInterval(cleanup); };
  }, [user]);

  if (!user || active.length === 0) return null;

  return (
    <div className="fixed inset-x-0 top-14 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
      {active.map(({ b, expires }) => {
        const lifeMs = Math.max(0, expires - Date.now());
        const opacity = lifeMs > 1000 ? 1 : Math.max(0, lifeMs / 1000);
        const tag = tags.find((t) => t.id === b.fromTagId);
        return (
          <div
            key={b.id}
            className="pointer-events-auto max-w-2xl w-full rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-50/95 to-yellow-50/95 dark:from-amber-950/80 dark:to-yellow-950/80 px-4 py-3 shadow-lg backdrop-blur transition-opacity"
            style={{ opacity }}
          >
            <div className="flex items-center gap-2 text-xs mb-1">
              <span className="font-semibold">{b.fromDisplayName}</span>
              {tag && <TagBadge tag={tag} />}
              <span className="text-muted-foreground">@{b.fromUsername}</span>
              <span className="ml-auto uppercase tracking-wider text-[10px] text-amber-700 dark:text-amber-300">Broadcast</span>
            </div>
            <div className="text-sm">{b.message}</div>
          </div>
        );
      })}
    </div>
  );
}
