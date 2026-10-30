<script lang="ts">
	import type { HTMLTableAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils';
	let { class: className, children, ...rest }: HTMLTableAttributes = $props();
</script>

<div class="relative w-full overflow-x-auto">
	<table class={cn('w-full caption-bottom text-sm', className)} {...rest}>
		{@render children?.()}
	</table>
</div>
