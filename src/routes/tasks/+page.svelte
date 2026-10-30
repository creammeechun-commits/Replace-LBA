<script lang="ts">
	import type { PageProps } from './$types';
	import * as Card from '#lib/components/ui/card';
	import { Button } from '#lib/components/ui/button';
	import { Input } from '#lib/components/ui/input';
	import { Select } from '#lib/components/ui/select';
	import { Table, TablePart as T } from '#lib/components/ui/table';
	import StatusBadge from '#lib/components/status-badge.svelte';
	import Pagination from '#lib/components/pagination.svelte';
	import { fmtDate, fmtBaht, fmtShift } from '#lib/shared/format';
	import { COVERAGE_LABELS, STATUS_LABELS, PAY_LABELS, REASONS } from '#lib/shared/labels';
	import { Plus, Search } from '@lucide/svelte';

	let { data }: PageProps = $props();
	const isEmployee = $derived(data.user?.role === 'employee');
</script>

<div class="space-y-4">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold">{isEmployee ? 'งานแทนของฉัน' : 'งานแทนทั้งหมด'}</h1>
			<p class="text-sm text-muted-foreground">ประวัติงานแทนย้อนหลังและงานที่กำลังจะถึง · {data.total.toLocaleString()} รายการ</p>
		</div>
		{#if data.user?.role === 'admin'}
			<Button href="/tasks/new"><Plus class="size-4" /> บันทึกงานแทนใหม่</Button>
		{/if}
	</div>

	<Card.Root class="py-3">
		<Card.Content>
			<form method="GET" class="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
				<div class="relative col-span-2">
					<Search class="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
					<Input name="q" value={data.filters.q} placeholder="ค้นหาชื่อ / หน่วยงาน / Code / หมายเหตุ" class="pl-8" />
				</div>
				<Input type="date" name="from" value={data.filters.from} aria-label="ตั้งแต่" />
				<Input type="date" name="to" value={data.filters.to} aria-label="ถึง" />
				{#if !isEmployee}
					<Select name="siteId" value={String(data.filters.siteId || '')}>
						<option value="">ทุกหน่วยงาน</option>
						{#each data.siteOptions as s (s.id)}<option value={String(s.id)}>{s.name}</option>{/each}
					</Select>
					<Select name="substituteId" value={String(data.filters.substituteId || '')}>
						<option value="">คนแทนทุกคน</option>
						{#each data.employeeOptions as e (e.id)}<option value={String(e.id)}>{e.fullName}{e.nickname ? ` (${e.nickname})` : ''}</option>{/each}
					</Select>
				{/if}
				<Select name="status" value={data.filters.status}>
					<option value="">ทุกสถานะ</option>
					{#each Object.entries(STATUS_LABELS) as [k, v] (k)}<option value={k}>{v}</option>{/each}
				</Select>
				<Select name="coverage" value={data.filters.coverage}>
					<option value="">การแทนทุกแบบ</option>
					{#each Object.entries(COVERAGE_LABELS) as [k, v] (k)}<option value={k}>{v}</option>{/each}
				</Select>
				<Select name="pay" value={data.filters.pay}>
					<option value="">การเบิกทุกแบบ</option>
					{#each Object.entries(PAY_LABELS) as [k, v] (k)}<option value={k}>{v}</option>{/each}
				</Select>
				<Select name="reason" value={data.filters.reason}>
					<option value="">ทุกสาเหตุ</option>
					{#each REASONS as r (r)}<option value={r}>{r}</option>{/each}
				</Select>
				<label class="flex items-center gap-2 text-sm">
					<input type="checkbox" name="overdue" value="1" checked={data.filters.overdue} class="rounded" /> เฉพาะงานค้าง/ส่งไม่ได้
				</label>
				<div class="flex gap-2">
					<Button type="submit" size="sm">กรอง</Button>
					<Button href="/tasks" size="sm" variant="ghost">ล้าง</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>

	<Card.Root class="py-0">
		<Table>
			<T as="thead">
				<T as="tr">
					<T as="th">วันที่</T>
					<T as="th">หน่วยงาน</T>
					<T as="th">พนักงานที่ลา / จุดงาน</T>
					<T as="th">สาเหตุ</T>
					<T as="th">คนแทน</T>
					<T as="th">เวลา</T>
					<T as="th" class="text-right">ค่าแรง</T>
					<T as="th">เบิก</T>
					<T as="th">สถานะ</T>
				</T>
			</T>
			<T as="tbody">
				{#each data.rows as r (r.id)}
					<T as="tr" class={r.workDate < data.today && r.status !== 'done' ? 'bg-destructive/5' : ''}>
						<T as="td">
							<a class="font-medium hover:underline" href="/tasks/{r.id}">{fmtDate(r.workDate)}</a>
							{#if r.notifiedDate}<div class="text-xs text-muted-foreground">แจ้ง {fmtDate(r.notifiedDate)}</div>{/if}
						</T>
						<T as="td">{r.siteName}<div class="text-xs text-muted-foreground">{r.siteCode ?? ''}</div></T>
						<T as="td">{r.absentName}<div class="text-xs text-muted-foreground">{r.position ?? ''}</div></T>
						<T as="td">{r.reason}</T>
						<T as="td">
							{#if r.coverageType === 'spare'}
								{r.substituteName ?? '-'}{#if r.substituteNickname}<span class="text-muted-foreground"> ({r.substituteNickname})</span>{/if}
								{#if r.staffType}<span class="ml-1 text-xs text-muted-foreground">{r.staffType}</span>{/if}
							{:else}
								<StatusBadge kind="coverage" value={r.coverageType} />
							{/if}
						</T>
						<T as="td">{fmtShift(r.startTime, r.endTime)}</T>
						<T as="td" class="text-right tabular-nums">{fmtBaht(r.wage)}</T>
						<T as="td"><StatusBadge kind="pay" value={r.payStatus} /></T>
						<T as="td"><StatusBadge kind="status" value={r.status} /></T>
					</T>
				{:else}
					<T as="tr"><T as="td" colspan={9} class="py-8 text-center text-muted-foreground">ไม่พบรายการตามเงื่อนไข</T></T>
				{/each}
			</T>
		</Table>
	</Card.Root>

	<Pagination current={data.page} total={data.total} perPage={data.perPage} />
</div>
