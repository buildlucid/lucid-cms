import constants from "../../../constants/constants.js";
import logger from "../../../libs/logger/index.js";
import type { AgentStreamEvent } from "../../../types/response.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import advanceInputs from "../advance-inputs.js";
import getInputsEvent from "../get-inputs-event.js";

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
