import type { Component, JSXElement } from "solid-js";

const ReleaseRequestDetailRow: Component<{
	label: string;
	value?: string | number | null;
	children?: JSXElement;
}> = (props) => (
	<div class="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-b-0 last:pb-0">
		<dt class="text-body">{props.label}</dt>
		<dd class="min-w-0 text-right text-title">
			{props.children ?? props.value}
		</dd>
	</div>
);

export default ReleaseRequestDetailRow;
