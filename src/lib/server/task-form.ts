import { and, eq } from 'drizzle-orm';
import { db } from './db';
import { sites, sitePosts, COVERAGE_TYPES, PAY_STATUSES, TASK_STATUSES } from './db/schema';
import type { CoverageType, PayStatus, TaskStatus } from './db/schema';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export type TaskFormValues = {
	siteId: number;
	newSiteName: string;
	absentName: string;
	position: string | null;
	siteCode: string | null;
	reason: string;
	notifiedDate: string | null;
	workDate: string;
	workDateTo: string;
	coverageType: CoverageType;
	substituteId: number | null;
	staffType: string | null;
	startTime: string | null;
	endTime: string | null;
	wage: number | null;
	payStatus: PayStatus;
	status: TaskStatus;
	note: string | null;
};

const str = (form: FormData, k: string) => {
	const v = form.get(k);
	if (v === null) return null;
	const s = String(v).replace(/\s+/g, ' ').trim();
	return s === '' ? null : s;
};

export function parseTaskForm(form: FormData, mode: 'create' | 'edit') {
	const errors: string[] = [];
	const siteId = Number(form.get('siteId')) || 0;
	const newSiteName = str(form, 'newSiteName') ?? '';
	const absentName = str(form, 'absentName') ?? '';
	const reason = str(form, 'reason') ?? '';
	const workDate = str(form, 'workDate') ?? '';
	const workDateTo = str(form, 'workDateTo') ?? workDate;
	const notifiedDate = str(form, 'notifiedDate');
	const coverageType = (str(form, 'coverageType') ?? 'pending') as CoverageType;
	const substituteId = Number(form.get('substituteId')) || null;
	const startTime = str(form, 'startTime');
	const endTime = str(form, 'endTime');
	const wageRaw = str(form, 'wage');
	const wage = wageRaw ? Number(wageRaw.replace(/,/g, '')) : null;
	const payStatus = (str(form, 'payStatus') ?? 'pending') as PayStatus;
	const status = (str(form, 'status') ?? 'todo') as TaskStatus;

	if (!siteId && !newSiteName) errors.push('กรุณาเลือกหน่วยงาน');
	if (!absentName) errors.push('กรุณาระบุชื่อพนักงานที่ลา / จุดงาน');
	if (!reason) errors.push('กรุณาระบุสาเหตุ');
	if (!DATE_RE.test(workDate)) errors.push('กรุณาระบุวันที่ต้องการคนแทน');
	if (mode === 'create') {
		if (!DATE_RE.test(workDateTo)) errors.push('วันที่สิ้นสุดไม่ถูกต้อง');
		else if (workDateTo < workDate) errors.push('วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม');
		else if ((Date.parse(workDateTo) - Date.parse(workDate)) / 86_400_000 > 62)
			errors.push('สร้างได้สูงสุด 62 วันต่อครั้ง');
	}
	if (notifiedDate && !DATE_RE.test(notifiedDate)) errors.push('วันที่แจ้งลาไม่ถูกต้อง');
	if (!COVERAGE_TYPES.includes(coverageType)) errors.push('ประเภทการแทนไม่ถูกต้อง');
	if (coverageType === 'spare' && !substituteId) errors.push('กรุณาเลือกพนักงานทดแทน');
	if (startTime && !TIME_RE.test(startTime)) errors.push('เวลาเข้างานไม่ถูกต้อง (HH:MM)');
	if (endTime && !TIME_RE.test(endTime)) errors.push('เวลาออกงานไม่ถูกต้อง (HH:MM)');
	if (wage !== null && (!Number.isFinite(wage) || wage < 0)) errors.push('ค่าแรงไม่ถูกต้อง');
	if (!PAY_STATUSES.includes(payStatus)) errors.push('สถานะการเบิกไม่ถูกต้อง');
	if (!TASK_STATUSES.includes(status)) errors.push('สถานะงานไม่ถูกต้อง');

	const values: TaskFormValues = {
		siteId,
		newSiteName,
		absentName,
		position: str(form, 'position'),
		siteCode: str(form, 'siteCode'),
		reason,
		notifiedDate,
		workDate,
		workDateTo,
		coverageType,
		substituteId: coverageType === 'spare' ? substituteId : null,
		staffType: coverageType === 'spare' ? str(form, 'staffType') : null,
		startTime,
		endTime,
		wage: coverageType === 'spare' ? wage : null,
		payStatus: coverageType === 'spare' ? payStatus : 'pending',
		status,
		note: str(form, 'note')
	};
	return { values, errors };
}

/** หา/สร้างหน่วยงาน และจุดงาน เพื่อให้ครั้งถัดไปกรอกอัตโนมัติได้ */
export async function ensureSiteAndPost(v: TaskFormValues) {
	let siteId = v.siteId;
	let createdSite = false;
	if (!siteId && v.newSiteName) {
		const existing = await db.select({ id: sites.id }).from(sites).where(eq(sites.name, v.newSiteName)).limit(1);
		if (existing[0]) siteId = existing[0].id;
		else {
			const [row] = await db.insert(sites).values({ name: v.newSiteName }).returning({ id: sites.id });
			siteId = row.id;
			createdSite = true;
		}
	}
	const existingPost = await db
		.select({ id: sitePosts.id })
		.from(sitePosts)
		.where(and(eq(sitePosts.siteId, siteId), eq(sitePosts.name, v.absentName)))
		.limit(1);
	let postId: number;
	if (existingPost[0]) {
		postId = existingPost[0].id;
		// อัปเดตค่าเริ่มต้นล่าสุดของจุดงาน
		await db
			.update(sitePosts)
			.set({
				position: v.position ?? undefined,
				defaultSiteCode: v.siteCode ?? undefined,
				defaultStartTime: v.startTime ?? undefined,
				defaultEndTime: v.endTime ?? undefined,
				active: true
			})
			.where(eq(sitePosts.id, postId));
	} else {
		const [row] = await db
			.insert(sitePosts)
			.values({
				siteId,
				name: v.absentName,
				position: v.position,
				defaultSiteCode: v.siteCode,
				defaultStartTime: v.startTime,
				defaultEndTime: v.endTime
			})
			.returning({ id: sitePosts.id });
		postId = row.id;
	}
	return { siteId, postId, createdSite };
}

export function eachDate(from: string, to: string): string[] {
	const out: string[] = [];
	let cur = from;
	while (cur <= to) {
		out.push(cur);
		const [y, m, d] = cur.split('-').map(Number);
		cur = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
	}
	return out;
}
