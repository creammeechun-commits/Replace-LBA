import { eq } from 'drizzle-orm';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from './db';
import { sessions, users, type User } from './db/schema';
import { randomToken, sha256Hex } from './password';

export type SessionUser = Pick<
	User,
	'id' | 'username' | 'fullName' | 'nickname' | 'role' | 'staffType' | 'active'
>;

const SESSION_COOKIE = 'session';
const SESSION_DAYS = 30;

export async function createSession(userId: number) {
	const token = randomToken(32);
	const id = await sha256Hex(token);
	const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
	await db.insert(sessions).values({ id, userId, expiresAt });
	return { token, expiresAt };
}

export async function validateSessionToken(token: string): Promise<SessionUser | null> {
	const id = await sha256Hex(token);
	const rows = await db
		.select({
			expiresAt: sessions.expiresAt,
			user: {
				id: users.id,
				username: users.username,
				fullName: users.fullName,
				nickname: users.nickname,
				role: users.role,
				staffType: users.staffType,
				active: users.active
			}
		})
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.id, id))
		.limit(1);
	const row = rows[0];
	if (!row) return null;
	if (row.expiresAt.getTime() < Date.now() || !row.user.active) {
		await db.delete(sessions).where(eq(sessions.id, id));
		return null;
	}
	// ต่ออายุ session เมื่อเหลือน้อยกว่าครึ่ง
	if (row.expiresAt.getTime() - Date.now() < (SESSION_DAYS / 2) * 86_400_000) {
		await db
			.update(sessions)
			.set({ expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000) })
			.where(eq(sessions.id, id));
	}
	return row.user;
}

export async function invalidateSession(token: string) {
	const id = await sha256Hex(token);
	await db.delete(sessions).where(eq(sessions.id, id));
}

export function setSessionCookie(event: RequestEvent, token: string, expiresAt: Date) {
	event.cookies.set(SESSION_COOKIE, token, {
		httpOnly: true,
		sameSite: 'lax',
		path: '/',
		expires: expiresAt,
		secure: event.url.protocol === 'https:'
	});
}

export function deleteSessionCookie(event: RequestEvent) {
	event.cookies.delete(SESSION_COOKIE, { path: '/' });
}

export function getSessionToken(event: RequestEvent): string | null {
	return event.cookies.get(SESSION_COOKIE) ?? null;
}

export const isAdmin = (u: SessionUser | null | undefined) => u?.role === 'admin';
export const isManagerOrAdmin = (u: SessionUser | null | undefined) =>
	u?.role === 'admin' || u?.role === 'manager';
