import type { AgentRoutine } from "@types";
import { type Component, createMemo } from "solid-js";
import DetailsList from "@/components/DetailsList/DetailsList";
import api from "@/services/api";
import T from "@/translations";
import { getAgentName } from "@/utils/agent-access";
import { describeSchedule } from "@/utils/agent-schedule";

const AgentRoutineDetails: Component<{ routine: AgentRoutine }> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const models = api.agent.useGetModels({
		agentKey: () => props.routine.agentKey,
		routineId: () => props.routine.id,
	});

	// ----------------------------------------
	// Memos
	//* the routine's model is the catalogue default when a routine is given
	const model = createMemo(() => {
		//* read only once loaded, as reading data while pending suspends the whole page
		const catalog = models.isSuccess ? models.data.data : undefined;
		const modelId =
			props.routine.modelSelection?.modelId ?? catalog?.default.modelId;
		return (
			catalog?.models.find((model) => model.id === modelId)?.name ?? modelId
		);
	});

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
						label: T()("agent.models.label"),
						value: model() ?? T()("agent.models.default.plain"),
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
