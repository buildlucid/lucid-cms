import type z from "zod";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../../utils/services/types.js";
import { runToolkitService } from "../../../utils.js";
import { inputSchema } from "./schema.js";

/** A comment, or a reply to one. */
export type ToolkitRequestsCommentsCreateInput = z.input<typeof inputSchema>;

/** Adds a comment or reply, dismissing approvals only for top-level comments. */
const create = (
	context: ServiceContext,
	input: ToolkitRequestsCommentsCreateInput,
): ServiceResponse<{ id: number }> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async ({ actor, replyTo, ...data }) => {
			const [
				{ default: resolveActorUser },
				{ default: serviceWrapper },
				{ default: createComment },
			] = await Promise.all([
				import("../../../../../services/users/helpers/resolve-actor-user.js"),
				import("../../../../../utils/services/service-wrapper.js"),
				import("../../../../../services/requests/create-comment.js"),
			]);

			return serviceWrapper(
				async (context: ServiceContext): ServiceResponse<{ id: number }> => {
					const userRes = await resolveActorUser(context, { actor });
					if (userRes.error) return userRes;

					return createComment(context, {
						...data,
						parentId: replyTo,
						user: userRes.data,
						agentRunId: actor.agentRunId,
					});
				},
				{ transaction: true },
			)(context);
		},
		name: { key: "core.toolkit.requests.comments.create.error.name" },
		message: { key: "core.toolkit.requests.comments.create.error.message" },
	});

export default create;
