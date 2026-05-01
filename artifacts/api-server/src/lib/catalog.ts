// Shared catalog of items, tags, and quests. Frontend mirrors this in src/lib/catalog.ts.

export type ItemSlot = "skin" | "hair" | "shirt" | "pants" | "face";

export type Item = {
  id: string;
  name: string;
  slot: ItemSlot;
  cost: number; // 0 = free / starter
  // visuals stored on the frontend; backend only cares about id/cost/slot
};

export const ITEMS: Item[] = [
  // SKIN — all free
  { id: "skin_light", name: "Light", slot: "skin", cost: 0 },
  { id: "skin_fair", name: "Fair", slot: "skin", cost: 0 },
  { id: "skin_tan", name: "Tan", slot: "skin", cost: 0 },
  { id: "skin_brown", name: "Brown", slot: "skin", cost: 0 },
  { id: "skin_dark", name: "Dark", slot: "skin", cost: 0 },
  { id: "skin_deep", name: "Deep", slot: "skin", cost: 0 },

  // HAIR — short brown free, others cost
  { id: "hair_short_brown", name: "Short Brown", slot: "hair", cost: 0 },
  { id: "hair_short_black", name: "Short Black", slot: "hair", cost: 0 },
  { id: "hair_buzz", name: "Buzz Cut", slot: "hair", cost: 0 },
  { id: "hair_long_blonde", name: "Long Blonde", slot: "hair", cost: 1500 },
  { id: "hair_mohawk_red", name: "Red Mohawk", slot: "hair", cost: 4000 },
  { id: "hair_afro", name: "Afro", slot: "hair", cost: 3500 },
  { id: "hair_neon", name: "Neon Wave", slot: "hair", cost: 12000 },
  { id: "hair_galaxy", name: "Galaxy Locks", slot: "hair", cost: 50000 },

  // SHIRT — white & black free
  { id: "shirt_white", name: "White Tee", slot: "shirt", cost: 0 },
  { id: "shirt_black", name: "Black Tee", slot: "shirt", cost: 0 },
  { id: "shirt_red", name: "Red Hoodie", slot: "shirt", cost: 1200 },
  { id: "shirt_blue", name: "Blue Polo", slot: "shirt", cost: 1500 },
  { id: "shirt_green", name: "Forest Flannel", slot: "shirt", cost: 2500 },
  { id: "shirt_gold", name: "Gold Chain Tee", slot: "shirt", cost: 8000 },
  { id: "shirt_neon", name: "Neon Jacket", slot: "shirt", cost: 15000 },
  { id: "shirt_diamond", name: "Diamond Vest", slot: "shirt", cost: 75000 },

  // PANTS — jeans & sweats free
  { id: "pants_jeans", name: "Jeans", slot: "pants", cost: 0 },
  { id: "pants_sweat", name: "Sweatpants", slot: "pants", cost: 0 },
  { id: "pants_chinos", name: "Chinos", slot: "pants", cost: 1000 },
  { id: "pants_cargo", name: "Cargo Pants", slot: "pants", cost: 2000 },
  { id: "pants_leather", name: "Leather Pants", slot: "pants", cost: 6000 },
  { id: "pants_neon", name: "Neon Tracks", slot: "pants", cost: 12000 },
  { id: "pants_gold", name: "Gold Trousers", slot: "pants", cost: 60000 },

  // FACE — basic free
  { id: "face_smile", name: "Smile", slot: "face", cost: 0 },
  { id: "face_neutral", name: "Neutral", slot: "face", cost: 0 },
  { id: "face_wink", name: "Wink", slot: "face", cost: 0 },
  { id: "face_shades", name: "Shades", slot: "face", cost: 2500 },
  { id: "face_cool", name: "Cool Smirk", slot: "face", cost: 3500 },
  { id: "face_money", name: "Money Eyes", slot: "face", cost: 10000 },
  { id: "face_galaxy", name: "Galaxy Eyes", slot: "face", cost: 25000 },
];

export const ITEM_BY_ID = new Map(ITEMS.map((i) => [i.id, i]));

export type Tag = {
  id: string;
  name: string;
  description: string;
  // textClass identifies the tag visual style on the client; backend only stores id
  style: "default" | "gold" | "neon-rainbow" | "silver" | "blue" | "green" | "red" | "purple";
};

export const TAGS: Tag[] = [
  { id: "noob", name: "Noob", description: "Default starter tag.", style: "default" },
  { id: "developer", name: "Developer", description: "The dev. Reserved.", style: "gold" },
  { id: "millionaire", name: "Millionaire", description: "Hold 1,000,000 coins.", style: "neon-rainbow" },
  { id: "high_roller", name: "High Roller", description: "Bet 100,000 coins lifetime.", style: "purple" },
  { id: "lucky", name: "Lucky", description: "Win 10 games in a row.", style: "green" },
  { id: "plinker", name: "Plinker", description: "Win 50 plinko games.", style: "blue" },
  { id: "mine_master", name: "Mine Master", description: "Win 25 mines games.", style: "red" },
  { id: "sharpshooter", name: "Sharpshooter", description: "Make 5 free throws.", style: "silver" },
  { id: "blackjack_pro", name: "Blackjack Pro", description: "Win 25 blackjack hands.", style: "purple" },
  { id: "friendly", name: "Friendly", description: "Have 10 friends.", style: "green" },
];

export const TAG_BY_ID = new Map(TAGS.map((t) => [t.id, t]));

// Career quests — unlocks tags (and bonus coins).
export type CareerQuest = {
  key: string;
  name: string;
  description: string;
  rewardCoins: number;
  tagId: string;
  // progress fn must be evaluated server-side using user counters
  metric: "coins" | "totalBet" | "bestWinStreak" | "plinkoWins" | "minesWins" | "freeThrowMakes" | "blackjackWins" | "friends";
  target: number;
};

export const CAREER_QUESTS: CareerQuest[] = [
  { key: "millionaire", name: "Millionaire", description: "Hold 1,000,000 coins at once.", rewardCoins: 5000, tagId: "millionaire", metric: "coins", target: 1_000_000 },
  { key: "high_roller", name: "High Roller", description: "Bet 100,000 coins lifetime.", rewardCoins: 5000, tagId: "high_roller", metric: "totalBet", target: 100_000 },
  { key: "lucky", name: "Lucky", description: "Win 10 games in a row.", rewardCoins: 2500, tagId: "lucky", metric: "bestWinStreak", target: 10 },
  { key: "plinker", name: "Plinker", description: "Win 50 plinko games.", rewardCoins: 3000, tagId: "plinker", metric: "plinkoWins", target: 50 },
  { key: "mine_master", name: "Mine Master", description: "Win 25 mines games.", rewardCoins: 3000, tagId: "mine_master", metric: "minesWins", target: 25 },
  { key: "sharpshooter", name: "Sharpshooter", description: "Make 5 free throws.", rewardCoins: 2500, tagId: "sharpshooter", metric: "freeThrowMakes", target: 5 },
  { key: "blackjack_pro", name: "Blackjack Pro", description: "Win 25 blackjack hands.", rewardCoins: 3000, tagId: "blackjack_pro", metric: "blackjackWins", target: 25 },
  { key: "friendly", name: "Friendly", description: "Have 10 accepted friends.", rewardCoins: 2000, tagId: "friendly", metric: "friends", target: 10 },
];

export type DailyQuest = {
  key: string;
  name: string;
  description: string;
  rewardCoins: number;
  metric: "gamesToday" | "winsToday" | "betToday" | "biggestWinToday";
  target: number;
};

export const DAILY_QUESTS: DailyQuest[] = [
  { key: "play_5", name: "Play 5 Games", description: "Play 5 games today.", rewardCoins: 200, metric: "gamesToday", target: 5 },
  { key: "win_3", name: "Win 3 Games", description: "Win any 3 games today.", rewardCoins: 500, metric: "winsToday", target: 3 },
  { key: "bet_1000", name: "High Stakes", description: "Bet 1,000 coins total today.", rewardCoins: 300, metric: "betToday", target: 1000 },
  { key: "big_win", name: "Big Win", description: "Win 500+ coins in a single game.", rewardCoins: 400, metric: "biggestWinToday", target: 500 },
];

// Daily wheel rewards (weighted-ish; chosen at random uniformly).
export const DAILY_WHEEL_REWARDS = [50, 100, 150, 250, 500, 750, 1000, 2500];

// Profanity filter — small list to satisfy "cannot be inappropriate" rule.
const BAD_WORDS = [
  "fuck","shit","bitch","cunt","nigger","nigga","faggot","fag","retard","slut","whore","dick","cock","pussy","asshole","bastard","kike","spic","chink","tranny",
];
export function isInappropriate(text: string): boolean {
  const t = text.toLowerCase();
  return BAD_WORDS.some((w) => t.includes(w));
}
