import { copy } from "../../libs/i18n/index.js";
import {
	AgentConversationsRepository,
	AgentInputsRepository,
	AgentRunsRepository,
} from "../../libs/repositories/index.js";
import type { AgentInputAction } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import advanceInputs from "./advance-inputs.js";
import getAccessibleConversation from "./helpers/get-accessible-conversation.js";

/** Cancels or steers pending input, or resumes or clears a paused queue. */
const updateInput: ServiceFn<
	[{ conversationId: string; userId: number; action: AgentInputAction }],
	undefined
> = async (context, input) => {
	const owned = await getAccessibleConversation(context, {
		id: input.conversationId,
		userId: input.userId,
	});
	if (owned.error) return owned;

	const Inputs = new AgentInputsRepository(context.db);
	const Conversations = new AgentConversationsRepository(context.db);
	const Runs = new AgentRunsRepository(context.db);

	const { action } = input;
	switch (action.kind) {
		case "cancel": {
			const cancelled = await Inputs.cancel({
				conversationId: input.conversationId,
				id: action.id,
			});
			if (cancelled.error) return cancelled;
			if (!cancelled.data) {
				return {
					data: undefined,
					error: {
						type: "basic",
						status: 409,
						message: copy("server:agent.input.changed"),
					},
				};
			}

			break;
		}
		case "steer": {
			if (owned.data.active_run_id !== action.targetRunId) {
				return {
					data: undefined,
					error: {
						type: "basic",
						status: 409,
						message: copy("server:agent.input.changed"),
					},
				};
			}

			//* a run only takes corrections from the person it acts for
			const target = await Runs.selectSingle({
				select: ["user_id"],
				where: [{ key: "id", operator: "=", value: action.targetRunId }],
			});
			if (target.error) return target;
			if (target.data?.user_id !== input.userId) {
				return {
					data: undefined,
					error: {
						type: "basic",
						status: 403,
						message: copy("server:agent.input.steer.denied"),
					},
				};
			}

			const steered = await Inputs.steer({
				conversationId: input.conversationId,
				userId: input.userId,
				id: action.id,
				runId: action.targetRunId,
			});
			if (steered.error) return steered;
			if (!steered.data) {
				return {
					data: undefined,
					error: {
						type: "basic",
						status: 409,
						message: copy("server:agent.input.changed"),
					},
				};
			}

			break;
		}
		case "clear": {
			const cleared = await Inputs.cancel({
				conversationId: input.conversationId,
			});
			if (cleared.error) return cleared;

			const resumed = await Conversations.updateSingle({
				where: [{ key: "id", operator: "=", value: input.conversationId }],
				data: { queue_paused: false },
			});
			if (resumed.error) return resumed;

			break;
		}
		case "resume": {
			const resumed = await Conversations.updateSingle({
				where: [{ key: "id", operator: "=", value: input.conversationId }],
				data: { queue_paused: false },
			});
			if (resumed.error) return resumed;

			break;
		}
	}

	const advanced = await advanceInputs(context, input);
	if (advanced.error) return advanced;

	return { error: undefined, data: undefined };
};

export default updateInput;
