import type z from "zod";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../../utils/services/types.js";
import { runToolkitService } from "../../../utils.js";
import { inputSchema } from "./schema.js";

/** A top-level comment to resolve, close or reopen. */
export type ToolkitRequestsCommentsResolveInput = z.input<typeof inputSchema>;

/** Resolves, closes or reopens a comment's thread on an open request. */
const resolve = (
	context: ServiceContext,
	input: ToolkitRequestsCommentsResolveInput,
): ServiceResponse<undefined> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async ({ actor, ...data }) => {
			const [
				{ default: resolveActorUser },
				{ default: serviceWrapper },
				{ default: updateCommentResolution },
			] = await Promise.all([
				import("../../../../../services/users/helpers/resolve-actor-user.js"),
				import("../../../../../utils/services/service-wrapper.js"),
				import("../../../../../services/requests/update-comment-resolution.js"),
			]);

			return serviceWrapper(
				async (context: ServiceContext): ServiceResponse<undefined> => {
					const userRes = await resolveActorUser(context, { actor });
					if (userRes.error) return userRes;

					return updateCommentResolution(context, {
						...data,
						user: userRes.data,
						agentRunId: actor.agentRunId,
					});
				},
				{ transaction: true },
			)(context);
		},
		name: { key: "core.toolkit.requests.comments.resolve.error.name" },
		message: { key: "core.toolkit.requests.comments.resolve.error.message" },
	});

export default resolve;
