<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '#lib/components/ui/button';
	import { Input } from '#lib/components/ui/input';
	import { Label } from '#lib/components/ui/label';
	import * as Card from '#lib/components/ui/card';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let loading = $state(false);
</script>

<div class="flex min-h-screen items-center justify-center p-4">
	<Card.Root class="w-full max-w-sm">
		<Card.Header class="flex-col items-start">
			<div
				class="mb-2 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-chart-2 text-xl font-bold text-white shadow-md shadow-primary/30"
			>
				L
			</div>
			<Card.Title class="text-xl">LBA Replace</Card.Title>
			<Card.Description>ระบบจัดการงานแทน (Spare) แผนกธุรการ LBA</Card.Description>
		</Card.Header>
		<Card.Content>
			<form
				method="POST"
				class="space-y-4"
				use:enhance={() => {
					loading = true;
					return async ({ update }) => {
						loading = false;
						await update();
					};
				}}
			>
				<div class="space-y-1.5">
					<Label for="username">ชื่อผู้ใช้</Label>
					<Input id="username" name="username" autocomplete="username" value={form?.username ?? ''} required />
				</div>
				<div class="space-y-1.5">
					<Label for="password">รหัสผ่าน</Label>
					<Input id="password" name="password" type="password" autocomplete="current-password" required />
				</div>
				{#if form?.error}
					<p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{form.error}</p>
				{/if}
				<Button type="submit" class="w-full" disabled={loading}>
					{loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
				</Button>
			</form>
			<div class="mt-4 rounded-xl bg-pastel-lavender p-3 text-xs text-muted-foreground">
				<div class="mb-1 font-medium text-foreground">บัญชีทดสอบ</div>
				<div>ธุรการ: <code>admin</code> / <code>admin1234</code> (หรือ ice, pat / 1234)</div>
				<div>หัวหน้า: <code>manager</code> / <code>manager1234</code></div>
				<div>พนักงาน: <code>emp001</code> … <code>emp284</code> / <code>1234</code></div>
			</div>
		</Card.Content>
	</Card.Root>
</div>
