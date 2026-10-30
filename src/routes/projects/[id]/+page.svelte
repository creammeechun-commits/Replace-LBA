<script lang="ts">
	import type { PageProps } from './$types';
	import { enhance } from '$app/forms';
	import * as Card from '#lib/components/ui/card';
	import { Button } from '#lib/components/ui/button';
	import { Input } from '#lib/components/ui/input';
	import { Table, TablePart as T } from '#lib/components/ui/table';
	import StatusBadge from '#lib/components/status-badge.svelte';
	import DateRange from '#lib/components/date-range.svelte';
	import { fmtDate, fmtBaht, fmtShift } from '#lib/shared/format';
	import { ArrowLeft, Plus, Pencil } from '@lucide/svelte';

	let { data, form }: PageProps = $props();
	const isAdmin = $derived(data.user?.role === 'admin');
	let editSite = $state(false);
	let addPost = $state(false);
	let editPostId = $state<number | null>(null);
	let showInactivePosts = $state(false);
	const visiblePosts = $derived(data.posts.filter((p) => showInactivePosts || p.active));
	$effect(() => {
		if (form?.ok) {
			editSite = false;
			addPost = false;
			editPostId = null;
		}
	});
</script>

<div class="space-y-4">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div class="flex items-center gap-3">
			<Button href="/projects" variant="ghost" size="icon-sm" aria-label="กลับ"><ArrowLeft class="size-4" /></Button>
			<div>
				<h1 class="text-2xl font-semibold">{data.site.name} {#if !data.site.active}<span class="text-base font-normal text-muted-foreground">(ปิดใช้งาน)</span>{/if}</h1>
				<p class="text-sm text-muted-foreground">
					{data.site.note ?? 'โปรเจกต์ / หน่วยงานลูกค้า'} · Code site: {data.codes.map((c) => c.code).slice(0, 6).join(', ') || '-'}{data.codes.length > 6 ? ' …' : ''}
				</p>
			</div>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<DateRange from={data.from} to={data.to} />
			{#if isAdmin}
				<Button size="sm" href="/tasks/new?siteId={data.site.id}"><Plus class="size-4" /> งานแทนใหม่</Button>
				<Button size="sm" variant="outline" onclick={() => (editSite = !editSite)}><Pencil class="size-4" /> แก้ไขหน่วยงาน</Button>
			{/if}
		</div>
	</div>

	{#if form?.error}<p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{form.error}</p>{/if}

	{#if editSite && isAdmin}
		<Card.Root class="py-3"><Card.Content>
			<form method="POST" action="?/updateSite" use:enhance class="flex flex-wrap items-end gap-2">
				<div class="min-w-48 flex-1 space-y-1"><label for="sname" class="text-sm font-medium">ชื่อหน่วยงาน</label><Input id="sname" name="name" value={data.site.name} required /></div>
				<div class="min-w-48 flex-1 space-y-1"><label for="snote" class="text-sm font-medium">หมายเหตุ</label><Input id="snote" name="note" value={data.site.note ?? ''} /></div>
				<label class="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="active" checked={data.site.active} class="rounded" /> เปิดใช้งาน</label>
				<Button type="submit">บันทึก</Button>
			</form>
		</Card.Content></Card.Root>
	{/if}

	<!-- สรุป -->
	<div class="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
		{#snippet tile(label: string, value: string | number, tone = '')}
			<Card.Root class="gap-1 py-3"><Card.Content><div class="text-xs text-muted-foreground">{label}</div><div class="text-xl font-semibold tabular-nums {tone}">{value}</div></Card.Content></Card.Root>
		{/snippet}
		{@render tile('งานแทนในช่วง', data.summary.total)}
		{@render tile('ส่งคนแทน', data.summary.spare)}
		{@render tile('หมุนในไซต์', data.summary.rotate)}
		{@render tile('ไม่เอาคนแทน', data.summary.none_needed)}
		{@render tile('ส่งไม่ได้/ยังไม่ระบุ', data.summary.unable + data.summary.pending, data.summary.unable + data.summary.pending ? 'text-destructive' : '')}
		{@render tile('งานค้าง', data.summary.overdue, data.summary.overdue ? 'text-amber-700' : '')}
		{@render tile('ค่าแรงรวม', fmtBaht(data.summary.wage))}
	</div>

	<div class="grid gap-4 xl:grid-cols-3">
		<!-- พนักงานประจำ / จุดงาน -->
		<Card.Root class="xl:col-span-1">
			<Card.Header>
				<div><Card.Title>พนักงานประจำ / จุดงาน ({visiblePosts.length})</Card.Title><Card.Description>ใช้กรอกอัตโนมัติเวลาบันทึกงานแทน</Card.Description></div>
				{#if isAdmin}<Button size="xs" variant="outline" onclick={() => (addPost = !addPost)}><Plus class="size-3.5" /> เพิ่ม</Button>{/if}
			</Card.Header>
			<Card.Content class="space-y-2">
				{#if addPost && isAdmin}
					<form method="POST" action="?/addPost" use:enhance class="grid grid-cols-2 gap-1.5 rounded-md border p-2 text-xs">
						<Input name="name" placeholder="ชื่อพนักงาน / จุดงาน *" class="col-span-2 h-8" required />
						<Input name="position" placeholder="ตำแหน่ง" class="h-8" />
						<Input name="code" placeholder="Code site" class="h-8" />
						<Input name="start" type="time" class="h-8" />
						<Input name="end" type="time" class="h-8" />
						<Button type="submit" size="sm" class="col-span-2">บันทึก</Button>
						{#if form?.postError}<p class="col-span-2 text-destructive">{form.postError}</p>{/if}
					</form>
				{/if}
				<ul class="max-h-[60vh] divide-y overflow-y-auto text-sm">
					{#each visiblePosts as p (p.id)}
						<li class="py-2 {p.active ? '' : 'opacity-50'}">
							{#if editPostId === p.id}
								<form method="POST" action="?/updatePost" use:enhance class="grid grid-cols-2 gap-1.5 text-xs">
									<input type="hidden" name="postId" value={p.id} />
									<Input name="name" value={p.name} class="col-span-2 h-8" required />
									<Input name="position" value={p.position ?? ''} placeholder="ตำแหน่ง" class="h-8" />
									<Input name="code" value={p.code ?? ''} placeholder="Code site" class="h-8" />
									<Input name="start" type="time" value={p.start ?? ''} class="h-8" />
									<Input name="end" type="time" value={p.end ?? ''} class="h-8" />
									<label class="col-span-2 flex items-center gap-1"><input type="checkbox" name="active" value="on" checked={p.active} class="rounded" /> เปิดใช้งาน <input type="hidden" name="active" value="off" /></label>
									<Button type="submit" size="sm">บันทึก</Button>
									<Button type="button" size="sm" variant="ghost" onclick={() => (editPostId = null)}>ยกเลิก</Button>
								</form>
							{:else}
								<div class="flex items-start justify-between gap-2">
									<div class="min-w-0">
										<a class="font-medium hover:underline" href="/tasks?q={encodeURIComponent(p.name)}&siteId={data.site.id}">{p.name}</a>
										<div class="text-xs text-muted-foreground">{[p.position, p.code, p.start && p.end ? `${p.start}-${p.end}` : null].filter(Boolean).join(' · ') || '-'}</div>
										<div class="text-xs text-muted-foreground">แทนงาน {p.count} ครั้ง · ล่าสุด {fmtDate(p.lastDate)}</div>
									</div>
									{#if isAdmin}<Button size="icon-sm" variant="ghost" aria-label="แก้ไข" onclick={() => (editPostId = p.id)}><Pencil class="size-3.5" /></Button>{/if}
								</div>
							{/if}
						</li>
					{:else}
						<li class="py-4 text-center text-xs text-muted-foreground">ยังไม่มีข้อมูล</li>
					{/each}
				</ul>
				{#if data.posts.some((p) => !p.active)}
					<button class="text-xs text-muted-foreground underline" onclick={() => (showInactivePosts = !showInactivePosts)}>{showInactivePosts ? 'ซ่อน' : 'แสดง'}รายการที่ปิดใช้งาน</button>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- งานแทนในช่วง -->
		<Card.Root class="xl:col-span-2">
			<Card.Header>
				<div><Card.Title>งานแทน {fmtDate(data.from)} - {fmtDate(data.to)} ({data.rows.length})</Card.Title>
					<Card.Description>สาเหตุ: {data.byReason.map(([r, n]) => `${r} ${n}`).join(' · ') || '-'}</Card.Description></div>
				<Button size="xs" variant="outline" href="/tasks?siteId={data.site.id}&from={data.from}&to={data.to}">ดูในรายการงาน</Button>
			</Card.Header>
			<Card.Content>
				<Table>
					<T as="thead"><T as="tr"><T as="th">วันที่</T><T as="th">พนักงานที่ลา</T><T as="th">สาเหตุ</T><T as="th">คนแทน</T><T as="th">เวลา</T><T as="th" class="text-right">ค่าแรง</T><T as="th">สถานะ</T></T></T>
					<T as="tbody">
						{#each data.rows as r (r.id)}
							<T as="tr" class={r.workDate < data.today && r.status !== 'done' ? 'bg-destructive/5' : ''}>
								<T as="td"><a class="hover:underline" href="/tasks/{r.id}">{fmtDate(r.workDate)}</a></T>
								<T as="td">{r.absentName}<div class="text-xs text-muted-foreground">{r.position ?? ''}</div></T>
								<T as="td">{r.reason}</T>
								<T as="td">{#if r.coverageType === 'spare'}{r.substituteName}{r.substituteNickname ? ` (${r.substituteNickname})` : ''}{:else}<StatusBadge kind="coverage" value={r.coverageType} />{/if}</T>
								<T as="td">{fmtShift(r.startTime, r.endTime)}</T>
								<T as="td" class="text-right tabular-nums">{fmtBaht(r.wage)}</T>
								<T as="td"><StatusBadge kind="status" value={r.status} /></T>
							</T>
						{:else}
							<T as="tr"><T as="td" colspan={7} class="py-6 text-center text-muted-foreground">ไม่มีงานแทนในช่วงนี้</T></T>
						{/each}
					</T>
				</Table>
			</Card.Content>
		</Card.Root>
	</div>
</div>
