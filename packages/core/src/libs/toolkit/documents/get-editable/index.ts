import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import resolveDocumentVersion from "../helpers/resolve-document-version.js";
import type { CollectionDocumentEditable, DocumentEditable } from "../types.js";
import { inputSchema } from "./schema.js";
import type { ToolkitDocumentsGetEditableInput } from "./types.js";

export type * from "./types.js";

/** Returns stored values, nested refs and an edit token from latest or a request proposal, without reserving the document. */
const getEditable = <K extends string>(
	context: ServiceContext,
	input: ToolkitDocumentsGetEditableInput<K>,
): ServiceResponse<DocumentEditable<K>> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { default: getEditable } =
				await import("../../../../services/documents/get-editable.js");

			const versionRes = await resolveDocumentVersion(context, {
				...data,
				action: "read",
			});
			if (versionRes.error) return versionRes;

			const result = await getEditable(context, {
				collectionKey: data.collectionKey,
				id: data.id,
				versionId: versionRes.data.versionId,
			});
			if (result.error) return result;

			return {
				error: undefined,
				data: {
					...result.data,
					// Generated field types use the same collection shape validated by the reader.
					data: result.data.data as CollectionDocumentEditable<K>,
				},
			};
		},
		name: {
			key: "core.toolkit.documents.get-editable.error.name",
		},
		message: {
			key: "core.toolkit.documents.get-editable.error.message",
		},
	});

export default getEditable;
