import type { AgentRoutine } from "@types";
import { type Component, createMemo } from "solid-js";
import AgentMarkdown from "@/components/AgentMarkdown/AgentMarkdown";
import DetailsList from "@/components/DetailsList/DetailsList";
import SectionHeading from "@/components/SectionHeading/SectionHeading";
import api from "@/services/api";
import T from "@/translations";
import { conversationModeLabels, getAgentName } from "@/utils/agent-access";
import { describeTriggers } from "@/utils/agent-routine-events";

/** A code routine's read-only details, shown in place of the routine form. */
const AgentRoutineDetails: Component<{ routine: AgentRoutine }> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const models = api.agent.useGetModels({
		agentKey: () => props.routine.agentKey,
		routineId: () => props.routine.id,
	});

	// ----------------------------------------
	// Memos
	const model = createMemo(() => {
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
				layout="columns"
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
						label: T()("agent.routine.conversation.label"),
						value: T()(conversationModeLabels[props.routine.conversationMode]),
					},
					{
						label: T()("agent.routine.triggers"),
						value: describeTriggers(props.routine),
						wrap: true,
					},
				]}
			/>
			<div>
				<SectionHeading title={T()("agent.routine.instructions")} level={3} />
				<div class="mb-3 rounded-md border border-border bg-card p-4 last:mb-0">
					{/* matches the instructions editor, so code and admin routines read the same */}
					<AgentMarkdown
						text={props.routine.instructions}
						class="agent-markdown-compact"
					/>
				</div>
			</div>
		</>
	);
};

export default AgentRoutineDetails;
