import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteSessionCookie, invalidateSession } from '#lib/server/auth';
import { logActivity } from '#lib/server/activity';

export const POST: RequestHandler = async (event) => {
	if (event.locals.sessionToken) {
		await invalidateSession(event.locals.sessionToken);
		if (event.locals.user) {
			await logActivity({
				userId: event.locals.user.id,
				action: 'logout',
				entity: 'auth',
				summary: `${event.locals.user.fullName} ออกจากระบบ`
			});
		}
	}
	deleteSessionCookie(event);
	redirect(303, '/login');
};
