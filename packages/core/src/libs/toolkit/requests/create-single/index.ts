import type z from "zod";
import type { CollectionDocumentKey } from "../../../../exports/types.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import runRequestService from "../run-request-service.js";
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
			const { default: createSingle } = await import(
				"../../../../services/requests/create-single.js"
			);

			return runRequestService(context, {
				actor,
				transaction: true,
				run: (context, user) =>
					createSingle(context, {
						...data,
						user,
						agentRunId: actor.agentRunId,
					}),
			});
		},
		name: { key: "core.toolkit.requests.create-single.error.name" },
		message: { key: "core.toolkit.requests.create-single.error.message" },
	});

export default createSingle;
