DROP TABLE "rewardsSent" CASCADE;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "minimumDaysToHold" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "userDeals" ADD COLUMN "rewardSentTransactionHash" text;--> statement-breakpoint
ALTER TABLE "userDeals" DROP COLUMN "done";