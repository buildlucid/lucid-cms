import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import resolveDocumentVersion from "../helpers/resolve-document-version.js";
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
		handler: async ({ actor, requestId, ...data }) => {
			const { default: writeSingle } =
				await import("../../../../services/documents/write-single.js");

			const versionRes = await resolveDocumentVersion(context, {
				actor,
				collectionKey: data.collectionKey,
				id: data.id,
				requestId,
				action: "update",
			});
			if (versionRes.error) return versionRes;

			return writeSingle(context, {
				...data,
				...versionRes.data.actor,
				versionId: versionRes.data.versionId,
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
