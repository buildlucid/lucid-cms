import type { AgentStreamEvent } from "@lucidcms/types";
import constants from "../../../constants/constants.js";
import formatter from "../../../libs/formatters/index.js";
import logger from "../../../libs/logger/index.js";
import { AgentConversationsRepository } from "../../../libs/repositories/index.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import advanceInputs from "./advance-inputs.js";
import getInputsEvent from "./get-inputs-event.js";

/**
 * Starts the next queued message once a run lets go of the conversation, and
 * tells an open chat so it follows the new run straight away.
 */
const continueQueue = async (
	context: ServiceContext,
	props: {
		conversationId: string;
		emit?: (event: AgentStreamEvent) => Promise<void>;
	},
) => {
	const Conversations = new AgentConversationsRepository(context.db);

	//* usually nothing is waiting, so the chat only needs to hear whether its queue is paused
	const state = await Conversations.selectQueueState(props.conversationId);
	if (state.error) {
		logger.error({
			message: `Agent queue for conversation ${props.conversationId} could not be read: ${context.translate(state.error.message)}`,
			scope: constants.logScopes.ai,
		});
		return;
	}
	if (!formatter.formatBoolean(state.data?.has_input)) {
		if (props.emit && state.data) {
			await props.emit({
				type: "inputs",
				inputs: [],
				queuePaused: formatter.formatBoolean(state.data.queue_paused),
			});
		}
		return;
	}

	const advanced = await advanceInputs(context, {
		conversationId: props.conversationId,
	});
	if (advanced.error) {
		logger.error({
			message: `Agent input for conversation ${props.conversationId} could not advance: ${context.translate(advanced.error.message)}`,
			scope: constants.logScopes.ai,
		});
		return;
	}
	if (!props.emit) return;

	if (advanced.data.runId) {
		await props.emit({ type: "next", runId: advanced.data.runId });
	}
	const queue = await getInputsEvent(context, {
		conversationId: props.conversationId,
	});
	if (queue.data) await props.emit(queue.data);
};

export default continueQueue;
