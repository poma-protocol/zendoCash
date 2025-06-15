ALTER TABLE "deals" ADD COLUMN "creationTransactionHash" text;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "chain" text NOT NULL;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "dealActivated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "VALID_CHAIN" CHECK ("deals"."chain" = 'arbitrum');