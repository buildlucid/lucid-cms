import type { AgentRoutine } from "@types";
import { type Component, createMemo, Show } from "solid-js";
import AgentRunStatus from "@/components/AgentRunStatus/AgentRunStatus";
import Table from "@/components/Table/Table";
import T from "@/translations";
import {
	getAgentName,
	getAgentUnavailableReason,
	getRoutinePause,
} from "@/utils/agent-access";
import { describeSchedule } from "@/utils/agent-schedule";

const AgentRoutineTableRow: Component<{
	index: number;
	routine: AgentRoutine;
	runPending: boolean;
	onOpen: () => void;
	onRuns: () => void;
	onRun: () => void;
	onToggle: () => void;
	onDelete: () => void;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const pause = createMemo(() => getRoutinePause(props.routine));

	// ----------------------------------------
	// Render
	return (
		<Table.Row
			index={props.index}
			actions={[
				{
					label:
						props.routine.source === "code"
							? T()("common.details")
							: T()("common.edit"),
					type: "button",
					icon: props.routine.source === "code" ? "info" : "pen",
					onClick: props.onOpen,
				},
				{
					label: T()("agent.routine.runs.view"),
					type: "button",
					icon: "clock",
					onClick: props.onRuns,
				},
				{
					label: T()("agent.routine.run.now"),
					type: "button",
					icon: "rotate",
					variant: "primary",
					disabled:
						props.runPending || getAgentUnavailableReason() !== undefined,
					onClick: props.onRun,
					excludeFromRowClick: true,
				},
				{
					label: props.routine.enabled
						? T()("agent.routine.pause")
						: T()("agent.routine.resume"),
					type: "button",
					icon: props.routine.enabled ? "ban" : "check",
					variant: props.routine.enabled ? "danger" : "primary",
					onClick: props.onToggle,
					excludeFromRowClick: true,
				},
				{
					label: T()("common.delete"),
					type: "button",
					icon: "trash",
					variant: "danger",
					show: props.routine.source === "database",
					onClick: props.onDelete,
					excludeFromRowClick: true,
				},
			]}
		>
			<Table.Text
				column="name"
				text={props.routine.name}
				minWidth={260}
				maxLines={1}
			/>
			<Table.Pill
				column="enabled"
				text={
					pause().paused
						? T()("agent.routine.paused")
						: T()("agent.routine.active")
				}
				variant={pause().paused ? "warning-subtle" : "success-subtle"}
				tooltip={pause().reason}
			/>
			<Table.Pill
				column="source"
				text={T()(`agent.routine.source.${props.routine.source}`)}
				variant="neutral"
			/>
			<Table.Text
				column="agentKey"
				text={getAgentName(props.routine.agentKey)}
				minWidth={160}
				maxLines={1}
			/>
			<Table.Text
				column="schedule"
				text={`${describeSchedule(props.routine.cron)} · ${props.routine.timezone}`}
				minWidth={240}
				maxLines={1}
			/>
			<Table.Date
				column="nextRunAt"
				date={pause().paused ? null : props.routine.nextRunAt}
				includeTime={true}
			/>
			<Table.Cell column="lastRun" minWidth={140}>
				<Show
					when={props.routine.lastRun}
					fallback={<span class="text-sm text-muted">-</span>}
				>
					{(run) => (
						<AgentRunStatus
							status={run().status}
							outcome={run().outcome}
							size="sm"
						/>
					)}
				</Show>
			</Table.Cell>
		</Table.Row>
	);
};

export default AgentRoutineTableRow;
