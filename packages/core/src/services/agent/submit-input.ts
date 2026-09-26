import { copy } from "../../libs/i18n/index.js";
import {
	AgentConversationsRepository,
	AgentInputsRepository,
	AgentRunsRepository,
} from "../../libs/repositories/index.js";
import type { AgentDelivery } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import advanceInputs from "./advance-inputs.js";
import getAccessibleConversation from "./helpers/get-accessible-conversation.js";

/**
 * Records input sent to a conversation. Sending resumes a paused queue, since the
 * user chose to carry on. Only a run acting for the sender can be steered; other
 * input starts its own run.
 */
const submitInput: ServiceFn<
	[
		{
			conversationId: string;
			userId: number;
			requestId: string;
			text: string;
			delivery: AgentDelivery;
			dispatch?: boolean;
		},
	],
	{ runId: string | null }
> = async (context, input) => {
	const owned = await getAccessibleConversation(context, {
		id: input.conversationId,
		userId: input.userId,
	});
	if (owned.error) return owned;

	const Inputs = new AgentInputsRepository(context.db);
	const Conversations = new AgentConversationsRepository(context.db);
	const Runs = new AgentRunsRepository(context.db);

	//* a stale target is queued rather than injected into another run
	let targetRunId: string | null = null;
	if (
		input.delivery.kind === "steer" &&
		owned.data.active_run_id === input.delivery.targetRunId
	) {
		const target = await Runs.selectSingle({
			select: ["user_id"],
			where: [{ key: "id", operator: "=", value: input.delivery.targetRunId }],
		});
		if (target.error) return target;
		if (target.data?.user_id === input.userId) {
			targetRunId = input.delivery.targetRunId;
		}
	}

	const submitted = await Inputs.submit({
		id: input.requestId,
		conversationId: input.conversationId,
		userId: input.userId,
		text: input.text,
		targetRunId,
	});
	if (submitted.error) return submitted;

	//* a retry must repeat the original submission
	const receipt = await Inputs.selectSingle({
		select: ["conversation_id", "user_id", "text"],
		where: [{ key: "id", operator: "=", value: input.requestId }],
	});
	if (receipt.error) return receipt;

	if (
		receipt.data?.conversation_id !== input.conversationId ||
		receipt.data.user_id !== input.userId ||
		receipt.data.text !== input.text
	) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 409,
				message: copy("server:agent.input.changed"),
			},
		};
	}

	if (owned.data.queue_paused) {
		const resumed = await Conversations.updateSingle({
			where: [{ key: "id", operator: "=", value: input.conversationId }],
			data: { queue_paused: false },
		});
		if (resumed.error) return resumed;
	}

	return advanceInputs(context, input);
};

export default submitInput;
