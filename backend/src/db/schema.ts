import { sql } from "drizzle-orm";
import { primaryKey, check, pgTable, serial, text, real, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const dealsTable = pgTable("deals", {
    id: serial("id").primaryKey(),
    contract_address: text("contractAddress").notNull(),
    name: text("name").notNull(),
    minimum_amount_to_hold: real("minimumAmountToHold").notNull(),
    miniumum_days_to_hold: integer("minimumDaysToHold").notNull(),
    reward: real("reward").notNull(),
    max_rewards: integer("maxRewards").notNull(),
    coin_owner_address: text("coinOwnerAddress").notNull(),
    start_date: timestamp("startDate").notNull(),
    endDate: timestamp("endDate").notNull(),
    creationTxHash: text("creationTransactionHash"),
    chain: text("chain").notNull(),
    activationTxHash: text("activationTransactionHash"),
    creationDate: timestamp("creationDate").defaultNow().notNull(),
    activationDate: timestamp("activationDate"),
    endDealTx: text("endDealTransactionHash"),
    done: boolean("done").default(false).notNull(),
    description: text("description"),
    commissionTxHash: text("commissionTransactionHash"),
    commissionDate: timestamp("commissionDate"),
    code: text("code")
});

export const userDealsTable = pgTable("userDeals", {
    userAddress: text('address').notNull(),
    dealID: integer('dealID').notNull().references(() => dealsTable.id, {onDelete: 'cascade'}),
    counter: integer('counter').notNull(),
    joinTxHash: text("joinTransactionHash"),
    joinTime: timestamp("joinTime").defaultNow().notNull(),
    lastCountUpdateTime: timestamp("lastCountUpdateTime"),
    rewardSentTxHash: text('rewardSentTransactionHash')
}, (table) => [
    primaryKey({columns: [table.userAddress, table.dealID]})
]);

export const tokenDetailsTable = pgTable("tokenDetails", {
    address: text("address").notNull(),
    chain: text("chain").notNull(),
    name: text("name").notNull(),
    symbol: text("symbol").notNull(),
    decimals: integer("decimals").notNull(),
    logo: text("logo")
}, (table) => [
    primaryKey({columns: [table.address, table.chain]})
]);