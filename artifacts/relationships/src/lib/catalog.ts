import type { Item, ItemSlot, Tag } from "./types";

// Visual definitions for items (skin tones, hair colors/shapes, etc.).
// IDs MUST match the backend catalog in artifacts/api-server/src/lib/catalog.ts.

export const SKIN_COLORS: Record<string, string> = {
  skin_light: "#fde2c5",
  skin_fair: "#f4c79c",
  skin_tan: "#d99a6c",
  skin_brown: "#a06846",
  skin_dark: "#6b3f25",
  skin_deep: "#3e2618",
};

export type HairVisual = { color: string; style: "short" | "buzz" | "long" | "mohawk" | "afro" | "wave" | "galaxy"; gradient?: [string, string] };
export const HAIR: Record<string, HairVisual> = {
  hair_short_brown: { color: "#5b3a1a", style: "short" },
  hair_short_black: { color: "#1c1614", style: "short" },
  hair_buzz: { color: "#2b201a", style: "buzz" },
  hair_long_blonde: { color: "#e9c98a", style: "long" },
  hair_mohawk_red: { color: "#d8392b", style: "mohawk" },
  hair_afro: { color: "#1f1410", style: "afro" },
  hair_neon: { color: "#39d4ff", style: "wave", gradient: ["#39d4ff", "#b864ff"] },
  hair_galaxy: { color: "#7a3bff", style: "galaxy", gradient: ["#7a3bff", "#3bd0ff"] },
};

export type ShirtVisual = { color: string; gradient?: [string, string]; pattern?: "stripe" | "diamond" | "neon" | "gold-chain" };
export const SHIRT: Record<string, ShirtVisual> = {
  shirt_white: { color: "#f6f6f6" },
  shirt_black: { color: "#1c1c1c" },
  shirt_red: { color: "#c63030" },
  shirt_blue: { color: "#3957c8" },
  shirt_green: { color: "#386b3a", pattern: "stripe" },
  shirt_gold: { color: "#1c1c1c", pattern: "gold-chain" },
  shirt_neon: { color: "#0e0e2a", gradient: ["#39d4ff", "#b864ff"], pattern: "neon" },
  shirt_diamond: { color: "#1f2230", pattern: "diamond", gradient: ["#cfeaff", "#9bd1ff"] },
};

export type PantsVisual = { color: string; gradient?: [string, string] };
export const PANTS: Record<string, PantsVisual> = {
  pants_jeans: { color: "#3a4a78" },
  pants_sweat: { color: "#3a3a3a" },
  pants_chinos: { color: "#9a8665" },
  pants_cargo: { color: "#5b6243" },
  pants_leather: { color: "#161616" },
  pants_neon: { color: "#0e0e2a", gradient: ["#39d4ff", "#b864ff"] },
  pants_gold: { color: "#c89c2a", gradient: ["#f4d774", "#a0741a"] },
};

export type FaceVisual = { eyes: "smile" | "neutral" | "wink" | "shades" | "smirk" | "money" | "galaxy"; mouth: "smile" | "neutral" | "wink" | "smirk" };
export const FACE: Record<string, FaceVisual> = {
  face_smile: { eyes: "smile", mouth: "smile" },
  face_neutral: { eyes: "neutral", mouth: "neutral" },
  face_wink: { eyes: "wink", mouth: "smile" },
  face_shades: { eyes: "shades", mouth: "smile" },
  face_cool: { eyes: "smirk", mouth: "smirk" },
  face_money: { eyes: "money", mouth: "smile" },
  face_galaxy: { eyes: "galaxy", mouth: "smile" },
};

export const SLOT_LABELS: Record<ItemSlot, string> = {
  skin: "Skin Tone",
  hair: "Hair",
  shirt: "Shirt",
  pants: "Pants",
  face: "Face",
};

// Local default catalog (will be overwritten by server fetch when available)
export const DEFAULT_ITEMS: Item[] = [];
export const DEFAULT_TAGS: Tag[] = [];

export const GAMES: { id: string; name: string; description: string; tone: string }[] = [
  { id: "dice", name: "Dice Roll", description: "Pick over/under and roll 1-100.", tone: "from-amber-400/20 to-amber-600/20" },
  { id: "mines", name: "Mines", description: "Click safe tiles, avoid the bombs.", tone: "from-rose-400/20 to-rose-600/20" },
  { id: "plinko", name: "Plinko", description: "Drop the ball, win on the bounce.", tone: "from-violet-400/20 to-violet-600/20" },
  { id: "coinflip", name: "Heads or Tails", description: "Pick a side. 2x payout.", tone: "from-yellow-400/20 to-yellow-600/20" },
  { id: "blackjack", name: "Blackjack", description: "Beat the dealer to 21.", tone: "from-emerald-400/20 to-emerald-600/20" },
  { id: "freethrow", name: "Free Throw", description: "Tiny chance, huge payout.", tone: "from-sky-400/20 to-sky-600/20" },
];
