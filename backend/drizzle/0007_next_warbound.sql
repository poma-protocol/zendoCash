ALTER TABLE "deals" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "endDealTransactionHash" text;--> statement-breakpoint
ALTER TABLE "userDeals" ADD COLUMN "joinTransactionHash" text;