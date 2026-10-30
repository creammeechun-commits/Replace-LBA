import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	DATABASE_URL: {
		description:
			'libsql/SQLite connection string สำหรับรันในเครื่อง (เช่น file:local.db) — บน Cloudflare ไม่ต้องตั้ง ระบบจะใช้ D1 binding "DB" แทน',
		// optional: ไม่มีค่า = undefined (ใช้ D1 บน Cloudflare หรือ file:local.db ในเครื่อง)
		schema: (value) => (value && value.trim() !== '' ? value : undefined)
	}
});
