import type { AgentInput } from "@lucidcms/types";
import { agentFormatter } from "../../../libs/formatters/index.js";
import { AgentInputsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** The person's undelivered input, in queue order. Messages from a parent agent are left out. */
const getInputs: ServiceFn<[{ conversationId: string }], AgentInput[]> = async (
	context,
	input,
) => {
	const Inputs = new AgentInputsRepository(context.db);

	const result = await Inputs.selectDeliverable(input.conversationId);
	if (result.error) return result;

	return {
		error: undefined,
		data: result.data
			.filter((row) => row.source === "person")
			.map((row) => agentFormatter.formatInput({ input: row })),
	};
};

export default getInputs;
