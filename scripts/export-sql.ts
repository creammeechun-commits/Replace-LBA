/**
 * ส่งออกข้อมูลจาก SQLite ในเครื่อง (หลัง npm run db:seed) เป็นไฟล์ SQL
 * สำหรับนำเข้า Cloudflare D1:
 *
 *   npm run db:export                 -> data/seed-data.sql
 *   npm run db:migrate:remote         -> สร้างตารางบน D1 (ใช้ไฟล์ใน drizzle/)
 *   npm run db:seed:remote            -> นำข้อมูลเข้า D1
 */
import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';

const DATABASE_URL = process.env.DATABASE_URL ?? 'file:local.db';
// หมายเหตุ: ห้ามวางไว้ใน drizzle/ เพราะ wrangler จะนับทุก .sql ในโฟลเดอร์ migrations เป็น migration
const OUT = process.argv[2] ?? path.resolve('data/seed-data.sql');
const TABLES = ['users', 'sites', 'site_posts', 'tasks', 'activity_logs']; // ลำดับตาม foreign key
const ROWS_PER_STATEMENT = 100;

function lit(v: unknown): string {
	if (v === null || v === undefined) return 'NULL';
	if (typeof v === 'number' || typeof v === 'bigint') return String(v);
	if (typeof v === 'boolean') return v ? '1' : '0';
	if (v instanceof ArrayBuffer || ArrayBuffer.isView(v)) {
		const bytes = v instanceof ArrayBuffer ? new Uint8Array(v) : new Uint8Array(v.buffer);
		return `X'${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}'`;
	}
	return `'${String(v).replace(/'/g, "''")}'`;
}

async function main() {
	const client = createClient({ url: DATABASE_URL });
	const out: string[] = [`-- generated ${new Date().toISOString()} from ${DATABASE_URL}`, 'PRAGMA defer_foreign_keys = ON;'];
	for (const table of TABLES) {
		out.push(`DELETE FROM ${table};`);
		const res = await client.execute(`SELECT * FROM ${table} ORDER BY rowid`);
		const cols = res.columns;
		for (let i = 0; i < res.rows.length; i += ROWS_PER_STATEMENT) {
			const chunk = res.rows.slice(i, i + ROWS_PER_STATEMENT);
			const values = chunk.map((r) => `(${cols.map((c) => lit(r[c])).join(',')})`).join(',\n');
			out.push(`INSERT INTO ${table} (${cols.join(',')}) VALUES\n${values};`);
		}
		console.log(`  ${table}: ${res.rows.length} rows`);
	}
	fs.mkdirSync(path.dirname(OUT), { recursive: true });
	fs.writeFileSync(OUT, out.join('\n') + '\n', 'utf8');
	console.log(`✔ เขียน ${OUT} (${(fs.statSync(OUT).size / 1024 / 1024).toFixed(1)} MB)`);
}

main()
	.then(() => process.exit(0))
	.catch((e) => {
		console.error(e);
		process.exit(1);
	});
