import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { DATABASE_URL } from '$app/env/private';

// Local dev: SQLite ผ่าน libsql (file:local.db)
// เมื่อย้ายไป Cloudflare D1: เปลี่ยนเป็น drizzle(platform.env.DB, { schema }) จาก 'drizzle-orm/d1'
// schema และ query ทั้งหมดใช้ sqlite dialect เหมือนกัน จึงไม่ต้องแก้โค้ดส่วนอื่น
const client = createClient({ url: DATABASE_URL || 'file:local.db' });

export const db = drizzle(client, { schema });
export type Db = typeof db;
export { schema };
