import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { PublicUser } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { TagBadge } from "@/components/TagBadge";
import { CoinDisplay } from "@/components/CoinDisplay";
import { useCatalog } from "@/lib/catalog-context";
import { ArrowLeft } from "lucide-react";

export default function UserDetailPage() {
  const [, params] = useRoute("/users/:id");
  const { tags } = useCatalog();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    void api.get<{ user: PublicUser }>(`/users/${params.id}`).then((r) => setUser(r.user)).catch((e) => setError(e?.message ?? "Not found."));
  }, [params?.id]);

  if (error) return <div className="text-rose-400">{error}</div>;
  if (!user) return <div className="text-slate-400">Loading...</div>;
  const tag = tags.find((t) => t.id === user.equippedTagId);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Link href="/friends" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"><ArrowLeft className="w-4 h-4" /> Back</Link>
      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardContent className="p-5 flex items-center gap-5 flex-wrap">
          <Avatar equipped={user.equippedItems} size={140} />
          <div className="flex-1 min-w-[200px]">
            <div className="text-2xl font-bold">{user.displayName}</div>
            <div className="text-sm text-slate-400">@{user.username}</div>
            <div className="mt-1"><TagBadge tag={tag ?? null} size="md" /></div>
            <div className="mt-2 inline-flex"><CoinDisplay amount={user.coins} size={16} className="text-amber-200 font-semibold" /></div>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardHeader><CardTitle className="text-base">Stats</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {[
              ["Games Played", user.gamesPlayed],
              ["Games Won", user.gamesWon],
              ["Best Streak", user.bestWinStreak],
              ["Total Bet", user.totalBet],
              ["Total Won", user.totalWon],
              ["Plinko Wins", user.plinkoWins],
              ["Mines Wins", user.minesWins],
              ["Blackjack Wins", user.blackjackWins],
              ["Dice Wins", user.diceWins],
              ["Coinflip Wins", user.coinflipWins],
              ["Free Throws Made", user.freeThrowMakes],
            ].map(([label, val]) => (
              <div key={String(label)} className="bg-slate-950/40 rounded p-2 border border-slate-800"><div className="text-xs text-slate-400">{label}</div><div className="font-semibold tabular-nums">{Number(val).toLocaleString()}</div></div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
