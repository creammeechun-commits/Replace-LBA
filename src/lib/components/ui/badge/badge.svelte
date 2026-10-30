<script lang="ts" module>
	import { tv, type VariantProps } from 'tailwind-variants';
	export const badgeVariants = tv({
		base: 'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
		variants: {
			variant: {
				default: 'border-transparent bg-primary text-primary-foreground',
				secondary: 'border-transparent bg-secondary text-secondary-foreground',
				destructive: 'border-transparent bg-destructive text-white',
				outline: 'text-foreground',
				todo: 'border-transparent bg-status-todo/15 text-status-todo',
				doing: 'border-transparent bg-status-doing/20 text-amber-800',
				done: 'border-transparent bg-status-done/15 text-status-done',
				success: 'border-transparent bg-emerald-100 text-emerald-800',
				warning: 'border-transparent bg-amber-100 text-amber-800',
				info: 'border-transparent bg-sky-100 text-sky-800',
				muted: 'border-transparent bg-muted text-muted-foreground'
			}
		},
		defaultVariants: { variant: 'default' }
	});
	export type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils';
	let {
		class: className,
		variant = 'default',
		children,
		...rest
	}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant } = $props();
</script>

<span class={cn(badgeVariants({ variant }), className)} {...rest}>
	{@render children?.()}
</span>
