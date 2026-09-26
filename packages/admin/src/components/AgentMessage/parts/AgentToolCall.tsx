import type { AgentMessagePart } from "@types";
import classnames from "classnames";
import {
	FaSolidCheck,
	FaSolidChevronRight,
	FaSolidClock,
	FaSolidXmark,
} from "solid-icons/fa";
import { type Component, createMemo, Match, Show, Switch } from "solid-js";
import Spinner from "@/components/Spinner/Spinner";
import T from "@/translations";

type ToolPart = Extract<AgentMessagePart, { type: "tool" }>;

const format = (value: unknown) => JSON.stringify(value, null, 2);

/** A collapsible record of one tool call, with its input and output. */
const AgentToolCall: Component<{ part: ToolPart }> = (props) => {
	// ----------------------------------------
	// Memos
	const label = createMemo(() => {
		const skill = props.part.input.name;
		if (props.part.name === "lucid_load_skill" && typeof skill === "string") {
			return T()("agent.tool.skill", { name: skill });
		}
		const name = props.part.name.replaceAll("_", " ");
		switch (props.part.status) {
			case "pending":
				return T()("agent.tool.pending", { name });
			case "running":
				return T()("agent.tool.running", { name });
			case "skipped":
				return T()("agent.tool.skipped", { name });
			case "failed":
				return T()("agent.tool.failed", { name });
			case "complete":
				return T()("agent.tool.complete", { name });
		}
	});

	// ----------------------------------------
	// Render
	return (
		<details class="group rounded-md border border-border bg-card text-xs">
			<summary class="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-body [&::-webkit-details-marker]:hidden">
				<span
					class={classnames("flex size-4 items-center justify-center", {
						"text-success": props.part.status === "complete",
						"text-danger": props.part.status === "failed",
					})}
				>
					<Switch>
						<Match when={props.part.status === "pending"}>
							<FaSolidClock class="text-icon" />
						</Match>
						<Match when={props.part.status === "running"}>
							<Spinner size="sm" />
						</Match>
						<Match when={props.part.status === "complete"}>
							<FaSolidCheck />
						</Match>
						<Match
							when={
								props.part.status === "failed" ||
								props.part.status === "skipped"
							}
						>
							<FaSolidXmark />
						</Match>
					</Switch>
				</span>
				<span class="min-w-0 grow truncate">{label()}</span>
				<FaSolidChevronRight class="size-2.5 text-icon transition-transform group-open:rotate-90" />
			</summary>
			<div class="flex flex-col gap-2 border-t border-border p-3">
				<p class="font-medium text-subtitle">{T()("agent.tool.input")}</p>
				<pre class="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-input p-2 text-body">
					{format(props.part.input)}
				</pre>
				<Show when={props.part.output !== undefined}>
					<p class="font-medium text-subtitle">{T()("agent.tool.output")}</p>
					<pre class="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-input p-2 text-body">
						{format(props.part.output)}
					</pre>
				</Show>
			</div>
		</details>
	);
};

export default AgentToolCall;
