import type z from "zod";
import type { CollectionDocumentKey } from "../../../../../exports/types.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../../utils/services/types.js";
import type { ToolkitDocumentVersion } from "../../../documents/index.js";
import { runToolkitService } from "../../../utils.js";
import runRequestService from "../../run-request-service.js";
import { inputSchema } from "./schema.js";

/** A document's new targets in a publish or unpublish request. */
export type ToolkitRequestsDocumentsSetTargetsInput<
	K extends CollectionDocumentKey = CollectionDocumentKey,
> = Omit<z.input<typeof inputSchema>, "collectionKey" | "targets"> & {
	collectionKey: K;
	targets: ToolkitDocumentVersion<K>[];
};

/** Replaces a request document's targets and withdraws approvals. */
const setTargets = <K extends CollectionDocumentKey>(
	context: ServiceContext,
	input: ToolkitRequestsDocumentsSetTargetsInput<K>,
): ServiceResponse<undefined> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async ({ actor, ...data }) => {
			const [{ default: updateTargets }, { default: getRequestDocumentId }] =
				await Promise.all([
					import("../../../../../services/requests/update-targets.js"),
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

					return updateTargets(context, {
						id: data.id,
						requestDocumentId: documentRes.data,
						targets: data.targets,
						user,
						agentRunId: actor.agentRunId,
					});
				},
			});
		},
		name: { key: "core.toolkit.requests.documents.set-targets.error.name" },
		message: {
			key: "core.toolkit.requests.documents.set-targets.error.message",
		},
	});

export default setTargets;
