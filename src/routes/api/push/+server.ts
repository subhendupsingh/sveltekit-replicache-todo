import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { push, pushRequestSchema } from '$lib/push';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Database } from '$lib';

let db: PostgresJsDatabase<Database> | null;
const getDb = (url: string): PostgresJsDatabase<Database> => {
    if (!db) {
        const queryClient = postgres(url);
        db = drizzle(queryClient);
    }
    return db
}

export const POST: RequestHandler = async ({ platform, url, request } ) => {
    if(!platform){
        error(500, 'Platform not found');
    }

    const searchParams = url.searchParams;
    const db = getDb(platform.env.SUPABASE_CONNECT_URL);
    const body = await request.json();
    const pushBody = pushRequestSchema.parse(body);
    const spaceID = searchParams.get("spaceID") ?? null;

    if(!spaceID){
        error(500, 'Space ID not found');
    }
    
    await push(pushBody, spaceID, db);
    return new Response();
};