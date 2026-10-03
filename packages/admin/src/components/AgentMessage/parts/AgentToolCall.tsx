import classnames from "classnames";
import {
	FaSolidBan,
	FaSolidClock,
	FaSolidGlobe,
	FaSolidMagnifyingGlass,
	FaSolidWrench,
	FaSolidXmark,
} from "solid-icons/fa";
import { type Component, createMemo, Match, Switch } from "solid-js";
import Spinner from "@/components/Spinner/Spinner";
import T, { translateAdminCopy } from "@/translations";
import {
	type AgentToolPart,
	webFetchTool,
	webSearchTool,
} from "@/utils/agent-tools";

/** The tool's saved result copy, with a state label when the call did not complete. */
export const toolLabel = (part: AgentToolPart) => {
	const summary = translateAdminCopy(part.summary);
	return part.status === "complete"
		? summary
		: `${summary} · ${T()(`agent.tool.status.${part.status}`)}`;
};

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
					<Spinner size="sm" variant="subtle" />
				</Match>
				<Match when={props.part.status === "complete"}>
					<Switch fallback={<FaSolidWrench size={10} />}>
						<Match when={props.part.name === webSearchTool}>
							<FaSolidMagnifyingGlass size={10} />
						</Match>
						<Match when={props.part.name === webFetchTool}>
							<FaSolidGlobe size={10} />
						</Match>
					</Switch>
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

const AgentToolCall: Component<{
	part: AgentToolPart;
	selected: boolean;
	onSelect?: (id: string) => void;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const label = createMemo(() => toolLabel(props.part));

	// ----------------------------------------
	// Render
	return (
		<button
			type="button"
			class={classnames(
				"group -ms-2 flex max-w-full min-w-0 items-center gap-2 self-start rounded-md px-2 py-1 text-start text-xs transition-colors focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary",
				props.selected
					? "bg-card text-title"
					: "text-muted hover:bg-card hover:text-body",
			)}
			aria-pressed={props.selected}
			onClick={() => props.onSelect?.(props.part.id)}
		>
			<AgentToolIcon part={props.part} />
			<span class="min-w-0 truncate" title={label()}>
				{label()}
			</span>
		</button>
	);
};

export default AgentToolCall;
