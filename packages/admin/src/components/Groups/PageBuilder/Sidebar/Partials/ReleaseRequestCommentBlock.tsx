import { type Component, Show } from "solid-js";

const ReleaseRequestCommentBlock: Component<{
	label: string;
	value: string | null;
}> = (props) => (
	<Show when={props.value}>
		<div class="rounded-md border border-border bg-card-base p-3">
			<p class="text-xs font-medium text-body">{props.label}</p>
			<p class="mt-2 whitespace-pre-wrap text-sm text-title">{props.value}</p>
		</div>
	</Show>
);

export default ReleaseRequestCommentBlock;
