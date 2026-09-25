import { copy } from "../../../libs/i18n/index.js";
import { AgentRunsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

const getOwnedRun: ServiceFn<
	[{ runId: string; userId: number }],
	{ id: string; conversationId: string }
> = async (context, input) => {
	const AgentRuns = new AgentRunsRepository(context.db);

	const result = await AgentRuns.selectSingle({
		select: ["id", "conversation_id"],
		where: [
			{ key: "id", operator: "=", value: input.runId },
			{ key: "user_id", operator: "=", value: input.userId },
		],
	});
	if (result.error) return result;
	if (!result.data) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 404,
				message: copy("server:agent.run.not.found"),
			},
		};
	}

	return {
		error: undefined,
		data: { id: result.data.id, conversationId: result.data.conversation_id },
	};
};

export default getOwnedRun;
