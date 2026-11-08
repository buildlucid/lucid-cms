import { AgentMessagesRepository } from "../../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../../utils/services/types.js";

/** The timezone of the message that started a run, so its sub-agents see the same local time. Null when the run has no request message, eg. a retry. */
const getRunTimezone: ServiceFn<[{ runId: string }], string | null> = async (
	context,
	input,
) => {
	const Messages = new AgentMessagesRepository(context.db);

	//* a run's request message shares its ID
	const request = await Messages.selectSingle({
		select: ["parts"],
		where: [{ key: "id", operator: "=", value: input.runId }],
	});
	if (request.error) return request;

	return {
		error: undefined,
		data:
			request.data?.parts.find((part) => part.type === "context")?.timezone ??
			null,
	};
};

export default getRunTimezone;
