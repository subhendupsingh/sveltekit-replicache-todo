import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { replicacheClient, replicacheSpace, todos } from "./db/schema";

export type Env = {
    SUPABASE_URL: string,
    SUPABASE_CONNECT_URL: string,
    SUPABASE_ANON_KEY: string,
    REP_LICENSE: string,
    DEFAULT_USER: string
}

export type ReplicacheClient = InferSelectModel<typeof replicacheClient>;
export type ReplicacheSpace = InferSelectModel<typeof replicacheSpace>;
export type Todo = InferSelectModel<typeof todos>;
export type TodoInsert = InferInsertModel<typeof todos>;
export type TodoPatch = Partial<TodoInsert>;