import type { CollectionDocumentKey } from "../../../../exports/types.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";
import type {
	ToolkitDocumentsGetSingleInput,
	ToolkitDocumentsGetSingleResult,
} from "./types.js";

export type * from "./types.js";

const getSingle = async <TCollectionKey extends CollectionDocumentKey>(
	context: ServiceContext,
	input: ToolkitDocumentsGetSingleInput<TCollectionKey>,
): ServiceResponse<ToolkitDocumentsGetSingleResult<TCollectionKey>> => {
	return runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { default: getSingleDocument } = await import(
				"../../../../services/documents/content/get-single.js"
			);

			return getSingleDocument(context, {
				collectionKey: input.collectionKey,
				versionType: input.version,
				preview: data.preview ?? undefined,
				query: data.query,
			});
		},
		name: {
			key: "core.toolkit.documents.get.single.error.name",
			defaultMessage: "Documents Toolkit Error",
		},
		message: {
			key: "core.toolkit.documents.get.single.error.message",
			defaultMessage: "Lucid toolkit could not fetch a document.",
		},
	});
};

export default getSingle;
