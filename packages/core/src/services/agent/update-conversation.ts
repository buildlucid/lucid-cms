import { copy } from "../../libs/i18n/index.js";
import { AgentConversationsRepository } from "../../libs/repositories/index.js";
import type {
	AgentApprovalMode,
	AgentConversation,
	AiModelSelection,
} from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getConversation from "./get-conversation.js";
import getAccessibleConversation from "./helpers/get-accessible-conversation.js";
import resolveModel from "./helpers/resolve-model.js";

const updateConversation: ServiceFn<
	[
		{
			id: string;
			userId: number;
			title?: string;
			approvalMode?: AgentApprovalMode;
			modelSelection?: AiModelSelection;
		},
	],
	AgentConversation
> = async (context, input) => {
	const conversation = await getAccessibleConversation(context, input);
	if (conversation.error) return conversation;

	if (
		conversation.data.routine_id &&
		input.approvalMode !== undefined &&
		input.approvalMode !== "tool-defaults"
	) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 400,
				message: copy("server:agent.routine.approval.locked"),
			},
		};
	}

	//* the choice is checked now, so the picker never saves a model the run would swap out
	const model = input.modelSelection
		? await resolveModel(context, {
				agentKey: conversation.data.agent_key,
				routineId: conversation.data.routine_id,
				selection: input.modelSelection,
			})
		: undefined;
	if (model?.error) return model;
	if (model && model.data.model.id !== input.modelSelection?.modelId) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 400,
				message: copy("server:agent.models.invalid"),
			},
		};
	}

	//* the context ring measures against the model's limit, so it follows the new choice straight away
	const current = conversation.data.context;
	const nextContext =
		model && current && current.model !== model.data.model.id
			? {
					...current,
					model: model.data.model.id,
					tokenLimit: model.data.model.inputTokenLimit,
				}
			: undefined;

	const AgentConversation = new AgentConversationsRepository(context.db);

	const updated = await AgentConversation.updateSingle({
		where: [{ key: "id", operator: "=", value: input.id }],
		data: {
			title: input.title,
			title_status: input.title !== undefined ? "user_set" : undefined,
			approval_mode: input.approvalMode,
			model_selection: model?.data.selection,
			context: nextContext,
			updated_at: new Date().toISOString(),
		},
	});
	if (updated.error) return updated;

	return getConversation(context, input);
};

export default updateConversation;
