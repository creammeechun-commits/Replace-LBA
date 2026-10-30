/**
 * นำเข้าข้อมูลจากไฟล์ Excel "แผนธุรการ LBA" (data/lba-plan.xlsx) เป็นข้อมูลเริ่มต้น
 *
 *   npm run db:seed            -> สร้างตาราง (migrate) + ล้างข้อมูลเดิม + นำเข้าใหม่
 *
 * โครงสร้างชีต "แผนงาน" (1 แถว = 1 วันที่ต้องหาคนแทน 1 ตำแหน่ง):
 *   A วันที่แจ้งลา | B วันที่ต้องการ | C Code site | D หน่วยงาน | E ชื่อพนักงานลา | F ตำแหน่ง
 *   G สาเหตุการลา | H ชื่อพนักงานทดแทน | I สถานะ พนง. (EX/WL/HO/HS) | J เวลาเข้างาน
 *   K ค่าแรง | L สถานะ (เบิกแล้ว/ไม่จ่าย) | M เข้า-ออก | N หมายเหตุ
 */
import * as XLSX from 'xlsx';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { sql } from 'drizzle-orm';
import * as schema from '../src/lib/server/db/schema';
import { hashPassword } from '../src/lib/server/password';
import { parseThaiName, todayISO } from '../src/lib/shared/format';
import path from 'node:path';
import fs from 'node:fs';

const DATABASE_URL = process.env.DATABASE_URL ?? 'file:local.db';
const EXCEL_PATH = process.argv[2] ?? path.resolve('data/lba-plan.xlsx');
const SHEET = 'แผนงาน';
const DEFAULT_PASSWORD = process.env.SEED_PASSWORD ?? '1234';

if (!fs.existsSync(EXCEL_PATH)) {
	console.error('ไม่พบไฟล์ Excel:', EXCEL_PATH);
	process.exit(1);
}

const client = createClient({ url: DATABASE_URL });
const db = drizzle(client, { schema });

// ---------- helpers ----------
const clean = (v: unknown): string | null => {
	if (v === null || v === undefined) return null;
	const s = String(v).replace(/\s+/g, ' ').trim();
	return s === '' ? null : s;
};

function excelDate(v: unknown): string | null {
	if (v === null || v === undefined || v === '') return null;
	if (typeof v === 'number') {
		// Excel serial date (ระบบ 1900): วันที่ 0 = 1899-12-30
		const ms = Date.UTC(1899, 11, 30) + Math.round(v) * 86_400_000;
		return new Date(ms).toISOString().slice(0, 10);
	}
	const s = String(v).trim();
	// รูปแบบ d/m/yyyy หรือ d/m/yy (ตามที่กรอกในไฟล์)
	const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
	if (m) {
		let [, a, b, y] = m;
		let day = Number(a);
		let mon = Number(b);
		if (mon > 12 && day <= 12) [day, mon] = [mon, day];
		let year = Number(y);
		if (year < 100) year += 2000;
		return `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
	}
	return null;
}

function normTime(v: unknown): string | null {
	const s = clean(v);
	if (!s) return null;
	const m = s.match(/^(\d{1,2})[.:]+(\d{1,2})$/);
	if (!m) return null;
	const h = Number(m[1]);
	const mm = m[2].length === 1 ? Number(m[2]) * 10 : Number(m[2]);
	if (h > 23 || mm > 59) return null;
	return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function normShift(v: unknown): { start: string | null; end: string | null } {
	const s = clean(v);
	if (!s) return { start: null, end: null };
	const parts = s.split(/\s*[-–]\s*/);
	return { start: normTime(parts[0]), end: normTime(parts[1]) };
}

function normWage(v: unknown): number | null {
	if (v === null || v === undefined) return null;
	if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v) : null;
	const s = String(v).replace(/,/g, '').trim();
	return /^\d+(\.\d+)?$/.test(s) ? Math.round(Number(s)) : null;
}

const REASON_MAP: Record<string, string> = {
	dayoff: 'Dayoff',
	'day off': 'Dayoff',
	dayff: 'Dayoff',
	ลาพักร้อน: 'พักร้อน',
	พักร้อน: 'พักร้อน',
	'ลาป่วย - ฉุกเฉิน': 'ลาป่วย-ฉุกเฉิน',
	'ลาป่วย-ฉุกเเฉิน': 'ลาป่วย-ฉุกเฉิน',
	'ลาป่วย-ฉุเกฉิน': 'ลาป่วย-ฉุกเฉิน',
	'ลาป่่วย': 'ลาป่วย',
	'โยกย้าย ตำแหน่ง': 'โยกย้ายตำแหน่ง',
	'โยกย้สยตำแหน่ง': 'โยกย้ายตำแหน่ง',
	เรีียนงาน: 'เรียนงาน',
	เรีนรงาน: 'เรียนงาน'
};
function normReason(v: unknown): string {
	const s = clean(v);
	if (!s) return 'อื่นๆ';
	return REASON_MAP[s.toLowerCase()] ?? s;
}

const SITE_ALIAS: Record<string, string> = {
	'termnal พัทยา': 'terminal พัทยา',
	'แฟชั่ั่น': 'แฟชั่น',
	'clouid 11': 'cloud 11',
	'cloud11': 'cloud 11'
};
function siteKey(name: string): string {
	const k = name.toLowerCase().replace(/\s+/g, ' ').trim();
	return SITE_ALIAS[k] ?? k;
}

const POSITION_MAP: Record<string, string> = {
	call: 'Call Center',
	callcenter: 'Call Center',
	'call center': 'Call Center',
	programer: 'Programmer',
	ธุุรการ: 'ธุรการ',
	แอดมิน: 'Admin'
};
function normPosition(v: unknown): string | null {
	const s = clean(v);
	if (!s) return null;
	return POSITION_MAP[s.toLowerCase()] ?? s;
}

function coverageOf(sub: string | null): schema.CoverageType {
	if (!sub) return 'pending';
	const s = sub.replace(/\s+/g, '');
	if (s.includes('ไม่เอาคนแทน') || s.includes('ไม่จัดส่ง') || s.startsWith('ห้างปิ') || s.startsWith('ห้างปื'))
		return 'none_needed';
	if (s.startsWith('หมุ') || s.includes('คนในไซต์')) return 'rotate';
	if (s.includes('ไม่ได้')) return 'unable';
	return 'spare';
}

function normStaffType(v: unknown): string | null {
	const s = clean(v)?.toUpperCase();
	return s && ['EX', 'WL', 'HO', 'HS'].includes(s) ? s : null;
}

function normPay(v: unknown): schema.PayStatus {
	const s = clean(v);
	if (!s) return 'pending';
	if (s.startsWith('เบิก')) return 'claimed';
	if (s.includes('ไม่จ่าย')) return 'no_pay';
	return 'pending';
}

function mostFrequent<T>(items: T[]): T | null {
	const m = new Map<T, number>();
	for (const i of items) m.set(i, (m.get(i) ?? 0) + 1);
	let best: T | null = null;
	let n = 0;
	for (const [k, v] of m) if (v > n) ((best = k), (n = v));
	return best;
}

// ---------- main ----------
async function main() {
	console.log('→ migrate schema');
	await migrate(db, { migrationsFolder: path.resolve('drizzle') });

	console.log('→ อ่าน Excel:', EXCEL_PATH);
	const wb = XLSX.read(fs.readFileSync(EXCEL_PATH), { type: 'buffer' });
	const ws = wb.Sheets[SHEET];
	if (!ws) throw new Error(`ไม่พบชีต "${SHEET}"`);
	const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, raw: true });
	const dataRows = rows.slice(1).filter((r) => r.some((c) => c !== null && c !== ''));
	console.log('  แถวข้อมูล:', dataRows.length);

	type Row = {
		notifiedDate: string | null;
		workDate: string;
		siteCode: string | null;
		siteRaw: string;
		absentName: string;
		position: string | null;
		reason: string;
		subRaw: string | null;
		coverage: schema.CoverageType;
		staffType: string | null;
		startTime: string | null;
		endTime: string | null;
		wage: number | null;
		payStatus: schema.PayStatus;
		note: string | null;
	};

	const parsed: Row[] = [];
	let skipped = 0;
	for (const r of dataRows) {
		const workDate = excelDate(r[1]);
		const siteRaw = clean(r[3]);
		const absentName = clean(r[4]);
		if (!workDate || !siteRaw || !absentName) {
			skipped++;
			continue;
		}
		let notifiedDate = excelDate(r[0]);
		// แก้ปีที่พิมพ์ผิด เช่น แจ้ง 29/12/2026 สำหรับงาน 1/1/2026 -> ปีก่อนหน้า
		if (notifiedDate && notifiedDate > workDate) {
			const diffDays =
				(Date.parse(notifiedDate) - Date.parse(workDate)) / 86_400_000;
			if (diffDays > 200) notifiedDate = `${Number(notifiedDate.slice(0, 4)) - 1}${notifiedDate.slice(4)}`;
		}
		const shift = normShift(r[12]);
		const startTime = normTime(r[9]) ?? shift.start;
		const subRaw = clean(r[7]);
		parsed.push({
			notifiedDate,
			workDate,
			siteCode: clean(r[2]),
			siteRaw,
			absentName,
			position: normPosition(r[5]),
			reason: normReason(r[6]),
			subRaw,
			coverage: coverageOf(subRaw),
			staffType: normStaffType(r[8]),
			startTime,
			endTime: shift.end,
			wage: normWage(r[10]),
			payStatus: normPay(r[11]),
			note: clean(r[13])
		});
	}
	console.log('  ใช้ได้:', parsed.length, ' ข้าม (ไม่มีวันที่/หน่วยงาน/ชื่อ):', skipped);

	// ---------- ล้างข้อมูลเดิม ----------
	console.log('→ ล้างข้อมูลเดิม');
	await db.run(sql`PRAGMA foreign_keys = OFF`);
	for (const t of ['activity_logs', 'tasks', 'site_posts', 'sites', 'sessions', 'users']) {
		await db.run(sql.raw(`DELETE FROM ${t}`));
		await db.run(sql.raw(`DELETE FROM sqlite_sequence WHERE name = '${t}'`));
	}
	await db.run(sql`PRAGMA foreign_keys = ON`);

	// ---------- ผู้ใช้ระบบ (admin / หัวหน้า) ----------
	console.log('→ สร้างบัญชีผู้ใช้');
	const pw = await hashPassword(DEFAULT_PASSWORD);
	const adminPw = await hashPassword('admin1234');
	const managerPw = await hashPassword('manager1234');
	const staticUsers = [
		{ username: 'admin', passwordHash: adminPw, fullName: 'ผู้ดูแลระบบ', nickname: 'Admin', role: 'admin' as const },
		{ username: 'manager', passwordHash: managerPw, fullName: 'หัวหน้าแผนก LBA', nickname: 'หัวหน้า', role: 'manager' as const },
		{ username: 'ice', passwordHash: pw, fullName: 'ไอซ์ (ธุรการ LBA)', nickname: 'ไอซ์', role: 'admin' as const },
		{ username: 'pat', passwordHash: pw, fullName: 'แพท (ธุรการ LBA)', nickname: 'แพท', role: 'admin' as const }
	];
	await db.insert(schema.users).values(staticUsers);
	const adminId = (await db.select({ id: schema.users.id }).from(schema.users).where(sql`username = 'admin'`))[0].id;

	// ---------- พนักงานทดแทน ----------
	type SubInfo = { fullName: string; nickname: string | null; staffTypes: string[]; wages: number[]; raws: Set<string> };
	const subs = new Map<string, SubInfo>();
	for (const r of parsed) {
		if (r.coverage !== 'spare' || !r.subRaw) continue;
		const { fullName, nickname } = parseThaiName(r.subRaw);
		const key = fullName.replace(/\s+/g, '');
		let info = subs.get(key);
		if (!info) {
			info = { fullName, nickname, staffTypes: [], wages: [], raws: new Set() };
			subs.set(key, info);
		}
		if (!info.nickname && nickname) info.nickname = nickname;
		if (r.staffType) info.staffTypes.push(r.staffType);
		if (r.wage) info.wages.push(r.wage);
		info.raws.add(r.subRaw);
	}
	const subList = [...subs.entries()];
	// เรียงตามจำนวนครั้งที่แทนงาน (คนที่แทนบ่อยได้รหัสต้นๆ)
	subList.sort((a, b) => b[1].staffTypes.length + b[1].wages.length - (a[1].staffTypes.length + a[1].wages.length));
	const rawToUserId = new Map<string, number>();
	let seq = 1;
	const batch: (typeof schema.users.$inferInsert)[] = [];
	for (const [, info] of subList) {
		batch.push({
			username: `emp${String(seq).padStart(3, '0')}`,
			passwordHash: pw,
			fullName: info.fullName,
			nickname: info.nickname,
			role: 'employee',
			staffType: mostFrequent(info.staffTypes),
			defaultWage: mostFrequent(info.wages),
			active: true
		});
		seq++;
	}
	for (let i = 0; i < batch.length; i += 100) {
		const chunk = batch.slice(i, i + 100);
		const inserted = await db.insert(schema.users).values(chunk).returning({ id: schema.users.id, username: schema.users.username });
		inserted.forEach((row, j) => {
			const info = subList[i + j][1];
			for (const raw of info.raws) rawToUserId.set(raw, row.id);
		});
	}
	console.log('  พนักงานทดแทน:', batch.length, 'คน');

	// ---------- หน่วยงาน (Project) ----------
	const siteNames = new Map<string, string[]>();
	for (const r of parsed) {
		const k = siteKey(r.siteRaw);
		if (!siteNames.has(k)) siteNames.set(k, []);
		siteNames.get(k)!.push(r.siteRaw);
	}
	const siteIdByKey = new Map<string, number>();
	const siteRows = [...siteNames.entries()].map(([k, raws]) => {
		let name = mostFrequent(raws)!;
		if (k === 'true') name = 'True';
		if (k === 'cloud 11') name = 'Cloud 11';
		if (k === 'terminal พัทยา') name = 'Terminal พัทยา';
		return { key: k, name };
	});
	for (const s of siteRows) {
		const [row] = await db.insert(schema.sites).values({ name: s.name }).returning({ id: schema.sites.id });
		siteIdByKey.set(s.key, row.id);
	}
	console.log('  หน่วยงาน:', siteRows.length);

	// ---------- จุดงาน / พนักงานประจำ ----------
	type PostInfo = { siteId: number; name: string; positions: string[]; codes: string[]; starts: string[]; ends: string[] };
	const posts = new Map<string, PostInfo>();
	for (const r of parsed) {
		const siteId = siteIdByKey.get(siteKey(r.siteRaw))!;
		const name = r.absentName.replace(/\d{10,}$/, '').trim(); // ตัดเลขบัตรที่ติดมากับชื่อ
		const key = `${siteId}|${name.replace(/\s+/g, '').toLowerCase()}`;
		let p = posts.get(key);
		if (!p) {
			p = { siteId, name, positions: [], codes: [], starts: [], ends: [] };
			posts.set(key, p);
		}
		if (r.position) p.positions.push(r.position);
		if (r.siteCode) p.codes.push(r.siteCode);
		if (r.startTime) p.starts.push(r.startTime);
		if (r.endTime) p.ends.push(r.endTime);
	}
	const postIdByKey = new Map<string, number>();
	const postEntries = [...posts.entries()];
	for (let i = 0; i < postEntries.length; i += 100) {
		const chunk = postEntries.slice(i, i + 100);
		const inserted = await db
			.insert(schema.sitePosts)
			.values(
				chunk.map(([, p]) => ({
					siteId: p.siteId,
					name: p.name,
					position: mostFrequent(p.positions),
					defaultSiteCode: mostFrequent(p.codes),
					defaultStartTime: mostFrequent(p.starts),
					defaultEndTime: mostFrequent(p.ends)
				}))
			)
			.returning({ id: schema.sitePosts.id });
		inserted.forEach((row, j) => postIdByKey.set(chunk[j][0], row.id));
	}
	console.log('  จุดงาน/พนักงานประจำ:', postEntries.length);

	// ---------- งานแทน ----------
	const today = todayISO();
	const taskRows: (typeof schema.tasks.$inferInsert)[] = parsed.map((r) => {
		const siteId = siteIdByKey.get(siteKey(r.siteRaw))!;
		const name = r.absentName.replace(/\d{10,}$/, '').trim();
		const postId = postIdByKey.get(`${siteId}|${name.replace(/\s+/g, '').toLowerCase()}`) ?? null;
		const covered = r.coverage === 'spare' || r.coverage === 'rotate' || r.coverage === 'none_needed';
		let status: schema.TaskStatus = 'todo';
		if (r.workDate < today) status = covered ? 'done' : 'todo';
		else if (r.workDate === today) status = covered ? 'doing' : 'todo';
		const substituteId = r.coverage === 'spare' && r.subRaw ? (rawToUserId.get(r.subRaw) ?? null) : null;
		return {
			siteId,
			sitePostId: postId,
			siteCode: r.siteCode,
			absentName: name,
			position: r.position,
			reason: r.reason,
			notifiedDate: r.notifiedDate,
			workDate: r.workDate,
			coverageType: r.coverage,
			substituteId,
			substituteName: r.coverage === 'spare' ? r.subRaw : null,
			staffType: r.staffType,
			startTime: r.startTime,
			endTime: r.endTime,
			wage: r.wage,
			payStatus: r.payStatus,
			status,
			note: r.note,
			createdBy: adminId
		};
	});
	for (let i = 0; i < taskRows.length; i += 200) {
		await db.insert(schema.tasks).values(taskRows.slice(i, i + 200));
	}
	console.log('  งานแทน:', taskRows.length);

	await db.insert(schema.activityLogs).values({
		userId: adminId,
		action: 'import',
		entity: 'system',
		summary: `นำเข้าข้อมูลจาก Excel ${path.basename(EXCEL_PATH)} จำนวน ${taskRows.length} รายการ`,
		details: JSON.stringify({ sites: siteRows.length, posts: postEntries.length, employees: batch.length })
	});

	const cov = new Map<string, number>();
	for (const t of taskRows) cov.set(t.coverageType!, (cov.get(t.coverageType!) ?? 0) + 1);
	console.log('  สรุปประเภทการแทน:', Object.fromEntries(cov));
	console.log('\n✔ เสร็จสิ้น  บัญชีทดสอบ: admin/admin1234, manager/manager1234, ice/1234, pat/1234, emp001.../1234');
}

main()
	.then(() => process.exit(0))
	.catch((e) => {
		console.error(e);
		process.exit(1);
	});
