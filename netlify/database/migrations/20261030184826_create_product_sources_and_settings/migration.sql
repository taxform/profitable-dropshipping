CREATE TABLE "product_sources" (
	"slug" text PRIMARY KEY,
	"cj_pid" text NOT NULL,
	"cj_vid" text NOT NULL,
	"cj_sku" text,
	"cj_name" text,
	"cj_variant_name" text,
	"cj_image" text,
	"product_cost" integer NOT NULL,
	"shipping_cost" integer NOT NULL,
	"logistic_name" text,
	"shipping_days" text,
	"price" integer NOT NULL,
	"price_locked" boolean DEFAULT false NOT NULL,
	"use_cj_image" boolean DEFAULT true NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
