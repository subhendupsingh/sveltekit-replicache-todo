import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { push, pushRequestSchema } from '$lib/push';
import { getDb } from '$lib';


export const POST: RequestHandler = async ({ platform, url, request } ) => {
    if(!platform){
        error(500, 'Platform not found');
    }

    console.log("In Push request endpoint");

    const searchParams = url.searchParams;
    const db = await getDb(platform.env.NEON_URL);
    const body = await request.json();
    const pushBody = pushRequestSchema.parse(body);
    const spaceID = searchParams.get("spaceID") ?? null;

    if(!spaceID){
        error(500, 'Space ID not found');
    }
    
    await push(pushBody, spaceID, db);
    return new Response();
};