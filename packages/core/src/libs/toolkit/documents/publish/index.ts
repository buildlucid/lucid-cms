import type z from "zod";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";

export type ToolkitDocumentsPublishInput = z.input<typeof inputSchema>;

/** Publishes latest to an environment that doesn't require review. */
const publish = (
	context: ServiceContext,
	input: ToolkitDocumentsPublishInput,
): ServiceResponse<undefined> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async ({ actor, id, ...data }) => {
			const [{ default: resolveActorUser }, { default: publish }] =
				await Promise.all([
					import("../../../../services/users/helpers/resolve-actor-user.js"),
					import("../../../../services/documents/publish.js"),
				]);

			const userRes = await resolveActorUser(context, { actor });
			if (userRes.error) return userRes;

			return publish(context, {
				...data,
				documentId: id,
				user: userRes.data,
				agentRunId: actor.agentRunId,
			});
		},
		name: { key: "core.toolkit.documents.publish.error.name" },
		message: { key: "core.toolkit.documents.publish.error.message" },
	});

export default publish;
