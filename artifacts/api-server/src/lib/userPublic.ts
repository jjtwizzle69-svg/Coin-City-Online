import type { UserRow } from "@workspace/db";
import { TAG_BY_ID } from "./catalog";

export type PublicUser = {
  id: string;
  username: string;
  displayName: string;
  coins: number;
  isAdmin: boolean;
  equippedTagId: string;
  equippedTagStyle: string;
  equippedItems: UserRow["equippedItems"];
  ownedItems: string[];
  ownedTags: string[];
  luckCharges: number;
  luckUntil: string | null;
  xp: number;
  level: number;
  chatBannedUntil: string | null;
  chatBanReason: string | null;
  totalBet: number;
  totalWon: number;
  gamesPlayed: number;
  gamesWon: number;
  bestWinStreak: number;
  currentWinStreak: number;
  plinkoWins: number;
  minesWins: number;
  diceWins: number;
  blackjackWins: number;
  coinflipWins: number;
  freeThrowMakes: number;
  lastDailyWheelAt: string | null;
  createdAt: string;
};

export function toPublicUser(u: UserRow): PublicUser {
  const tag = TAG_BY_ID.get(u.equippedTagId);
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    coins: u.coins,
    isAdmin: u.isAdmin,
    equippedTagId: u.equippedTagId,
    equippedTagStyle: tag?.style ?? "default",
    equippedItems: u.equippedItems,
    ownedItems: u.ownedItems,
    ownedTags: u.ownedTags,
    luckCharges: u.luckCharges,
    luckUntil: u.luckUntil ? u.luckUntil.toISOString() : null,
    xp: u.xp,
    level: u.level,
    chatBannedUntil: u.chatBannedUntil ? u.chatBannedUntil.toISOString() : null,
    chatBanReason: u.chatBanReason ?? null,
    totalBet: u.totalBet,
    totalWon: u.totalWon,
    gamesPlayed: u.gamesPlayed,
    gamesWon: u.gamesWon,
    bestWinStreak: u.bestWinStreak,
    currentWinStreak: u.currentWinStreak,
    plinkoWins: u.plinkoWins,
    minesWins: u.minesWins,
    diceWins: u.diceWins,
    blackjackWins: u.blackjackWins,
    coinflipWins: u.coinflipWins,
    freeThrowMakes: u.freeThrowMakes,
    lastDailyWheelAt: u.lastDailyWheelAt ? u.lastDailyWheelAt.toISOString() : null,
    createdAt: u.createdAt.toISOString(),
  };
}
