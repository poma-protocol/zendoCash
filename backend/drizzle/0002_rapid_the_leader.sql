ALTER TABLE "deals" ADD COLUMN "creationDate" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "activationDate" timestamp;