import classnames from "classnames";
import {
	FaSolidBan,
	FaSolidChevronRight,
	FaSolidClock,
	FaSolidWrench,
	FaSolidXmark,
} from "solid-icons/fa";
import { type Component, Match, Show, Switch } from "solid-js";
import Spinner from "@/components/Spinner/Spinner";
import T from "@/translations";
import type { AgentToolPart } from "@/utils/agent-chat";

/** What a tool call did, in plain words, such as "Used collections list". */
export const toolLabel = (part: AgentToolPart) => {
	const skill = part.input.name;
	if (part.name === "lucid_load_skill" && typeof skill === "string") {
		return T()("agent.tool.skill", { name: skill });
	}
	const name = part.name.replaceAll("_", " ");
	switch (part.status) {
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
};

/** A tool call's status as a small icon. */
export const AgentToolIcon: Component<{ part: AgentToolPart }> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<span
			class={classnames("flex size-3.5 shrink-0 items-center justify-center", {
				"text-danger": props.part.status === "failed",
			})}
		>
			<Switch>
				<Match when={props.part.status === "pending"}>
					<FaSolidClock size={10} />
				</Match>
				<Match when={props.part.status === "running"}>
					<Spinner size="sm" />
				</Match>
				<Match when={props.part.status === "complete"}>
					<FaSolidWrench size={10} />
				</Match>
				<Match when={props.part.status === "failed"}>
					<FaSolidXmark size={11} />
				</Match>
				<Match when={props.part.status === "skipped"}>
					<FaSolidBan size={10} />
				</Match>
			</Switch>
		</span>
	);
};

/**
 * One tool call as a compact row. Selecting it shows its input and output in
 * the chat's sidebar. The first call in a run of calls carries a toggle that
 * shows or hides the rest.
 */
const AgentToolCall: Component<{
	part: AgentToolPart;
	selected: boolean;
	onSelect?: (id: string) => void;
	/** How many calls follow this one in its run, when it leads the run. */
	more?: number;
	expanded?: boolean;
	onToggle?: () => void;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div data-compact-row class="flex max-w-full items-center gap-1 self-start">
			<button
				type="button"
				class={classnames(
					"group -ml-2 flex min-w-0 items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary",
					props.selected
						? "bg-card text-title"
						: "text-muted hover:bg-card hover:text-body",
				)}
				aria-pressed={props.selected}
				onClick={() => props.onSelect?.(props.part.id)}
			>
				<AgentToolIcon part={props.part} />
				<span class="min-w-0 truncate">{toolLabel(props.part)}</span>
			</button>
			<Show when={props.more}>
				{(more) => (
					<button
						type="button"
						class="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted transition-colors hover:bg-card hover:text-body focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
						aria-expanded={props.expanded}
						aria-label={T()(
							props.expanded
								? "agent.tool.group.hide"
								: "agent.tool.group.show",
							{ count: more() },
						)}
						onClick={() => props.onToggle?.()}
					>
						<span class="tabular-nums">+{more()}</span>
						<FaSolidChevronRight
							size={8}
							class={classnames("transition-transform", {
								"rotate-90": props.expanded,
							})}
						/>
					</button>
				)}
			</Show>
		</div>
	);
};

export default AgentToolCall;
