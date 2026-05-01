import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, Loader2 } from "lucide-react";
import { ApiError, api } from "@/lib/api";

export default function AuthPage() {
  const { signIn, signUp, user } = useAuth();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState<null | boolean>(null);

  if (user) {
    setLocation("/");
    return null;
  }

  async function checkUsername(value: string) {
    if (mode !== "signup") return;
    setAvailable(null);
    if (value.length < 5) return;
    try {
      const r = await api.post<{ available: boolean }>("/auth/check-username", { username: value });
      setAvailable(r.available);
    } catch { setAvailable(null); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        await signIn(username, password);
      } else {
        if (password !== confirm) throw new Error("Passwords don't match.");
        await signUp(username, displayName, password);
      }
      setLocation("/");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e instanceof Error ? e.message : "Something went wrong."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950 text-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900/80 border-slate-800 backdrop-blur">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-7 h-7 text-amber-400" />
            <CardTitle className="text-2xl tracking-tight">CoinCity Casino</CardTitle>
          </div>
          <CardDescription>{mode === "signin" ? "Sign in to keep stacking coins." : "Create an account — 1,500 starter coins inside."}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => { setUsername(e.target.value); void checkUsername(e.target.value); }}
                autoComplete="username"
                placeholder="5–24 letters, numbers, underscores"
                className="bg-slate-950/60 border-slate-700"
              />
              {mode === "signup" && username.length >= 5 && available !== null && (
                <p className={`text-xs ${available ? "text-emerald-400" : "text-rose-400"}`}>
                  {available ? "Username is available." : "Username is taken or not allowed."}
                </p>
              )}
            </div>
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Display Name</Label>
                <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="2–15 characters" className="bg-slate-950/60 border-slate-700" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder="8+ chars, letter & number" className="bg-slate-950/60 border-slate-700" />
            </div>
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className="bg-slate-950/60 border-slate-700" />
              </div>
            )}
            {error && <p className="text-sm text-rose-400">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : (mode === "signin" ? "Sign In" : "Create Account")}
            </Button>
          </form>
          <div className="mt-4 text-sm text-slate-400 text-center">
            {mode === "signin" ? (
              <>No account?{" "}
                <button type="button" className="text-amber-300 hover:underline" onClick={() => { setMode("signup"); setError(null); }}>Sign up</button>
              </>
            ) : (
              <>Already have one?{" "}
                <button type="button" className="text-amber-300 hover:underline" onClick={() => { setMode("signin"); setError(null); }}>Sign in</button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
