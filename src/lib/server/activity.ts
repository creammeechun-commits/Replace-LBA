import { db } from './db';
import { activityLogs } from './db/schema';

export async function logActivity(input: {
	userId: number | null;
	action: 'create' | 'update' | 'delete' | 'status' | 'login' | 'logout' | 'import' | 'password';
	entity: 'task' | 'user' | 'site' | 'site_post' | 'auth' | 'system';
	entityId?: number | null;
	summary: string;
	details?: Record<string, unknown> | null;
}) {
	await db.insert(activityLogs).values({
		userId: input.userId,
		action: input.action,
		entity: input.entity,
		entityId: input.entityId ?? null,
		summary: input.summary,
		details: input.details ? JSON.stringify(input.details) : null
	});
}

/** คืนค่าเฉพาะ field ที่เปลี่ยน {field: [old, new]} */
export function diffFields<T extends Record<string, unknown>>(
	before: T,
	after: Partial<T>
): Record<string, [unknown, unknown]> {
	const out: Record<string, [unknown, unknown]> = {};
	for (const k of Object.keys(after)) {
		const a = before[k] ?? null;
		const b = after[k] ?? null;
		if (a !== b) out[k] = [a, b];
	}
	return out;
}
