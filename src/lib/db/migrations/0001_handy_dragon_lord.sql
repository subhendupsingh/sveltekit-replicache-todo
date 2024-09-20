ALTER TABLE "replicache_client" ADD COLUMN "clientgroupid" text NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "replicache_client" ADD CONSTRAINT "replicache_client_clientgroupid_replicache_client_group_id_fk" FOREIGN KEY ("clientgroupid") REFERENCES "public"."replicache_client_group"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
