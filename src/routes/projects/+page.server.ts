import { error, fail } from '@sveltejs/kit';
import { desc, eq, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/db';
import { sites } from '#lib/server/db/schema';
import { logActivity } from '#lib/server/activity';
import { todayISO, startOfMonth, endOfMonth } from '#lib/shared/format';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const load: PageServerLoad = async ({ url }) => {
	const today = todayISO();
	const from = DATE_RE.test(url.searchParams.get('from') ?? '') ? url.searchParams.get('from')! : startOfMonth(today);
	const to = DATE_RE.test(url.searchParams.get('to') ?? '') ? url.searchParams.get('to')! : endOfMonth(today);
	const showInactive = url.searchParams.get('all') === '1';

	const inRange = sql<number>`(select count(*) from tasks t where t.site_id = sites.id and t.work_date between ${from} and ${to})`;
	const rows = await db
		.select({
			id: sites.id,
			name: sites.name,
			active: sites.active,
			note: sites.note,
			posts: sql<number>`(select count(*) from site_posts p where p.site_id = sites.id and p.active = 1)`,
			total: sql<number>`(select count(*) from tasks t where t.site_id = sites.id)`,
			inRange,
			spare: sql<number>`(select count(*) from tasks t where t.site_id = sites.id and t.work_date between ${from} and ${to} and t.coverage_type = 'spare')`,
			unable: sql<number>`(select count(*) from tasks t where t.site_id = sites.id and t.work_date between ${from} and ${to} and t.coverage_type in ('unable','pending'))`,
			overdue: sql<number>`(select count(*) from tasks t where t.site_id = sites.id and t.work_date < ${today} and t.status != 'done')`,
			wage: sql<number>`(select coalesce(sum(t.wage),0) from tasks t where t.site_id = sites.id and t.work_date between ${from} and ${to})`,
			lastDate: sql<string | null>`(select max(t.work_date) from tasks t where t.site_id = sites.id)`
		})
		.from(sites)
		.where(showInactive ? undefined : eq(sites.active, true))
		.orderBy(desc(inRange), sites.name);
	return { rows, from, to, showInactive };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const user = locals.user!;
		if (user.role !== 'admin') error(403);
		const form = await request.formData();
		const name = String(form.get('name') ?? '').replace(/\s+/g, ' ').trim();
		const note = String(form.get('note') ?? '').trim() || null;
		if (!name) return fail(400, { error: 'กรุณาระบุชื่อหน่วยงาน' });
		const dup = await db.select({ id: sites.id }).from(sites).where(eq(sites.name, name)).limit(1);
		if (dup[0]) return fail(400, { error: 'มีหน่วยงานชื่อนี้อยู่แล้ว' });
		const [row] = await db.insert(sites).values({ name, note }).returning({ id: sites.id });
		await logActivity({ userId: user.id, action: 'create', entity: 'site', entityId: row.id, summary: `สร้างหน่วยงาน "${name}"` });
		return { ok: true };
	}
};
