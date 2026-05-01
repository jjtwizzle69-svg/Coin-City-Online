import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { PublicUser } from "@/lib/types";
import { Coin, CoinDisplay } from "@/components/CoinDisplay";

const ROWS = 12;

export default function PlinkoGame() {
  const { user, setUser } = useAuth();
  const [bet, setBet] = useState(50);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payouts, setPayouts] = useState<number[]>([]);
  const [activeBalls, setActiveBalls] = useState<{ id: number; path: ("L" | "R")[]; bucket: number }[]>([]);
  const [bucketHighlight, setBucketHighlight] = useState<{ idx: number; mult: number } | null>(null);
  const ballIdRef = useRef(0);

  useEffect(() => {
    void api.get<{ payouts: number[]; rows: number }>("/games/plinko/config").then((r) => setPayouts(r.payouts));
  }, []);

  const buckets = payouts.length ? payouts : new Array(ROWS + 1).fill(1);

  async function drop() {
    setError(null);
    setBucketHighlight(null);
    setBusy(true);
    try {
      const r = await api.post<{ path: ("L" | "R")[]; bucket: number; multiplier: number; payout: number; user: PublicUser }>("/games/plinko", { bet });
      const id = ++ballIdRef.current;
      setActiveBalls((prev) => [...prev, { id, path: r.path, bucket: r.bucket }]);
      setUser(r.user);
      // animation duration: 100ms per row
      setTimeout(() => {
        setActiveBalls((prev) => prev.filter((b) => b.id !== id));
        setBucketHighlight({ idx: r.bucket, mult: r.multiplier });
      }, ROWS * 110 + 200);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  const pegSpacing = 36;
  const boardWidth = ROWS * pegSpacing + 80;
  const boardHeight = (ROWS + 1) * pegSpacing + 40;

  const pegs = useMemo(() => {
    const out: { x: number; y: number }[] = [];
    for (let row = 1; row <= ROWS; row++) {
      const count = row + 1;
      const offsetX = boardWidth / 2 - ((count - 1) * pegSpacing) / 2;
      const y = row * pegSpacing;
      for (let i = 0; i < count; i++) {
        out.push({ x: offsetX + i * pegSpacing, y });
      }
    }
    return out;
  }, [boardWidth]);

  function ballPosition(path: ("L" | "R")[], step: number) {
    let x = boardWidth / 2;
    let y = 0;
    for (let i = 0; i < step && i < path.length; i++) {
      x += path[i] === "L" ? -pegSpacing / 2 : pegSpacing / 2;
      y += pegSpacing;
    }
    return { x, y };
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Plinko</h1>
      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardHeader><CardTitle className="text-base">Drop the ball, win on the bounce</CardTitle></CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <svg viewBox={`0 0 ${boardWidth} ${boardHeight}`} className="w-full max-w-[520px] h-auto">
              {/* pegs */}
              {pegs.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={3} fill="#475569" />
              ))}
              {/* buckets */}
              {buckets.map((m, i) => {
                const x = boardWidth / 2 - (ROWS * pegSpacing) / 2 + i * pegSpacing - pegSpacing / 2;
                const isHigh = m >= 2;
                const isActive = bucketHighlight?.idx === i;
                return (
                  <g key={i}>
                    <rect
                      x={x}
                      y={(ROWS + 1) * pegSpacing - 12}
                      width={pegSpacing - 4}
                      height={28}
                      rx={4}
                      fill={isActive ? "#f59e0b" : isHigh ? "#7f1d1d" : "#1e293b"}
                      stroke={isActive ? "#fbbf24" : "#334155"}
                    />
                    <text
                      x={x + (pegSpacing - 4) / 2}
                      y={(ROWS + 1) * pegSpacing + 6}
                      fontSize={10}
                      fontWeight={700}
                      textAnchor="middle"
                      fill={isHigh ? "#fbbf24" : "#cbd5e1"}
                    >
                      {m}x
                    </text>
                  </g>
                );
              })}
              {/* balls */}
              {activeBalls.map((b) => (
                <PlinkoBall key={b.id} path={b.path} positionFn={ballPosition} />
              ))}
            </svg>
          </div>

          <div className="mt-4 grid sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-slate-300">Bet</Label>
              <Input type="number" min={1} max={user?.coins ?? 1} value={bet} onChange={(e) => setBet(Math.max(1, Math.floor(Number(e.target.value) || 1)))} className="bg-slate-950/60 border-slate-700" />
              <div className="flex gap-2">
                {[10, 50, 100, 500].map((v) => (
                  <Button key={v} type="button" variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={() => setBet(v)}>
                    <Coin size={12} />&nbsp;{v}
                  </Button>
                ))}
              </div>
            </div>
            <Button onClick={drop} disabled={busy || bet > (user?.coins ?? 0)} className="bg-violet-500 hover:bg-violet-400 text-white font-semibold h-10">
              {busy ? "Dropping..." : "Drop Ball"}
            </Button>
          </div>
          {bucketHighlight && (
            <div className={`mt-2 text-center font-semibold ${bucketHighlight.mult >= 1 ? "text-emerald-400" : "text-rose-400"}`}>
              Landed on {bucketHighlight.mult}x ({bucketHighlight.mult >= 1 ? "+" : ""}{Math.floor(bet * bucketHighlight.mult - bet).toLocaleString()})
            </div>
          )}
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <div className="mt-2 text-sm text-slate-400 flex items-center gap-2">
            Balance: <CoinDisplay amount={user?.coins ?? 0} className="text-amber-200" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PlinkoBall({ path, positionFn }: { path: ("L" | "R")[]; positionFn: (p: ("L" | "R")[], step: number) => { x: number; y: number } }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setStep((s) => (s >= path.length ? path.length : s + 1));
    }, 100);
    return () => clearInterval(id);
  }, [path.length]);
  const { x, y } = positionFn(path, step);
  return <circle cx={x} cy={y} r={6} fill="#fbbf24" stroke="#92400e" strokeWidth={1} />;
}
