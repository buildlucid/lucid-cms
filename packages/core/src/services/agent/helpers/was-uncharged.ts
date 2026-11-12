import { AiGenerationsRepository } from "../../../libs/repositories/index.js";
import type { ServiceContext } from "../../../utils/services/types.js";

/**
 * Identifies requests settled without charge. Retries need a new ID because settled IDs retain
 * their original usage.
 */
const wasUncharged = async (context: ServiceContext, requestId: string) => {
	const AiGenerations = new AiGenerationsRepository(context.db);
	const usage = await AiGenerations.selectSingleByRequestId({
		requestId,
		select: ["status"],
	});
	return usage.data?.status === "failed";
};

export default wasUncharged;
