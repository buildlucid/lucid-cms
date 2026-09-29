import type { AgentCapabilities } from "@types";
import classnames from "classnames";
import { type Component, For, Show } from "solid-js";
import T from "@/translations";
import {
	type AgentReferenceItem,
	canAgentOpen,
} from "@/utils/agent-references";
import AgentReferenceFile from "./parts/AgentReferenceFile";

/** Resources attached to a draft or message, laid out as tilted file cards in one row that scrolls sideways. */
const AgentReferenceFiles: Component<{
	references: AgentReferenceItem[];
	/** Shows whether the agent can open each file. */
	capabilities?: AgentCapabilities;
	align?: "start" | "end";
	class?: string;
	onRemove?: (reference: AgentReferenceItem) => void;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Show when={props.references.length > 0}>
			<ul
				class={classnames(
					"agent-reference-strip flex gap-2 overflow-x-auto px-4 pt-3 pb-2 scrollbar-none",
					props.class,
				)}
				aria-label={T()("agent.references.attached")}
			>
				<For each={props.references}>
					{(reference, index) => (
						<li
							class="shrink-0"
							classList={{ "ms-auto": props.align === "end" && index() === 0 }}
						>
							<AgentReferenceFile
								reference={reference}
								readable={
									props.capabilities
										? canAgentOpen(reference, props.capabilities)
										: undefined
								}
								onRemove={
									props.onRemove ? () => props.onRemove?.(reference) : undefined
								}
							/>
						</li>
					)}
				</For>
			</ul>
		</Show>
	);
};

export default AgentReferenceFiles;
