<script lang="ts">
	import type { PageProps } from './$types';
	import * as Card from '#lib/components/ui/card';
	import { Button } from '#lib/components/ui/button';
	import { Table, TablePart as T } from '#lib/components/ui/table';
	import StatusBadge from '#lib/components/status-badge.svelte';
	import DateRange from '#lib/components/date-range.svelte';
	import { fmtDate, fmtDateThai, fmtBaht, fmtShift } from '#lib/shared/format';
	import { COVERAGE_LABELS } from '#lib/shared/labels';
	import { Copy, Check, AlertTriangle } from '@lucide/svelte';

	let { data }: PageProps = $props();
	let copied = $state(false);

	// ข้อความสรุปรายวันสำหรับส่งหัวหน้า (คัดลอกลง LINE ได้ทันที)
	const dailyText = $derived.by(() => {
		if (data.role === 'employee') return '';
		const t = data.todaySummary!;
		const lines = [`สรุปงานแทน ${fmtDateThai(data.today)}`];
		for (const r of data.todayRows!) {
			const who =
				r.coverageType === 'spare'
					? `${r.substituteName ?? '-'}${r.substituteNickname ? ` (${r.substituteNickname})` : ''}${r.staffType ? ` ${r.staffType}` : ''}`
					: COVERAGE_LABELS[r.coverageType];
			lines.push(
				`• ${r.siteName} | ${r.absentName}${r.position ? ` (${r.position})` : ''} ${r.reason} → ${who} ${fmtShift(r.startTime, r.endTime)}${r.wage ? ` ${r.wage.toLocaleString()}฿` : ''}`
			);
		}
		lines.push(
			`รวม ${t.total} งาน | ส่งคน ${t.spare} | หมุนในไซต์ ${t.rotate} | ไม่เอาคน ${t.none_needed} | ส่งไม่ได้ ${t.unable} | ยังไม่ระบุ ${t.pending} | ค่าแทนงาน ${t.wage.toLocaleString()}฿`
		);
		return lines.join('\n');
	});

	async function copyDaily() {
		await navigator.clipboard.writeText(dailyText);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}

	const maxDay = $derived(data.role === 'employee' ? 0 : Math.max(1, ...data.byDay!.map((d) => d.count)));
	const s = $derived(data.summary);
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold">Dashboard</h1>
			<p class="text-sm text-muted-foreground">
				{data.role === 'employee' ? 'สรุปงานแทนของฉัน' : 'สรุปงานแทนรายวัน รายคน รายโปรเจกต์'} · {fmtDateThai(data.today)}
			</p>
		</div>
		<DateRange from={data.from} to={data.to} />
	</div>

	<!-- KPI -->
	<div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
		{#snippet tile(label: string, value: string | number, sub?: string, tone?: string)}
			<Card.Root class="kpi gap-1 py-3">
				<Card.Content>
					<div class="text-xs text-muted-foreground">{label}</div>
					<div class="text-2xl font-semibold tabular-nums {tone ?? ''}">{value}</div>
					{#if sub}<div class="text-xs text-muted-foreground">{sub}</div>{/if}
				</Card.Content>
			</Card.Root>
		{/snippet}
		{@render tile('งานแทนในช่วงที่เลือก', s.total, `${fmtDate(data.from)} - ${fmtDate(data.to)}`)}
		{@render tile('ส่งคนแทนได้', s.spare, `หมุนในไซต์ ${s.rotate} · ไม่เอาคน ${s.none_needed}`)}
		{@render tile('ส่งคนแทนไม่ได้', s.unable, `ยังไม่ระบุคนแทน ${s.pending}`, s.unable ? 'text-destructive' : '')}
		{@render tile('ค่าแทนงานรวม', fmtBaht(s.wage))}
		{@render tile('รอเบิก', fmtBaht(s.wagePending), `เบิกแล้ว ${fmtBaht(s.wageClaimed)}`)}
		{@render tile('สถานะงาน', `${s.done}/${s.total}`, `Done · Doing ${s.doing} · To do ${s.todo}`)}
	</div>

	{#if data.role === 'employee'}
		<Card.Root>
			<Card.Header><Card.Title>งานที่กำลังจะถึง</Card.Title></Card.Header>
			<Card.Content>
				{#if data.upcoming!.length === 0}
					<p class="text-sm text-muted-foreground">ยังไม่มีงานแทนที่รอดำเนินการ</p>
				{:else}
					<Table>
						<T as="thead"><T as="tr"><T as="th">วันที่</T><T as="th">หน่วยงาน</T><T as="th">แทนใคร</T><T as="th">เวลา</T><T as="th">ค่าแรง</T><T as="th">สถานะ</T></T></T>
						<T as="tbody">
							{#each data.upcoming! as r (r.id)}
								<T as="tr">
									<T as="td"><a class="underline-offset-2 hover:underline" href="/tasks/{r.id}">{fmtDateThai(r.workDate)}</a></T>
									<T as="td">{r.siteName}</T>
									<T as="td">{r.absentName} <span class="text-muted-foreground">{r.position ?? ''}</span></T>
									<T as="td">{fmtShift(r.startTime, r.endTime)}</T>
									<T as="td">{fmtBaht(r.wage)}</T>
									<T as="td"><StatusBadge kind="status" value={r.status} /></T>
								</T>
							{/each}
						</T>
					</Table>
				{/if}
				<div class="mt-3"><Button href="/board" variant="outline" size="sm">ไปที่ Kanban Board</Button></div>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- รายงานวันนี้ -->
		<Card.Root>
			<Card.Header>
				<div>
					<Card.Title>รายงานงานแทนวันนี้ ({data.todayRows!.length} งาน)</Card.Title>
					<Card.Description>ใครไปแทนใคร ที่ไหน จ่ายเท่าไหร่ — คัดลอกส่งหัวหน้าได้ทันที</Card.Description>
				</div>
				<Button size="sm" variant="outline" onclick={copyDaily}>
					{#if copied}<Check class="size-4" /> คัดลอกแล้ว{:else}<Copy class="size-4" /> คัดลอกสรุป{/if}
				</Button>
			</Card.Header>
			<Card.Content>
				{#if data.todayRows!.length === 0}
					<p class="text-sm text-muted-foreground">วันนี้ไม่มีงานแทนที่บันทึกไว้</p>
				{:else}
					<Table>
						<T as="thead">
							<T as="tr"><T as="th">หน่วยงาน</T><T as="th">พนักงานที่ลา</T><T as="th">สาเหตุ</T><T as="th">คนแทน</T><T as="th">เวลา</T><T as="th" class="text-right">ค่าแรง</T><T as="th">เบิก</T><T as="th">สถานะ</T></T>
						</T>
						<T as="tbody">
							{#each data.todayRows! as r (r.id)}
								<T as="tr">
									<T as="td"><a class="font-medium hover:underline" href="/projects/{r.siteId}">{r.siteName}</a><div class="text-xs text-muted-foreground">{r.siteCode ?? ''}</div></T>
									<T as="td">{r.absentName}<div class="text-xs text-muted-foreground">{r.position ?? ''}</div></T>
									<T as="td">{r.reason}</T>
									<T as="td">
										{#if r.coverageType === 'spare'}
											<a class="hover:underline" href="/tasks/{r.id}">{r.substituteName}{r.substituteNickname ? ` (${r.substituteNickname})` : ''}</a>
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
							{/each}
						</T>
						<T as="tfoot">
							<T as="tr"><T as="td" class="font-medium" colspan={5}>รวม {data.todaySummary!.total} งาน · ส่งคน {data.todaySummary!.spare} · หมุนในไซต์ {data.todaySummary!.rotate} · ไม่เอาคน {data.todaySummary!.none_needed} · ส่งไม่ได้ {data.todaySummary!.unable}</T><T as="td" class="text-right font-semibold">{fmtBaht(data.todaySummary!.wage)}</T><T as="td" colspan={2}></T></T>
						</T>
					</Table>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- กราฟรายวัน -->
		<Card.Root>
			<Card.Header>
				<div>
					<Card.Title>จำนวนงานแทนรายวัน</Card.Title>
					<Card.Description>แท่งเข้ม = งานทั้งหมดในวันนั้น · ชี้เพื่อดูรายละเอียด</Card.Description>
				</div>
			</Card.Header>
			<Card.Content>
				{#if data.byDay!.length === 0}
					<p class="text-sm text-muted-foreground">ไม่มีข้อมูลในช่วงที่เลือก</p>
				{:else}
					<div class="flex h-40 items-end gap-px overflow-x-auto border-b pb-px" role="img" aria-label="จำนวนงานแทนรายวัน">
						{#each data.byDay! as d (d.date)}
							<a
								href="/tasks?from={d.date}&to={d.date}"
								class="group relative flex min-w-[6px] flex-1 flex-col justify-end"
								style="height:100%"
								title="{fmtDateThai(d.date)}: {d.count} งาน · ส่งไม่ได้/ยังไม่ระบุ {d.unable} · {fmtBaht(d.wage)}"
							>
								<div class="w-full rounded-t-[4px] bg-chart-1 transition-colors group-hover:bg-primary" style="height:{(d.count / maxDay) * 100}%"></div>
							</a>
						{/each}
					</div>
					<div class="mt-1 flex justify-between text-xs text-muted-foreground">
						<span>{fmtDate(data.byDay![0].date)}</span>
						<span>สูงสุด {maxDay} งาน/วัน</span>
						<span>{fmtDate(data.byDay![data.byDay!.length - 1].date)}</span>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<div class="grid gap-6 xl:grid-cols-2">
			<!-- รายคน -->
			<Card.Root>
				<Card.Header>
					<div>
						<Card.Title>สรุปรายคน (พนักงานทดแทน)</Card.Title>
						<Card.Description>จำนวนครั้งที่แทนงานและค่าแรงในช่วงที่เลือก</Card.Description>
					</div>
				</Card.Header>
				<Card.Content>
					<Table>
						<T as="thead"><T as="tr"><T as="th">ชื่อ</T><T as="th">สถานะ</T><T as="th" class="text-right">ครั้ง</T><T as="th" class="text-right">ค่าแรงรวม</T><T as="th" class="text-right">รอเบิก</T></T></T>
						<T as="tbody">
							{#each data.byPerson!.slice(0, 15) as p (p.id ?? p.name)}
								<T as="tr">
									<T as="td">
										{#if p.id}<a class="hover:underline" href="/tasks?substituteId={p.id}&from={data.from}&to={data.to}">{p.name}</a>{:else}{p.name}{/if}
										{#if p.nickname}<span class="text-muted-foreground"> ({p.nickname})</span>{/if}
									</T>
									<T as="td" class="text-muted-foreground">{p.staffType ?? '-'}</T>
									<T as="td" class="text-right tabular-nums">{p.count}</T>
									<T as="td" class="text-right tabular-nums">{fmtBaht(p.wage)}</T>
									<T as="td" class="text-right tabular-nums {p.pending ? 'text-amber-700' : 'text-muted-foreground'}">{fmtBaht(p.pending)}</T>
								</T>
							{:else}
								<T as="tr"><T as="td" colspan={5} class="text-muted-foreground">ไม่มีข้อมูล</T></T>
							{/each}
						</T>
					</Table>
					{#if data.byPerson!.length > 15}<p class="mt-2 text-xs text-muted-foreground">แสดง 15 จาก {data.byPerson!.length} คน</p>{/if}
				</Card.Content>
			</Card.Root>

			<!-- รายโปรเจกต์ -->
			<Card.Root>
				<Card.Header>
					<div>
						<Card.Title>สรุปรายโปรเจกต์ / หน่วยงาน</Card.Title>
						<Card.Description>จำนวนงานแทนและผลการจัดส่งคน</Card.Description>
					</div>
				</Card.Header>
				<Card.Content>
					<Table>
						<T as="thead"><T as="tr"><T as="th">หน่วยงาน</T><T as="th" class="text-right">งาน</T><T as="th" class="text-right">ส่งคน</T><T as="th" class="text-right">หมุน/ไม่เอา</T><T as="th" class="text-right">ส่งไม่ได้</T><T as="th" class="text-right">ค่าแรง</T></T></T>
						<T as="tbody">
							{#each data.bySite!.slice(0, 15) as s2 (s2.id)}
								<T as="tr">
									<T as="td"><a class="hover:underline" href="/projects/{s2.id}?from={data.from}&to={data.to}">{s2.name}</a></T>
									<T as="td" class="text-right tabular-nums">{s2.count}</T>
									<T as="td" class="text-right tabular-nums">{s2.spare}</T>
									<T as="td" class="text-right tabular-nums text-muted-foreground">{s2.rotate + s2.none_needed}</T>
									<T as="td" class="text-right tabular-nums {s2.unable + s2.pending ? 'text-destructive' : 'text-muted-foreground'}">{s2.unable + s2.pending}</T>
									<T as="td" class="text-right tabular-nums">{fmtBaht(s2.wage)}</T>
								</T>
							{:else}
								<T as="tr"><T as="td" colspan={6} class="text-muted-foreground">ไม่มีข้อมูล</T></T>
							{/each}
						</T>
					</Table>
					{#if data.bySite!.length > 15}<p class="mt-2 text-xs text-muted-foreground">แสดง 15 จาก {data.bySite!.length} หน่วยงาน · <a class="underline" href="/projects">ดูทั้งหมด</a></p>{/if}
				</Card.Content>
			</Card.Root>
		</div>

		<!-- งานช้า / ส่งสแปร์ไม่ได้ -->
		<Card.Root>
			<Card.Header>
				<div>
					<Card.Title class="flex items-center gap-2"><AlertTriangle class="size-4 text-destructive" /> งานที่เลยกำหนด / ส่งสแปร์ไม่ได้ ({data.overdueRows!.length})</Card.Title>
					<Card.Description>งานที่ถึงวันแล้วแต่ยังไม่ Done และงานที่จัดส่งคนแทนไม่ได้ (ย้อนหลัง 60 วัน)</Card.Description>
				</div>
			</Card.Header>
			<Card.Content>
				{#if data.overdueRows!.length === 0}
					<p class="text-sm text-muted-foreground">ไม่มีงานค้าง 🎉</p>
				{:else}
					<Table>
						<T as="thead"><T as="tr"><T as="th">วันที่</T><T as="th">หน่วยงาน</T><T as="th">พนักงานที่ลา</T><T as="th">สาเหตุ</T><T as="th">การแทน</T><T as="th">คนแทน</T><T as="th">สถานะ</T></T></T>
						<T as="tbody">
							{#each data.overdueRows!.slice(0, 50) as r (r.id)}
								<T as="tr">
									<T as="td"><a class="hover:underline" href="/tasks/{r.id}">{fmtDate(r.workDate)}</a></T>
									<T as="td">{r.siteName}</T>
									<T as="td">{r.absentName} <span class="text-xs text-muted-foreground">{r.position ?? ''}</span></T>
									<T as="td">{r.reason}</T>
									<T as="td"><StatusBadge kind="coverage" value={r.coverageType} /></T>
									<T as="td">{r.substituteName ?? '-'}</T>
									<T as="td"><StatusBadge kind="status" value={r.status} /></T>
								</T>
							{/each}
						</T>
					</Table>
					{#if data.overdueRows!.length > 50}<p class="mt-2 text-xs text-muted-foreground">แสดง 50 รายการแรก · <a class="underline" href="/tasks?overdue=1">ดูทั้งหมด</a></p>{/if}
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- สาเหตุการลา -->
		<Card.Root>
			<Card.Header><Card.Title>สาเหตุการลาในช่วงที่เลือก</Card.Title></Card.Header>
			<Card.Content class="flex flex-wrap gap-2">
				{#each data.byReason! as [reason, n] (reason)}
					<a href="/tasks?reason={encodeURIComponent(reason)}&from={data.from}&to={data.to}" class="rounded-md border px-2.5 py-1 text-sm hover:bg-accent">{reason} <span class="font-semibold tabular-nums">{n}</span></a>
				{/each}
			</Card.Content>
		</Card.Root>
	{/if}
</div>
