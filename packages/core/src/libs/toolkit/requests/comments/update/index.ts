import type z from "zod";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../../utils/services/types.js";
import { runToolkitService } from "../../../utils.js";
import { inputSchema } from "./schema.js";

export type ToolkitRequestsCommentsUpdateInput = z.input<typeof inputSchema>;

/** Rewrites the actor's own comment or reply, restricting agent comments to their original agent identity. */
const update = (
	context: ServiceContext,
	input: ToolkitRequestsCommentsUpdateInput,
): ServiceResponse<undefined> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async ({ actor, ...data }) => {
			const [
				{ default: resolveActorUser },
				{ default: serviceWrapper },
				{ default: updateComment },
			] = await Promise.all([
				import("../../../../../services/users/helpers/resolve-actor-user.js"),
				import("../../../../../utils/services/service-wrapper.js"),
				import("../../../../../services/requests/update-comment.js"),
			]);

			return serviceWrapper(
				async (context: ServiceContext): ServiceResponse<undefined> => {
					const userRes = await resolveActorUser(context, { actor });
					if (userRes.error) return userRes;

					return updateComment(context, {
						...data,
						user: userRes.data,
						agentRunId: actor.agentRunId,
					});
				},
				{ transaction: true },
			)(context);
		},
		name: { key: "core.toolkit.requests.comments.update.error.name" },
		message: { key: "core.toolkit.requests.comments.update.error.message" },
	});

export default update;
