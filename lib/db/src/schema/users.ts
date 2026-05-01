import { pgTable, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

export type EquippedItems = {
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  face: string;
};

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  usernameLower: text("username_lower").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  coins: integer("coins").notNull().default(1000),
  isAdmin: boolean("is_admin").notNull().default(false),
  equippedTagId: text("equipped_tag_id").notNull().default("noob"),
  equippedItems: jsonb("equipped_items").$type<EquippedItems>().notNull().default({
    skin: "skin_light",
    hair: "hair_short_brown",
    shirt: "shirt_white",
    pants: "pants_jeans",
    face: "face_smile",
  }),
  ownedItems: jsonb("owned_items").$type<string[]>().notNull().default([]),
  ownedTags: jsonb("owned_tags").$type<string[]>().notNull().default(["noob"]),
  lastDailyWheelAt: timestamp("last_daily_wheel_at", { withTimezone: true }),
  luckCharges: integer("luck_charges").notNull().default(0),
  luckUntil: timestamp("luck_until", { withTimezone: true }),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  chatBannedUntil: timestamp("chat_banned_until", { withTimezone: true }),
  chatBanReason: text("chat_ban_reason"),
  totalBet: integer("total_bet").notNull().default(0),
  totalWon: integer("total_won").notNull().default(0),
  gamesPlayed: integer("games_played").notNull().default(0),
  gamesWon: integer("games_won").notNull().default(0),
  currentWinStreak: integer("current_win_streak").notNull().default(0),
  bestWinStreak: integer("best_win_streak").notNull().default(0),
  plinkoWins: integer("plinko_wins").notNull().default(0),
  minesWins: integer("mines_wins").notNull().default(0),
  diceWins: integer("dice_wins").notNull().default(0),
  blackjackWins: integer("blackjack_wins").notNull().default(0),
  coinflipWins: integer("coinflip_wins").notNull().default(0),
  freeThrowMakes: integer("free_throw_makes").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserRow = typeof usersTable.$inferSelect;

export const sessionsTable = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SessionRow = typeof sessionsTable.$inferSelect;
