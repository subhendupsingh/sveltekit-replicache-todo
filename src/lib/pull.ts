import type { DB, Transact } from "$lib";
import { replicacheClient, todos } from "./db/schema";
import { and, eq, gt } from "drizzle-orm";
import { getSpaceCurrentVersion } from "./push";
import { z } from "zod";
import type { ClientID, PatchOperation } from "replicache";

export const pullRequest = z.object({
  profileID: z.string(),
  clientGroupID: z.string(),
  cookie: z.union([z.number(), z.null()]),
  schemaVersion: z.string(),
});

type PullRequest = z.infer<typeof pullRequest>;

export type PullResponse = {
  cookie: number;
  lastMutationIDChanges: Record<ClientID, number>;
  patch: PatchOperation[];
};

export async function pull(db: DB, pull: PullRequest, spaceID: string): Promise<PullResponse> {
    console.log(`Processing pull`, JSON.stringify(pull, null, ''));

    // 1. Get the last space version that was synced. `requestCookie` here.
    const {cookie: requestCookie, schemaVersion} = pull;
    console.log('spaceID', spaceID);
  
    const t0 = Date.now();
    const sinceCookie = requestCookie as number ?? 0;
  
    const [entries, lastMutationIDChanges, responseCookie] = await db.transaction(
      async (tx) => {
        return Promise.all([
          // 2. Get all the records that were changed for the requesting spaceID (user)
          // since last sync `sinceCookie`
          getChangedEntries(tx, spaceID, sinceCookie),
          
          //3. Get the last mutation ids of all the clients in the requesting client group
          getLastMutationIDsSince(tx, pull.clientGroupID, sinceCookie),

          // 4. Get the current version of the space
          getSpaceCurrentVersion(tx, spaceID),
        ]);
      },
    );
  
    console.log('lastMutationIDChanges: ', lastMutationIDChanges);
    console.log('responseCookie: ', responseCookie);
    console.log('Read all objects in', Date.now() - t0);
  
    if (responseCookie === undefined) {
      throw new Error(`Unknown space ${spaceID}`);
    }
  
    // 5. Preparing the response
    const resp: PullResponse = {
      lastMutationIDChanges,
      cookie: responseCookie,
      patch: [],
    };
  
    for (const [id, text, deleted, completed] of entries) {
      if (deleted) {
        resp.patch.push({
          op: 'del',
          key: `todo/${id}`,
        });
      } else {
        resp.patch.push({
          op: 'put',
          key: `todo/${id}`,
          value: {
            text,
            completed,
            id,
          },
        });
      }
    }
  
    console.log(`Returning`, JSON.stringify(resp, null, ''));
    return resp;
  }

  const getChangedEntries = async (tx: Transact, spaceID: string, since: number) => {
      try {
        const result = await tx.select().from(todos).where(and(eq(todos.spaceId, spaceID), gt(todos.version, since)));
        return result.map((r) => [r.id, r.text, r.deleted, r.completed] as [string, string, boolean, boolean]);
      } catch (error) {
          console.log("Failed to get changed entries");
          throw error;
      }
  }

  const getLastMutationIDsSince = async (tx: Transact, clientGroupID: string, since: number) => {
    try {
      const result = await tx
        .select({ lastMutationID: replicacheClient.lastMutationId, clientId: replicacheClient.id, clientGroupId: replicacheClient.clientgroupid })
        .from(replicacheClient)
        .where(and(eq(replicacheClient.clientgroupid, clientGroupID), gt(replicacheClient.version, since)));
      return Object.fromEntries(result.map((r) => [r.clientId, r.lastMutationID] as [string, number]));
    } catch (error) {
        console.log("Failed to get last mutation IDs since");
        throw error;
    }
  }