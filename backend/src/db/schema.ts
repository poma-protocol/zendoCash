import { pgTable, serial, text, real, integer, timestamp } from "drizzle-orm/pg-core";

export const dealsTable = pgTable("deals", {
    id: serial("id").primaryKey(),
    contract_address: text("contractAddress").notNull(),
    minimum_amount_to_hold: real("minimumAmountToHold").notNull(),
    reward: real("reward").notNull(),
    max_rewards: integer("maxRewards").notNull(),
    coin_owner_address: text("coinOwnerAddress").notNull(),
    start_date: timestamp("startDate").notNull(),
    endDate: timestamp("endDate").notNull()
})