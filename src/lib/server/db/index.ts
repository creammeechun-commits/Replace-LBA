import { AsyncLocalStorage } from 'node:async_hooks';
import { drizzle as drizzleLibsql, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { DATABASE_URL } from '$app/env/private';

/**
 * ชั้นฐานข้อมูลใช้ได้ 2 แบบโดยไม่ต้องแก้โค้ดส่วนอื่น:
 *  - ในเครื่อง: SQLite ผ่าน libsql (DATABASE_URL หรือ file:local.db)
 *  - บน Cloudflare Workers: D1 binding `DB` (ส่งต่อ request ผ่าน AsyncLocalStorage จาก hooks.server.ts)
 * ทั้งสอง driver ใช้ sqlite dialect เดียวกัน query ของ drizzle จึงเหมือนกัน
 */
export type Db = LibSQLDatabase<typeof schema>;

const als = new AsyncLocalStorage<Db>();
let localDb: Db | undefined;

function getLocalDb(): Db {
	if (!localDb) {
		localDb = drizzleLibsql(createClient({ url: DATABASE_URL || 'file:local.db' }), { schema });
	}
	return localDb;
}

type PlatformLike = { env?: { DB?: unknown } } | undefined;

export function createDb(platform: PlatformLike): Db {
	const d1 = platform?.env?.DB;
	if (d1) return drizzleD1(d1 as Parameters<typeof drizzleD1>[0], { schema }) as unknown as Db;
	return getLocalDb();
}

/** รัน fn ภายใต้ context ที่ `db` ชี้ไปยังฐานข้อมูลของ platform นั้น */
export function runWithDb<T>(platform: PlatformLike, fn: () => T): T {
	return als.run(createDb(platform), fn);
}

function current(): Db {
	return als.getStore() ?? getLocalDb();
}

/** db ที่ import ไปใช้ทั่วโปรเจกต์ — เป็น proxy ชี้ไปยังฐานข้อมูลของ request ปัจจุบัน */
export const db: Db = new Proxy({} as Db, {
	get(_target, prop) {
		const target = current();
		const value = Reflect.get(target as object, prop, target);
		return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(target) : value;
	}
});

export { schema };
