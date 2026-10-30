<script lang="ts">
	import { Badge, type BadgeVariant } from '#lib/components/ui/badge';
	import { STATUS_LABELS, STATUS_LABELS_TH, COVERAGE_LABELS, PAY_LABELS } from '#lib/shared/labels';

	let {
		kind,
		value,
		thai = false
	}: { kind: 'status' | 'coverage' | 'pay'; value: string; thai?: boolean } = $props();

	const coverageVariant: Record<string, BadgeVariant> = {
		spare: 'success',
		rotate: 'info',
		none_needed: 'muted',
		unable: 'destructive',
		pending: 'warning'
	};
	const payVariant: Record<string, BadgeVariant> = {
		pending: 'warning',
		claimed: 'success',
		no_pay: 'muted'
	};

	const label = $derived(
		kind === 'status'
			? thai
				? STATUS_LABELS_TH[value]
				: STATUS_LABELS[value]
			: kind === 'coverage'
				? COVERAGE_LABELS[value]
				: PAY_LABELS[value]
	);
	const variant = $derived<BadgeVariant>(
		kind === 'status'
			? (value as BadgeVariant)
			: kind === 'coverage'
				? coverageVariant[value]
				: payVariant[value]
	);
</script>

<Badge {variant}>{label ?? value}</Badge>
