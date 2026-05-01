import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { CatalogProvider } from "@/lib/catalog-context";
import { Layout } from "@/components/Layout";
import { Loader2 } from "lucide-react";

import AuthPage from "@/pages/auth";
import CasinoPage from "@/pages/casino";
import ProfilePage from "@/pages/profile";
import FriendsPage from "@/pages/friends";
import QuestsPage from "@/pages/quests";
import LotteryPage from "@/pages/lottery";
import AdminPage from "@/pages/admin";
import ChatPage from "@/pages/chat";
import TournamentsPage from "@/pages/tournaments";
import CoinflipGame from "@/pages/games/coinflip";
import DiceGame from "@/pages/games/dice";
import PlinkoGame from "@/pages/games/plinko";
import MinesGame from "@/pages/games/mines";
import BlackjackGame from "@/pages/games/blackjack";
import FreeThrowGame from "@/pages/games/freethrow";
import UserDetailPage from "@/pages/user-detail";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

function GuardedShell() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }
  if (!user) return <Redirect to="/login" />;
  return (
    <Layout>
      <Switch>
        <Route path="/" component={CasinoPage} />
        <Route path="/games/coinflip" component={CoinflipGame} />
        <Route path="/games/dice" component={DiceGame} />
        <Route path="/games/plinko" component={PlinkoGame} />
        <Route path="/games/mines" component={MinesGame} />
        <Route path="/games/blackjack" component={BlackjackGame} />
        <Route path="/games/freethrow" component={FreeThrowGame} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/friends" component={FriendsPage} />
        <Route path="/users/:id" component={UserDetailPage} />
        <Route path="/quests" component={QuestsPage} />
        <Route path="/lottery" component={LotteryPage} />
        <Route path="/chat" component={ChatPage} />
        <Route path="/tournaments" component={TournamentsPage} />
        <Route path="/admin" component={AdminPage} />
        <Route><div className="text-center text-slate-400 py-12">Page not found.</div></Route>
      </Switch>
    </Layout>
  );
}

function Routed() {
  return (
    <Switch>
      <Route path="/login" component={AuthPage} />
      <Route component={GuardedShell} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CatalogProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Routed />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </CatalogProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
