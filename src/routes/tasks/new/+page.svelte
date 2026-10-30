<script lang="ts">
	import type { PageProps } from './$types';
	import TaskForm from '#lib/components/task-form.svelte';
	let { data, form }: PageProps = $props();
</script>

<div class="mx-auto max-w-4xl space-y-4">
	<div>
		<h1 class="text-2xl font-semibold">บันทึกงานแทนใหม่</h1>
		<p class="text-sm text-muted-foreground">
			เลือกหน่วยงานและพนักงานที่ลา ระบบจะกรอกตำแหน่ง Code site และเวลาเข้า-ออกให้จากประวัติ · ลาหลายวันสร้างทีเดียวได้
		</p>
	</div>
	<TaskForm
		mode="create"
		options={data.options}
		initial={{ siteId: data.presetSiteId }}
		errors={form?.errors ?? []}
		submitLabel="บันทึกงานแทน"
	/>
</div>
