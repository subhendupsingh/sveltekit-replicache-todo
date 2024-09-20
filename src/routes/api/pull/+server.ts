import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { pull, pullRequest } from '$lib/pull';
import { getDb } from '$lib';

export const POST: RequestHandler = async ({ url, request, platform }) => {
    if(!platform){
        error(500, 'Platform not found');
    }
    
    console.log("In Pull request endpoint");

    const body = await request.json();
    const pullBody = pullRequest.parse(body);
    const searchParams = url.searchParams;
    const spaceID = searchParams.get("spaceID") ?? null;
    if(!spaceID){
        error(500, 'Space ID not found');
    }
    
    const db = await getDb(platform.env.NEON_URL);
    const response = await pull(db, pullBody, spaceID);
    return json(response);
};