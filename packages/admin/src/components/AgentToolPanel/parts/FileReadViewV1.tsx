import type { AgentFileReadOutput } from "@types";
import { type Component, createMemo, For, Show } from "solid-js";
import T from "@/translations";

const FileReadViewV1: Component<{
	output: AgentFileReadOutput;
	search?: string;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const summary = createMemo(() => {
		if (props.output.mode === "search") {
			return T()("agent.file.read.matches", {
				search: props.search ?? "",
				count: props.output.passages.length,
			});
		}
		const passage = props.output.passages[0];
		if (!passage) return T()("agent.file.read.end");
		return T()("agent.file.read.range", {
			start: (passage.offset + 1).toLocaleString(),
			end: (passage.offset + passage.text.length).toLocaleString(),
			total: props.output.totalChars.toLocaleString(),
		});
	});

	// ----------------------------------------
	// Render
	return (
		<div class="flex flex-col gap-2.5">
			<p class="text-[11px] text-muted">
				{props.output.filename ??
					T()("agent.preview.item", { id: props.output.mediaId })}
				{" · "}
				{summary()}
				<Show when={props.output.truncated}>
					{" · "}
					{T()("agent.file.read.more")}
				</Show>
			</p>
			<For each={props.output.passages}>
				{(passage) => (
					<pre class="max-h-48 overflow-auto rounded-md bg-input p-2.5 font-mono text-xs whitespace-pre-wrap break-words text-body">
						{passage.text}
					</pre>
				)}
			</For>
		</div>
	);
};

export default FileReadViewV1;
