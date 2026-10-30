import { and, asc, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';
import { db } from './db';
import { sites, sitePosts, tasks, users } from './db/schema';

/** รูปแบบคอลัมน์งานแทนที่ join ชื่อหน่วยงานและชื่อคนแทนแล้ว */
export const taskSelect = {
	id: tasks.id,
	siteId: tasks.siteId,
	siteName: sites.name,
	sitePostId: tasks.sitePostId,
	siteCode: tasks.siteCode,
	absentName: tasks.absentName,
	position: tasks.position,
	reason: tasks.reason,
	notifiedDate: tasks.notifiedDate,
	workDate: tasks.workDate,
	coverageType: tasks.coverageType,
	substituteId: tasks.substituteId,
	substituteName: sql<string | null>`coalesce(${users.fullName}, ${tasks.substituteName})`,
	substituteNickname: users.nickname,
	staffType: tasks.staffType,
	startTime: tasks.startTime,
	endTime: tasks.endTime,
	wage: tasks.wage,
	payStatus: tasks.payStatus,
	status: tasks.status,
	note: tasks.note,
	createdAt: tasks.createdAt,
	updatedAt: tasks.updatedAt
};

export type TaskRow = Awaited<ReturnType<typeof taskQuery>>[number];

export function taskQuery() {
	return db
		.select(taskSelect)
		.from(tasks)
		.leftJoin(sites, eq(tasks.siteId, sites.id))
		.leftJoin(users, eq(tasks.substituteId, users.id));
}

export async function tasksInRange(from: string, to: string, extra: SQL[] = []) {
	return taskQuery()
		.where(and(gte(tasks.workDate, from), lte(tasks.workDate, to), ...extra))
		.orderBy(asc(tasks.workDate), asc(tasks.startTime), asc(sites.name));
}

export async function taskById(id: number) {
	const rows = await taskQuery().where(eq(tasks.id, id)).limit(1);
	return rows[0] ?? null;
}

/** ข้อมูลสำหรับฟอร์มกรอกอัตโนมัติ: หน่วยงาน + จุดงาน + พนักงานทดแทน */
export async function formOptions() {
	const siteRows = await db
		.select({ id: sites.id, name: sites.name })
		.from(sites)
		.where(eq(sites.active, true))
		.orderBy(asc(sites.name));
	const postRows = await db
		.select({
			id: sitePosts.id,
			siteId: sitePosts.siteId,
			name: sitePosts.name,
			position: sitePosts.position,
			code: sitePosts.defaultSiteCode,
			start: sitePosts.defaultStartTime,
			end: sitePosts.defaultEndTime
		})
		.from(sitePosts)
		.where(eq(sitePosts.active, true))
		.orderBy(asc(sitePosts.name));
	const employeeRows = await db
		.select({
			id: users.id,
			fullName: users.fullName,
			nickname: users.nickname,
			staffType: users.staffType,
			defaultWage: users.defaultWage,
			role: users.role
		})
		.from(users)
		.where(and(eq(users.active, true), eq(users.role, 'employee')))
		.orderBy(asc(users.fullName));
	return { sites: siteRows, posts: postRows, employees: employeeRows };
}

export const orderNewest = [desc(tasks.workDate), desc(tasks.id)];
