import type z from "zod";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../../utils/services/types.js";
import { runToolkitService } from "../../../utils.js";
import runRequestService from "../../run-request-service.js";
import { inputSchema } from "./schema.js";

export type ToolkitRequestsDocumentsRemoveInput = z.input<typeof inputSchema>;

/** Removes a document and its captured content while keeping at least one document in the request. */
const remove = (
	context: ServiceContext,
	input: ToolkitRequestsDocumentsRemoveInput,
): ServiceResponse<undefined> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async ({ actor, ...data }) => {
			const [{ default: removeDocument }, { default: getRequestDocumentId }] =
				await Promise.all([
					import("../../../../../services/requests/remove-document.js"),
					import(
						"../../../../../services/requests/helpers/get-request-document-id.js"
					),
				]);

			return runRequestService(context, {
				actor,
				transaction: true,
				run: async (context, user) => {
					const documentRes = await getRequestDocumentId(context, {
						...data,
						user,
					});
					if (documentRes.error) return documentRes;

					return removeDocument(context, {
						id: data.id,
						requestDocumentId: documentRes.data,
						user,
						agentRunId: actor.agentRunId,
					});
				},
			});
		},
		name: { key: "core.toolkit.requests.documents.remove.error.name" },
		message: { key: "core.toolkit.requests.documents.remove.error.message" },
	});

export default remove;
