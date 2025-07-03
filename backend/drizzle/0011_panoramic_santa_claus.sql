ALTER TABLE "deals" ADD COLUMN "commissionTransactionHash" text;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "commissionDate" timestamp;--> statement-breakpoint
ALTER TABLE "deals" DROP COLUMN "dealActivated";