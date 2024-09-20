import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Database } from '$lib';
import postgres from 'postgres';
import { pull, pullRequest } from '$lib/pull';


let db: PostgresJsDatabase<Database> | null;

const getDb = (url: string): PostgresJsDatabase<Database> => {
    if (!db) {
        const queryClient = postgres(url);
        db = drizzle(queryClient);
    }
    return db
}

export const POST: RequestHandler = async ({ url, request, platform }) => {
    if(!platform){
        error(500, 'Platform not found');
    }
    
    const body = await request.json();
    const pullBody = pullRequest.parse(body);
    const searchParams = url.searchParams;
    const spaceID = searchParams.get("spaceID") ?? null;
    if(!spaceID){
        error(500, 'Space ID not found');
    }
    
    const db = getDb(platform.env.SUPABASE_CONNECT_URL);
    const response = await pull(db, pullBody, spaceID);
    return json(response);
};