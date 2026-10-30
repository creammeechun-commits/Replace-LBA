import { error, fail, redirect } from '@sveltejs/kit';
import { count, desc, eq, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/db';
import { sessions, tasks, users } from '#lib/server/db/schema';
import { taskQuery } from '#lib/server/queries';
import { hashPassword } from '#lib/server/password';
import { logActivity, diffFields } from '#lib/server/activity';
import { STAFF_TYPES } from '#lib/shared/labels';

export const load: PageServerLoad = async ({ params }) => {
	const id = Number(params.id);
	const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
	if (!u) error(404, 'ไม่พบพนักงาน');
	const { passwordHash: _, ...user } = u;
	const [history, [{ n: total }], stats] = await Promise.all([
		taskQuery().where(eq(tasks.substituteId, id)).orderBy(desc(tasks.workDate)).limit(100),
		db.select({ n: count() }).from(tasks).where(eq(tasks.substituteId, id)),
		db
			.select({
				month: sql<string>`substr(${tasks.workDate},1,7)`,
				n: count(),
				wage: sql<number>`coalesce(sum(${tasks.wage}),0)`,
				pending: sql<number>`coalesce(sum(case when ${tasks.payStatus}='pending' then ${tasks.wage} else 0 end),0)`
			})
			.from(tasks)
			.where(eq(tasks.substituteId, id))
			.groupBy(sql`substr(${tasks.workDate},1,7)`)
			.orderBy(desc(sql`substr(${tasks.workDate},1,7)`))
			.limit(12)
	]);
	return { user, history, total, stats };
};

export const actions: Actions = {
	update: async ({ params, request, locals }) => {
		const admin = locals.user!;
		const id = Number(params.id);
		const [before] = await db.select().from(users).where(eq(users.id, id)).limit(1);
		if (!before) error(404);
		const form = await request.formData();
		const patch = {
			fullName: String(form.get('fullName') ?? '').replace(/\s+/g, ' ').trim(),
			nickname: String(form.get('nickname') ?? '').trim() || null,
			role: String(form.get('role') ?? before.role) as 'admin' | 'manager' | 'employee',
			staffType: String(form.get('staffType') ?? '') || null,
			phone: String(form.get('phone') ?? '').trim() || null,
			defaultWage: Number(form.get('defaultWage')) || null,
			active: form.get('active') === 'on'
		};
		if (!patch.fullName) return fail(400, { error: 'กรุณาระบุชื่อ-นามสกุล' });
		if (!['admin', 'manager', 'employee'].includes(patch.role)) return fail(400, { error: 'สิทธิ์ไม่ถูกต้อง' });
		if (patch.staffType && !(STAFF_TYPES as readonly string[]).includes(patch.staffType)) return fail(400, { error: 'สถานะ พนง. ไม่ถูกต้อง' });
		if (id === admin.id && (patch.role !== 'admin' || !patch.active)) return fail(400, { error: 'ไม่สามารถลดสิทธิ์หรือปิดบัญชีของตัวเองได้' });
		const changes = diffFields(before as unknown as Record<string, unknown>, patch);
		if (Object.keys(changes).length === 0) return { ok: true };
		await db.update(users).set({ ...patch, updatedAt: new Date() }).where(eq(users.id, id));
		if (!patch.active) await db.delete(sessions).where(eq(sessions.userId, id));
		await logActivity({ userId: admin.id, action: 'update', entity: 'user', entityId: id, summary: `แก้ไขพนักงาน ${before.fullName}: ${Object.keys(changes).join(', ')}`, details: changes });
		return { ok: true };
	},
	password: async ({ params, request, locals }) => {
		const admin = locals.user!;
		const id = Number(params.id);
		const form = await request.formData();
		const password = String(form.get('password') ?? '');
		if (password.length < 4) return fail(400, { error: 'รหัสผ่านอย่างน้อย 4 ตัวอักษร' });
		const [u] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, id)).limit(1);
		if (!u) error(404);
		await db.update(users).set({ passwordHash: await hashPassword(password), updatedAt: new Date() }).where(eq(users.id, id));
		await db.delete(sessions).where(eq(sessions.userId, id));
		await logActivity({ userId: admin.id, action: 'password', entity: 'user', entityId: id, summary: `รีเซ็ตรหัสผ่านของ ${u.fullName}` });
		return { ok: true, passwordReset: true };
	},
	delete: async ({ params, locals }) => {
		const admin = locals.user!;
		const id = Number(params.id);
		if (id === admin.id) return fail(400, { error: 'ไม่สามารถลบบัญชีของตัวเองได้' });
		const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
		if (!u) error(404);
		// เก็บชื่อไว้ในงานแทนเดิมก่อนตัดความเชื่อมโยง
		await db.update(tasks).set({ substituteName: u.fullName }).where(eq(tasks.substituteId, id));
		await db.delete(users).where(eq(users.id, id));
		await logActivity({ userId: admin.id, action: 'delete', entity: 'user', entityId: id, summary: `ลบพนักงาน ${u.fullName} [${u.username}] (ประวัติงานแทนยังคงอยู่)`, details: { username: u.username, fullName: u.fullName, role: u.role } });
		redirect(303, '/employees');
	}
};
