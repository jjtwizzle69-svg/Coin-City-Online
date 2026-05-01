import { pgTable, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export const friendshipsTable = pgTable("friendships", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  friendId: text("friend_id").notNull(),
  status: text("status").notNull().default("pending"),
  requestedBy: text("requested_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type FriendshipRow = typeof friendshipsTable.$inferSelect;

export const broadcastsTable = pgTable("broadcasts", {
  id: text("id").primaryKey(),
  fromUserId: text("from_user_id").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BroadcastRow = typeof broadcastsTable.$inferSelect;

export const tradesTable = pgTable("trades", {
  id: text("id").primaryKey(),
  fromUserId: text("from_user_id").notNull(),
  toUserId: text("to_user_id").notNull(),
  status: text("status").notNull().default("pending"),
  offeredCoins: integer("offered_coins").notNull().default(0),
  requestedCoins: integer("requested_coins").notNull().default(0),
  offeredItems: jsonb("offered_items").$type<string[]>().notNull().default([]),
  requestedItems: jsonb("requested_items").$type<string[]>().notNull().default([]),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export type TradeRow = typeof tradesTable.$inferSelect;
