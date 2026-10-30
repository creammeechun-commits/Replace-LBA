<script lang="ts">
	import { Button } from '#lib/components/ui/button';
	import { page } from '$app/state';

	let { current, total, perPage }: { current: number; total: number; perPage: number } = $props();
	const pages = $derived(Math.max(1, Math.ceil(total / perPage)));
	function href(p: number) {
		const url = new URL(page.url.href);
		url.searchParams.set('page', String(p));
		return url.pathname + url.search;
	}
</script>

{#if pages > 1}
	<div class="flex items-center justify-between gap-2 text-sm text-muted-foreground">
		<span>หน้า {current} / {pages} · ทั้งหมด {total.toLocaleString()} รายการ</span>
		<div class="flex gap-1">
			<Button size="sm" variant="outline" href={href(current - 1)} aria-disabled={current <= 1} class={current <= 1 ? 'pointer-events-none opacity-50' : ''}>ก่อนหน้า</Button>
			<Button size="sm" variant="outline" href={href(current + 1)} aria-disabled={current >= pages} class={current >= pages ? 'pointer-events-none opacity-50' : ''}>ถัดไป</Button>
		</div>
	</div>
{/if}
