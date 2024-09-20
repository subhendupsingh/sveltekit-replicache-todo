/**
 *  Every mutation contains mutation name i.e the name of the function
 *  these mutation names and args will be passed to the sever in the push endpoint
 *  it is important to keep the mutation function names same on the client and server
 */

import type { ReadonlyJSONObject, WriteTransaction } from "replicache";
import type { Todo, TodoInsert } from "./types";

export const mutators = {
    createTodo: async (tx: WriteTransaction, args: Omit<TodoInsert, "spaceId"|"version">) => {
        await tx.set(`todo/${args.id}`, { 
            text: args.text,
            completed: false,
            deleted: false,
            id: args.id
        });
    },
    deleteTodo: async(tx: WriteTransaction, args: any) => {
        await tx.del(`todo/${args.id}`);
    },
    updateTodo: async (tx: WriteTransaction, args: any) => {
        const prev = (await tx.get(`todo/${args.id}`)) as ReadonlyJSONObject;
        if(!prev) {
            throw new Error(`Unknown todo ${args.id}`);
        }
        
        const next = {...prev, ...args};
        await tx.set(`todo/${next.id}`, next);
    },
}


export type M = typeof mutators;