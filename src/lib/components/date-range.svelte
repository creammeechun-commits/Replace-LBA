<script lang="ts">
	import { Input } from '#lib/components/ui/input';
	import { Button } from '#lib/components/ui/button';
	import { todayISO, addDays, startOfMonth, endOfMonth } from '#lib/shared/format';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { from, to }: { from: string; to: string } = $props();
	let f = $state('');
	let t = $state('');
	$effect(() => {
		f = from;
		t = to;
	});

	function apply(nf = f, nt = t) {
		const url = new URL(page.url.href);
		url.searchParams.set('from', nf);
		url.searchParams.set('to', nt);
		url.searchParams.delete('page');
		goto(url.toString());
	}
	const today = todayISO();
	const presets = [
		{ label: 'วันนี้', from: today, to: today },
		{ label: '7 วันหน้า', from: today, to: addDays(today, 7) },
		{ label: 'เดือนนี้', from: startOfMonth(today), to: endOfMonth(today) },
		{ label: 'เดือนก่อน', from: startOfMonth(addDays(startOfMonth(today), -1)), to: addDays(startOfMonth(today), -1) }
	];
</script>

<div class="flex flex-wrap items-center gap-2">
	<Input type="date" bind:value={f} class="w-auto" aria-label="ตั้งแต่" />
	<span class="text-sm text-muted-foreground">ถึง</span>
	<Input type="date" bind:value={t} class="w-auto" aria-label="ถึง" />
	<Button size="sm" variant="secondary" onclick={() => apply()}>ดูข้อมูล</Button>
	<div class="flex flex-wrap gap-1">
		{#each presets as p (p.label)}
			<Button
				size="xs"
				variant={from === p.from && to === p.to ? 'default' : 'outline'}
				onclick={() => apply(p.from, p.to)}>{p.label}</Button
			>
		{/each}
	</div>
</div>
