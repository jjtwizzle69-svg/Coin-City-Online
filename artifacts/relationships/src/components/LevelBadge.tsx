import { levelColor, levelBgColor, xpProgress } from "@/lib/xp";

type Props = {
  level: number;
  xp: number;
  showBar?: boolean;
  className?: string;
};

export default function LevelBadge({ level, xp, showBar = false, className = "" }: Props) {
  const color = levelColor(level);
  const bg = levelBgColor(level);
  const prog = xpProgress(xp, level);

  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <span className={`inline-flex items-center gap-1 text-xs font-bold ${color}`}>
        <span className={`${bg} text-white rounded px-1 py-0.5 text-[10px] font-bold leading-none`}>Lvl {level}</span>
      </span>
      {showBar && (
        <div className="flex items-center gap-1.5">
          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full ${bg} rounded-full transition-all duration-500`} style={{ width: `${prog.percent}%` }} />
          </div>
          <span className="text-[10px] text-slate-500 whitespace-nowrap">{prog.current.toLocaleString()}/{prog.needed.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}
