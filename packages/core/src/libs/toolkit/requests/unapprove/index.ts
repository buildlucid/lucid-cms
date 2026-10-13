import type z from "zod";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";

export type ToolkitRequestsUnapproveInput = z.input<typeof inputSchema>;

/** Withdraws the person's approval. Other approvals still count, but an approved request needs approving again. */
const unapprove = (
	context: ServiceContext,
	input: ToolkitRequestsUnapproveInput,
): ServiceResponse<undefined> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async ({ actor, ...data }) => {
			const [
				{ default: resolveActorUser },
				{ default: serviceWrapper },
				{ default: unapprove },
			] = await Promise.all([
				import("../../../../services/users/helpers/resolve-actor-user.js"),
				import("../../../../utils/services/service-wrapper.js"),
				import("../../../../services/requests/unapprove.js"),
			]);

			return serviceWrapper(
				async (context: ServiceContext): ServiceResponse<undefined> => {
					const userRes = await resolveActorUser(context, { actor });
					if (userRes.error) return userRes;

					return unapprove(context, {
						...data,
						user: userRes.data,
						agentRunId: actor.agentRunId,
					});
				},
				{ transaction: true },
			)(context);
		},
		name: { key: "core.toolkit.requests.unapprove.error.name" },
		message: { key: "core.toolkit.requests.unapprove.error.message" },
	});

export default unapprove;
