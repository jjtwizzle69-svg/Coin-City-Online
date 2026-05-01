export type EquippedItems = {
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  face: string;
};

export type PublicUser = {
  id: string;
  username: string;
  displayName: string;
  coins: number;
  isAdmin: boolean;
  equippedTagId: string;
  equippedTagStyle: string;
  equippedItems: EquippedItems;
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

export type ItemSlot = "skin" | "hair" | "shirt" | "pants" | "face";
export type Item = { id: string; name: string; slot: ItemSlot; cost: number };
export type Tag = { id: string; name: string; description: string; style: string };

export type DailyQuest = { key: string; name: string; description: string; rewardCoins: number; metric: string; target: number };
export type CareerQuest = { key: string; name: string; description: string; rewardCoins: number; tagId: string; metric: string; target: number };

export type DailyQuestStatus = { quest: DailyQuest; progress: number; target: number; complete: boolean; claimed: boolean };
export type CareerQuestStatus = { quest: CareerQuest; progress: number; target: number; complete: boolean; claimed: boolean };

export type Broadcast = {
  id: string;
  fromUserId: string;
  fromUsername: string;
  fromDisplayName: string;
  fromTagId: string;
  message: string;
  createdAt: string;
};

export type FriendEntry = { user: PublicUser; friendshipId: string };
export type FriendsResponse = {
  accepted: FriendEntry[];
  incoming: FriendEntry[];
  outgoing: FriendEntry[];
};

export type Trade = {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  offeredCoins: number;
  requestedCoins: number;
  offeredItems: string[];
  requestedItems: string[];
  message: string | null;
  createdAt: string;
  direction: "incoming" | "outgoing";
  other: PublicUser | null;
};

export type LotteryStatus = {
  round: {
    id: string;
    startedAt: string;
    endsAt: string;
    totalCoins: number;
    myCoins: number;
    participants: number;
  };
  pastWinners: {
    id: string;
    endedAt: string;
    totalCoins: number;
    winners: { userId: string; username: string; displayName: string; coins: number; share: number }[];
  }[];
};

export type GameHistoryEntry = {
  id: string;
  game: string;
  betCoins: number;
  payoutCoins: number;
  won: boolean;
  createdAt: string;
};
