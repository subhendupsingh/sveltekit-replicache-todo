import { Replicache } from 'replicache';
import * as schema from "$lib/db/schema";
import { mutators, type M } from './mutators';
import { drizzle, type PostgresJsDatabase, type PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import { customAlphabet } from 'nanoid';

export type Database = typeof schema;
export type Transact = PgTransaction<PostgresJsQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;

let db: PostgresJsDatabase<Database> | null;
let replicache: Replicache<M>;

export const initReplicache = (license: string, spaceId: string) => {
    if(!replicache){
        replicache = new Replicache({
            licenseKey: license,
            name: spaceId,
            pushURL: `/api/push?spaceID=${spaceId}`,
            pullURL: `/api/pull?spaceID=${spaceId}`,
            mutators
        })
    }

    return replicache;
}

export default function getRandomID(){
    const nanoid = customAlphabet('abcdefghijklmnopqrstwxyz', 15);
    return nanoid(15);
}