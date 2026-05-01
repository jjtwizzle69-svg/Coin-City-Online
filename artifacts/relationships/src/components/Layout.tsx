import { Link, useLocation } from "wouter";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { CoinDisplay } from "./CoinDisplay";
import { TagBadge } from "./TagBadge";
import { useCatalog } from "@/lib/catalog-context";
import { BroadcastBanner } from "./BroadcastBanner";
import { Button } from "@/components/ui/button";
import LevelBadge from "./LevelBadge";
import { Coins, User as UserIcon, Users, ListChecks, Ticket, ShieldCheck, LogOut, Dice5, MessageSquare, Trophy } from "lucide-react";

const NAV = [
  { href: "/", label: "Casino", icon: Dice5 },
  { href: "/tournaments", label: "Tournaments", icon: Trophy },
  { href: "/lottery", label: "Lottery", icon: Ticket },
  { href: "/quests", label: "Quests", icon: ListChecks },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { tags } = useCatalog();
  const [location] = useLocation();
  const tag = tags.find((t) => t.id === user?.equippedTagId);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-slate-100">
      <header className="sticky top-0 z-40 backdrop-blur bg-slate-950/80 border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <Coins className="w-5 h-5 text-amber-400" />
            <span>CoinCity</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {NAV.map((n) => {
              const active = location === n.href || (n.href !== "/" && location.startsWith(n.href));
              const Icon = n.icon;
              return (
                <Link key={n.href} href={n.href} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${active ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800/60 hover:text-white"}`}>
                  <Icon className="w-4 h-4" />
                  {n.label}
                </Link>
              );
            })}
            {user?.isAdmin && (
              <Link href="/admin" className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${location.startsWith("/admin") ? "bg-amber-900/40 text-amber-300" : "text-amber-300/80 hover:bg-amber-900/30 hover:text-amber-200"}`}>
                <ShieldCheck className="w-4 h-4" />
                Admin
              </Link>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {user && (
              <>
                <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm font-semibold">
                  <CoinDisplay amount={user.coins} size={16} />
                </div>
                <LevelBadge level={user.level} xp={user.xp} showBar className="hidden sm:flex" />
                <Link href="/profile" className="flex items-center gap-2 text-sm">
                  <span className="hidden sm:inline font-medium">{user.displayName}</span>
                  {tag && <TagBadge tag={tag} />}
                </Link>
                <Button size="sm" variant="ghost" onClick={signOut} className="text-slate-300 hover:text-white">
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        {/* Mobile nav */}
        <nav className="md:hidden border-t border-slate-800 px-2 py-2 flex justify-between gap-1 overflow-x-auto">
          {NAV.map((n) => {
            const active = location === n.href || (n.href !== "/" && location.startsWith(n.href));
            const Icon = n.icon;
            return (
              <Link key={n.href} href={n.href} className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded text-[11px] ${active ? "text-amber-300" : "text-slate-400"}`}>
                <Icon className="w-4 h-4" />
                <span>{n.label}</span>
              </Link>
            );
          })}
          {user?.isAdmin && (
            <Link href="/admin" className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded text-[11px] ${location.startsWith("/admin") ? "text-amber-300" : "text-amber-400/70"}`}>
              <ShieldCheck className="w-4 h-4" />
              <span>Admin</span>
            </Link>
          )}
        </nav>
      </header>
      <BroadcastBanner />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
