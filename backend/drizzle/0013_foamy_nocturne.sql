CREATE TABLE "tokenDetails" (
	"address" text NOT NULL,
	"chain" text NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"decimals" integer NOT NULL,
	"logo" text NOT NULL,
	CONSTRAINT "tokenDetails_address_chain_pk" PRIMARY KEY("address","chain")
);
