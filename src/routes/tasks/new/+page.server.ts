import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/db';
import { tasks } from '#lib/server/db/schema';
import { formOptions } from '#lib/server/queries';
import { parseTaskForm, ensureSiteAndPost, eachDate } from '#lib/server/task-form';
import { logActivity } from '#lib/server/activity';
import { COVERAGE_LABELS } from '#lib/shared/labels';
import { fmtDate } from '#lib/shared/format';

export const load: PageServerLoad = async ({ url }) => {
	const options = await formOptions();
	// รองรับลิงก์ "เพิ่มงานให้หน่วยงานนี้" จากหน้าโปรเจกต์
	const presetSiteId = Number(url.searchParams.get('siteId')) || undefined;
	return { options, presetSiteId };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = locals.user!;
		const form = await request.formData();
		const { values, errors } = parseTaskForm(form, 'create');
		if (errors.length) return fail(400, { errors });

		const { siteId, postId, createdSite } = await ensureSiteAndPost(values);
		if (createdSite) {
			await logActivity({ userId: user.id, action: 'create', entity: 'site', entityId: siteId, summary: `สร้างหน่วยงานใหม่ "${values.newSiteName}"` });
		}
		const dates = eachDate(values.workDate, values.workDateTo);
		const inserted = await db
			.insert(tasks)
			.values(
				dates.map((workDate) => ({
					siteId,
					sitePostId: postId,
					siteCode: values.siteCode,
					absentName: values.absentName,
					position: values.position,
					reason: values.reason,
					notifiedDate: values.notifiedDate,
					workDate,
					coverageType: values.coverageType,
					substituteId: values.substituteId,
					staffType: values.staffType,
					startTime: values.startTime,
					endTime: values.endTime,
					wage: values.wage,
					payStatus: values.payStatus,
					status: values.status,
					note: values.note,
					createdBy: user.id
				}))
			)
			.returning({ id: tasks.id, workDate: tasks.workDate });

		for (const t of inserted) {
			await logActivity({
				userId: user.id,
				action: 'create',
				entity: 'task',
				entityId: t.id,
				summary: `สร้างงานแทน ${fmtDate(t.workDate)} ${values.absentName} (${values.reason}) — ${COVERAGE_LABELS[values.coverageType]}`,
				details: { ...values, workDate: t.workDate, batch: inserted.length }
			});
		}
		if (inserted.length === 1) redirect(303, `/tasks/${inserted[0].id}`);
		redirect(303, `/tasks?from=${values.workDate}&to=${values.workDateTo}&siteId=${siteId}`);
	}
};
