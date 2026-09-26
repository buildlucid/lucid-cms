import type { AgentConversation, AgentRoutine } from "@types";
import { FaSolidRepeat, FaSolidXmark } from "solid-icons/fa";
import { type Component, type JSXElement, Show } from "solid-js";
import AgentRunStatus from "@/components/AgentRunStatus/AgentRunStatus";
import Button from "@/components/Button/Button";
import Pill from "@/components/Pill/Pill";
import T from "@/translations";
import { describeSchedule } from "@/utils/agent-schedule";
import dateHelpers from "@/utils/date-helpers";

const AgentRoutineCard: Component<{
	routine: AgentRoutine;
	conversation: AgentConversation;
	onRuns: () => void;
	onOpen: () => void;
	onClose: () => void;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<aside
			aria-labelledby="agent-routine-card-title"
			class="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-lg animate-fade-in md:p-5"
		>
			<div class="flex items-center gap-3">
				<span class="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary-low-border bg-primary-low text-primary">
					<FaSolidRepeat size={13} />
				</span>
				<div class="min-w-0 grow">
					<p class="text-xs text-muted">{T()("agent.routine.run")}</p>
					<h3
						id="agent-routine-card-title"
						class="truncate text-sm font-medium text-title"
						title={props.routine.name}
					>
						{props.routine.name}
					</h3>
				</div>
				<button
					type="button"
					class="-mt-0.5 -mr-1 flex size-6 shrink-0 items-center justify-center self-start rounded-md text-icon transition-colors hover:text-icon-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
					aria-label={T()("common.close")}
					title={T()("common.close")}
					onClick={() => props.onClose()}
				>
					<FaSolidXmark size={12} />
				</button>
			</div>
			<dl class="flex flex-col gap-2.5 border-t border-border pt-4 text-xs">
				<Show when={props.conversation.latestRun}>
					{(run) => (
						<Detail label={T()("agent.routine.this.run")}>
							<AgentRunStatus status={run().status} outcome={run().outcome} />
						</Detail>
					)}
				</Show>
				<Detail label={T()("agent.routine.started")}>
					<time
						datetime={props.conversation.createdAt ?? undefined}
						title={dateHelpers.formatFullDate(props.conversation.createdAt, {
							includeTime: true,
						})}
					>
						{dateHelpers.formatTimestamp(props.conversation.createdAt)}
					</time>
				</Detail>
				<Detail label={T()("common.schedule")}>
					{describeSchedule(props.routine.cron)}
				</Detail>
				<Detail label={T()("agent.routine.next.run")}>
					<Show
						when={props.routine.enabled && props.routine.nextRunAt}
						fallback={
							<Pill size="xs" variant="warning-subtle">
								{T()("agent.routine.paused")}
							</Pill>
						}
					>
						{(next) => (
							<time
								datetime={next()}
								title={dateHelpers.formatFullDate(next(), {
									includeTime: true,
								})}
							>
								{dateHelpers.formatTimestamp(next())}
							</time>
						)}
					</Show>
				</Detail>
			</dl>
			<div class="grid grid-cols-2 gap-2">
				<Button size="sm" variant="secondary" onClick={() => props.onRuns()}>
					{T()("agent.routine.runs.view")}
				</Button>
				<Button size="sm" variant="outline" onClick={() => props.onOpen()}>
					{props.routine.source === "code"
						? T()("common.details")
						: T()("agent.routine.edit")}
				</Button>
			</div>
		</aside>
	);
};

const Detail: Component<{ label: string; children: JSXElement }> = (props) => (
	<div class="flex items-center justify-between gap-4">
		<dt class="shrink-0 text-muted">{props.label}</dt>
		<dd class="flex min-w-0 justify-end text-right text-body">
			{props.children}
		</dd>
	</div>
);

export default AgentRoutineCard;
