export function Coin({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className="inline-block flex-shrink-0">
      <defs>
        <radialGradient id="coingrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fff7c2" />
          <stop offset="60%" stopColor="#f5c542" />
          <stop offset="100%" stopColor="#a8740c" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#coingrad)" stroke="#7a4f06" strokeWidth="1" />
      <text x="12" y="16.5" textAnchor="middle" fontSize="11" fontWeight="900" fill="#7a4f06">$</text>
    </svg>
  );
}

export function CoinDisplay({ amount, size = 14, className = "" }: { amount: number; size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 tabular-nums ${className}`}>
      <Coin size={size} />
      <span>{amount.toLocaleString()}</span>
    </span>
  );
}
