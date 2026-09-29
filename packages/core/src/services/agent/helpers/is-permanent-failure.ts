import { AiGenerationsRepository } from "../../../libs/repositories/index.js";
import type { LucidErrorData } from "../../../types/errors.js";
import type { ServiceContext } from "../../../utils/services/types.js";

/**
 * Whether a failed model request fails its run rather than interrupting it for
 * a retry: the model failed a request the Lucid service settled, or the
 * service refused the request outright. Conflicts and server errors can pass.
 */
const isPermanentFailure = async (
	context: ServiceContext,
	props: { error: LucidErrorData; requestId?: string },
) => {
	if (props.error.key === "agent_model_failed" && props.requestId) {
		const AiGenerations = new AiGenerationsRepository(context.db);
		const usage = await AiGenerations.selectSingleByRequestId({
			requestId: props.requestId,
			select: ["status"],
		});
		if (usage.data?.status === "failed") return true;
	}

	const { status } = props.error;
	return status !== undefined && status < 500 && status !== 409;
};

export default isPermanentFailure;
