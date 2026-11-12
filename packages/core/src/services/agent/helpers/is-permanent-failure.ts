import type { LucidErrorData } from "../../../types/errors.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import wasUncharged from "./was-uncharged.js";

/**
 * Whether a failed model request fails its run rather than interrupting it for
 * a retry: the model failed a request the Lucid service settled, or the
 * service refused the request outright. Conflicts and server errors can pass.
 */
const isPermanentFailure = async (
	context: ServiceContext,
	props: { error: LucidErrorData; requestId?: string },
) => {
	if (
		props.error.key === "agent_model_failed" &&
		props.requestId &&
		(await wasUncharged(context, props.requestId))
	) {
		return true;
	}

	const { status } = props.error;
	return status !== undefined && status < 500 && status !== 409;
};

export default isPermanentFailure;
