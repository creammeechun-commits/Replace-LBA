<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils';
	let { class: className, children, ...rest }: HTMLAttributes<HTMLDivElement> = $props();
</script>

<div
	class={cn(
		'flex flex-col gap-4 rounded-2xl border border-white/60 bg-card/90 py-4 text-card-foreground shadow-[0_8px_30px_-12px_oklch(0.6_0.14_300/0.25)] backdrop-blur-sm',
		className
	)}
	{...rest}
>
	{@render children?.()}
</div>
