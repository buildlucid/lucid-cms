import classnames from "classnames";
import { TbOutlineChevronRight } from "solid-icons/tb";
import {
	type Component,
	createMemo,
	createSignal,
	createUniqueId,
	For,
	Show,
} from "solid-js";
import T, { translateAdminCopy } from "@/translations";
import {
	type AgentToolGroup as ToolGroup,
	toolDisplayStatus,
} from "@/utils/agent-tools";
import AgentToolCall, { AgentToolIcon } from "./AgentToolCall";

const AgentToolGroup: Component<{
	group: ToolGroup;
	retriedIds?: ReadonlySet<string>;
	selectedToolId?: string;
	onSelect?: (id: string) => void;
	working?: boolean;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [expanded, setExpanded] = createSignal(false);
	const detailsId = createUniqueId();

	// ----------------------------------------
	// Memos
	const counts = createMemo(() => {
		const totals = {
			failed: 0,
			retried: 0,
			skipped: 0,
			running: 0,
			pending: 0,
		};
		for (const call of props.group.calls) {
			const status = toolDisplayStatus(call, props.retriedIds?.has(call.id));
			if (status !== "complete") totals[status]++;
		}
		return totals;
	});
	const latest = createMemo(
		() =>
			props.group.calls.findLast((call) => call.status === "running") ??
			props.group.calls.findLast((call) => call.status === "pending") ??
			props.group.latest,
	);
	const summary = createMemo(() => translateAdminCopy(latest().summary));

	// ----------------------------------------
	// Functions
	const isRetried = (id: string) => props.retriedIds?.has(id) ?? false;

	// ----------------------------------------
	// Render
	return (
		<Show
			when={props.group.calls.length > 1}
			fallback={
				<div
					class={classnames({
						"agent-shimmer w-fit max-w-full": props.working,
					})}
				>
					<AgentToolCall
						part={props.group.latest}
						retried={isRetried(props.group.latest.id)}
						selected={props.selectedToolId === props.group.latest.id}
						onSelect={props.onSelect}
					/>
				</div>
			}
		>
			<div class="flex min-w-0 flex-col items-start">
				<button
					type="button"
					class={classnames(
						"-ms-2 flex max-w-full items-center gap-2 rounded-md px-2 py-1 text-start text-xs text-muted transition-colors hover:bg-card hover:text-body focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary",
						{ "agent-shimmer": props.working },
					)}
					aria-expanded={expanded()}
					aria-controls={detailsId}
					onClick={() => setExpanded((value) => !value)}
				>
					<AgentToolIcon part={latest()} retried={isRetried(latest().id)} />
					<span class="min-w-0 truncate" title={summary()}>
						{summary()}
					</span>
					<span class="shrink-0 tabular-nums">
						{T()("agent.tool.group.calls", { count: props.group.calls.length })}
					</span>
					<Show when={counts().failed}>
						<span class="shrink-0 rounded bg-danger/10 px-1 text-danger tabular-nums">
							{T()("agent.tool.group.failed", { count: counts().failed })}
						</span>
					</Show>
					<Show when={counts().retried}>
						<span class="shrink-0 tabular-nums">
							{T()("agent.tool.group.retried", { count: counts().retried })}
						</span>
					</Show>
					<Show when={counts().skipped}>
						<span class="shrink-0 tabular-nums">
							{T()("agent.tool.group.skipped", { count: counts().skipped })}
						</span>
					</Show>
					<Show when={counts().running || counts().pending}>
						<span class="shrink-0 tabular-nums">
							{counts().running
								? T()("agent.tool.group.running", { count: counts().running })
								: T()("agent.tool.group.pending", { count: counts().pending })}
						</span>
					</Show>
					<TbOutlineChevronRight
						size={8}
						class={classnames("shrink-0 transition-transform", {
							"rotate-90": expanded(),
						})}
					/>
				</button>
				<Show when={expanded()}>
					<div
						id={detailsId}
						class="my-1 ms-1.5 flex max-w-full flex-col border-s border-border ps-4"
					>
						<For each={props.group.calls}>
							{(call) => (
								<AgentToolCall
									part={call}
									retried={isRetried(call.id)}
									selected={props.selectedToolId === call.id}
									onSelect={props.onSelect}
								/>
							)}
						</For>
					</div>
				</Show>
			</div>
		</Show>
	);
};

export default AgentToolGroup;
