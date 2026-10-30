<script lang="ts">
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils';
	let {
		class: className,
		value = $bindable(),
		children,
		...rest
	}: HTMLSelectAttributes = $props();
</script>

<select
	bind:value
	class={cn(
		'flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent py-1 pr-8 pl-3 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	{...rest}
>
	{@render children?.()}
</select>
