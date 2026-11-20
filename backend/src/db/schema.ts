import {sqliteTable, integer, text} from 'drizzle-orm/sqlite-core';

export const notes = sqliteTable('notes', {
	id: integer('id').primaryKey({autoIncrement: true}),
	content: text('content').notNull(),
	pinned: integer('pinned', {mode: 'boolean'}).notNull().default(false),
	userId: integer('user_id'),
});

export const users = sqliteTable('users', {
	id: integer('id').primaryKey({autoIncrement: true}),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	createdAt: text('created_at').notNull(),
});

export const sessions = sqliteTable('sessions', {
	token: text('token').primaryKey(),
	userId: integer('user_id').notNull(),
	expiresAt: integer('expires_at').notNull(),
});

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
