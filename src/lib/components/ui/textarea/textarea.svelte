<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils';
	let { class: className, value = $bindable(), ...rest }: HTMLTextareaAttributes = $props();
</script>

<textarea
	bind:value
	class={cn(
		'flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	{...rest}
></textarea>
