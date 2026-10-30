<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';
	import { page } from '$app/state';
	import { ROLE_LABELS } from '#lib/shared/labels';
	import {
		LayoutDashboard,
		ClipboardList,
		KanbanSquare,
		Building2,
		Users,
		History,
		LogOut,
		Menu,
		Plus
	} from '@lucide/svelte';

	let { data, children }: LayoutProps = $props();
	let open = $state(false);

	const nav = $derived.by(() => {
		const u = data.user;
		if (!u) return [];
		const items = [
			{ href: '/', label: 'Dashboard', icon: LayoutDashboard },
			{ href: '/tasks', label: u.role === 'employee' ? 'งานของฉัน' : 'งานแทนทั้งหมด', icon: ClipboardList },
			{ href: '/board', label: 'Kanban Board', icon: KanbanSquare },
			{ href: '/projects', label: 'โปรเจกต์ / หน่วยงาน', icon: Building2 }
		];
		if (u.role === 'admin') items.push({ href: '/employees', label: 'พนักงาน', icon: Users });
		items.push({
			href: u.role === 'employee' ? '/activity?mine=1' : '/activity',
			label: 'ประวัติการแก้ไข',
			icon: History
		});
		return items;
	});

	function isActive(href: string) {
		const p = page.url.pathname;
		const base = href.split('?')[0];
		return base === '/' ? p === '/' : p === base || p.startsWith(base + '/');
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>LBA Replace - จัดการงานแทน</title>
</svelte:head>

{#if !data.user}
	{@render children()}
{:else}
	<div class="flex min-h-screen">
		<!-- Sidebar -->
		<aside
			class="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/60 bg-gradient-to-b from-pastel-lavender via-white/70 to-pastel-mint text-sidebar-foreground backdrop-blur-md transition-transform md:static md:translate-x-0 {open
				? 'translate-x-0'
				: '-translate-x-full'}"
		>
			<div class="flex h-16 items-center gap-2.5 px-4">
				<span
					class="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-chart-2 font-bold text-white shadow-md shadow-primary/30"
					>L</span
				>
				<div class="leading-tight">
					<div class="text-sm font-semibold">LBA Replace</div>
					<div class="text-xs text-muted-foreground">ระบบจัดการงานแทน</div>
				</div>
			</div>
			<nav class="flex-1 space-y-1 p-3">
				{#each nav as item (item.href)}
					<a
						href={item.href}
						onclick={() => (open = false)}
						class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all hover:bg-white/70 {isActive(
							item.href
						)
							? 'bg-white text-primary shadow-sm shadow-primary/15 hover:bg-white'
							: 'text-muted-foreground'}"
					>
						<item.icon class="size-4" />
						{item.label}
					</a>
				{/each}
				{#if data.user.role === 'admin'}
					<a
						href="/tasks/new"
						onclick={() => (open = false)}
						class="mt-3 flex items-center gap-3 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90"
					>
						<Plus class="size-4" /> บันทึกงานแทนใหม่
					</a>
				{/if}
			</nav>
			<div class="m-3 rounded-xl bg-white/70 p-3">
				<div class="mb-2 px-1 text-sm">
					<div class="font-medium">{data.user.nickname ?? data.user.fullName}</div>
					<div class="text-xs text-muted-foreground">
						{data.user.fullName} · {ROLE_LABELS[data.user.role]}
					</div>
				</div>
				<form method="POST" action="/logout">
					<button
						type="submit"
						class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-pastel-rose hover:text-rose-800"
					>
						<LogOut class="size-4" /> ออกจากระบบ
					</button>
				</form>
			</div>
		</aside>
		{#if open}
			<button
				class="fixed inset-0 z-30 bg-black/30 md:hidden"
				aria-label="ปิดเมนู"
				onclick={() => (open = false)}
			></button>
		{/if}

		<!-- Main -->
		<div class="flex min-w-0 flex-1 flex-col">
			<header class="flex h-14 items-center gap-3 border-b border-white/60 bg-white/70 px-4 backdrop-blur md:hidden">
				<button class="rounded-md p-2 hover:bg-accent" onclick={() => (open = !open)} aria-label="เมนู">
					<Menu class="size-5" />
				</button>
				<span class="font-semibold">LBA Replace</span>
			</header>
			<main class="flex-1 p-4 md:p-6">
				{@render children()}
			</main>
		</div>
	</div>
{/if}
