import { and, eq, gte, lt, ne, or } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { tasks } from '#lib/server/db/schema';
import { tasksInRange, taskQuery, type TaskRow } from '#lib/server/queries';
import { todayISO, startOfMonth, endOfMonth, addDays } from '#lib/shared/format';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function summarize(rows: TaskRow[]) {
	const s = {
		total: rows.length,
		spare: 0,
		rotate: 0,
		none_needed: 0,
		unable: 0,
		pending: 0,
		wage: 0,
		wagePending: 0,
		wageClaimed: 0,
		done: 0,
		doing: 0,
		todo: 0
	};
	for (const r of rows) {
		s[r.coverageType]++;
		s[r.status]++;
		if (r.wage) {
			s.wage += r.wage;
			if (r.payStatus === 'pending') s.wagePending += r.wage;
			if (r.payStatus === 'claimed') s.wageClaimed += r.wage;
		}
	}
	return s;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user!;
	const today = todayISO();
	const fromParam = url.searchParams.get('from');
	const toParam = url.searchParams.get('to');
	const from = fromParam && DATE_RE.test(fromParam) ? fromParam : startOfMonth(today);
	const to = toParam && DATE_RE.test(toParam) ? toParam : endOfMonth(today);

	// ---------- พนักงาน: เห็นเฉพาะงานของตัวเอง ----------
	if (user.role === 'employee') {
		const mine = await tasksInRange(from, to, [eq(tasks.substituteId, user.id)]);
		const upcoming = await taskQuery()
			.where(and(eq(tasks.substituteId, user.id), gte(tasks.workDate, today), ne(tasks.status, 'done')))
			.orderBy(tasks.workDate, tasks.startTime)
			.limit(20);
		return { role: 'employee' as const, from, to, today, summary: summarize(mine), mine, upcoming };
	}

	// ---------- หัวหน้า / ธุรการ ----------
	const [rows, todayRows, overdueRows] = await Promise.all([
		tasksInRange(from, to),
		tasksInRange(today, today),
		taskQuery()
			.where(
				or(
					and(lt(tasks.workDate, today), ne(tasks.status, 'done'), gte(tasks.workDate, addDays(today, -60))),
					and(eq(tasks.coverageType, 'unable'), gte(tasks.workDate, addDays(today, -60)))
				)
			)
			.orderBy(tasks.workDate)
			.limit(200)
	]);

	// รายคน
	const byPerson = new Map<string, { id: number | null; name: string; nickname: string | null; count: number; wage: number; pending: number; staffType: string | null }>();
	for (const r of rows) {
		if (r.coverageType !== 'spare') continue;
		const key = r.substituteId ? `u${r.substituteId}` : `n${r.substituteName}`;
		let p = byPerson.get(key);
		if (!p) {
			p = { id: r.substituteId, name: r.substituteName ?? '-', nickname: r.substituteNickname, count: 0, wage: 0, pending: 0, staffType: r.staffType };
			byPerson.set(key, p);
		}
		p.count++;
		p.wage += r.wage ?? 0;
		if (r.payStatus === 'pending') p.pending += r.wage ?? 0;
	}
	// รายโปรเจกต์
	const bySite = new Map<number, { id: number; name: string; count: number; spare: number; rotate: number; none_needed: number; unable: number; pending: number; wage: number }>();
	for (const r of rows) {
		let s = bySite.get(r.siteId);
		if (!s) {
			s = { id: r.siteId, name: r.siteName ?? '-', count: 0, spare: 0, rotate: 0, none_needed: 0, unable: 0, pending: 0, wage: 0 };
			bySite.set(r.siteId, s);
		}
		s.count++;
		s[r.coverageType]++;
		s.wage += r.wage ?? 0;
	}
	// รายวัน (กราฟ)
	const byDay = new Map<string, { date: string; count: number; unable: number; wage: number }>();
	for (const r of rows) {
		let d = byDay.get(r.workDate);
		if (!d) {
			d = { date: r.workDate, count: 0, unable: 0, wage: 0 };
			byDay.set(r.workDate, d);
		}
		d.count++;
		if (r.coverageType === 'unable' || r.coverageType === 'pending') d.unable++;
		d.wage += r.wage ?? 0;
	}
	// รายสาเหตุ
	const byReason = new Map<string, number>();
	for (const r of rows) byReason.set(r.reason, (byReason.get(r.reason) ?? 0) + 1);

	return {
		role: user.role,
		from,
		to,
		today,
		summary: summarize(rows),
		todaySummary: summarize(todayRows),
		todayRows,
		overdueRows,
		byPerson: [...byPerson.values()].sort((a, b) => b.count - a.count),
		bySite: [...bySite.values()].sort((a, b) => b.count - a.count),
		byDay: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
		byReason: [...byReason.entries()].sort((a, b) => b[1] - a[1])
	};
};
