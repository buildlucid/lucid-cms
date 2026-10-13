import type z from "zod";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import type { ToolkitRequestTarget } from "../types.js";
import { inputSchema } from "./schema.js";

/** Targets to acknowledge, as they were when the request was read. */
export type ToolkitRequestsAcknowledgeInput = z.input<typeof inputSchema>;

/** Acknowledges targets someone else published to since the request was opened, so it can be approved. */
const acknowledge = (
	context: ServiceContext,
	input: ToolkitRequestsAcknowledgeInput,
): ServiceResponse<{ targets: ToolkitRequestTarget[] }> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async ({ actor, ...data }) => {
			const [
				{ default: resolveActorUser },
				{ default: serviceWrapper },
				{ default: acknowledge },
			] = await Promise.all([
				import("../../../../services/users/helpers/resolve-actor-user.js"),
				import("../../../../utils/services/service-wrapper.js"),
				import("../../../../services/requests/acknowledge.js"),
			]);

			return serviceWrapper(
				async (
					context: ServiceContext,
				): ServiceResponse<{ targets: ToolkitRequestTarget[] }> => {
					const userRes = await resolveActorUser(context, { actor });
					if (userRes.error) return userRes;

					return acknowledge(context, {
						...data,
						user: userRes.data,
						agentRunId: actor.agentRunId,
					});
				},
				{ transaction: true },
			)(context);
		},
		name: { key: "core.toolkit.requests.acknowledge.error.name" },
		message: { key: "core.toolkit.requests.acknowledge.error.message" },
	});

export default acknowledge;
