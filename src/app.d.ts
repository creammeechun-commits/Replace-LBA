// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { SessionUser } from '#lib/server/auth';

declare global {
	// Cloudflare bindings ตาม wrangler.jsonc (runtime types มาจาก worker-configuration.d.ts ที่ `npm run gen` สร้าง)
	interface Env {
		DB: D1Database;
		ASSETS: Fetcher;
	}

	namespace App {
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}

		interface Locals {
			user: SessionUser | null;
			sessionToken: string | null;
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
