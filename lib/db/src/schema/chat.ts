import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const worldChatTable = pgTable("world_chat", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WorldChatRow = typeof worldChatTable.$inferSelect;

export const directMessagesTable = pgTable("direct_messages", {
  id: text("id").primaryKey(),
  fromUserId: text("from_user_id").notNull(),
  toUserId: text("to_user_id").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DirectMessageRow = typeof directMessagesTable.$inferSelect;
