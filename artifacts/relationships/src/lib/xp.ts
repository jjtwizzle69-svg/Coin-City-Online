// Mirror of backend lib/xp.ts level math
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(100 * Math.pow(level - 1, 1.8));
}

export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let l = 2; l <= level; l++) total += xpForLevel(l);
  return total;
}

export function xpProgress(xp: number, level: number): { current: number; needed: number; percent: number } {
  const base = totalXpForLevel(level);
  const next = totalXpForLevel(level + 1);
  const needed = next - base;
  const current = xp - base;
  return {
    current: Math.max(0, current),
    needed,
    percent: Math.min(100, Math.round((current / needed) * 100)),
  };
}

export const LEVEL_COLORS: Record<number, string> = {
  1: "text-slate-400",
  10: "text-blue-400",
  25: "text-emerald-400",
  50: "text-amber-400",
  75: "text-purple-400",
  100: "text-rose-400",
};

export function levelColor(level: number): string {
  if (level >= 100) return "text-rose-400";
  if (level >= 75) return "text-purple-400";
  if (level >= 50) return "text-amber-400";
  if (level >= 25) return "text-emerald-400";
  if (level >= 10) return "text-blue-400";
  return "text-slate-400";
}

export function levelBgColor(level: number): string {
  if (level >= 100) return "bg-rose-500";
  if (level >= 75) return "bg-purple-500";
  if (level >= 50) return "bg-amber-500";
  if (level >= 25) return "bg-emerald-500";
  if (level >= 10) return "bg-blue-500";
  return "bg-slate-500";
}
