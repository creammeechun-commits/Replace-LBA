import { error, fail } from '@sveltejs/kit';
import { and, asc, eq, gte, lte, ne, or, type SQL } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/db';
import { sites, tasks, TASK_STATUSES, type TaskStatus } from '#lib/server/db/schema';
import { taskQuery } from '#lib/server/queries';
import { logActivity } from '#lib/server/activity';
import { todayISO, addDays } from '#lib/shared/format';
import { STATUS_LABELS } from '#lib/shared/labels';
import { fmtDate } from '#lib/shared/format';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user!;
	const today = todayISO();
	const q = url.searchParams;
	const from = DATE_RE.test(q.get('from') ?? '') ? q.get('from')! : today;
	const to = DATE_RE.test(q.get('to') ?? '') ? q.get('to')! : addDays(today, 7);
	const siteId = Number(q.get('siteId')) || 0;

	const conds: SQL[] = [];
	if (user.role === 'employee') {
		conds.push(eq(tasks.substituteId, user.id));
		// งานของฉัน: ที่ยังไม่เสร็จ + ที่เสร็จใน 7 วันล่าสุด
		conds.push(or(ne(tasks.status, 'done'), gte(tasks.workDate, addDays(today, -7)))!);
		conds.push(lte(tasks.workDate, addDays(today, 30)));
	} else {
		conds.push(gte(tasks.workDate, from), lte(tasks.workDate, to));
		if (siteId) conds.push(eq(tasks.siteId, siteId));
	}
	const rows = await taskQuery()
		.where(and(...conds))
		.orderBy(asc(tasks.workDate), asc(tasks.startTime))
		.limit(400);
	const siteOptions =
		user.role === 'employee'
			? []
			: await db.select({ id: sites.id, name: sites.name }).from(sites).where(eq(sites.active, true)).orderBy(asc(sites.name));
	return { rows, from, to, siteId, siteOptions, today };
};

export const actions: Actions = {
	move: async ({ request, locals }) => {
		const user = locals.user!;
		const form = await request.formData();
		const id = Number(form.get('id'));
		const status = String(form.get('status')) as TaskStatus;
		if (!id || !TASK_STATUSES.includes(status)) return fail(400, { error: 'ข้อมูลไม่ถูกต้อง' });
		const [t] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
		if (!t) error(404);
		if (user.role === 'employee' && t.substituteId !== user.id) error(403, 'ไม่มีสิทธิ์');
		if (user.role === 'manager') error(403, 'หัวหน้าดูได้อย่างเดียว');
		if (t.status === status) return { ok: true };
		await db.update(tasks).set({ status, updatedAt: new Date() }).where(eq(tasks.id, id));
		await logActivity({
			userId: user.id,
			action: 'status',
			entity: 'task',
			entityId: id,
			summary: `เปลี่ยนสถานะ ${STATUS_LABELS[t.status]} → ${STATUS_LABELS[status]} (${fmtDate(t.workDate)} ${t.absentName}) ผ่าน Kanban`,
			details: { status: [t.status, status] }
		});
		return { ok: true };
	}
};
