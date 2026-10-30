<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { Button } from '#lib/components/ui/button';
	import { Input } from '#lib/components/ui/input';
	import { Label } from '#lib/components/ui/label';
	import { Select } from '#lib/components/ui/select';
	import { Textarea } from '#lib/components/ui/textarea';
	import { COVERAGE_LABELS, PAY_LABELS, STATUS_LABELS, REASONS, STAFF_TYPES, COMMON_SHIFTS } from '#lib/shared/labels';
	import { todayISO } from '#lib/shared/format';
	import { Sparkles } from '@lucide/svelte';

	type Options = {
		sites: { id: number; name: string }[];
		posts: { id: number; siteId: number; name: string; position: string | null; code: string | null; start: string | null; end: string | null }[];
		employees: { id: number; fullName: string; nickname: string | null; staffType: string | null; defaultWage: number | null }[];
	};
	type Initial = Partial<{
		siteId: number;
		absentName: string;
		position: string | null;
		siteCode: string | null;
		reason: string;
		notifiedDate: string | null;
		workDate: string;
		workDateTo: string;
		coverageType: string;
		substituteId: number | null;
		staffType: string | null;
		startTime: string | null;
		endTime: string | null;
		wage: number | null;
		payStatus: string;
		status: string;
		note: string | null;
	}>;

	let {
		options,
		initial = {},
		mode,
		action,
		errors = [],
		submitLabel = 'บันทึก'
	}: { options: Options; initial?: Initial; mode: 'create' | 'edit'; action?: string; errors?: string[]; submitLabel?: string } =
		$props();

	const today = todayISO();
	// ค่าเริ่มต้นอ่านครั้งเดียวตอน mount โดยตั้งใจ (ฟอร์มถือ state ของตัวเอง)
	const init = untrack(() => ({ ...initial }));
	let siteId = $state(String(init.siteId ?? ''));
	let newSiteName = $state('');
	let absentName = $state(init.absentName ?? '');
	let position = $state(init.position ?? '');
	let siteCode = $state(init.siteCode ?? '');
	let reason = $state(init.reason ?? 'ลาป่วย');
	let notifiedDate = $state(init.notifiedDate ?? today);
	let workDate = $state(init.workDate ?? today);
	let workDateTo = $state(init.workDateTo ?? init.workDate ?? today);
	let coverageType = $state(init.coverageType ?? 'spare');
	let substituteId = $state(String(init.substituteId ?? ''));
	let staffType = $state(init.staffType ?? '');
	let startTime = $state(init.startTime ?? '');
	let endTime = $state(init.endTime ?? '');
	let wage = $state(init.wage?.toString() ?? '');
	let payStatus = $state(init.payStatus ?? 'pending');
	let status = $state(init.status ?? 'todo');
	let note = $state(init.note ?? '');
	let autofilled = $state<string[]>([]);
	let submitting = $state(false);

	const sitePosts = $derived(options.posts.filter((p) => String(p.siteId) === siteId));
	const dayCount = $derived.by(() => {
		if (mode !== 'create' || !workDate || !workDateTo || workDateTo < workDate) return 1;
		return Math.round((Date.parse(workDateTo) - Date.parse(workDate)) / 86_400_000) + 1;
	});

	// กรอกอัตโนมัติเมื่อเลือกพนักงานประจำ/จุดงานที่เคยมีประวัติ
	function applyPost() {
		const p = sitePosts.find((x) => x.name === absentName.trim());
		if (!p) return;
		const filled: string[] = [];
		if (p.position && !position) ((position = p.position), filled.push('ตำแหน่ง'));
		if (p.code && !siteCode) ((siteCode = p.code), filled.push('Code site'));
		if (p.start && !startTime) ((startTime = p.start), filled.push('เวลาเข้า'));
		if (p.end && !endTime) ((endTime = p.end), filled.push('เวลาออก'));
		if (filled.length) autofilled = filled;
	}
	// กรอกอัตโนมัติเมื่อเลือกพนักงานทดแทน
	function applyEmployee() {
		const e = options.employees.find((x) => String(x.id) === substituteId);
		if (!e) return;
		const filled: string[] = [];
		if (e.staffType) ((staffType = e.staffType), filled.push('สถานะ พนง.'));
		if (e.defaultWage && !wage) ((wage = String(e.defaultWage)), filled.push('ค่าแรง'));
		if (filled.length) autofilled = filled;
	}
	function setShift(s: string) {
		[startTime, endTime] = s.split('-');
	}
	$effect(() => {
		if (mode === 'create' && workDateTo < workDate) workDateTo = workDate;
	});
</script>

<form
	method="POST"
	{action}
	class="space-y-5"
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			submitting = false;
			await update({ reset: false });
		};
	}}
>
	{#if errors.length}
		<ul class="list-inside list-disc rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
			{#each errors as e, i (i)}<li>{e}</li>{/each}
		</ul>
	{/if}
	{#if autofilled.length}
		<p class="flex items-center gap-1.5 rounded-md bg-sky-50 px-3 py-1.5 text-xs text-sky-800">
			<Sparkles class="size-3.5" /> กรอกให้อัตโนมัติ: {autofilled.join(', ')} (แก้ไขได้)
		</p>
	{/if}

	<!-- ส่วนที่ 1: ใคร ลาที่ไหน -->
	<fieldset class="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
		<legend class="px-1 text-sm font-semibold">1. พนักงานที่ลา / จุดงาน</legend>
		<div class="space-y-1.5">
			<Label for="siteId">หน่วยงาน (โปรเจกต์) *</Label>
			<Select id="siteId" name="siteId" bind:value={siteId} required={!newSiteName}>
				<option value="">— เลือกหน่วยงาน —</option>
				{#each options.sites as s (s.id)}<option value={String(s.id)}>{s.name}</option>{/each}
			</Select>
			{#if mode === 'create'}
				<Input name="newSiteName" bind:value={newSiteName} placeholder="หรือพิมพ์ชื่อหน่วยงานใหม่" class="text-xs" />
			{/if}
		</div>
		<div class="space-y-1.5">
			<Label for="absentName">ชื่อพนักงานที่ลา / จุดงาน *</Label>
			<Input
				id="absentName"
				name="absentName"
				bind:value={absentName}
				list="post-options"
				placeholder={siteId ? 'พิมพ์ชื่อ — เลือกจากรายการเพื่อกรอกอัตโนมัติ' : 'เลือกหน่วยงานก่อน'}
				onchange={applyPost}
				oninput={applyPost}
				required
			/>
			<datalist id="post-options">
				{#each sitePosts as p (p.id)}<option value={p.name}>{p.position ?? ''} {p.code ?? ''}</option>{/each}
			</datalist>
			<p class="text-xs text-muted-foreground">{sitePosts.length ? `มีประวัติ ${sitePosts.length} คน/จุดงานในหน่วยงานนี้` : 'ชื่อใหม่จะถูกจำไว้สำหรับครั้งถัดไป'}</p>
		</div>
		<div class="space-y-1.5">
			<Label for="position">ตำแหน่ง</Label>
			<Input id="position" name="position" bind:value={position} list="position-options" placeholder="เช่น ประชาสัมพันธ์, ธุรการ, ช่าง" />
			<datalist id="position-options">
				{#each ['ประชาสัมพันธ์', 'ธุรการ', 'ช่าง', 'Redem', 'Recep', 'Infor', 'Call Center', 'IT', 'Admin', 'Messenger'] as p (p)}<option value={p}></option>{/each}
			</datalist>
		</div>
		<div class="space-y-1.5">
			<Label for="siteCode">Code site</Label>
			<Input id="siteCode" name="siteCode" bind:value={siteCode} placeholder="เช่น 69LBAL0050" />
		</div>
		<div class="space-y-1.5">
			<Label for="reason">สาเหตุการลา *</Label>
			<Select id="reason" name="reason" bind:value={reason} required>
				{#each REASONS as r (r)}<option value={r}>{r}</option>{/each}
			</Select>
		</div>
		<div class="space-y-1.5">
			<Label for="notifiedDate">วันที่แจ้งลา</Label>
			<Input id="notifiedDate" name="notifiedDate" type="date" bind:value={notifiedDate} />
		</div>
		<div class="space-y-1.5">
			<Label for="workDate">{mode === 'create' ? 'วันที่ต้องการคนแทน ตั้งแต่ *' : 'วันที่ต้องการคนแทน *'}</Label>
			<Input id="workDate" name="workDate" type="date" bind:value={workDate} required />
		</div>
		{#if mode === 'create'}
			<div class="space-y-1.5">
				<Label for="workDateTo">ถึงวันที่ (ลาหลายวัน = สร้างทีเดียว)</Label>
				<Input id="workDateTo" name="workDateTo" type="date" bind:value={workDateTo} min={workDate} />
				<p class="text-xs text-muted-foreground">จะสร้าง {dayCount} รายการ (วันละ 1 งาน)</p>
			</div>
		{/if}
	</fieldset>

	<!-- ส่วนที่ 2: ใครมาแทน -->
	<fieldset class="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
		<legend class="px-1 text-sm font-semibold">2. การจัดคนแทน</legend>
		<div class="space-y-1.5 md:col-span-2">
			<Label>ประเภทการแทน *</Label>
			<div class="flex flex-wrap gap-2">
				{#each Object.entries(COVERAGE_LABELS) as [k, v] (k)}
					<label class="flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
						<input type="radio" name="coverageType" value={k} bind:group={coverageType} class="size-3.5" /> {v}
					</label>
				{/each}
			</div>
		</div>
		{#if coverageType === 'spare'}
			<div class="space-y-1.5">
				<Label for="substituteId">พนักงานทดแทน *</Label>
				<Select id="substituteId" name="substituteId" bind:value={substituteId} onchange={applyEmployee} required>
					<option value="">— เลือกพนักงาน —</option>
					{#each options.employees as e (e.id)}
						<option value={String(e.id)}>{e.fullName}{e.nickname ? ` (${e.nickname})` : ''}{e.staffType ? ` · ${e.staffType}` : ''}</option>
					{/each}
				</Select>
			</div>
			<div class="space-y-1.5">
				<Label for="staffType">สถานะ พนง.</Label>
				<Select id="staffType" name="staffType" bind:value={staffType}>
					<option value="">-</option>
					{#each STAFF_TYPES as t (t)}<option value={t}>{t}</option>{/each}
				</Select>
			</div>
			<div class="space-y-1.5">
				<Label for="wage">ค่าแรงแทนงาน (บาท)</Label>
				<Input id="wage" name="wage" type="number" min="0" step="1" bind:value={wage} placeholder="เช่น 700" />
			</div>
			<div class="space-y-1.5">
				<Label for="payStatus">สถานะการเบิก</Label>
				<Select id="payStatus" name="payStatus" bind:value={payStatus}>
					{#each Object.entries(PAY_LABELS) as [k, v] (k)}<option value={k}>{v}</option>{/each}
				</Select>
			</div>
		{/if}
		<div class="space-y-1.5">
			<Label for="startTime">เวลาเข้างาน</Label>
			<Input id="startTime" name="startTime" type="time" bind:value={startTime} />
		</div>
		<div class="space-y-1.5">
			<Label for="endTime">เวลาออกงาน</Label>
			<Input id="endTime" name="endTime" type="time" bind:value={endTime} />
		</div>
		<div class="flex flex-wrap gap-1 md:col-span-2">
			<span class="mr-1 self-center text-xs text-muted-foreground">กะที่ใช้บ่อย:</span>
			{#each COMMON_SHIFTS as s (s)}
				<Button type="button" size="xs" variant={`${startTime}-${endTime}` === s ? 'default' : 'outline'} onclick={() => setShift(s)}>{s}</Button>
			{/each}
		</div>
	</fieldset>

	<!-- ส่วนที่ 3: สถานะ -->
	<fieldset class="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
		<legend class="px-1 text-sm font-semibold">3. สถานะและหมายเหตุ</legend>
		<div class="space-y-1.5">
			<Label for="status">สถานะงาน</Label>
			<Select id="status" name="status" bind:value={status}>
				{#each Object.entries(STATUS_LABELS) as [k, v] (k)}<option value={k}>{v}</option>{/each}
			</Select>
		</div>
		<div class="space-y-1.5 md:col-span-2">
			<Label for="note">หมายเหตุ</Label>
			<Textarea id="note" name="note" bind:value={note} placeholder="เช่น ลาครึ่งวันบ่าย, ค่าแรง + ค่าห้องพัก" />
		</div>
	</fieldset>

	<div class="flex items-center gap-2">
		<Button type="submit" disabled={submitting}>{submitting ? 'กำลังบันทึก...' : submitLabel}{mode === 'create' && dayCount > 1 ? ` (${dayCount} รายการ)` : ''}</Button>
		<Button type="button" variant="ghost" onclick={() => history.back()}>ยกเลิก</Button>
	</div>
</form>
