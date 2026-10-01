import type { RunStream } from "../../libs/agent/run-stream.js";
import { copy } from "../../libs/i18n/index.js";
import type { AgentRunStatus } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import executeRunSlice from "./helpers/execute-run-slice.js";

/** Runs one slice. A viewer's replay buffer receives its events, then closes when the slice stops. */
const executeRun: ServiceFn<
	[Parameters<typeof executeRunSlice>[1] & { stream?: RunStream }],
	{ status: AgentRunStatus }
> = async (context, { stream, ...input }) => {
	if (!stream) return executeRunSlice(context, input);

	try {
		const result = await executeRunSlice(context, {
			...input,
			emit: async (event) => {
				stream.publish(event);
				await input.emit?.(event);
			},
		});
		if (result.error) {
			stream.publish({
				type: "error",
				message: context.translate(
					result.error.message ?? copy("server:core.errors.default.message"),
				),
			});
		}

		return result;
	} finally {
		stream.close();
	}
};

export default executeRun;
