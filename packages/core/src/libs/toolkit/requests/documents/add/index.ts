import type z from "zod";
import type { CollectionDocumentKey } from "../../../../../exports/types.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../../utils/services/types.js";
import { runToolkitService } from "../../../utils.js";
import runRequestService from "../../run-request-service.js";
import type { ToolkitRequestDocument } from "../../types.js";
import { inputSchema } from "./schema.js";

/** Documents to add to a publish, unpublish or delete request. */
export type ToolkitRequestsDocumentsAddInput<
	K extends CollectionDocumentKey = CollectionDocumentKey,
> = Omit<z.input<typeof inputSchema>, "documents"> & {
	documents: ToolkitRequestDocument<K>[];
};

/** Adds documents to a request, capturing publish content and withdrawing approvals. */
const add = <K extends CollectionDocumentKey>(
	context: ServiceContext,
	input: ToolkitRequestsDocumentsAddInput<K>,
): ServiceResponse<undefined> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async ({ actor, ...data }) => {
			const { default: addDocuments } = await import(
				"../../../../../services/requests/add-documents.js"
			);

			return runRequestService(context, {
				actor,
				transaction: true,
				run: (context, user) =>
					addDocuments(context, {
						...data,
						user,
						agentRunId: actor.agentRunId,
					}),
			});
		},
		name: { key: "core.toolkit.requests.documents.add.error.name" },
		message: { key: "core.toolkit.requests.documents.add.error.message" },
	});

export default add;
