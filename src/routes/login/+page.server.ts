import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/db';
import { users } from '#lib/server/db/schema';
import { verifyPassword } from '#lib/server/password';
import { createSession, setSessionCookie } from '#lib/server/auth';
import { logActivity } from '#lib/server/activity';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(303, '/');
	return {};
};

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const username = String(form.get('username') ?? '')
			.trim()
			.toLowerCase();
		const password = String(form.get('password') ?? '');
		if (!username || !password) {
			return fail(400, { error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน', username });
		}
		const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
		if (!user || !(await verifyPassword(password, user.passwordHash))) {
			return fail(400, { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', username });
		}
		if (!user.active) {
			return fail(403, { error: 'บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อธุรการ', username });
		}
		const { token, expiresAt } = await createSession(user.id);
		setSessionCookie(event, token, expiresAt);
		await logActivity({
			userId: user.id,
			action: 'login',
			entity: 'auth',
			summary: `${user.fullName} เข้าสู่ระบบ`
		});
		const next = event.url.searchParams.get('next');
		redirect(303, next && next.startsWith('/') ? next : '/');
	}
};
