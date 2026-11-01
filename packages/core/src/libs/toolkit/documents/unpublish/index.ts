import type z from "zod";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";

export type ToolkitDocumentsUnpublishInput = z.input<typeof inputSchema>;

/** Unpublishes a document from an environment that doesn't require review. */
const unpublish = (
	context: ServiceContext,
	input: ToolkitDocumentsUnpublishInput,
): ServiceResponse<undefined> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async ({ actor, id, ...data }) => {
			const [{ default: resolveActorUser }, { default: unpublish }] =
				await Promise.all([
					import("../../../../services/users/helpers/resolve-actor-user.js"),
					import("../../../../services/documents/unpublish.js"),
				]);

			const userRes = await resolveActorUser(context, { actor });
			if (userRes.error) return userRes;

			return unpublish(context, {
				...data,
				documentId: id,
				user: userRes.data,
				agentRunId: actor.agentRunId,
			});
		},
		name: { key: "core.toolkit.documents.unpublish.error.name" },
		message: { key: "core.toolkit.documents.unpublish.error.message" },
	});

export default unpublish;
