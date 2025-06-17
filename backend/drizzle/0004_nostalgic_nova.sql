CREATE TABLE "rewardsSent" (
	"id" serial PRIMARY KEY NOT NULL,
	"dealID" integer NOT NULL,
	"userAddress" text NOT NULL,
	"txhash" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "userDeals" ADD CONSTRAINT "userDeals_address_dealID_pk" PRIMARY KEY("address","dealID");--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "done" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "rewardsSent" ADD CONSTRAINT "rewardsSent_dealID_deals_id_fk" FOREIGN KEY ("dealID") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;