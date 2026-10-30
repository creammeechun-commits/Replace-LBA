<script lang="ts">
	import type { PageProps } from './$types';
	import * as Card from '#lib/components/ui/card';
	import { Button } from '#lib/components/ui/button';
	import { Input } from '#lib/components/ui/input';
	import { Select } from '#lib/components/ui/select';
	import { Badge, type BadgeVariant } from '#lib/components/ui/badge';
	import Pagination from '#lib/components/pagination.svelte';
	import { fmtDateTime } from '#lib/shared/format';

	let { data }: PageProps = $props();
	const ENTITY: Record<string, string> = { task: 'งานแทน', user: 'พนักงาน', site: 'หน่วยงาน', site_post: 'จุดงาน', auth: 'เข้า/ออกระบบ', system: 'ระบบ' };
	const ACTION: Record<string, string> = { create: 'สร้าง', update: 'แก้ไข', delete: 'ลบ', status: 'เปลี่ยนสถานะ', login: 'เข้าสู่ระบบ', logout: 'ออกจากระบบ', import: 'นำเข้า', password: 'รีเซ็ตรหัสผ่าน' };
	const TONE: Record<string, BadgeVariant> = { create: 'success', update: 'info', delete: 'destructive', status: 'warning', login: 'muted', logout: 'muted', import: 'secondary', password: 'warning' };
	function link(r: { entity: string; entityId: number | null }) {
		if (!r.entityId) return null;
		if (r.entity === 'task') return `/tasks/${r.entityId}`;
		if (r.entity === 'user') return `/employees/${r.entityId}`;
		if (r.entity === 'site') return `/projects/${r.entityId}`;
		return null;
	}
</script>

<div class="space-y-4">
	<div>
		<h1 class="text-2xl font-semibold">ประวัติการแก้ไข (Activity Log)</h1>
		<p class="text-sm text-muted-foreground">{data.mine ? 'การกระทำของคุณในระบบ' : 'ใครแก้อะไร เมื่อไหร่'} · {data.total.toLocaleString()} รายการ</p>
	</div>

	<Card.Root class="py-3"><Card.Content>
		<form method="GET" class="flex flex-wrap items-center gap-2">
			{#if data.mine}<input type="hidden" name="mine" value="1" />{/if}
			<Input name="q" value={data.filters.q} placeholder="ค้นหาข้อความ" class="w-56" />
			<Select name="entity" value={data.filters.entity} class="w-auto"><option value="">ทุกประเภท</option>{#each Object.entries(ENTITY) as [k, v] (k)}<option value={k}>{v}</option>{/each}</Select>
			<Select name="action" value={data.filters.action} class="w-auto"><option value="">ทุกการกระทำ</option>{#each Object.entries(ACTION) as [k, v] (k)}<option value={k}>{v}</option>{/each}</Select>
			{#if !data.mine}
				<Select name="userId" value={String(data.filters.userId || '')} class="w-auto"><option value="">ทุกคน</option>{#each data.userOptions as u (u.id)}<option value={String(u.id)}>{u.fullName}{u.nickname ? ` (${u.nickname})` : ''}</option>{/each}</Select>
			{/if}
			<Input type="date" name="from" value={data.filters.from} class="w-auto" />
			<Input type="date" name="to" value={data.filters.to} class="w-auto" />
			<Button type="submit" size="sm">กรอง</Button>
		</form>
	</Card.Content></Card.Root>

	<Card.Root class="py-0">
		<ul class="divide-y">
			{#each data.rows as r (r.id)}
				<li class="flex flex-wrap items-start gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
					<span class="w-36 shrink-0 text-xs text-muted-foreground tabular-nums">{fmtDateTime(r.createdAt)}</span>
					<span class="w-28 shrink-0 truncate font-medium">{r.userNickname ?? r.userName ?? 'ระบบ'}</span>
					<Badge variant={TONE[r.action] ?? 'secondary'}>{ACTION[r.action] ?? r.action}</Badge>
					<Badge variant="outline">{ENTITY[r.entity] ?? r.entity}</Badge>
					<span class="min-w-0 flex-1">
						{#if link(r)}<a class="hover:underline" href={link(r)}>{r.summary}</a>{:else}{r.summary}{/if}
					</span>
				</li>
			{:else}
				<li class="px-4 py-8 text-center text-sm text-muted-foreground">ไม่มีรายการ</li>
			{/each}
		</ul>
	</Card.Root>
	<Pagination current={data.page} total={data.total} perPage={data.perPage} />
</div>
