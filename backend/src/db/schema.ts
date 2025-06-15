import { sql } from "drizzle-orm";
import { check, pgTable, serial, text, real, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { ARBITRUM_CHAIN } from "../constants";

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
    activated: boolean("dealActivated").default(false).notNull()
}, (table) => [
    check("VALID_CHAIN", sql`${table.chain} = 'arbitrum'`),
])