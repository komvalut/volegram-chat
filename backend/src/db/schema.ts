import { pgTable, serial, varchar, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const messageTypeEnum = pgEnum("msg_type", ["text", "image", "lightning", "voice"]);
export const roomTypeEnum    = pgEnum("room_type", ["dm", "group"]);

export const chatUsersTable = pgTable("chat_users", {
  id:               serial("id").primaryKey(),
  lightningAddress: varchar("lightning_address", { length: 200 }).notNull().unique(),
  username:         varchar("username", { length: 80 }).notNull().unique(),
  avatarSeed:       varchar("avatar_seed", { length: 40 }).notNull(),
  avatarUrl:        text("avatar_url"),
  bio:              text("bio"),
  email:            varchar("email", { length: 200 }),
  phone:            varchar("phone", { length: 40 }),
  satsBalance:      integer("sats_balance").notNull().default(0),
  isAdmin:          boolean("is_admin").notNull().default(false),
  isBlocked:        boolean("is_blocked").notNull().default(false),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
});

export const chatRoomsTable = pgTable("chat_rooms", {
  id:          serial("id").primaryKey(),
  type:        roomTypeEnum("type").notNull().default("dm"),
  name:        varchar("name", { length: 100 }),
  isIncognito: boolean("is_incognito").notNull().default(false),
  inviteCode:  varchar("invite_code", { length: 32 }),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
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
  isDeleted:   boolean("is_deleted").notNull().default(false),
  expiresAt:   timestamp("expires_at"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export const chatReportsTable = pgTable("chat_reports", {
  id:         serial("id").primaryKey(),
  reporterId: integer("reporter_id").notNull().references(() => chatUsersTable.id),
  targetId:   integer("target_id").notNull().references(() => chatUsersTable.id),
  reason:     text("reason").notNull(),
  resolved:   boolean("resolved").notNull().default(false),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
});

export const vbcTradesTable = pgTable("vbc_trades", {
  id:            serial("id").primaryKey(),
  roomId:        integer("room_id").notNull().references(() => chatRoomsTable.id),
  buyerId:       integer("buyer_id").notNull().references(() => chatUsersTable.id),
  sellerId:      integer("seller_id").notNull().references(() => chatUsersTable.id),
  sats:          integer("sats").notNull(),
  asset:         varchar("asset", { length: 30 }).notNull(),
  assetAmount:   varchar("asset_amount", { length: 60 }).notNull(),
  buyerAddress:  text("buyer_address"),
  invoicePr:       text("invoice_pr"),
  sbpCheckoutId:   text("sbp_checkout_id"),
  status:          varchar("status", { length: 30 }).notNull().default("pending"),
  paymentProofUrl: text("payment_proof_url"),
  tradeType:       varchar("trade_type", { length: 20 }).notNull().default("lightning"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

export const chatRewardsTable = pgTable("chat_rewards", {
  id:        serial("id").primaryKey(),
  userId:    integer("user_id").notNull().references(() => chatUsersTable.id),
  action:    varchar("action", { length: 60 }).notNull(),
  sats:      integer("sats").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
