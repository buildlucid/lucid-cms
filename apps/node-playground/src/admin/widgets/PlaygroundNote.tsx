import type { AgentWidgetProps } from "@lucidcms/admin/types";

/** Renders the note returned by the `playground_save_note` agent tool. */
const PlaygroundNote = (props: AgentWidgetProps) => {
	// ----------------------------------------
	// Render
	return (
		<div class="rounded-lg border border-border px-4 py-3">
			<p class="text-sm font-medium text-title">{String(props.data.title)}</p>
			<p class="mt-1 text-sm text-body">{String(props.data.body)}</p>
		</div>
	);
};

export default PlaygroundNote;
