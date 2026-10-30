<script lang="ts">
	import type { PageProps } from './$types';
	import { enhance } from '$app/forms';
	import * as Card from '#lib/components/ui/card';
	import { Button } from '#lib/components/ui/button';
	import StatusBadge from '#lib/components/status-badge.svelte';
	import TaskForm from '#lib/components/task-form.svelte';
	import { fmtDate, fmtDateThai, fmtBaht, fmtShift, fmtDateTime } from '#lib/shared/format';
	import { STATUS_LABELS_TH } from '#lib/shared/labels';
	import { ArrowLeft, Pencil, Trash2 } from '@lucide/svelte';

	let { data, form }: PageProps = $props();
	let editing = $state(false);
	const t = $derived(data.task);
	const isAdmin = $derived(data.user?.role === 'admin');

	const FIELD_TH: Record<string, string> = {
		siteId: 'หน่วยงาน', sitePostId: 'จุดงาน', siteCode: 'Code site', absentName: 'พนักงานที่ลา', position: 'ตำแหน่ง',
		reason: 'สาเหตุ', notifiedDate: 'วันที่แจ้ง', workDate: 'วันที่', coverageType: 'การแทน', substituteId: 'คนแทน',
		substituteName: 'ชื่อคนแทน', staffType: 'สถานะ พนง.', startTime: 'เวลาเข้า', endTime: 'เวลาออก', wage: 'ค่าแรง',
		payStatus: 'การเบิก', status: 'สถานะ', note: 'หมายเหตุ'
	};
	function describe(details: string | null) {
		if (!details) return [];
		try {
			const d = JSON.parse(details) as Record<string, unknown>;
			return Object.entries(d)
				.filter(([, v]) => Array.isArray(v) && v.length === 2)
				.map(([k, v]) => `${FIELD_TH[k] ?? k}: ${(v as unknown[])[0] ?? '-'} → ${(v as unknown[])[1] ?? '-'}`);
		} catch {
			return [];
		}
	}
	$effect(() => {
		if (form?.ok) editing = false;
	});
</script>

<div class="mx-auto max-w-5xl space-y-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="flex items-center gap-3">
			<Button href="/tasks" variant="ghost" size="icon-sm" aria-label="กลับ"><ArrowLeft class="size-4" /></Button>
			<div>
				<h1 class="text-xl font-semibold">งานแทน #{t.id} · {fmtDateThai(t.workDate)}</h1>
				<p class="text-sm text-muted-foreground">{t.siteName} · {t.absentName}{t.position ? ` (${t.position})` : ''} · {t.reason}</p>
			</div>
		</div>
		<div class="flex items-center gap-2">
			<StatusBadge kind="coverage" value={t.coverageType} />
			<StatusBadge kind="status" value={t.status} />
			{#if isAdmin}
				<Button size="sm" variant={editing ? 'secondary' : 'outline'} onclick={() => (editing = !editing)}><Pencil class="size-4" /> {editing ? 'ปิดการแก้ไข' : 'แก้ไข'}</Button>
				<form method="POST" action="?/delete" use:enhance onsubmit={(e) => { if (!confirm('ลบงานแทนนี้ถาวร?')) e.preventDefault(); }}>
					<Button type="submit" size="sm" variant="destructive"><Trash2 class="size-4" /> ลบ</Button>
				</form>
			{/if}
		</div>
	</div>

	{#if form?.ok}
		<p class="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">บันทึกเรียบร้อย</p>
	{/if}
	{#if form?.error}
		<p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{form.error}</p>
	{/if}

	{#if editing && data.options}
		<Card.Root>
			<Card.Header><Card.Title>แก้ไขงานแทน</Card.Title></Card.Header>
			<Card.Content>
				<TaskForm mode="edit" action="?/update" options={data.options} initial={{ ...t, substituteId: t.substituteId }} errors={form?.errors ?? []} submitLabel="บันทึกการแก้ไข" />
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid gap-4 lg:grid-cols-3">
			<Card.Root class="lg:col-span-2">
				<Card.Header><Card.Title>รายละเอียด</Card.Title></Card.Header>
				<Card.Content>
					<dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm md:grid-cols-3">
						{#snippet row(label: string, value: string)}
							<div><dt class="text-xs text-muted-foreground">{label}</dt><dd class="font-medium">{value}</dd></div>
						{/snippet}
						{@render row('หน่วยงาน', t.siteName ?? '-')}
						{@render row('Code site', t.siteCode ?? '-')}
						{@render row('พนักงานที่ลา / จุดงาน', t.absentName)}
						{@render row('ตำแหน่ง', t.position ?? '-')}
						{@render row('สาเหตุ', t.reason)}
						{@render row('วันที่แจ้งลา', fmtDate(t.notifiedDate))}
						{@render row('วันที่ต้องการคนแทน', fmtDateThai(t.workDate))}
						{@render row('เวลาเข้า-ออก', fmtShift(t.startTime, t.endTime))}
						{@render row('คนแทน', t.coverageType === 'spare' ? `${t.substituteName ?? '-'}${t.substituteNickname ? ` (${t.substituteNickname})` : ''}` : '-')}
						{@render row('สถานะ พนง.', t.staffType ?? '-')}
						{@render row('ค่าแรงแทนงาน', fmtBaht(t.wage))}
						{@render row('อัปเดตล่าสุด', fmtDateTime(t.updatedAt))}
					</dl>
					<div class="mt-3 flex items-center gap-2 text-sm"><span class="text-xs text-muted-foreground">การเบิก:</span> <StatusBadge kind="pay" value={t.payStatus} /></div>
					{#if t.note}<p class="mt-3 rounded-md bg-muted p-3 text-sm">{t.note}</p>{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header><Card.Title>อัปเดตสถานะ</Card.Title></Card.Header>
				<Card.Content class="space-y-2">
					{#if data.canChangeStatus}
						<form method="POST" action="?/status" use:enhance class="flex flex-col gap-2">
							{#each ['todo', 'doing', 'done'] as s (s)}
								<Button type="submit" name="status" value={s} variant={t.status === s ? 'default' : 'outline'} class="justify-start">
									<span class="size-2 rounded-full {s === 'todo' ? 'bg-status-todo' : s === 'doing' ? 'bg-status-doing' : 'bg-status-done'}"></span>
									{STATUS_LABELS_TH[s]} <span class="text-xs opacity-70">({s === 'todo' ? 'To do' : s === 'doing' ? 'Doing' : 'Done'})</span>
								</Button>
							{/each}
						</form>
						<p class="text-xs text-muted-foreground">พนักงานกด "กำลังทำ" เมื่อเข้างาน และ "เสร็จแล้ว" เมื่อเลิกงาน</p>
					{:else}
						<p class="text-sm text-muted-foreground">เฉพาะผู้รับผิดชอบงานหรือธุรการที่เปลี่ยนสถานะได้</p>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	{/if}

	<Card.Root>
		<Card.Header><Card.Title>ประวัติการแก้ไข ({data.history.length})</Card.Title></Card.Header>
		<Card.Content>
			<ol class="relative space-y-3 border-l pl-4">
				{#each data.history as h (h.id)}
					<li class="text-sm">
						<span class="absolute -left-1.5 mt-1.5 size-3 rounded-full border-2 border-background bg-muted-foreground"></span>
						<div class="flex flex-wrap items-baseline gap-x-2">
							<span class="font-medium">{h.userNickname ?? h.userName ?? 'ระบบ'}</span>
							<span class="text-xs text-muted-foreground">{fmtDateTime(h.createdAt)}</span>
						</div>
						<div>{h.summary}</div>
						{#each describe(h.details) as line, i (i)}<div class="text-xs text-muted-foreground">{line}</div>{/each}
					</li>
				{:else}
					<li class="text-sm text-muted-foreground">ยังไม่มีประวัติ (ข้อมูลนำเข้าจาก Excel)</li>
				{/each}
			</ol>
		</Card.Content>
	</Card.Root>
</div>
