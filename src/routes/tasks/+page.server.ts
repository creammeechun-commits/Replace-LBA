import { and, asc, count, eq, gte, like, lt, lte, ne, or, type SQL } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '#lib/server/db';
import { sites, tasks, users } from '#lib/server/db/schema';
import { taskQuery, orderNewest } from '#lib/server/queries';
import { todayISO } from '#lib/shared/format';

const PER_PAGE = 50;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user!;
	const q = url.searchParams;
	const today = todayISO();
	const filters = {
		q: q.get('q')?.trim() ?? '',
		from: DATE_RE.test(q.get('from') ?? '') ? q.get('from')! : '',
		to: DATE_RE.test(q.get('to') ?? '') ? q.get('to')! : '',
		status: q.get('status') ?? '',
		coverage: q.get('coverage') ?? '',
		pay: q.get('pay') ?? '',
		reason: q.get('reason') ?? '',
		siteId: Number(q.get('siteId')) || 0,
		substituteId: Number(q.get('substituteId')) || 0,
		overdue: q.get('overdue') === '1'
	};
	const page = Math.max(1, Number(q.get('page')) || 1);

	const conds: SQL[] = [];
	if (user.role === 'employee') conds.push(eq(tasks.substituteId, user.id));
	else if (filters.substituteId) conds.push(eq(tasks.substituteId, filters.substituteId));
	if (filters.from) conds.push(gte(tasks.workDate, filters.from));
	if (filters.to) conds.push(lte(tasks.workDate, filters.to));
	if (filters.status) conds.push(eq(tasks.status, filters.status as 'todo'));
	if (filters.coverage) conds.push(eq(tasks.coverageType, filters.coverage as 'spare'));
	if (filters.pay) conds.push(eq(tasks.payStatus, filters.pay as 'pending'));
	if (filters.reason) conds.push(eq(tasks.reason, filters.reason));
	if (filters.siteId) conds.push(eq(tasks.siteId, filters.siteId));
	if (filters.overdue)
		conds.push(or(and(lt(tasks.workDate, today), ne(tasks.status, 'done')), eq(tasks.coverageType, 'unable'))!);
	if (filters.q) {
		const pat = `%${filters.q}%`;
		conds.push(
			or(
				like(tasks.absentName, pat),
				like(tasks.substituteName, pat),
				like(users.fullName, pat),
				like(users.nickname, pat),
				like(sites.name, pat),
				like(tasks.siteCode, pat),
				like(tasks.note, pat)
			)!
		);
	}
	const where = conds.length ? and(...conds) : undefined;

	const [rows, [{ n: total }], siteOptions, employeeOptions] = await Promise.all([
		taskQuery()
			.where(where)
			.orderBy(...orderNewest)
			.limit(PER_PAGE)
			.offset((page - 1) * PER_PAGE),
		db
			.select({ n: count() })
			.from(tasks)
			.leftJoin(sites, eq(tasks.siteId, sites.id))
			.leftJoin(users, eq(tasks.substituteId, users.id))
			.where(where),
		db.select({ id: sites.id, name: sites.name }).from(sites).orderBy(asc(sites.name)),
		user.role === 'employee'
			? Promise.resolve([])
			: db
					.select({ id: users.id, fullName: users.fullName, nickname: users.nickname })
					.from(users)
					.where(eq(users.role, 'employee'))
					.orderBy(asc(users.fullName))
	]);

	return { rows, total, page, perPage: PER_PAGE, filters, siteOptions, employeeOptions, today };
};
