<script lang="ts">
	import type { PageProps } from './$types';
	import { invalidateAll } from '$app/navigation';
	import { applyAction, deserialize } from '$app/forms';
	import * as Card from '#lib/components/ui/card';
	import { Button } from '#lib/components/ui/button';
	import { Select } from '#lib/components/ui/select';
	import StatusBadge from '#lib/components/status-badge.svelte';
	import DateRange from '#lib/components/date-range.svelte';
	import { fmtDate, fmtBaht, fmtShift } from '#lib/shared/format';
	import { STATUS_LABELS, STATUS_LABELS_TH } from '#lib/shared/labels';
	import { ChevronLeft, ChevronRight, GripVertical } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { data }: PageProps = $props();
	const isEmployee = $derived(data.user?.role === 'employee');
	const canMove = $derived(data.user?.role !== 'manager');
	const columns = ['todo', 'doing', 'done'] as const;
	// สถานะชั่วคราวระหว่างรอ server (optimistic)
	let pending = $state<Record<number, string>>({});
	let dragId = $state<number | null>(null);
	let overCol = $state<string | null>(null);
	let errorMsg = $state('');

	const grouped = $derived.by(() => {
		const g: Record<string, typeof data.rows> = { todo: [], doing: [], done: [] };
		for (const r of data.rows) g[pending[r.id] ?? r.status].push(r);
		return g;
	});

	async function move(id: number, status: string) {
		if (!canMove) return;
		pending = { ...pending, [id]: status };
		const body = new FormData();
		body.set('id', String(id));
		body.set('status', status);
		const res = await fetch('?/move', { method: 'POST', body, headers: { 'x-sveltekit-action': 'true' } });
		const result = deserialize(await res.text());
		if (result.type === 'failure' || result.type === 'error') {
			errorMsg = 'เปลี่ยนสถานะไม่สำเร็จ';
			setTimeout(() => (errorMsg = ''), 2000);
		}
		await applyAction(result);
		await invalidateAll();
		const { [id]: _, ...rest } = pending;
		pending = rest;
	}
	function onDrop(col: string) {
		if (dragId !== null) move(dragId, col);
		dragId = null;
		overCol = null;
	}
	function changeSite(e: Event) {
		const url = new URL(page.url.href);
		const v = (e.target as HTMLSelectElement).value;
		if (v) url.searchParams.set('siteId', v);
		else url.searchParams.delete('siteId');
		goto(url.toString());
	}
	const colTone: Record<string, string> = { todo: 'border-t-status-todo', doing: 'border-t-status-doing', done: 'border-t-status-done' };
</script>

<div class="space-y-4">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold">Kanban Board</h1>
			<p class="text-sm text-muted-foreground">
				{isEmployee ? 'ลากการ์ดหรือกดลูกศรเพื่ออัปเดตสถานะงานของคุณ' : 'ภาพรวมสถานะงานแทนตามช่วงวันที่ · ลากการ์ดเพื่อเปลี่ยนสถานะ'}
			</p>
		</div>
		{#if !isEmployee}
			<div class="flex flex-wrap items-center gap-2">
				<Select value={String(data.siteId || '')} onchange={changeSite} class="w-auto">
					<option value="">ทุกหน่วยงาน</option>
					{#each data.siteOptions as s (s.id)}<option value={String(s.id)}>{s.name}</option>{/each}
				</Select>
				<DateRange from={data.from} to={data.to} />
			</div>
		{/if}
	</div>
	{#if errorMsg}<p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMsg}</p>{/if}

	<div class="grid gap-4 md:grid-cols-3">
		{#each columns as col (col)}
			<section
				class="flex min-h-[60vh] flex-col rounded-xl border border-t-4 bg-muted/30 {colTone[col]} {overCol === col ? 'ring-2 ring-ring/40' : ''}"
				role="list"
				aria-label={STATUS_LABELS[col]}
				ondragover={(e) => { if (canMove) { e.preventDefault(); overCol = col; } }}
				ondragleave={() => (overCol = null)}
				ondrop={(e) => { e.preventDefault(); onDrop(col); }}
			>
				<header class="flex items-center justify-between px-3 py-2">
					<h2 class="font-semibold">{STATUS_LABELS[col]} <span class="text-sm font-normal text-muted-foreground">· {STATUS_LABELS_TH[col]}</span></h2>
					<span class="rounded-full bg-background px-2 py-0.5 text-xs tabular-nums">{grouped[col].length}</span>
				</header>
				<div class="flex-1 space-y-2 overflow-y-auto px-2 pb-2">
					{#each grouped[col] as r (r.id)}
						<Card.Root
							class="gap-2 py-2 {canMove ? 'cursor-grab active:cursor-grabbing' : ''} {dragId === r.id ? 'opacity-50' : ''} {r.workDate < data.today && col !== 'done' ? 'border-destructive/40' : ''}"
							draggable={canMove}
							role="listitem"
							ondragstart={() => (dragId = r.id)}
							ondragend={() => { dragId = null; overCol = null; }}
						>
							<Card.Content class="px-3">
								<div class="flex items-start justify-between gap-2">
									<div class="min-w-0">
										<a href="/tasks/{r.id}" class="block truncate text-sm font-semibold hover:underline">{r.siteName}</a>
										<div class="truncate text-xs text-muted-foreground">{r.absentName}{r.position ? ` · ${r.position}` : ''} · {r.reason}</div>
									</div>
									{#if canMove}<GripVertical class="size-4 shrink-0 text-muted-foreground" />{/if}
								</div>
								<div class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
									<span class="font-medium {r.workDate < data.today && col !== 'done' ? 'text-destructive' : ''}">{fmtDate(r.workDate)}</span>
									<span class="text-muted-foreground">{fmtShift(r.startTime, r.endTime)}</span>
									{#if r.wage}<span class="text-muted-foreground">{fmtBaht(r.wage)}</span>{/if}
								</div>
								<div class="mt-1.5 flex items-center justify-between gap-2">
									{#if r.coverageType === 'spare'}
										<span class="truncate text-xs">👤 {r.substituteNickname ?? r.substituteName ?? '-'}</span>
									{:else}
										<StatusBadge kind="coverage" value={r.coverageType} />
									{/if}
									{#if canMove}
										<div class="flex shrink-0 gap-0.5">
											<Button size="icon-sm" variant="ghost" class="size-6" disabled={col === 'todo'} aria-label="ถอยสถานะ" onclick={() => move(r.id, columns[columns.indexOf(col) - 1])}><ChevronLeft class="size-3.5" /></Button>
											<Button size="icon-sm" variant="ghost" class="size-6" disabled={col === 'done'} aria-label="เลื่อนสถานะ" onclick={() => move(r.id, columns[columns.indexOf(col) + 1])}><ChevronRight class="size-3.5" /></Button>
										</div>
									{/if}
								</div>
							</Card.Content>
						</Card.Root>
					{:else}
						<p class="px-2 py-6 text-center text-xs text-muted-foreground">ไม่มีงาน</p>
					{/each}
				</div>
			</section>
		{/each}
	</div>
</div>
