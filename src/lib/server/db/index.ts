import { drizzle as drizzleLibsql, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import { createClient } from '@libsql/client';
import { env as cfEnv } from 'cloudflare:workers';
import { dev } from '$app/env';
import * as schema from './schema';
import { DATABASE_URL } from '$app/env/private';

/**
 * ชั้นฐานข้อมูลใช้ได้ 2 แบบโดยไม่ต้องแก้โค้ดส่วนอื่น:
 *  - dev / ในเครื่อง: SQLite ผ่าน libsql (DATABASE_URL หรือ file:local.db)
 *  - บน Cloudflare Workers (build แล้ว): D1 binding `DB` จาก `cloudflare:workers`
 * ทั้งสอง driver ใช้ sqlite dialect เดียวกัน query ของ drizzle จึงเหมือนกัน
 */
export type Db = LibSQLDatabase<typeof schema>;

let localDb: Db | undefined;
let d1Db: { binding: unknown; db: Db } | undefined;

function getLocalDb(): Db {
	if (!localDb) {
		localDb = drizzleLibsql(createClient({ url: DATABASE_URL || 'file:local.db' }), { schema });
	}
	return localDb;
}

function getD1Binding(): unknown {
	try {
		return (cfEnv as unknown as { DB?: unknown }).DB;
	} catch {
		// นอก Cloudflare (เช่น ตอน build/prerender) module นี้จะ throw — ถือว่าไม่มี binding
		return undefined;
	}
}

function resolveDb(): Db {
	if (!dev) {
		const binding = getD1Binding();
		if (binding) {
			if (!d1Db || d1Db.binding !== binding) {
				d1Db = {
					binding,
					db: drizzleD1(binding as Parameters<typeof drizzleD1>[0], { schema }) as unknown as Db
				};
			}
			return d1Db.db;
		}
	}
	return getLocalDb();
}

/** db ที่ import ไปใช้ทั่วโปรเจกต์ — เป็น proxy ชี้ไปยังฐานข้อมูลที่เหมาะกับสภาพแวดล้อมปัจจุบัน */
export const db: Db = new Proxy({} as Db, {
	get(_target, prop) {
		const target = resolveDb();
		const value = Reflect.get(target as object, prop, target);
		return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(target) : value;
	}
});

export { schema };
