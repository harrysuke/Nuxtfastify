import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import Database from 'better-sqlite3';
//Drizzle ORM
import {drizzle} from 'drizzle-orm/better-sqlite3';
import {and, eq} from 'drizzle-orm';
import {notes} from './db/schema.js';
import {createSessionToken, hashPassword, SESSION_MAX_AGE_SECONDS, verifyPassword} from './auth.js';

declare module 'fastify' {
	interface FastifyRequest {
		userId?: number;
	}
}

const fastify = Fastify({logger: true});
// Comma-separated list so one API can serve both frontends (Nuxt and React).
const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000,http://localhost:5173')
	.split(',')
	.map((origin) => origin.trim())
	.filter(Boolean);
await fastify.register(cors, {
	origin: corsOrigins,
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type'],
});
await fastify.register(cookie);

fastify.get('/health', async () => ({status: 'ok'}));

const dbPath = process.env.DB_PATH ?? 'task.db';
mkdirSync(dirname(dbPath), {recursive: true});
const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

sqlite.exec(`
	CREATE TABLE IF NOT EXISTS tasks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title TEXT NOT NULL,
		completed INTEGER DEFAULT 0
	);
	CREATE TABLE IF NOT EXISTS notes (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		content TEXT NOT NULL,
		pinned INTEGER NOT NULL DEFAULT 0
	);
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		email TEXT NOT NULL UNIQUE COLLATE NOCASE,
		password_hash TEXT NOT NULL,
		created_at TEXT NOT NULL
	);
	CREATE TABLE IF NOT EXISTS sessions (
		token TEXT PRIMARY KEY,
		user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		expires_at INTEGER NOT NULL
	);
`);

// Migrate existing task/note rows so data created before authentication remains visible.
for (const table of ['tasks', 'notes'] as const) {
	const columns = sqlite.prepare(`PRAGMA table_info(${table})`).all() as {name: string}[];
	if (!columns.some((column) => column.name === 'user_id')) {
		sqlite.exec(`ALTER TABLE ${table} ADD COLUMN user_id INTEGER`);
	}
	sqlite.exec(`
		UPDATE ${table}
		SET user_id = (SELECT MIN(id) FROM users)
		WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM users)
	`);
}

interface Task {
	id: number;
	title: string;
	completed: number;
}

interface UserRow {
	id: number;
	email: string;
	password_hash: string;
}

interface NoteUpdateBody { content?: string; pinned?: boolean }; interface SessionRow {
	token: string;
	user_id: number;
	expires_at: number;
}

function currentUserId(request: {userId?: number}): number {
	if (request.userId === undefined) throw new Error('Missing authenticated user');
	return request.userId;
}

function setSession(reply: import('fastify').FastifyReply, userId: number) {
	const token = createSessionToken();
	const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
	sqlite.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
	sqlite.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt);
	reply.setCookie('session', token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: SESSION_MAX_AGE_SECONDS,
	});
}

// Protect task and note routes; auth endpoints themselves stay public.
fastify.addHook('onRequest', async (request, reply) => {
	const path = request.url.split('?')[0] ?? '';
	if (!/^\/(tasks|notes)(\/|$)/.test(path)) return;

	const token = request.cookies.session;
	if (!token) return reply.code(401).send({error: 'Not authenticated'});

	const session = sqlite.prepare('SELECT * FROM sessions WHERE token = ?').get(token) as SessionRow | undefined;
	if (!session || session.expires_at < Date.now()) {
		if (session) sqlite.prepare('DELETE FROM sessions WHERE token = ?').run(token);
		reply.clearCookie('session', {path: '/'});
		return reply.code(401).send({error: 'Session expired'});
	}
	request.userId = session.user_id;
});

//AUTH
fastify.post<{Body: {email?: string; password?: string}}>('/auth/register', async (request, reply) => {
	const email = request.body.email?.trim().toLowerCase();
	const password = request.body.password;

	if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return reply.code(400).send({error: 'Enter a valid email address'});
	}
	if (!password || password.length < 8) {
		return reply.code(400).send({error: 'Password must be at least 8 characters'});
	}

	try {
		const result = sqlite.prepare(
			'INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)'
		).run(email, hashPassword(password), new Date().toISOString());
		const userId = Number(result.lastInsertRowid);
		sqlite.prepare('UPDATE tasks SET user_id = ? WHERE user_id IS NULL').run(userId);
		sqlite.prepare('UPDATE notes SET user_id = ? WHERE user_id IS NULL').run(userId);
		setSession(reply, userId);
		return reply.code(201).send({user: {id: userId, email}});
	} catch (error: unknown) {
		if (error instanceof Error && error.message.includes('UNIQUE')) {
			return reply.code(409).send({error: 'An account with this email already exists'});
		}
		throw error;
	}
});

fastify.post<{Body: {email?: string; password?: string}}>('/auth/login', async (request, reply) => {
	const email = request.body.email?.trim().toLowerCase();
	const password = request.body.password ?? '';

	const user = email
		? sqlite.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined
		: undefined;
	if (!user || !verifyPassword(password, user.password_hash)) {
		return reply.code(401).send({error: 'Invalid email or password'});
	}

	setSession(reply, user.id);
	return {user: {id: user.id, email: user.email}};
});

fastify.post('/auth/logout', async (request, reply) => {
	const token = request.cookies.session;
	if (token) sqlite.prepare('DELETE FROM sessions WHERE token = ?').run(token);
	reply.clearCookie('session', {path: '/'});
	return {loggedOut: true};
});

fastify.get('/auth/me', async (request, reply) => {
	const token = request.cookies.session;
	const session = token
		? sqlite.prepare('SELECT * FROM sessions WHERE token = ?').get(token) as SessionRow | undefined
		: undefined;

	if (!session || session.expires_at < Date.now()) {
		return reply.code(401).send({error: 'Not authenticated'});
	}
	const user = sqlite.prepare('SELECT id, email FROM users WHERE id = ?').get(session.user_id) as
		| {id: number; email: string}
		| undefined;
	if (!user) return reply.code(401).send({error: 'Not authenticated'});

	return {user};
});

//READ ALL
fastify.get('/tasks', async (request) => {
	return sqlite.prepare('SELECT * FROM tasks WHERE user_id = ?').all(currentUserId(request)) as Task[];
});

//CREATE
fastify.post<{Body: {title: string}}>('/tasks', async (req, reply) => {
	const {title} = req.body;
	if (!title) return reply.code(400).send({error: 'Title is required'});

	const info = sqlite.prepare('INSERT INTO tasks (title, user_id) VALUES (?, ?)').run(title, currentUserId(req));
	return reply.code(201).send({id: info.lastInsertRowid, title, completed: 0});
});

//UPDATE
fastify.put<{Params: {id: string}; Body: {title?: string; completed?: boolean}}>('/tasks/:id',
	async (req, reply) => {
		const {id} = req.params;
		const {title, completed} = req.body;
		const existing = sqlite.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(
			id, currentUserId(req)
		) as Task | undefined;

		if (!existing) return reply.code(404).send({error: 'Task not found'});

		const newTitle = title ?? existing.title;
		const newCompleted = completed !== undefined ? (completed ? 1 : 0) : existing.completed;

		sqlite.prepare('UPDATE tasks SET title = ?, completed = ? WHERE id = ?').run(newTitle, newCompleted, id);

		return {id: Number(id), title: newTitle, completed: newCompleted};
	}
);

//DELETE 
fastify.delete<{Params: {id: string}}>('/tasks/:id', async (req, reply) => {
	const info = sqlite.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(
		req.params.id, currentUserId(req)
	);
	if (info.changes === 0) return reply.code(404).send({error: 'Task not found'});
	return {deleted: true};
});



//drizzle-orm
//READ
fastify.get('/notes', async (request) => {
	return db.select().from(notes).where(eq(notes.userId, currentUserId(request))).all();
});

//CREATE
fastify.post<{Body: {content: string}}>('/notes', async (req, reply) => {
	const {content} = req.body;
	if (!content?.trim()) {
		return reply.code(400).send({error: 'Content is required'});
	}
	const created = db
		.insert(notes)
		.values({content, userId: currentUserId(req)})
		.returning()
		.get();

	return reply.code(201).send(created);
});

//UPDATE
fastify.put<{Params: {id: string}; Body: NoteUpdateBody}>(
	'/notes/:id',
	async (req, reply) => {
		const id = Number(req.params.id);
		const {content, pinned} = req.body;

		const updated = db
			.update(notes)
			.set({
				...(content !== undefined && {content}),
				...(pinned !== undefined && {pinned}),
			})
			.where(and(eq(notes.id, id), eq(notes.userId, currentUserId(req))))
			.returning()
			.get();

		if (!updated) return reply.code(404).send({error: 'Notes not found'});
		return updated;
	}
);

//DELETE
fastify.delete<{Params: {id: string}}>('/notes/:id', async (req, reply) => {
	const id = Number(req.params.id);
	const deleted = db
		.delete(notes)
		.where(and(eq(notes.id, id), eq(notes.userId, currentUserId(req))))
		.returning()
		.get();

	if (!deleted) return reply.code(404).send({error: 'Note not found'});
	return {deleted: true};
});


//Start Server
const host = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? 3001);
fastify.listen({host, port}, (err) => {
	if (err) {
		fastify.log.error(err);
		process.exit(1);
	}
});
