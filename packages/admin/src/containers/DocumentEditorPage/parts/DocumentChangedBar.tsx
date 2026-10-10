import type { Component } from "solid-js";
import Button from "@/components/Button/Button";
import T from "@/translations";

/** Shown above the editor when the saved content changed under unsaved edits, eg. someone else or the agent saved it. */
const DocumentChangedBar: Component<{
	reloading: boolean;
	onKeep: () => void;
	onReload: () => void;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			role="status"
			class="flex flex-wrap items-center gap-x-4 gap-y-2 border-b-2 border-warning px-4 py-2.5 md:px-6"
		>
			<p class="min-w-0 flex-1 text-sm text-body">
				{T()("documents.changed.message")}
			</p>
			<div class="flex shrink-0 items-center gap-2">
				<Button size="xs" variant="ghost" onClick={() => props.onKeep()}>
					{T()("documents.changed.keep")}
				</Button>
				<Button
					size="xs"
					variant="secondary"
					loading={props.reloading}
					onClick={() => props.onReload()}
				>
					{T()("documents.changed.reload")}
				</Button>
			</div>
		</div>
	);
};

export default DocumentChangedBar;
