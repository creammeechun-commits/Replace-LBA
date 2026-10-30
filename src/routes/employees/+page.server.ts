import { fail } from '@sveltejs/kit';
import { asc, eq, like, or, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/db';
import { users } from '#lib/server/db/schema';
import { hashPassword } from '#lib/server/password';
import { logActivity } from '#lib/server/activity';
import { todayISO, startOfMonth, endOfMonth } from '#lib/shared/format';
import { STAFF_TYPES } from '#lib/shared/labels';

export const load: PageServerLoad = async ({ url }) => {
	const today = todayISO();
	const from = startOfMonth(today);
	const to = endOfMonth(today);
	const q = url.searchParams.get('q')?.trim() ?? '';
	const role = url.searchParams.get('role') ?? '';
	const showInactive = url.searchParams.get('all') === '1';

	const conds = [];
	if (q) conds.push(or(like(users.fullName, `%${q}%`), like(users.nickname, `%${q}%`), like(users.username, `%${q}%`))!);
	if (role) conds.push(eq(users.role, role as 'employee'));
	if (!showInactive) conds.push(eq(users.active, true));

	const rows = await db
		.select({
			id: users.id,
			username: users.username,
			fullName: users.fullName,
			nickname: users.nickname,
			role: users.role,
			staffType: users.staffType,
			phone: users.phone,
			defaultWage: users.defaultWage,
			active: users.active,
			total: sql<number>`(select count(*) from tasks t where t.substitute_id = users.id)`,
			month: sql<number>`(select count(*) from tasks t where t.substitute_id = users.id and t.work_date between ${from} and ${to})`,
			monthWage: sql<number>`(select coalesce(sum(t.wage),0) from tasks t where t.substitute_id = users.id and t.work_date between ${from} and ${to})`,
			pendingWage: sql<number>`(select coalesce(sum(t.wage),0) from tasks t where t.substitute_id = users.id and t.pay_status = 'pending' and t.coverage_type = 'spare')`,
			lastDate: sql<string | null>`(select max(t.work_date) from tasks t where t.substitute_id = users.id)`
		})
		.from(users)
		.where(conds.length ? sql.join(conds, sql` and `) : undefined)
		.orderBy(asc(users.role), asc(users.username));
	return { rows, q, role, showInactive, from, to };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const admin = locals.user!;
		const form = await request.formData();
		const username = String(form.get('username') ?? '').trim().toLowerCase();
		const password = String(form.get('password') ?? '');
		const fullName = String(form.get('fullName') ?? '').replace(/\s+/g, ' ').trim();
		const nickname = String(form.get('nickname') ?? '').trim() || null;
		const roleV = String(form.get('role') ?? 'employee') as 'admin' | 'manager' | 'employee';
		const staffType = String(form.get('staffType') ?? '') || null;
		const phone = String(form.get('phone') ?? '').trim() || null;
		const defaultWage = Number(form.get('defaultWage')) || null;
		const values = { username, fullName, nickname, role: roleV, staffType, phone, defaultWage };
		if (!/^[a-z0-9_.-]{3,30}$/.test(username)) return fail(400, { error: 'ชื่อผู้ใช้ต้องเป็น a-z 0-9 . _ - ยาว 3-30 ตัว', values });
		if (password.length < 4) return fail(400, { error: 'รหัสผ่านอย่างน้อย 4 ตัวอักษร', values });
		if (!fullName) return fail(400, { error: 'กรุณาระบุชื่อ-นามสกุล', values });
		if (!['admin', 'manager', 'employee'].includes(roleV)) return fail(400, { error: 'สิทธิ์ไม่ถูกต้อง', values });
		if (staffType && !(STAFF_TYPES as readonly string[]).includes(staffType)) return fail(400, { error: 'สถานะ พนง. ไม่ถูกต้อง', values });
		const dup = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
		if (dup[0]) return fail(400, { error: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว', values });
		const [row] = await db
			.insert(users)
			.values({ ...values, passwordHash: await hashPassword(password) })
			.returning({ id: users.id });
		await logActivity({ userId: admin.id, action: 'create', entity: 'user', entityId: row.id, summary: `เพิ่มพนักงาน ${fullName}${nickname ? ` (${nickname})` : ''} [${username}]`, details: values });
		return { ok: true };
	}
};
