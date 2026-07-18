import type { RichTextJSON } from "@lucidcms/rich-text";
import { type Component, Show } from "solid-js";
import RichTextContent from "@/components/Partials/RichTextContent";

const ReleaseRequestCommentBlock: Component<{
	label: string;
	value: RichTextJSON | null;
}> = (props) => (
	<Show when={props.value}>
		{(value) => (
			<div class="rounded-md border border-border bg-card-base p-3">
				<p class="text-xs font-medium text-body">{props.label}</p>
				<RichTextContent value={value()} class="mt-2 text-sm" />
			</div>
		)}
	</Show>
);

export default ReleaseRequestCommentBlock;
