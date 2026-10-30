import { error, fail, redirect } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/db';
import { activityLogs, tasks, users, TASK_STATUSES, type TaskStatus } from '#lib/server/db/schema';
import { formOptions, taskById } from '#lib/server/queries';
import { parseTaskForm, ensureSiteAndPost } from '#lib/server/task-form';
import { logActivity, diffFields } from '#lib/server/activity';
import { STATUS_LABELS } from '#lib/shared/labels';
import { fmtDate } from '#lib/shared/format';

export const load: PageServerLoad = async ({ params, locals }) => {
	const id = Number(params.id);
	const task = await taskById(id);
	if (!task) error(404, 'ไม่พบงานแทนนี้');
	const user = locals.user!;
	if (user.role === 'employee' && task.substituteId !== user.id) error(403, 'ไม่มีสิทธิ์ดูงานนี้');

	const history = await db
		.select({
			id: activityLogs.id,
			action: activityLogs.action,
			summary: activityLogs.summary,
			details: activityLogs.details,
			createdAt: activityLogs.createdAt,
			userName: users.fullName,
			userNickname: users.nickname
		})
		.from(activityLogs)
		.leftJoin(users, eq(activityLogs.userId, users.id))
		.where(and(eq(activityLogs.entity, 'task'), eq(activityLogs.entityId, id)))
		.orderBy(desc(activityLogs.createdAt), desc(activityLogs.id));

	const options = user.role === 'admin' ? await formOptions() : null;
	const canChangeStatus = user.role === 'admin' || task.substituteId === user.id;
	return { task, history, options, canChangeStatus };
};

async function loadOwned(id: number, userId: number, role: string) {
	const [t] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
	if (!t) error(404, 'ไม่พบงานแทนนี้');
	if (role !== 'admin' && t.substituteId !== userId) error(403, 'ไม่มีสิทธิ์แก้ไขงานนี้');
	return t;
}

export const actions: Actions = {
	status: async ({ params, request, locals }) => {
		const user = locals.user!;
		const id = Number(params.id);
		const t = await loadOwned(id, user.id, user.role);
		const form = await request.formData();
		const status = String(form.get('status')) as TaskStatus;
		if (!TASK_STATUSES.includes(status)) return fail(400, { error: 'สถานะไม่ถูกต้อง' });
		if (t.status === status) return { ok: true };
		await db.update(tasks).set({ status, updatedAt: new Date() }).where(eq(tasks.id, id));
		await logActivity({
			userId: user.id,
			action: 'status',
			entity: 'task',
			entityId: id,
			summary: `เปลี่ยนสถานะ ${STATUS_LABELS[t.status]} → ${STATUS_LABELS[status]} (${fmtDate(t.workDate)} ${t.absentName})`,
			details: { status: [t.status, status] }
		});
		return { ok: true };
	},

	update: async ({ params, request, locals }) => {
		const user = locals.user!;
		if (user.role !== 'admin') error(403);
		const id = Number(params.id);
		const t = await loadOwned(id, user.id, user.role);
		const form = await request.formData();
		const { values, errors } = parseTaskForm(form, 'edit');
		if (errors.length) return fail(400, { errors });
		const { siteId, postId } = await ensureSiteAndPost(values);
		const patch = {
			siteId,
			sitePostId: postId,
			siteCode: values.siteCode,
			absentName: values.absentName,
			position: values.position,
			reason: values.reason,
			notifiedDate: values.notifiedDate,
			workDate: values.workDate,
			coverageType: values.coverageType,
			substituteId: values.substituteId,
			substituteName: null as string | null,
			staffType: values.staffType,
			startTime: values.startTime,
			endTime: values.endTime,
			wage: values.wage,
			payStatus: values.payStatus,
			status: values.status,
			note: values.note
		};
		const changes = diffFields(t as unknown as Record<string, unknown>, patch);
		if (Object.keys(changes).length === 0) return { ok: true };
		await db.update(tasks).set({ ...patch, updatedAt: new Date() }).where(eq(tasks.id, id));
		await logActivity({
			userId: user.id,
			action: 'update',
			entity: 'task',
			entityId: id,
			summary: `แก้ไขงานแทน ${fmtDate(values.workDate)} ${values.absentName}: ${Object.keys(changes).join(', ')}`,
			details: changes
		});
		return { ok: true };
	},

	delete: async ({ params, locals }) => {
		const user = locals.user!;
		if (user.role !== 'admin') error(403);
		const id = Number(params.id);
		const t = await loadOwned(id, user.id, user.role);
		await db.delete(tasks).where(eq(tasks.id, id));
		await logActivity({
			userId: user.id,
			action: 'delete',
			entity: 'task',
			entityId: id,
			summary: `ลบงานแทน ${fmtDate(t.workDate)} ${t.absentName} (${t.reason})`,
			details: t as unknown as Record<string, unknown>
		});
		redirect(303, '/tasks');
	}
};
