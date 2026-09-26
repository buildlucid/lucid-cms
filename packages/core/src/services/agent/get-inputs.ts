import { agentFormatter } from "../../libs/formatters/index.js";
import { AgentInputsRepository } from "../../libs/repositories/index.js";
import type { AgentInput } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** The conversation's undelivered input, in queue order. */
const getInputs: ServiceFn<[{ conversationId: string }], AgentInput[]> = async (
	context,
	input,
) => {
	const Inputs = new AgentInputsRepository(context.db);

	const result = await Inputs.selectDeliverable(input.conversationId);
	if (result.error) return result;

	return {
		error: undefined,
		data: result.data.map((row) => agentFormatter.formatInput({ input: row })),
	};
};

export default getInputs;
