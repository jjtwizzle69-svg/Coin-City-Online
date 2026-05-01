import { FACE, HAIR, PANTS, SHIRT, SKIN_COLORS } from "@/lib/catalog";
import type { EquippedItems } from "@/lib/types";

type Props = { equipped: EquippedItems; size?: number; className?: string };

export function Avatar({ equipped, size = 160, className = "" }: Props) {
  const skin = SKIN_COLORS[equipped.skin] ?? SKIN_COLORS.skin_light!;
  const hair = HAIR[equipped.hair] ?? HAIR.hair_short_brown!;
  const shirt = SHIRT[equipped.shirt] ?? SHIRT.shirt_white!;
  const pants = PANTS[equipped.pants] ?? PANTS.pants_jeans!;
  const face = FACE[equipped.face] ?? FACE.face_smile!;

  const hairId = `hair-${equipped.hair}`;
  const shirtId = `shirt-${equipped.shirt}`;
  const pantsId = `pants-${equipped.pants}`;

  return (
    <svg viewBox="0 0 200 240" width={size} height={size * 1.2} className={className} aria-label="Avatar">
      <defs>
        {hair.gradient && (
          <linearGradient id={hairId} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={hair.gradient[0]}>
              {equipped.hair === "hair_neon" || equipped.hair === "hair_galaxy" ? (
                <animate attributeName="stop-color" values={`${hair.gradient[0]};${hair.gradient[1]};${hair.gradient[0]}`} dur="4s" repeatCount="indefinite" />
              ) : null}
            </stop>
            <stop offset="100%" stopColor={hair.gradient[1]}>
              {equipped.hair === "hair_neon" || equipped.hair === "hair_galaxy" ? (
                <animate attributeName="stop-color" values={`${hair.gradient[1]};${hair.gradient[0]};${hair.gradient[1]}`} dur="4s" repeatCount="indefinite" />
              ) : null}
            </stop>
          </linearGradient>
        )}
        {shirt.gradient && (
          <linearGradient id={shirtId} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={shirt.gradient[0]} />
            <stop offset="100%" stopColor={shirt.gradient[1]} />
          </linearGradient>
        )}
        {pants.gradient && (
          <linearGradient id={pantsId} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={pants.gradient[0]} />
            <stop offset="100%" stopColor={pants.gradient[1]} />
          </linearGradient>
        )}
      </defs>

      {/* Pants */}
      <rect x="60" y="170" width="80" height="60" rx="6" fill={pants.gradient ? `url(#${pantsId})` : pants.color} />
      <line x1="100" y1="170" x2="100" y2="230" stroke="rgba(0,0,0,0.25)" strokeWidth="2" />

      {/* Shirt / torso */}
      <path d="M50 110 Q50 100 60 100 L80 95 L120 95 L140 100 Q150 100 150 110 L150 175 L50 175 Z"
            fill={shirt.gradient ? `url(#${shirtId})` : shirt.color} />
      {/* Shirt details */}
      {shirt.pattern === "stripe" && (
        <g stroke="rgba(255,255,255,0.5)" strokeWidth="3" fill="none">
          <line x1="55" y1="120" x2="145" y2="120" />
          <line x1="55" y1="135" x2="145" y2="135" />
          <line x1="55" y1="150" x2="145" y2="150" />
        </g>
      )}
      {shirt.pattern === "gold-chain" && (
        <g>
          <circle cx="100" cy="118" r="4" fill="#f1c84a" />
          <path d="M84 110 Q100 132 116 110" stroke="#f1c84a" strokeWidth="2" fill="none" />
        </g>
      )}
      {shirt.pattern === "diamond" && (
        <g>
          <polygon points="100,108 110,118 100,130 90,118" fill="#9bd1ff" stroke="#fff" strokeWidth="1" />
          <polygon points="100,108 110,118 100,130 90,118" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
        </g>
      )}
      {shirt.pattern === "neon" && (
        <g stroke="#fff" strokeWidth="1.5" fill="none" opacity="0.8">
          <path d="M55 130 Q70 115 100 130 T145 130" />
          <path d="M55 150 Q70 135 100 150 T145 150" />
        </g>
      )}

      {/* Neck */}
      <rect x="88" y="80" width="24" height="20" fill={skin} />

      {/* Head */}
      <circle cx="100" cy="60" r="34" fill={skin} />

      {/* Hair */}
      {hair.style === "short" && (
        <path d="M66 50 Q70 24 100 22 Q130 24 134 50 L134 60 Q120 38 100 38 Q80 38 66 60 Z"
              fill={hair.gradient ? `url(#${hairId})` : hair.color} />
      )}
      {hair.style === "buzz" && (
        <path d="M66 50 Q72 32 100 32 Q128 32 134 50 L134 56 Q120 48 100 48 Q80 48 66 56 Z"
              fill={hair.gradient ? `url(#${hairId})` : hair.color} opacity="0.85" />
      )}
      {hair.style === "long" && (
        <path d="M62 60 Q60 24 100 22 Q140 24 138 60 L142 110 L130 105 L130 60 Q120 44 100 44 Q80 44 70 60 L70 105 L58 110 Z"
              fill={hair.gradient ? `url(#${hairId})` : hair.color} />
      )}
      {hair.style === "mohawk" && (
        <path d="M92 14 L108 14 L114 50 L86 50 Z"
              fill={hair.gradient ? `url(#${hairId})` : hair.color} />
      )}
      {hair.style === "afro" && (
        <circle cx="100" cy="40" r="44" fill={hair.gradient ? `url(#${hairId})` : hair.color} />
      )}
      {hair.style === "wave" && (
        <path d="M62 50 Q50 30 80 22 Q90 14 100 22 Q110 14 120 22 Q150 30 138 50 L138 62 Q124 38 100 38 Q76 38 62 62 Z"
              fill={`url(#${hairId})`} />
      )}
      {hair.style === "galaxy" && (
        <g>
          <path d="M62 50 Q60 18 100 18 Q140 18 138 50 L138 60 Q120 36 100 36 Q80 36 62 60 Z"
                fill={`url(#${hairId})`} />
          <circle cx="80" cy="32" r="1.4" fill="#fff" />
          <circle cx="120" cy="36" r="1.2" fill="#fff" />
          <circle cx="100" cy="24" r="1.6" fill="#fff" />
          <circle cx="92" cy="40" r="1" fill="#fff" />
          <circle cx="124" cy="48" r="1.2" fill="#fff" />
        </g>
      )}

      {/* Face */}
      {/* Eyes */}
      {face.eyes === "smile" && (<g fill="#1c1614"><circle cx="88" cy="60" r="3" /><circle cx="112" cy="60" r="3" /></g>)}
      {face.eyes === "neutral" && (<g fill="#1c1614"><rect x="84" y="59" width="9" height="2" /><rect x="107" y="59" width="9" height="2" /></g>)}
      {face.eyes === "wink" && (<g fill="#1c1614"><circle cx="88" cy="60" r="3" /><path d="M107 60 Q112 56 117 60" stroke="#1c1614" strokeWidth="2" fill="none" /></g>)}
      {face.eyes === "shades" && (
        <g>
          <rect x="78" y="55" width="44" height="10" fill="#1c1614" rx="2" />
          <rect x="78" y="55" width="20" height="10" fill="#1c1614" rx="2" />
          <rect x="102" y="55" width="20" height="10" fill="#1c1614" rx="2" />
          <line x1="98" y1="60" x2="102" y2="60" stroke="#1c1614" strokeWidth="2" />
        </g>
      )}
      {face.eyes === "smirk" && (<g fill="#1c1614"><path d="M84 60 Q88 56 92 60" stroke="#1c1614" strokeWidth="2" fill="none" /><path d="M108 60 Q112 56 116 60" stroke="#1c1614" strokeWidth="2" fill="none" /></g>)}
      {face.eyes === "money" && (
        <g>
          <circle cx="88" cy="60" r="5" fill="#fff" stroke="#1c1614" />
          <circle cx="112" cy="60" r="5" fill="#fff" stroke="#1c1614" />
          <text x="88" y="63.5" textAnchor="middle" fontSize="7" fontWeight="900" fill="#2f9e2f">$</text>
          <text x="112" y="63.5" textAnchor="middle" fontSize="7" fontWeight="900" fill="#2f9e2f">$</text>
        </g>
      )}
      {face.eyes === "galaxy" && (
        <g>
          <circle cx="88" cy="60" r="5" fill="#7a3bff">
            <animate attributeName="fill" values="#7a3bff;#3bd0ff;#7a3bff" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="112" cy="60" r="5" fill="#3bd0ff">
            <animate attributeName="fill" values="#3bd0ff;#7a3bff;#3bd0ff" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="88" cy="60" r="1" fill="#fff" />
          <circle cx="112" cy="60" r="1" fill="#fff" />
        </g>
      )}

      {/* Mouth */}
      {face.mouth === "smile" && (<path d="M88 78 Q100 88 112 78" stroke="#1c1614" strokeWidth="2.5" fill="none" strokeLinecap="round" />)}
      {face.mouth === "neutral" && (<line x1="90" y1="80" x2="110" y2="80" stroke="#1c1614" strokeWidth="2.5" strokeLinecap="round" />)}
      {face.mouth === "wink" && (<path d="M88 80 Q100 86 112 80" stroke="#1c1614" strokeWidth="2.5" fill="none" strokeLinecap="round" />)}
      {face.mouth === "smirk" && (<path d="M88 82 Q100 78 114 82" stroke="#1c1614" strokeWidth="2.5" fill="none" strokeLinecap="round" />)}
    </svg>
  );
}
