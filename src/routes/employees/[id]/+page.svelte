<script lang="ts">
	import type { PageProps } from './$types';
	import { enhance } from '$app/forms';
	import * as Card from '#lib/components/ui/card';
	import { Button } from '#lib/components/ui/button';
	import { Input } from '#lib/components/ui/input';
	import { Label } from '#lib/components/ui/label';
	import { Select } from '#lib/components/ui/select';
	import { Table, TablePart as T } from '#lib/components/ui/table';
	import StatusBadge from '#lib/components/status-badge.svelte';
	import { fmtDate, fmtBaht, fmtShift } from '#lib/shared/format';
	import { ROLE_LABELS, STAFF_TYPES } from '#lib/shared/labels';
	import { ArrowLeft, Trash2 } from '@lucide/svelte';

	let { data, form }: PageProps = $props();
	const u = $derived(data.user);
</script>

<div class="space-y-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="flex items-center gap-3">
			<Button href="/employees" variant="ghost" size="icon-sm" aria-label="กลับ"><ArrowLeft class="size-4" /></Button>
			<div>
				<h1 class="text-2xl font-semibold">{u.fullName} {#if u.nickname}<span class="text-muted-foreground">({u.nickname})</span>{/if}</h1>
				<p class="text-sm text-muted-foreground"><code>{u.username}</code> · {ROLE_LABELS[u.role]} · {u.staffType ?? '-'} · แทนงานทั้งหมด {data.total} ครั้ง</p>
			</div>
		</div>
		<form method="POST" action="?/delete" use:enhance onsubmit={(e) => { if (!confirm(`ลบบัญชี ${u.fullName}? ประวัติงานแทนจะยังอยู่แต่ไม่ผูกกับบัญชีนี้`)) e.preventDefault(); }}>
			<Button type="submit" variant="destructive" size="sm"><Trash2 class="size-4" /> ลบบัญชี</Button>
		</form>
	</div>

	{#if form?.ok}<p class="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{form.passwordReset ? 'รีเซ็ตรหัสผ่านแล้ว (session เดิมถูกยกเลิก)' : 'บันทึกเรียบร้อย'}</p>{/if}
	{#if form?.error}<p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{form.error}</p>{/if}

	<div class="grid gap-4 lg:grid-cols-3">
		<Card.Root class="lg:col-span-2">
			<Card.Header><Card.Title>ข้อมูลพนักงาน</Card.Title></Card.Header>
			<Card.Content>
				<form method="POST" action="?/update" use:enhance class="grid gap-3 md:grid-cols-2">
					<div class="space-y-1"><Label for="fullName">ชื่อ-นามสกุล *</Label><Input id="fullName" name="fullName" value={u.fullName} required /></div>
					<div class="space-y-1"><Label for="nickname">ชื่อเล่น</Label><Input id="nickname" name="nickname" value={u.nickname ?? ''} /></div>
					<div class="space-y-1"><Label for="role">สิทธิ์</Label><Select id="role" name="role" value={u.role}>{#each Object.entries(ROLE_LABELS) as [k, v] (k)}<option value={k}>{v}</option>{/each}</Select></div>
					<div class="space-y-1"><Label for="staffType">สถานะ พนง.</Label><Select id="staffType" name="staffType" value={u.staffType ?? ''}><option value="">-</option>{#each STAFF_TYPES as t (t)}<option value={t}>{t}</option>{/each}</Select></div>
					<div class="space-y-1"><Label for="defaultWage">ค่าแรงมาตรฐาน (บาท/วัน)</Label><Input id="defaultWage" name="defaultWage" type="number" min="0" value={u.defaultWage ?? ''} /></div>
					<div class="space-y-1"><Label for="phone">เบอร์โทร</Label><Input id="phone" name="phone" value={u.phone ?? ''} /></div>
					<label class="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" name="active" checked={u.active} class="rounded" /> เปิดใช้งานบัญชี (ปิด = login ไม่ได้ แต่ประวัติยังอยู่)</label>
					<div class="md:col-span-2"><Button type="submit">บันทึก</Button></div>
				</form>
			</Card.Content>
		</Card.Root>

		<div class="space-y-4">
			<Card.Root>
				<Card.Header><Card.Title>รีเซ็ตรหัสผ่าน</Card.Title></Card.Header>
				<Card.Content>
					<form method="POST" action="?/password" use:enhance class="flex gap-2">
						<Input name="password" type="text" placeholder="รหัสผ่านใหม่" required />
						<Button type="submit" variant="secondary">ตั้งใหม่</Button>
					</form>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header><Card.Title>สถิติรายเดือน</Card.Title></Card.Header>
				<Card.Content>
					<Table>
						<T as="thead"><T as="tr"><T as="th">เดือน</T><T as="th" class="text-right">ครั้ง</T><T as="th" class="text-right">ค่าแรง</T><T as="th" class="text-right">รอเบิก</T></T></T>
						<T as="tbody">
							{#each data.stats as s (s.month)}
								<T as="tr"><T as="td">{s.month}</T><T as="td" class="text-right tabular-nums">{s.n}</T><T as="td" class="text-right tabular-nums">{fmtBaht(s.wage)}</T><T as="td" class="text-right tabular-nums">{fmtBaht(s.pending)}</T></T>
							{:else}
								<T as="tr"><T as="td" colspan={4} class="text-muted-foreground">ยังไม่มีงานแทน</T></T>
							{/each}
						</T>
					</Table>
				</Card.Content>
			</Card.Root>
		</div>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>ประวัติงานแทน (ล่าสุด {data.history.length} จาก {data.total})</Card.Title>
			<Button size="xs" variant="outline" href="/tasks?substituteId={u.id}">ดูทั้งหมด</Button>
		</Card.Header>
		<Card.Content>
			<Table>
				<T as="thead"><T as="tr"><T as="th">วันที่</T><T as="th">หน่วยงาน</T><T as="th">แทนใคร</T><T as="th">สาเหตุ</T><T as="th">เวลา</T><T as="th" class="text-right">ค่าแรง</T><T as="th">เบิก</T><T as="th">สถานะ</T></T></T>
				<T as="tbody">
					{#each data.history as r (r.id)}
						<T as="tr">
							<T as="td"><a class="hover:underline" href="/tasks/{r.id}">{fmtDate(r.workDate)}</a></T>
							<T as="td">{r.siteName}</T>
							<T as="td">{r.absentName} <span class="text-xs text-muted-foreground">{r.position ?? ''}</span></T>
							<T as="td">{r.reason}</T>
							<T as="td">{fmtShift(r.startTime, r.endTime)}</T>
							<T as="td" class="text-right tabular-nums">{fmtBaht(r.wage)}</T>
							<T as="td"><StatusBadge kind="pay" value={r.payStatus} /></T>
							<T as="td"><StatusBadge kind="status" value={r.status} /></T>
						</T>
					{:else}
						<T as="tr"><T as="td" colspan={8} class="py-6 text-center text-muted-foreground">ยังไม่มีงานแทน</T></T>
					{/each}
				</T>
			</Table>
		</Card.Content>
	</Card.Root>
</div>
