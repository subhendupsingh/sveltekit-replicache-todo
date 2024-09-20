import { pgTable, text, uuid, boolean, timestamp, integer } from 'drizzle-orm/pg-core';

// Todos table
export const todos = pgTable('todos', {
  id: text('id').primaryKey(),
  spaceId: text('space_id').notNull(),
  text: text('text').notNull(),
  completed: boolean('completed').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  version: integer('version').notNull(),
  deleted: boolean('deleted').notNull().default(false),
});

// Replicache space table
export const replicacheSpace = pgTable('replicache_space', {
  id: text('id').primaryKey(),
  version: integer('version').notNull(),
});

// Replicache client table
export const replicacheClient = pgTable('replicache_client', {
  id: text('id').primaryKey(),
  clientgroupid: text('clientgroupid').notNull(),
  lastMutationId: integer('last_mutation_id').notNull(),
  lastModifiedAt: timestamp('last_modified_at').notNull().defaultNow(),
  version: integer('version').notNull(),
});