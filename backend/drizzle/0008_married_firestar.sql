ALTER TABLE "userDeals" DROP CONSTRAINT "userDeals_dealID_deals_id_fk";
--> statement-breakpoint
ALTER TABLE "userDeals" ADD COLUMN "joinTime" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "userDeals" ADD CONSTRAINT "userDeals_dealID_deals_id_fk" FOREIGN KEY ("dealID") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;