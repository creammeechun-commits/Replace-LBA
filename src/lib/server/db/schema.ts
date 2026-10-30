import { integer, sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ---------- ผู้ใช้งาน (Admin / หัวหน้า / พนักงานทดแทน) ----------
export const users = sqliteTable('users', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	fullName: text('full_name').notNull(),
	nickname: text('nickname'),
	role: text('role', { enum: ['admin', 'manager', 'employee'] })
		.notNull()
		.default('employee'),
	// สถานะพนักงานตาม Excel: EX / WL / HO / HS
	staffType: text('staff_type'),
	phone: text('phone'),
	defaultWage: integer('default_wage'),
	active: integer('active', { mode: 'boolean' }).notNull().default(true),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(), // sha256(token)
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull()
});

// ---------- โปรเจกต์ = หน่วยงาน / ไซต์ลูกค้า ----------
export const sites = sqliteTable('sites', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique(),
	note: text('note'),
	active: integer('active', { mode: 'boolean' }).notNull().default(true),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date())
});

// ---------- จุดงาน / พนักงานประจำในไซต์ (คนที่ลาและต้องหาคนแทน) ----------
export const sitePosts = sqliteTable(
	'site_posts',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		siteId: integer('site_id')
			.notNull()
			.references(() => sites.id, { onDelete: 'cascade' }),
		name: text('name').notNull(), // ชื่อพนักงานประจำ หรือชื่อจุดงาน (เช่น E-Stamp Ikea)
		position: text('position'),
		defaultSiteCode: text('default_site_code'),
		defaultStartTime: text('default_start_time'),
		defaultEndTime: text('default_end_time'),
		active: integer('active', { mode: 'boolean' }).notNull().default(true)
	},
	(t) => [index('site_posts_site_idx').on(t.siteId)]
);

// ---------- งานแทน (Task) ----------
export const COVERAGE_TYPES = ['spare', 'rotate', 'none_needed', 'unable', 'pending'] as const;
export const TASK_STATUSES = ['todo', 'doing', 'done'] as const;
export const PAY_STATUSES = ['pending', 'claimed', 'no_pay'] as const;

export const tasks = sqliteTable(
	'tasks',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		siteId: integer('site_id')
			.notNull()
			.references(() => sites.id),
		sitePostId: integer('site_post_id').references(() => sitePosts.id, { onDelete: 'set null' }),
		siteCode: text('site_code'),
		absentName: text('absent_name').notNull(), // ชื่อพนักงานที่ลา / จุดงาน
		position: text('position'),
		reason: text('reason').notNull(), // สาเหตุการลา
		notifiedDate: text('notified_date'), // YYYY-MM-DD วันที่แจ้งลา
		workDate: text('work_date').notNull(), // YYYY-MM-DD วันที่ต้องการคนแทน (กำหนดส่ง)
		coverageType: text('coverage_type', { enum: COVERAGE_TYPES }).notNull().default('pending'),
		substituteId: integer('substitute_id').references(() => users.id, { onDelete: 'set null' }),
		substituteName: text('substitute_name'), // snapshot ชื่อคนแทน (กรณีไม่ได้ผูกบัญชี)
		staffType: text('staff_type'), // EX / WL / HO / HS
		startTime: text('start_time'), // HH:MM
		endTime: text('end_time'), // HH:MM
		wage: integer('wage'), // ค่าแรงแทนงาน (บาท)
		payStatus: text('pay_status', { enum: PAY_STATUSES }).notNull().default('pending'),
		status: text('status', { enum: TASK_STATUSES }).notNull().default('todo'),
		note: text('note'),
		createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(t) => [
		index('tasks_work_date_idx').on(t.workDate),
		index('tasks_site_idx').on(t.siteId),
		index('tasks_substitute_idx').on(t.substituteId),
		index('tasks_status_idx').on(t.status)
	]
);

// ---------- Activity Log ----------
export const activityLogs = sqliteTable(
	'activity_logs',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
		action: text('action').notNull(), // create / update / delete / status / login ...
		entity: text('entity').notNull(), // task / user / site / site_post / auth
		entityId: integer('entity_id'),
		summary: text('summary').notNull(),
		details: text('details'), // JSON
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(t) => [
		index('activity_entity_idx').on(t.entity, t.entityId),
		index('activity_created_idx').on(t.createdAt)
	]
);

// ---------- relations ----------
export const usersRelations = relations(users, ({ many }) => ({
	tasks: many(tasks)
}));
export const sitesRelations = relations(sites, ({ many }) => ({
	posts: many(sitePosts),
	tasks: many(tasks)
}));
export const sitePostsRelations = relations(sitePosts, ({ one }) => ({
	site: one(sites, { fields: [sitePosts.siteId], references: [sites.id] })
}));
export const tasksRelations = relations(tasks, ({ one }) => ({
	site: one(sites, { fields: [tasks.siteId], references: [sites.id] }),
	post: one(sitePosts, { fields: [tasks.sitePostId], references: [sitePosts.id] }),
	substitute: one(users, { fields: [tasks.substituteId], references: [users.id] })
}));
export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
	user: one(users, { fields: [activityLogs.userId], references: [users.id] })
}));

export type User = typeof users.$inferSelect;
export type Site = typeof sites.$inferSelect;
export type SitePost = typeof sitePosts.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type CoverageType = (typeof COVERAGE_TYPES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type PayStatus = (typeof PAY_STATUSES)[number];
