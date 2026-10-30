import type {
	CollectionDocumentKey,
	ContentDocument,
	IsLocalized,
} from "../../../../exports/types.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService, toPagination } from "../../utils.js";
import { inputSchema } from "./schema.js";
import type {
	ToolkitDocumentsGetMultipleInput,
	ToolkitDocumentsGetMultipleResult,
} from "./types.js";

export type * from "./types.js";

const createGetMultiple =
	(context: ServiceContext) =>
	async <
		TCollectionKey extends CollectionDocumentKey,
		TLocale extends string | undefined = undefined,
	>(
		input: ToolkitDocumentsGetMultipleInput<TCollectionKey, TLocale>,
	): ServiceResponse<
		ToolkitDocumentsGetMultipleResult<TCollectionKey, TLocale>
	> =>
		runToolkitService({
			schema: inputSchema,
			input,
			handler: async (data) => {
				const { default: getMultiple } =
					await import("../../../../services/documents/content/get-multiple.js");

				const result = await getMultiple<
					ContentDocument<TCollectionKey, IsLocalized<TLocale>>
				>(context, {
					collectionKey: input.collectionKey,
					versionType: input.version,
					preview: data.preview ?? undefined,
					locale: data.locale,
					fallbackLocale: data.fallbackLocale,
					depth: data.depth,
					query: data.query,
				});
				if (result.error) return result;

				return {
					error: undefined,
					data: {
						items: result.data.documents,
						pagination: toPagination(result.data.count, data.query),
					},
				};
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

export default createGetMultiple;
