import { and, asc, count, desc, eq, gte, like, lt, or, type SQL } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '#lib/server/db';
import { activityLogs, users } from '#lib/server/db/schema';
import { addDays } from '#lib/shared/format';

const PER_PAGE = 50;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user!;
	const q = url.searchParams;
	const filters = {
		entity: q.get('entity') ?? '',
		action: q.get('action') ?? '',
		userId: user.role === 'employee' ? user.id : Number(q.get('userId')) || 0,
		from: DATE_RE.test(q.get('from') ?? '') ? q.get('from')! : '',
		to: DATE_RE.test(q.get('to') ?? '') ? q.get('to')! : '',
		q: q.get('q')?.trim() ?? ''
	};
	const page = Math.max(1, Number(q.get('page')) || 1);
	const conds: SQL[] = [];
	if (filters.entity) conds.push(eq(activityLogs.entity, filters.entity));
	if (filters.action) conds.push(eq(activityLogs.action, filters.action));
	if (filters.userId) conds.push(eq(activityLogs.userId, filters.userId));
	if (filters.from) conds.push(gte(activityLogs.createdAt, new Date(filters.from + 'T00:00:00+07:00')));
	if (filters.to) conds.push(lt(activityLogs.createdAt, new Date(addDays(filters.to, 1) + 'T00:00:00+07:00')));
	if (filters.q) conds.push(or(like(activityLogs.summary, `%${filters.q}%`), like(users.fullName, `%${filters.q}%`))!);
	const where = conds.length ? and(...conds) : undefined;

	const [rows, [{ n: total }], userOptions] = await Promise.all([
		db
			.select({
				id: activityLogs.id,
				action: activityLogs.action,
				entity: activityLogs.entity,
				entityId: activityLogs.entityId,
				summary: activityLogs.summary,
				details: activityLogs.details,
				createdAt: activityLogs.createdAt,
				userName: users.fullName,
				userNickname: users.nickname
			})
			.from(activityLogs)
			.leftJoin(users, eq(activityLogs.userId, users.id))
			.where(where)
			.orderBy(desc(activityLogs.createdAt), desc(activityLogs.id))
			.limit(PER_PAGE)
			.offset((page - 1) * PER_PAGE),
		db.select({ n: count() }).from(activityLogs).leftJoin(users, eq(activityLogs.userId, users.id)).where(where),
		user.role === 'employee'
			? Promise.resolve([])
			: db.select({ id: users.id, fullName: users.fullName, nickname: users.nickname }).from(users).orderBy(asc(users.fullName))
	]);
	return { rows, total, page, perPage: PER_PAGE, filters, userOptions, mine: user.role === 'employee' };
};
