import { error, fail } from '@sveltejs/kit';
import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/db';
import { sites, sitePosts, tasks } from '#lib/server/db/schema';
import { taskQuery } from '#lib/server/queries';
import { logActivity } from '#lib/server/activity';
import { todayISO, startOfMonth, endOfMonth } from '#lib/shared/format';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const load: PageServerLoad = async ({ params, url }) => {
	const id = Number(params.id);
	const [site] = await db.select().from(sites).where(eq(sites.id, id)).limit(1);
	if (!site) error(404, 'ไม่พบหน่วยงาน');
	const today = todayISO();
	const from = DATE_RE.test(url.searchParams.get('from') ?? '') ? url.searchParams.get('from')! : startOfMonth(today);
	const to = DATE_RE.test(url.searchParams.get('to') ?? '') ? url.searchParams.get('to')! : endOfMonth(today);

	const [posts, rows, codes] = await Promise.all([
		db
			.select({
				id: sitePosts.id,
				name: sitePosts.name,
				position: sitePosts.position,
				code: sitePosts.defaultSiteCode,
				start: sitePosts.defaultStartTime,
				end: sitePosts.defaultEndTime,
				active: sitePosts.active,
				count: sql<number>`(select count(*) from tasks t where t.site_post_id = site_posts.id)`,
				lastDate: sql<string | null>`(select max(t.work_date) from tasks t where t.site_post_id = site_posts.id)`
			})
			.from(sitePosts)
			.where(eq(sitePosts.siteId, id))
			.orderBy(desc(sql`(select count(*) from tasks t where t.site_post_id = site_posts.id)`), asc(sitePosts.name)),
		taskQuery()
			.where(and(eq(tasks.siteId, id), gte(tasks.workDate, from), lte(tasks.workDate, to)))
			.orderBy(desc(tasks.workDate), asc(tasks.startTime))
			.limit(300),
		db
			.select({ code: tasks.siteCode, n: sql<number>`count(*)` })
			.from(tasks)
			.where(and(eq(tasks.siteId, id), sql`${tasks.siteCode} is not null`))
			.groupBy(tasks.siteCode)
			.orderBy(desc(sql`count(*)`))
	]);

	const summary = { total: rows.length, spare: 0, rotate: 0, none_needed: 0, unable: 0, pending: 0, wage: 0, overdue: 0 };
	const byReason = new Map<string, number>();
	for (const r of rows) {
		summary[r.coverageType]++;
		summary.wage += r.wage ?? 0;
		if (r.workDate < today && r.status !== 'done') summary.overdue++;
		byReason.set(r.reason, (byReason.get(r.reason) ?? 0) + 1);
	}
	return { site, posts, rows, codes, summary, byReason: [...byReason.entries()].sort((a, b) => b[1] - a[1]), from, to, today };
};

function adminOnly(role: string) {
	if (role !== 'admin') error(403, 'เฉพาะธุรการ');
}

export const actions: Actions = {
	updateSite: async ({ params, request, locals }) => {
		adminOnly(locals.user!.role);
		const id = Number(params.id);
		const form = await request.formData();
		const name = String(form.get('name') ?? '').replace(/\s+/g, ' ').trim();
		const note = String(form.get('note') ?? '').trim() || null;
		const active = form.get('active') === 'on';
		if (!name) return fail(400, { error: 'กรุณาระบุชื่อหน่วยงาน' });
		const [before] = await db.select().from(sites).where(eq(sites.id, id)).limit(1);
		if (!before) error(404);
		await db.update(sites).set({ name, note, active }).where(eq(sites.id, id));
		await logActivity({
			userId: locals.user!.id,
			action: 'update',
			entity: 'site',
			entityId: id,
			summary: `แก้ไขหน่วยงาน "${before.name}"${before.name !== name ? ` → "${name}"` : ''}${before.active !== active ? (active ? ' (เปิดใช้งาน)' : ' (ปิดใช้งาน)') : ''}`,
			details: { name: [before.name, name], note: [before.note, note], active: [before.active, active] }
		});
		return { ok: true };
	},
	addPost: async ({ params, request, locals }) => {
		adminOnly(locals.user!.role);
		const siteId = Number(params.id);
		const form = await request.formData();
		const name = String(form.get('name') ?? '').replace(/\s+/g, ' ').trim();
		if (!name) return fail(400, { postError: 'กรุณาระบุชื่อ' });
		const [row] = await db
			.insert(sitePosts)
			.values({
				siteId,
				name,
				position: String(form.get('position') ?? '').trim() || null,
				defaultSiteCode: String(form.get('code') ?? '').trim() || null,
				defaultStartTime: String(form.get('start') ?? '').trim() || null,
				defaultEndTime: String(form.get('end') ?? '').trim() || null
			})
			.returning({ id: sitePosts.id });
		await logActivity({ userId: locals.user!.id, action: 'create', entity: 'site_post', entityId: row.id, summary: `เพิ่มพนักงานประจำ/จุดงาน "${name}" ในหน่วยงาน #${siteId}` });
		return { ok: true };
	},
	updatePost: async ({ request, locals }) => {
		adminOnly(locals.user!.role);
		const form = await request.formData();
		const id = Number(form.get('postId'));
		const [before] = await db.select().from(sitePosts).where(eq(sitePosts.id, id)).limit(1);
		if (!before) error(404);
		const patch = {
			name: String(form.get('name') ?? '').replace(/\s+/g, ' ').trim() || before.name,
			position: String(form.get('position') ?? '').trim() || null,
			defaultSiteCode: String(form.get('code') ?? '').trim() || null,
			defaultStartTime: String(form.get('start') ?? '').trim() || null,
			defaultEndTime: String(form.get('end') ?? '').trim() || null,
			active: form.get('active') !== 'off'
		};
		await db.update(sitePosts).set(patch).where(eq(sitePosts.id, id));
		await logActivity({
			userId: locals.user!.id,
			action: 'update',
			entity: 'site_post',
			entityId: id,
			summary: `แก้ไขพนักงานประจำ/จุดงาน "${before.name}"${patch.active ? '' : ' (ปิดใช้งาน)'}`,
			details: { before, after: patch }
		});
		return { ok: true };
	}
};
