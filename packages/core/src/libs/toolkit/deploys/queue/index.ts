import type z from "zod";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";

export type ToolkitDeploysQueueInput = z.input<typeof inputSchema>;

/** Queues a deploy like a trigger does, so it starts once changes go quiet for its debounce. */
const queue = (
	context: ServiceContext,
	input: ToolkitDeploysQueueInput,
): ServiceResponse<undefined> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const [{ default: serviceWrapper }, { default: queueDeploy }] =
				await Promise.all([
					import("../../../../utils/services/service-wrapper.js"),
					import("../../../../services/deploys/queue.js"),
				]);

			return serviceWrapper(queueDeploy, { transaction: true })(context, data);
		},
		name: { key: "core.toolkit.deploys.error.name" },
		message: { key: "core.toolkit.deploys.queue.error.message" },
	});

export default queue;
