<script lang="ts" module>
	import { tv, type VariantProps } from 'tailwind-variants';
	export const badgeVariants = tv({
		base: 'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
		variants: {
			variant: {
				default: 'border-transparent bg-primary text-primary-foreground',
				secondary: 'border-transparent bg-secondary text-secondary-foreground',
				destructive: 'border-transparent bg-pastel-rose text-rose-800',
				outline: 'border-border bg-white/70 text-foreground',
				todo: 'border-transparent bg-pastel-rose text-rose-800',
				doing: 'border-transparent bg-pastel-peach text-amber-800',
				done: 'border-transparent bg-pastel-mint text-emerald-800',
				success: 'border-transparent bg-pastel-mint text-emerald-800',
				warning: 'border-transparent bg-pastel-peach text-amber-800',
				info: 'border-transparent bg-pastel-sky text-sky-800',
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
