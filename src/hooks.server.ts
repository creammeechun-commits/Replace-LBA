import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { getSessionToken, validateSessionToken, deleteSessionCookie } from '#lib/server/auth';

const PUBLIC_PATHS = ['/login'];
const ADMIN_PATHS = ['/employees', '/tasks/new'];
const MANAGER_PATHS = ['/activity'];

export const handle: Handle = async ({ event, resolve }) => {
	const token = getSessionToken(event);
	event.locals.sessionToken = token;
	event.locals.user = token ? await validateSessionToken(token) : null;
	if (token && !event.locals.user) deleteSessionCookie(event);

	const path = event.url.pathname;
	const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + '/'));

	if (!event.locals.user && !isPublic && path !== '/logout') {
		const next = encodeURIComponent(path + event.url.search);
		redirect(303, `/login?next=${next}`);
	}

	const role = event.locals.user?.role;
	if (role && role !== 'admin' && ADMIN_PATHS.some((p) => path === p || path.startsWith(p + '/'))) {
		redirect(303, '/');
	}
	if (role === 'employee' && MANAGER_PATHS.some((p) => path === p || path.startsWith(p + '/'))) {
		// พนักงานดูได้เฉพาะประวัติของตัวเอง ผ่าน /activity?mine=1
		if (!event.url.searchParams.has('mine')) redirect(303, '/activity?mine=1');
	}

	return resolve(event);
};
