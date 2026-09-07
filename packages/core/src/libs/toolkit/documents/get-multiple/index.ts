import type { CollectionDocumentKey } from "../../../../exports/types.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";
import type {
	ToolkitDocumentsGetMultipleInput,
	ToolkitDocumentsGetMultipleResult,
} from "./types.js";

export type * from "./types.js";

const getMultiple = async <TCollectionKey extends CollectionDocumentKey>(
	context: ServiceContext,
	input: ToolkitDocumentsGetMultipleInput<TCollectionKey>,
): ServiceResponse<ToolkitDocumentsGetMultipleResult<TCollectionKey>> => {
	return runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { default: getMultipleDocuments } = await import(
				"../../../../services/documents/content/get-multiple.js"
			);

			return getMultipleDocuments(context, {
				collectionKey: input.collectionKey,
				versionType: input.version,
				preview: data.preview ?? undefined,
				query: data.query,
			});
		},
		name: {
			key: "core.toolkit.documents.get.multiple.error.name",
			defaultMessage: "Documents Toolkit Error",
		},
		message: {
			key: "core.toolkit.documents.get.multiple.error.message",
			defaultMessage: "Lucid toolkit could not fetch multiple documents.",
		},
	});
};

export default getMultiple;
