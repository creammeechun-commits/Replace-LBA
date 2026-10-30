import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// Workaround: rolldown (native bundler ของ Vite 8) ล่มด้วย access violation บน Windows
// ระหว่าง build ฝั่ง client เมื่อใช้ tokio หลาย thread — บังคับ 1 thread ให้ build ผ่านเสถียร
process.env.TOKIO_WORKER_THREADS ??= '1';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	]
});
