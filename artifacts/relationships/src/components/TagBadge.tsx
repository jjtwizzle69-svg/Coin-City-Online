import type { Tag } from "@/lib/types";

const STYLE: Record<string, string> = {
  default: "bg-zinc-200 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
  gold: "bg-gradient-to-r from-amber-200 to-yellow-400 text-amber-900 border-amber-500 font-semibold shadow-[0_0_10px_rgba(250,204,21,0.4)]",
  "neon-rainbow": "text-white font-bold border-transparent",
  silver: "bg-gradient-to-r from-zinc-200 to-zinc-400 text-zinc-900 border-zinc-400",
  blue: "bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30",
  green: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  red: "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30",
  purple: "bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/30",
};

export function TagBadge({ tag, size = "sm" }: { tag: Tag | { id: string; name: string; style: string } | null; size?: "sm" | "md" }) {
  if (!tag) return null;
  const cls = STYLE[tag.style] ?? STYLE.default;
  const isRainbow = tag.style === "neon-rainbow";
  const padding = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  if (isRainbow) {
    return (
      <span
        className={`inline-flex items-center rounded-full border ${padding} ${cls}`}
        style={{
          background: "linear-gradient(90deg,#ff3df1,#3d8aff,#3dffd1,#3dff5b,#fff03d,#ff7e3d,#ff3df1)",
          backgroundSize: "300% 100%",
          animation: "tagRainbow 4s linear infinite",
        }}
      >
        {tag.name}
      </span>
    );
  }
  return <span className={`inline-flex items-center rounded-full border ${padding} ${cls}`}>{tag.name}</span>;
}
