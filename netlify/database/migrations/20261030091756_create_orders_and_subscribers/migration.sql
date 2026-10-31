CREATE TABLE "orders" (
	"id" serial PRIMARY KEY,
	"public_id" text NOT NULL UNIQUE,
	"email" text NOT NULL,
	"name" text,
	"shipping_address" jsonb,
	"items" jsonb NOT NULL,
	"subtotal" integer NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"shipping" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"cogs" integer NOT NULL,
	"fees" integer NOT NULL,
	"profit" integer NOT NULL,
	"promo_code" text,
	"status" text DEFAULT 'pending_payment' NOT NULL,
	"stripe_session_id" text,
	"supplier_order_id" text,
	"tracking_number" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" serial PRIMARY KEY,
	"email" text NOT NULL UNIQUE,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
