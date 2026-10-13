import type z from "zod";
import type { CollectionDocumentKey } from "../../../../../exports/types.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../../utils/services/types.js";
import { runToolkitService } from "../../../utils.js";
import type { ToolkitRequestDocument } from "../../types.js";
import { inputSchema } from "./schema.js";

/** Documents to add to a publish, unpublish or delete request. */
export type ToolkitRequestsDocumentsAddInput<
	K extends CollectionDocumentKey = CollectionDocumentKey,
> = Omit<z.input<typeof inputSchema>, "documents"> & {
	documents: ToolkitRequestDocument<K>[];
};

/** Adds documents to a request, capturing publish content and dismissing approvals. */
const add = <K extends CollectionDocumentKey>(
	context: ServiceContext,
	input: ToolkitRequestsDocumentsAddInput<K>,
): ServiceResponse<undefined> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async ({ actor, ...data }) => {
			const [
				{ default: resolveActorUser },
				{ default: serviceWrapper },
				{ default: addDocuments },
			] = await Promise.all([
				import("../../../../../services/users/helpers/resolve-actor-user.js"),
				import("../../../../../utils/services/service-wrapper.js"),
				import("../../../../../services/requests/add-documents.js"),
			]);

			return serviceWrapper(
				async (context: ServiceContext): ServiceResponse<undefined> => {
					const userRes = await resolveActorUser(context, { actor });
					if (userRes.error) return userRes;

					return addDocuments(context, {
						...data,
						user: userRes.data,
						agentRunId: actor.agentRunId,
					});
				},
				{ transaction: true },
			)(context);
		},
		name: { key: "core.toolkit.requests.documents.add.error.name" },
		message: { key: "core.toolkit.requests.documents.add.error.message" },
	});

export default add;
