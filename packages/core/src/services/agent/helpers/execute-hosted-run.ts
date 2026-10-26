import {
	findRunStream,
	startRunStream,
} from "../../../libs/agent/run-stream.js";
import type { AgentRunStart } from "../../../libs/agent/types.js";
import { copy } from "../../../libs/i18n/index.js";
import LucidError from "../../../utils/errors/lucid-error.js";
import serviceWrapper from "../../../utils/services/service-wrapper.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import executeRunSlice from "./execute-run-slice.js";

/** Executes a hosted slice through the host's existing or replacement stream, preserving first-event delivery and rejecting server failures or active leases so retries retain answers while viewers follow saved state without an error. */
const executeHostedRun = async (
	context: ServiceContext,
	input: AgentRunStart,
) => {
	const opened = findRunStream(context.config, input.runId);
	const stream = opened?.active
		? opened
		: startRunStream(context.config, input.runId);

	try {
		const result = await serviceWrapper(executeRunSlice, {
			transaction: false,
			logError: true,
		})(context, {
			...input,
			emit: async (event) => {
				stream.publish(event);
			},
		});
		if (!result.error) return;

		const message = context.translate(
			result.error.message ?? copy("server:core.errors.default.message"),
		);
		if (
			(result.error.status ?? 500) >= 500 ||
			result.error.key === "agent_run_superseded"
		) {
			throw new LucidError({ message, data: { runId: input.runId } });
		}

		stream.publish({ type: "error", message });
	} finally {
		stream.close();
	}
};

export default executeHostedRun;
