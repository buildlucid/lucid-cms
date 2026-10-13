import type z from "zod";
import type { RequestDetails } from "../../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";

/** A request to read, optionally as a user. */
export type ToolkitRequestsGetSingleInput = z.input<typeof inputSchema>;

/** Returns a request with its documents, activity, blockers, the actor's permissions and a review token. */
const getSingle = (
	context: ServiceContext,
	input: ToolkitRequestsGetSingleInput,
): ServiceResponse<RequestDetails> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const [{ default: resolveActorUser }, { default: getSingle }] =
				await Promise.all([
					import("../../../../services/users/helpers/resolve-actor-user.js"),
					import("../../../../services/requests/get-single.js"),
				]);

			const userRes = await resolveActorUser(context, { actor: data.actor });
			if (userRes.error) return userRes;

			return getSingle(context, { id: data.id, user: userRes.data });
		},
		name: { key: "core.toolkit.requests.get-single.error.name" },
		message: { key: "core.toolkit.requests.get-single.error.message" },
	});

export default getSingle;
