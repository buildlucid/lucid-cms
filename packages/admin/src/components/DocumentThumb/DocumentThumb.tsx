import classnames from "classnames";
import type { Component } from "solid-js";
import { Show } from "solid-js";

/**
 * A tiny page sketch, like the document resources in agent chats. Multiple
 * collections show a second page behind, so a stack reads as many documents.
 * A `requested` page is dashed, as it won't exist until its request completes.
 */
const DocumentThumb: Component<{ multiple?: boolean; requested?: boolean }> = (
	props,
) => {
	// ----------------------------------------
	// Render
	return (
		<span class="relative h-9 w-7 shrink-0" aria-hidden="true">
			<Show when={props.multiple}>
				<span class="absolute inset-0 translate-x-1 -translate-y-0.5 rotate-6 rounded border border-border bg-input/60" />
			</Show>
			<span
				class={classnames(
					"absolute inset-0 flex flex-col gap-0.75 rounded border border-border p-1.5",
					props.requested ? "border-dashed bg-input/40" : "bg-input shadow-xs",
				)}
			>
				<span class="h-0.5 w-3/4 rounded-full bg-border" />
				<span class="h-0.5 w-full rounded-full bg-border" />
				<span class="h-0.5 w-5/6 rounded-full bg-border" />
				<span class="h-0.5 w-1/2 rounded-full bg-border" />
			</span>
		</span>
	);
};

export default DocumentThumb;
