import classnames from "classnames";
import {
	TbOutlineBan,
	TbOutlineClock,
	TbOutlineRefresh,
	TbOutlineSearch,
	TbOutlineTool,
	TbOutlineWorld,
	TbOutlineX,
} from "solid-icons/tb";
import { type Component, createMemo, Match, Switch } from "solid-js";
import Spinner from "@/components/Spinner/Spinner";
import T, { translateAdminCopy } from "@/translations";
import {
	type AgentToolPart,
	toolDisplayStatus,
	webFetchTool,
	webSearchTool,
} from "@/utils/agent-tools";

/** The tool's saved result copy, with a state label when the call did not complete. */
export const toolLabel = (part: AgentToolPart, retried?: boolean) => {
	const summary = translateAdminCopy(part.summary);
	const status = toolDisplayStatus(part, retried);
	return status === "complete"
		? summary
		: `${summary} · ${T()(`agent.tool.status.${status}`)}`;
};

/** Shows a tool call's status, muting failures recovered by later calls. */
export const AgentToolIcon: Component<{
	part: AgentToolPart;
	retried?: boolean;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const status = createMemo(() => toolDisplayStatus(props.part, props.retried));

	// ----------------------------------------
	// Render
	return (
		<span
			class={classnames("flex size-3.5 shrink-0 items-center justify-center", {
				"text-danger": status() === "failed",
			})}
		>
			<Switch>
				<Match when={props.part.status === "pending"}>
					<TbOutlineClock size={10} />
				</Match>
				<Match when={props.part.status === "running"}>
					<Spinner size="sm" variant="subtle" />
				</Match>
				<Match when={props.part.status === "complete"}>
					<Switch fallback={<TbOutlineTool size={10} />}>
						<Match when={props.part.name === webSearchTool}>
							<TbOutlineSearch size={10} />
						</Match>
						<Match when={props.part.name === webFetchTool}>
							<TbOutlineWorld size={10} />
						</Match>
					</Switch>
				</Match>
				<Match when={status() === "failed"}>
					<TbOutlineX size={11} />
				</Match>
				<Match when={status() === "retried"}>
					<TbOutlineRefresh size={10} />
				</Match>
				<Match when={props.part.status === "skipped"}>
					<TbOutlineBan size={10} />
				</Match>
			</Switch>
		</span>
	);
};

const AgentToolCall: Component<{
	part: AgentToolPart;
	retried?: boolean;
	selected: boolean;
	onSelect?: (id: string) => void;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const label = createMemo(() => toolLabel(props.part, props.retried));

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
			<AgentToolIcon part={props.part} retried={props.retried} />
			<span class="min-w-0 truncate" title={label()}>
				{label()}
			</span>
		</button>
	);
};

export default AgentToolCall;
