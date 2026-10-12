import constants from "../../constants/constants.js";
import logger from "../../libs/logger/index.js";
import { AgentInputsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import advanceInputs from "./advance-inputs.js";

/** Repairs steers left by stopped runs and starts lost between saving input and dispatching its run. */
const recoverInputs: ServiceFn<[], undefined> = async (context) => {
	const Inputs = new AgentInputsRepository(context.db);

	const recoverable = await Inputs.selectRecoverable();
	if (recoverable.error) return recoverable;

	for (const item of recoverable.data) {
		const result = await advanceInputs(context, {
			conversationId: item.conversation_id,
		});
		if (result.error) {
			logger.error({
				message: `Agent inputs for conversation ${item.conversation_id} could not be recovered: ${context.translate(result.error.message)}`,
				scope: constants.logScopes.ai,
			});
		}
	}

	return { error: undefined, data: undefined };
};

export default recoverInputs;
