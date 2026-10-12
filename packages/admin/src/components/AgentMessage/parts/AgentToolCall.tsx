import { A } from "@solidjs/router";
import classnames from "classnames";
import {
	TbOutlineArrowUpRight,
	TbOutlineBan,
	TbOutlineClock,
	TbOutlinePhotoAi,
	TbOutlineRefresh,
	TbOutlineSearch,
	TbOutlineTool,
	TbOutlineVolume,
	TbOutlineWorld,
	TbOutlineX,
} from "solid-icons/tb";
import { type Component, createMemo, Match, Show, Switch } from "solid-js";
import Spinner from "@/components/Spinner/Spinner";
import T, { translateAdminCopy } from "@/translations";
import { agentChangesHref } from "@/utils/agent-references";
import {
	type AgentToolPart,
	generateAudioTool,
	imageTools,
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
					<Spinner size="xs" variant="subtle" />
				</Match>
				<Match when={props.part.status === "complete"}>
					<Switch fallback={<TbOutlineTool size={10} />}>
						<Match when={props.part.name === webSearchTool}>
							<TbOutlineSearch size={10} />
						</Match>
						<Match when={props.part.name === webFetchTool}>
							<TbOutlineWorld size={10} />
						</Match>
						<Match when={imageTools.has(props.part.name)}>
							<TbOutlinePhotoAi size={10} />
						</Match>
						<Match when={props.part.name === generateAudioTool}>
							<TbOutlineVolume size={10} />
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

/** A tool call that opens its details, with a link to what it changed. */
const AgentToolCall: Component<{
	part: AgentToolPart;
	retried?: boolean;
	selected: boolean;
	onSelect?: (id: string) => void;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const label = createMemo(() => toolLabel(props.part, props.retried));
	const changesHref = createMemo(() =>
		agentChangesHref(props.part.changes ?? []),
	);

	// ----------------------------------------
	// Render
	return (
		<div class="-ms-2 flex max-w-full min-w-0 items-center gap-0.5 self-start">
			<button
				type="button"
				class={classnames(
					"group flex min-w-0 items-center gap-2 rounded-md px-2 py-1 text-start text-xs transition-colors focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary",
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
			<Show when={changesHref()}>
				{(href) => (
					<A
						href={href()}
						class="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted transition-colors hover:bg-card hover:text-body focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
						aria-label={T()("agent.tool.open.label", { tool: label() })}
					>
						{T()("agent.tool.open")}
						<TbOutlineArrowUpRight size={10} class="rtl:-scale-x-100" />
					</A>
				)}
			</Show>
		</div>
	);
};

export default AgentToolCall;
