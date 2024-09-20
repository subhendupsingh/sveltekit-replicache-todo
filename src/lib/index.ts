import { Replicache } from 'replicache';
import * as schema from "$lib/db/schema";
import { mutators, type M } from './mutators';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import { customAlphabet } from 'nanoid';
import type { NeonTransaction } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { drizzle, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import { PUBLIC_NEON_URL } from '$env/static/public';

export type DatabaseType = typeof schema;
export type DB = NeonDatabase<DatabaseType>
export type Transact = NeonTransaction<typeof schema, ExtractTablesWithRelations<typeof schema>>;

let replicache: Replicache<M>;

export const getDb = (url: string): DB => {
    const pool = new Pool({ connectionString: PUBLIC_NEON_URL });
    const db: DB = drizzle(pool)
    return db;
}

export const initReplicache = (license: string, spaceId: string) => {
    if(!replicache){
        replicache = new Replicache({
            licenseKey: license,
            name: spaceId,
            pushURL: `/api/push?spaceID=${spaceId}`,
            pullURL: `/api/pull?spaceID=${spaceId}`,
            pullInterval: 10 * 1000,
            mutators
        })
    }

    return replicache;
}

export default function getRandomID(){
    const nanoid = customAlphabet('abcdefghijklmnopqrstwxyz', 15);
    return nanoid(15);
}