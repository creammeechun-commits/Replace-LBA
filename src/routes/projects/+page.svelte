<script lang="ts">
	import type { PageProps } from './$types';
	import { enhance } from '$app/forms';
	import * as Card from '#lib/components/ui/card';
	import { Button } from '#lib/components/ui/button';
	import { Input } from '#lib/components/ui/input';
	import { Table, TablePart as T } from '#lib/components/ui/table';
	import DateRange from '#lib/components/date-range.svelte';
	import { fmtDate, fmtBaht } from '#lib/shared/format';
	import { Plus } from '@lucide/svelte';

	let { data, form }: PageProps = $props();
	let showCreate = $state(false);
	const isAdmin = $derived(data.user?.role === 'admin');
	const totals = $derived(
		data.rows.reduce(
			(a, r) => ({ inRange: a.inRange + r.inRange, spare: a.spare + r.spare, unable: a.unable + r.unable, wage: a.wage + r.wage }),
			{ inRange: 0, spare: 0, unable: 0, wage: 0 }
		)
	);
</script>

<div class="space-y-4">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold">โปรเจกต์ / หน่วยงาน</h1>
			<p class="text-sm text-muted-foreground">{data.rows.length} หน่วยงาน · งานแทนในช่วงที่เลือก {totals.inRange} งาน · ค่าแรง {fmtBaht(totals.wage)}</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<DateRange from={data.from} to={data.to} />
			{#if isAdmin}<Button size="sm" onclick={() => (showCreate = !showCreate)}><Plus class="size-4" /> เพิ่มหน่วยงาน</Button>{/if}
		</div>
	</div>

	{#if showCreate && isAdmin}
		<Card.Root class="py-3">
			<Card.Content>
				<form method="POST" action="?/create" use:enhance={() => async ({ update }) => { await update(); showCreate = !!form?.error; }} class="flex flex-wrap items-end gap-2">
					<div class="min-w-48 flex-1 space-y-1"><label for="name" class="text-sm font-medium">ชื่อหน่วยงาน *</label><Input id="name" name="name" required /></div>
					<div class="min-w-48 flex-1 space-y-1"><label for="note" class="text-sm font-medium">หมายเหตุ</label><Input id="note" name="note" /></div>
					<Button type="submit">บันทึก</Button>
				</form>
				{#if form?.error}<p class="mt-2 text-sm text-destructive">{form.error}</p>{/if}
			</Card.Content>
		</Card.Root>
	{/if}

	<Card.Root class="py-0">
		<Table>
			<T as="thead">
				<T as="tr">
					<T as="th">หน่วยงาน</T>
					<T as="th" class="text-right">จุดงาน/พนง.ประจำ</T>
					<T as="th" class="text-right">งานในช่วง</T>
					<T as="th" class="text-right">ส่งคนได้</T>
					<T as="th" class="text-right">ส่งไม่ได้/ยังไม่ระบุ</T>
					<T as="th" class="text-right">งานค้าง</T>
					<T as="th" class="text-right">ค่าแรง</T>
					<T as="th" class="text-right">ทั้งหมด</T>
					<T as="th">ล่าสุด</T>
				</T>
			</T>
			<T as="tbody">
				{#each data.rows as r (r.id)}
					<T as="tr" class={r.active ? '' : 'opacity-50'}>
						<T as="td"><a class="font-medium hover:underline" href="/projects/{r.id}?from={data.from}&to={data.to}">{r.name}</a>{#if r.note}<div class="text-xs text-muted-foreground">{r.note}</div>{/if}</T>
						<T as="td" class="text-right tabular-nums">{r.posts}</T>
						<T as="td" class="text-right tabular-nums font-medium">{r.inRange}</T>
						<T as="td" class="text-right tabular-nums">{r.spare}</T>
						<T as="td" class="text-right tabular-nums {r.unable ? 'text-destructive' : 'text-muted-foreground'}">{r.unable}</T>
						<T as="td" class="text-right tabular-nums {r.overdue ? 'text-amber-700' : 'text-muted-foreground'}">{r.overdue}</T>
						<T as="td" class="text-right tabular-nums">{fmtBaht(r.wage)}</T>
						<T as="td" class="text-right tabular-nums text-muted-foreground">{r.total}</T>
						<T as="td" class="text-muted-foreground">{fmtDate(r.lastDate)}</T>
					</T>
				{/each}
			</T>
		</Table>
	</Card.Root>
	<p class="text-xs text-muted-foreground">
		{#if data.showInactive}<a class="underline" href="/projects">ซ่อนหน่วยงานที่ปิดแล้ว</a>{:else}<a class="underline" href="/projects?all=1">แสดงหน่วยงานที่ปิดแล้วด้วย</a>{/if}
	</p>
</div>
