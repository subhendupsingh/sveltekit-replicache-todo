ALTER TABLE "replicache_client" DROP CONSTRAINT "replicache_client_space_id_replicache_space_id_fk";
--> statement-breakpoint
ALTER TABLE "replicache_client" DROP COLUMN IF EXISTS "space_id";