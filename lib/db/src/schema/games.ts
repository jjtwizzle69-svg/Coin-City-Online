import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const gameHistoryTable = pgTable("game_history", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  game: text("game").notNull(),
  betCoins: integer("bet_coins").notNull().default(0),
  payoutCoins: integer("payout_coins").notNull().default(0),
  won: boolean("won").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GameHistoryRow = typeof gameHistoryTable.$inferSelect;

export const dailyQuestStateTable = pgTable("daily_quest_state", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  dateKey: text("date_key").notNull(),
  questKey: text("quest_key").notNull(),
  claimed: boolean("claimed").notNull().default(false),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
});

export type DailyQuestStateRow = typeof dailyQuestStateTable.$inferSelect;

export const careerQuestStateTable = pgTable("career_quest_state", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  questKey: text("quest_key").notNull(),
  claimed: boolean("claimed").notNull().default(false),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
});

export type CareerQuestStateRow = typeof careerQuestStateTable.$inferSelect;
