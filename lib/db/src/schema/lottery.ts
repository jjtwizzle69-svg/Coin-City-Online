import { pgTable, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export type LotteryWinner = {
  userId: string;
  username: string;
  displayName: string;
  coins: number;
  share: number;
};

export const lotteryRoundsTable = pgTable("lottery_rounds", {
  id: text("id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  totalCoins: integer("total_coins").notNull().default(0),
  status: text("status").notNull().default("active"),
  winners: jsonb("winners").$type<LotteryWinner[]>().notNull().default([]),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export type LotteryRoundRow = typeof lotteryRoundsTable.$inferSelect;

export const lotteryEntriesTable = pgTable("lottery_entries", {
  id: text("id").primaryKey(),
  roundId: text("round_id").notNull(),
  userId: text("user_id").notNull(),
  coins: integer("coins").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LotteryEntryRow = typeof lotteryEntriesTable.$inferSelect;
