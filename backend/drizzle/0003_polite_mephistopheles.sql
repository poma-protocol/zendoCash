CREATE TABLE "userDeals" (
	"address" text NOT NULL,
	"dealID" integer NOT NULL,
	"counter" integer NOT NULL,
	"done" boolean NOT NULL
);
--> statement-breakpoint
ALTER TABLE "userDeals" ADD CONSTRAINT "userDeals_dealID_deals_id_fk" FOREIGN KEY ("dealID") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;