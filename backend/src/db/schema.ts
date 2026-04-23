import { pgTable, serial, varchar, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const messageTypeEnum = pgEnum("msg_type", ["text", "image", "lightning", "voice"]);
export const roomTypeEnum = pgEnum("room_type", ["dm", "group"]);

export const chatUsersTable = pgTable("chat_users", {
  id:               serial("id").primaryKey(),
  lightningAddress: varchar("lightning_address", { length: 200 }).notNull().unique(),
  username:         varchar("username", { length: 80 }).notNull().unique(),
  avatarSeed:       varchar("avatar_seed", { length: 40 }).notNull(),
  satsBalance:      integer("sats_balance").notNull().default(0),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
});

export const chatRoomsTable = pgTable("chat_rooms", {
  id:        serial("id").primaryKey(),
  type:      roomTypeEnum("type").notNull().default("dm"),
  name:      varchar("name", { length: 100 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chatMembersTable = pgTable("chat_members", {
  roomId:   integer("room_id").notNull().references(() => chatRoomsTable.id),
  userId:   integer("user_id").notNull().references(() => chatUsersTable.id),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const chatMessagesTable = pgTable("chat_messages", {
  id:          serial("id").primaryKey(),
  roomId:      integer("room_id").notNull().references(() => chatRoomsTable.id),
  senderId:    integer("sender_id").notNull().references(() => chatUsersTable.id),
  type:        messageTypeEnum("type").notNull().default("text"),
  content:     text("content"),
  invoicePr:   text("invoice_pr"),
  invoicePaid: boolean("invoice_paid").notNull().default(false),
  fileUrl:     text("file_url"),
  sats:        integer("sats"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export const chatRewardsTable = pgTable("chat_rewards", {
  id:        serial("id").primaryKey(),
  userId:    integer("user_id").notNull().references(() => chatUsersTable.id),
  action:    varchar("action", { length: 60 }).notNull(),
  sats:      integer("sats").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
