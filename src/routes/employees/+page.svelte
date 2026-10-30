<script lang="ts">
	import type { PageProps } from './$types';
	import { enhance } from '$app/forms';
	import * as Card from '#lib/components/ui/card';
	import { Button } from '#lib/components/ui/button';
	import { Input } from '#lib/components/ui/input';
	import { Label } from '#lib/components/ui/label';
	import { Select } from '#lib/components/ui/select';
	import { Badge } from '#lib/components/ui/badge';
	import { Table, TablePart as T } from '#lib/components/ui/table';
	import { fmtDate, fmtBaht } from '#lib/shared/format';
	import { ROLE_LABELS, STAFF_TYPES } from '#lib/shared/labels';
	import { Plus, Search } from '@lucide/svelte';

	let { data, form }: PageProps = $props();
	let showCreate = $state(false);
	$effect(() => {
		if (form?.ok) showCreate = false;
		if (form?.error) showCreate = true;
	});
</script>

<div class="space-y-4">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold">พนักงาน</h1>
			<p class="text-sm text-muted-foreground">{data.rows.length} บัญชี · สถิติประจำเดือน {fmtDate(data.from)} - {fmtDate(data.to)}</p>
		</div>
		<Button onclick={() => (showCreate = !showCreate)}><Plus class="size-4" /> เพิ่มพนักงาน</Button>
	</div>

	{#if form?.ok}<p class="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">เพิ่มพนักงานเรียบร้อย</p>{/if}

	{#if showCreate}
		<Card.Root>
			<Card.Header><Card.Title>เพิ่มพนักงานใหม่</Card.Title></Card.Header>
			<Card.Content>
				<form method="POST" action="?/create" use:enhance class="grid gap-3 md:grid-cols-4">
					<div class="space-y-1"><Label for="username">ชื่อผู้ใช้ (login) *</Label><Input id="username" name="username" value={form?.values?.username ?? ''} placeholder="เช่น emp285" required /></div>
					<div class="space-y-1"><Label for="password">รหัสผ่าน *</Label><Input id="password" name="password" type="text" placeholder="อย่างน้อย 4 ตัว" required /></div>
					<div class="space-y-1"><Label for="fullName">ชื่อ-นามสกุล *</Label><Input id="fullName" name="fullName" value={form?.values?.fullName ?? ''} required /></div>
					<div class="space-y-1"><Label for="nickname">ชื่อเล่น</Label><Input id="nickname" name="nickname" value={form?.values?.nickname ?? ''} /></div>
					<div class="space-y-1"><Label for="role">สิทธิ์</Label>
						<Select id="role" name="role" value={form?.values?.role ?? 'employee'}>
							{#each Object.entries(ROLE_LABELS) as [k, v] (k)}<option value={k}>{v}</option>{/each}
						</Select></div>
					<div class="space-y-1"><Label for="staffType">สถานะ พนง.</Label>
						<Select id="staffType" name="staffType" value={form?.values?.staffType ?? ''}>
							<option value="">-</option>{#each STAFF_TYPES as t (t)}<option value={t}>{t}</option>{/each}
						</Select></div>
					<div class="space-y-1"><Label for="defaultWage">ค่าแรงมาตรฐาน (บาท/วัน)</Label><Input id="defaultWage" name="defaultWage" type="number" min="0" value={form?.values?.defaultWage ?? ''} /></div>
					<div class="space-y-1"><Label for="phone">เบอร์โทร</Label><Input id="phone" name="phone" value={form?.values?.phone ?? ''} /></div>
					{#if form?.error}<p class="text-sm text-destructive md:col-span-4">{form.error}</p>{/if}
					<div class="flex gap-2 md:col-span-4"><Button type="submit">บันทึก</Button><Button type="button" variant="ghost" onclick={() => (showCreate = false)}>ยกเลิก</Button></div>
				</form>
			</Card.Content>
		</Card.Root>
	{/if}

	<Card.Root class="py-3"><Card.Content>
		<form method="GET" class="flex flex-wrap items-center gap-2">
			<div class="relative min-w-56"><Search class="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" /><Input name="q" value={data.q} placeholder="ค้นหาชื่อ / ชื่อเล่น / username" class="pl-8" /></div>
			<Select name="role" value={data.role} class="w-auto"><option value="">ทุกสิทธิ์</option>{#each Object.entries(ROLE_LABELS) as [k, v] (k)}<option value={k}>{v}</option>{/each}</Select>
			<label class="flex items-center gap-2 text-sm"><input type="checkbox" name="all" value="1" checked={data.showInactive} class="rounded" /> รวมที่ปิดใช้งาน</label>
			<Button type="submit" size="sm">ค้นหา</Button>
		</form>
	</Card.Content></Card.Root>

	<Card.Root class="py-0">
		<Table>
			<T as="thead"><T as="tr"><T as="th">ชื่อ</T><T as="th">Username</T><T as="th">สิทธิ์</T><T as="th">สถานะ</T><T as="th" class="text-right">ค่าแรงมาตรฐาน</T><T as="th" class="text-right">แทนงานเดือนนี้</T><T as="th" class="text-right">ค่าแรงเดือนนี้</T><T as="th" class="text-right">รอเบิก</T><T as="th" class="text-right">ทั้งหมด</T><T as="th">ล่าสุด</T></T></T>
			<T as="tbody">
				{#each data.rows as u (u.id)}
					<T as="tr" class={u.active ? '' : 'opacity-50'}>
						<T as="td"><a class="font-medium hover:underline" href="/employees/{u.id}">{u.fullName}</a>{#if u.nickname}<span class="text-muted-foreground"> ({u.nickname})</span>{/if}{#if !u.active}<Badge variant="muted" class="ml-2">ปิดใช้งาน</Badge>{/if}</T>
						<T as="td"><code class="text-xs">{u.username}</code></T>
						<T as="td"><Badge variant={u.role === 'admin' ? 'default' : u.role === 'manager' ? 'info' : 'secondary'}>{ROLE_LABELS[u.role]}</Badge></T>
						<T as="td" class="text-muted-foreground">{u.staffType ?? '-'}</T>
						<T as="td" class="text-right tabular-nums">{fmtBaht(u.defaultWage)}</T>
						<T as="td" class="text-right tabular-nums">{u.month}</T>
						<T as="td" class="text-right tabular-nums">{fmtBaht(u.monthWage)}</T>
						<T as="td" class="text-right tabular-nums {u.pendingWage ? 'text-amber-700' : 'text-muted-foreground'}">{fmtBaht(u.pendingWage)}</T>
						<T as="td" class="text-right tabular-nums text-muted-foreground">{u.total}</T>
						<T as="td" class="text-muted-foreground">{fmtDate(u.lastDate)}</T>
					</T>
				{/each}
			</T>
		</Table>
	</Card.Root>
</div>
