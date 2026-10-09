import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import systemActor from "../../../permission/system-actor.js";
import { runToolkitService } from "../../utils.js";
import type { DocumentWriteResult } from "../types.js";
import { inputSchema } from "./schema.js";
import type { ToolkitDocumentsUpdateSingleInput } from "./types.js";

export type * from "./types.js";

/** Updates latest or a request proposal, preserving omitted values and merging retained array items by ref. */
const updateSingle = <K extends string>(
	context: ServiceContext,
	input: ToolkitDocumentsUpdateSingleInput<K>,
): ServiceResponse<DocumentWriteResult> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const [
				{ default: writeSingle },
				{ default: resolveDocumentActor },
				{ default: resolveProposalVersion },
			] = await Promise.all([
				import("../../../../services/documents/write-single.js"),
				import(
					"../../../../services/documents/helpers/resolve-document-actor.js"
				),
				import(
					"../../../../services/documents/helpers/resolve-proposal-version.js"
				),
			]);
			//* request proposals check edit access to the request when they save
			const actor = await resolveDocumentActor(context, {
				...data,
				action: data.requestId === undefined ? "update" : "read",
			});
			if (actor.error) return actor;

			const versionRes =
				data.requestId === undefined
					? undefined
					: await resolveProposalVersion(context, {
							requestId: data.requestId,
							collectionKey: data.collectionKey,
							documentId: data.id,
							user: actor.data.authUser ?? systemActor,
						});
			if (versionRes?.error) return versionRes;

			const { actor: _actor, requestId: _requestId, ...values } = data;
			return writeSingle(context, {
				...values,
				...actor.data,
				versionId: versionRes?.data,
				kind: "update",
			});
		},
		name: {
			key: "core.toolkit.documents.update-single.error.name",
		},
		message: {
			key: "core.toolkit.documents.update-single.error.message",
		},
	});

export default updateSingle;
