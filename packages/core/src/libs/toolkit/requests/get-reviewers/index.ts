import type z from "zod";
import type { UserDisplay } from "../../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";

/** A request to list reviewers for, optionally read as a user. */
export type ToolkitRequestsGetReviewersInput = z.input<typeof inputSchema>;

/** Lists people who can approve a request, leaving out its creator unless the collections allow self-approval. */
const getReviewers = (
	context: ServiceContext,
	input: ToolkitRequestsGetReviewersInput,
): ServiceResponse<UserDisplay[]> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const [{ default: resolveActorUser }, { default: getReviewers }] =
				await Promise.all([
					import("../../../../services/users/helpers/resolve-actor-user.js"),
					import("../../../../services/requests/get-reviewers.js"),
				]);

			const userRes = await resolveActorUser(context, { actor: data.actor });
			if (userRes.error) return userRes;

			return getReviewers(context, { id: data.id, user: userRes.data });
		},
		name: { key: "core.toolkit.requests.get-reviewers.error.name" },
		message: { key: "core.toolkit.requests.get-reviewers.error.message" },
	});

export default getReviewers;
