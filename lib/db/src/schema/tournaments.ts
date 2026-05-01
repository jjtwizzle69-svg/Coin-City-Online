import { pgTable, text, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";

export type TournamentRewards = {
  first: { coins: number; xp: number; tagId?: string; itemId?: string };
  second: { coins: number; xp: number };
  third: { coins: number; xp: number };
  participation: { coins: number; xp: number };
};

export const tournamentsTable = pgTable("tournaments", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  game: text("game").notNull(),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  settled: boolean("settled").notNull().default(false),
  rewards: jsonb("rewards").$type<TournamentRewards>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TournamentRow = typeof tournamentsTable.$inferSelect;

export const tournamentEntriesTable = pgTable("tournament_entries", {
  id: text("id").primaryKey(),
  tournamentId: text("tournament_id").notNull(),
  userId: text("user_id").notNull(),
  score: integer("score").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  settledAt: timestamp("settled_at", { withTimezone: true }),
});

export type TournamentEntryRow = typeof tournamentEntriesTable.$inferSelect;
