CREATE TABLE "deals" (
	"id" serial PRIMARY KEY NOT NULL,
	"contractAddress" text NOT NULL,
	"minimumAmountToHold" real NOT NULL,
	"reward" real NOT NULL,
	"maxRewards" integer NOT NULL,
	"coinOwnerAddress" text NOT NULL,
	"startDate" timestamp NOT NULL,
	"endDate" timestamp NOT NULL
);
