import type z from "zod";
import type { CollectionDocumentKey } from "../../../../exports/types.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import type { ToolkitRequestDocument } from "../types.js";
import { inputSchema } from "./schema.js";

/** A publish, unpublish or delete request to open. */
export type ToolkitRequestsCreateSingleInput<
	K extends CollectionDocumentKey = CollectionDocumentKey,
> = Omit<z.input<typeof inputSchema>, "documents"> & {
	documents: ToolkitRequestDocument<K>[];
};

/** Opens a publish, unpublish or delete request for people to review. */
const createSingle = <K extends CollectionDocumentKey>(
	context: ServiceContext,
	input: ToolkitRequestsCreateSingleInput<K>,
): ServiceResponse<{ id: number }> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async ({ actor, ...data }) => {
			const [
				{ default: resolveActorUser },
				{ default: serviceWrapper },
				{ default: createSingle },
			] = await Promise.all([
				import("../../../../services/users/helpers/resolve-actor-user.js"),
				import("../../../../utils/services/service-wrapper.js"),
				import("../../../../services/requests/create-single.js"),
			]);

			return serviceWrapper(
				async (context: ServiceContext): ServiceResponse<{ id: number }> => {
					const userRes = await resolveActorUser(context, { actor });
					if (userRes.error) return userRes;

					return createSingle(context, {
						...data,
						user: userRes.data,
						agentRunId: actor.agentRunId,
					});
				},
				{ transaction: true },
			)(context);
		},
		name: { key: "core.toolkit.requests.create-single.error.name" },
		message: { key: "core.toolkit.requests.create-single.error.message" },
	});

export default createSingle;
