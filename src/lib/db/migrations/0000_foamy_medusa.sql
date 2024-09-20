CREATE TABLE IF NOT EXISTS "replicache_client" (
	"id" text PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"last_mutation_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "replicache_client_group" (
	"id" text PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "replicache_space" (
	"id" text PRIMARY KEY NOT NULL,
	"version" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "todos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" text NOT NULL,
	"text" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"version" integer NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "replicache_client" ADD CONSTRAINT "replicache_client_space_id_replicache_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."replicache_space"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "replicache_client_group" ADD CONSTRAINT "replicache_client_group_space_id_replicache_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."replicache_space"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
