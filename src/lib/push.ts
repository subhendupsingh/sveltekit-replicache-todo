import {z, ZodType} from 'zod';
import type { ReadonlyJSONValue } from 'replicache';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Database, Transact } from '$lib';
import { replicacheClient, replicacheSpace, todos } from './db/schema.js';
import { eq } from 'drizzle-orm';
import type { ReplicacheSpace } from './types.js';

const mutationSchema = z.object({
  clientID: z.string(),
  id: z.number(),
  name: z.string(),
  args: z.any(),
});

export const pushRequestSchema = z.object({
  profileID: z.string(),
  clientGroupID: z.string(),
  mutations: z.array(mutationSchema),
});

type PushRequest = z.infer<typeof pushRequestSchema>;
export type Error = 'SpaceNotFound';

export function parseIfDebug<T extends ReadonlyJSONValue>(
  schema: ZodType<T>,
  val: T,
): T {
  if (globalThis.process?.env?.NODE_ENV !== 'production') {
    return schema.parse(val);
  }
  return val as T;
}

export async function push(
  push: PushRequest, 
  spaceID: string, 
  db: PostgresJsDatabase<Database>
) {
  console.log('Processing push', JSON.stringify(push, null, ''));

  const {clientGroupID} = push;

  const t0 = Date.now();

  // Eevrything happends inside a transaction so that on error, the state of the db is not corrupted
  await db.transaction(async (tx)=>{
     // 1. Get the current version of the space associated with the user
     // spaceID is user ID
     const prevVersion = await getSpaceCurrentVersion(tx, spaceID);

     if (prevVersion === undefined) {
        throw new Error(`Unknown space ${spaceID}`);
     }

     // Increment the version of space after the mutations are applied
     const nextVersion = prevVersion + 1;

     // Mutations are generated by clients (browser tab), each client has unique ID
     // In case mutations are pushed by multiple clients at once, get all of their IDs
     const clientIDs = [...new Set(push.mutations.map(m => m.clientID))];

     // Each client maintains its mutation ID which is nothing but the number of
     // mutations this client has pushed. It is automatically incremented by
     // replicache on each push and saved in the database in replicache_client table
     // as last_mutation_id. As a result of each push, last mutation ids of all the clients
     // in this client group are returned so that the local replicache knows that it has
     // applied all the pending mutations. If this is not returned, it will keep on pushing
     // mutations till server replies with a mutation id. This is server side confirmation of local changes.
     const lastMutationIDs = await getLastMutationIDs(tx, clientIDs, clientGroupID);
     
     console.log(JSON.stringify({prevVersion, nextVersion, lastMutationIDs}));

     //Applying mutations to the Db now
     for (let i = 0; i < push.mutations.length; i++) {
      const mutation = push.mutations[i];
      
      //Each mutation has a client ID
      const {clientID} = mutation;

      // Checking this client's last mutation ID that was applied
      const lastMutationID = lastMutationIDs[clientID];

      if (lastMutationID === undefined) {
        throw new Error(
          'invalid state - lastMutationID not found for client: ' + clientID,
        );
      }

      // Next mutation id will be +1 from the last applied one
      const expectedMutationID = lastMutationID + 1;

      // Sometimes replicache may send already applied mutations
      // we reject them and move on
      if (mutation.id < expectedMutationID) {
        console.log(
          `Mutation ${mutation.id} has already been processed - skipping`,
        );
        continue;
      }

      // Rejecting mutations that are from the future, invalid
      if (mutation.id > expectedMutationID) {
        console.warn(`Mutation ${mutation.id} is from the future - aborting`);
        break;
      }

      console.log('Processing mutation:', JSON.stringify(mutation, null, ''));

      const t1 = Date.now();


      try {
        await mutator(tx, mutation.args, mutation.name, spaceID, nextVersion);
      } catch (e) {
        console.error(
          `Error executing mutator: ${JSON.stringify(mutator)}: ${e}`,
        );
      }

      lastMutationIDs[clientID] = expectedMutationID;
      console.log('Processed mutation in', Date.now() - t1);
    }

    // when all the mutations are applied, we update the version of the space
    // so that the next pull knows after which version, it needs to sync changes
    // to the local.

    // We also update the last mutation IDs for each client
    await Promise.all([
      setLastMutationIDs(tx, clientGroupID, lastMutationIDs, nextVersion),
      updateSpaceVersion(tx, spaceID, nextVersion),
    ]);

     // poke is implemented using supabase realtime
     // poke is nothing just a simple indication to replicache that there are
     // some changes to pull.
     // we listen to changes on the todo table using supabase realtime
     // when a change is detected, we initiate a pull
  });


  console.log('Processed all mutations in', Date.now() - t0);
}

export const getSpaceCurrentVersion = async (tx: Transact, spaceID: string): Promise<number> => {
  try {
      const [result] = await tx.select({ version: replicacheSpace.version }).from(replicacheSpace).where(eq(replicacheSpace.id, spaceID));
      
      if(!result){
          // if space is not found, create one
          await createNewSpace(tx, spaceID);
          return 0;
      }

      return result.version;
  } catch (error) {
      throw new Error("Failed to get cookie");
  }
}

const createNewSpace = async (tx: Transact, spaceID: string): Promise<ReplicacheSpace> => {
  try {
      console.log(`Creating space ${spaceID}`);
      const [result] = await tx.insert(replicacheSpace)
      .values({ id: spaceID, version: 0})
      .onConflictDoNothing()
      .returning();

      return result;
  } catch (error) {
      console.log(`Failed to create space ${spaceID}`);
      throw error;
  }
}

const getLastMutationIDs= async (tx: Transact, clientIDs: string[], clientGroupID: string): Promise<Record<string, number>> => {
  let results: {lastMutationID: number, clientId: string, clientGroupId: string}[] = [];

  try {
      for (let index = 0; index < clientIDs.length; index++) {
          const clientID = clientIDs[index];
          let [result] = await tx.select({ lastMutationID: replicacheClient.lastMutationId, clientId: replicacheClient.id, clientGroupId: replicacheClient.clientgroupid }).from(replicacheClient).where(eq(replicacheClient.id, clientID));
          
          if(!result){
            // if this client is not found, create one
              [result] = await tx.insert(replicacheClient).values({
                  clientgroupid: clientGroupID,
                  id: clientID,
                  lastMutationId: 0,
                  version: 0
              }).returning({ lastMutationID: replicacheClient.lastMutationId, clientId: replicacheClient.id, clientGroupId: replicacheClient.clientgroupid })
          }

          results.push(result);
      }

      return Object.fromEntries(
        results.map(r => [r.clientId as string, r.lastMutationID as number] as const),
      );
  } catch (error) {
      console.log("Failed to get last mutation IDs");
      throw error;   
  }
}

/**
 *  Every mutation contains mutation name i.e the name of the function
 *  that was called locally to make a change for e.g. createTodo.
 *  Mutation also has args that were passed during local mutation.
 *  Using this information, we apply the same changes to our database
 */
const mutator = async (tx: Transact, args: any, mutationName: string, spaceID: string, version: number) => {
   switch (mutationName) {
     case 'createTodo':
       await createTodo(tx, args, spaceID, version);
       break;
     case 'deleteTodo':
       await deleteTodo(tx, args, spaceID, version);
       break;
     case 'updateTodo':
       await updateTodo(tx, args, spaceID, version);
       break;
     default:
       throw new Error(`Unknown mutation: ${mutationName}`);
   }
}

export async function setLastMutationID(
  tx: Transact,
  clientID: string,
  clientGroupID: string,
  lastMutationID: number,
  version: number,
): Promise<void> {
    const [result] = await tx.insert(replicacheClient).values({
        clientgroupid: clientGroupID,
        lastMutationId: lastMutationID,
        id: clientID,
        version: version
    }).onConflictDoUpdate({
        target: replicacheClient.id,
        set: {
            lastMutationId: lastMutationID,
            version: version,
            clientgroupid: clientGroupID
        }
    }).returning();

    console.log(`Last mutation ID for ${result.id} updated to ${result.lastMutationId}`);
}

const setLastMutationIDs = async (tx: Transact, clientGroupID: string, lastMutationIDs: Record<string, number>, version: number) => {
  try {
    return await Promise.all([
      ...Object.entries(lastMutationIDs).map(([clientID, lmid]) => setLastMutationID(tx, clientID, clientGroupID, lmid, version))
    ])
  } catch (error) {
      console.log("Failed to set last mutation IDs");
      throw error;
  }
}

export const updateSpaceVersion = async (tx: Transact, spaceID: string, version: number) => {
  try {
      await tx.insert(replicacheSpace).values({
          id: spaceID,
          version: version,
      }).onConflictDoUpdate({
          target: replicacheSpace.id,
          set: {
              version: version,
          }
      });
  } catch (error) {
      console.log("Failed to update space version");
      throw error;
  }
}

// create todo function
const createTodo = async (tx: Transact, args: any, spaceID: string, version: number) => {
   try {
      await tx.insert(todos).values({
        spaceId: spaceID,
        text: args.text,
        completed: false,
        version: version,
        deleted: false,
        id: args.id
      })
   } catch (error) {
       console.log("Failed to create todo");
       throw error;
   }
}

// update todo function
const updateTodo = async (tx: Transact, args: any, spaceID: string, version: number) => {
   try {
      const [result] = await tx.update(todos).set({
        text: args.text,
        completed: args.completed,
        version: version
      }).where(eq(todos.id, args.id)).returning();
      console.log("Updated todo", result);
   } catch (error) {
       console.log("Failed to update todo");
       throw error;
   }
}

// delete todo function
/**
 *  We do not hard delete when using replicache because we want to let our local
 * client know that this partcular entry was deleted and should no longer be shown
 * in the UI. If the entry is hard deleted, there is no way to know which entry
 * was deleted and hence this information will not be synced with the client and 
 * the entry will be displayed in the UI.
 */
const deleteTodo = async (tx: Transact, args: any, spaceID: string, version: number) => {
   try {
      await tx.update(todos).set({
        deleted: true,
        version: version
      }).where(eq(todos.id, args.id))
   } catch (error) {
       console.log("Failed to delete todo");
       throw error;
   }
}


