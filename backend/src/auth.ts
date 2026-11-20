import {randomBytes, scryptSync, timingSafeEqual} from 'node:crypto';

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
	const salt = randomBytes(16).toString('hex');
	const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex');
	return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
	const [salt, hash] = stored.split(':');
	if (!salt || !hash) return false;

	const expected = Buffer.from(hash, 'hex');
	const actual = scryptSync(password, salt, KEY_LENGTH);
	return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function createSessionToken(): string {
	return randomBytes(32).toString('hex');
}

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
