import { sql } from "drizzle-orm";
import { check, pgTable, serial, text, real, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const dealsTable = pgTable("deals", {
    id: serial("id").primaryKey(),
    contract_address: text("contractAddress").notNull(),
    minimum_amount_to_hold: real("minimumAmountToHold").notNull(),
    reward: real("reward").notNull(),
    max_rewards: integer("maxRewards").notNull(),
    coin_owner_address: text("coinOwnerAddress").notNull(),
    start_date: timestamp("startDate").notNull(),
    endDate: timestamp("endDate").notNull(),
    creationTxHash: text("creationTransactionHash"),
    chain: text("chain").notNull(),
    activated: boolean("dealActivated").default(false).notNull(),
    creationDate: timestamp("creationDate").defaultNow().notNull(),
    activationDate: timestamp("activationDate"),
}, (table) => [
    check("VALID_CHAIN", sql`${table.chain} = 'arbitrum'`),
]);

export const userDealsTable = pgTable("userDeals", {
    userAddress: text('address').notNull(),
    dealID: integer('dealID').notNull().references(() => dealsTable.id),
    counter: integer('counter').notNull(),
    done: boolean('done').notNull()
});