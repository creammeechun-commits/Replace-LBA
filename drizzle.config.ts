import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL ?? 'file:local.db';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'sqlite',
	dbCredentials: { url },
	verbose: true,
	strict: true
});
