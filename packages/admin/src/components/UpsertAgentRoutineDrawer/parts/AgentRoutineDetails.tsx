import type { AgentRoutine } from "@types";
import type { Component } from "solid-js";
import DetailsList from "@/components/DetailsList/DetailsList";
import T from "@/translations";
import { getAgentName } from "@/utils/agent-access";
import { describeSchedule } from "@/utils/agent-schedule";

const AgentRoutineDetails: Component<{ routine: AgentRoutine }> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<>
			<DetailsList
				items={[
					{ label: T()("common.name"), value: props.routine.name },
					{
						label: T()("agent.select.label"),
						value: getAgentName(props.routine.agentKey),
					},
					{
						label: T()("common.schedule"),
						value: `${describeSchedule(props.routine.cron)} · ${props.routine.timezone}`,
						wrap: true,
					},
				]}
			/>
			<section class="rounded-md border border-border bg-card p-4">
				<h3 class="mb-2 text-sm font-medium text-title">
					{T()("agent.routine.instructions")}
				</h3>
				<p class="whitespace-pre-wrap wrap-break-word text-sm leading-6 text-body">
					{props.routine.instructions}
				</p>
			</section>
		</>
	);
};

export default AgentRoutineDetails;
