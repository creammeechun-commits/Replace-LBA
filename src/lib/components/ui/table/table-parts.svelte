<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils';
	let {
		as,
		class: className,
		children,
		...rest
	}: HTMLAttributes<HTMLElement> & {
		as: 'thead' | 'tbody' | 'tr' | 'th' | 'td' | 'tfoot';
		colspan?: number;
		rowspan?: number;
	} = $props();

	const base: Record<string, string> = {
		thead: '[&_tr]:border-b',
		tbody: '[&_tr:last-child]:border-0',
		tfoot: 'border-t bg-muted/50 font-medium [&>tr]:last:border-b-0',
		tr: 'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
		th: 'h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-muted-foreground',
		td: 'p-2 align-middle whitespace-nowrap'
	};
</script>

<svelte:element this={as} class={cn(base[as], className)} {...rest}>
	{@render children?.()}
</svelte:element>
