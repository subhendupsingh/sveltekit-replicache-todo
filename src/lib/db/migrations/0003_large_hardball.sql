ALTER TABLE "replicache_client" DROP CONSTRAINT "replicache_client_clientgroupid_replicache_client_group_id_fk";--> statement-breakpoint
DROP TABLE "replicache_client_group";
--> statement-breakpoint
ALTER TABLE "replicache_client" ADD COLUMN "last_modified_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "replicache_client" ADD COLUMN "version" integer NOT NULL;