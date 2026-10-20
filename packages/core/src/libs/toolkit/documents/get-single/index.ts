import type {
	CollectionDocumentKey,
	ContentDocument,
	IsLocalized,
} from "../../../../exports/types.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";
import type { ToolkitDocumentsGetSingleInput } from "./types.js";

export type * from "./types.js";

const createGetSingle =
	(context: ServiceContext) =>
	async <
		TCollectionKey extends CollectionDocumentKey,
		TLocale extends string | undefined = undefined,
	>(
		input: ToolkitDocumentsGetSingleInput<TCollectionKey, TLocale>,
	): ServiceResponse<ContentDocument<TCollectionKey, IsLocalized<TLocale>>> =>
		runToolkitService({
			schema: inputSchema,
			input,
			handler: async (data) => {
				const { default: getSingle } = await import(
					"../../../../services/documents/content/get-single.js"
				);

				return getSingle<ContentDocument<TCollectionKey, IsLocalized<TLocale>>>(
					context,
					{
						collectionKey: input.collectionKey,
						versionType: input.version,
						preview: data.preview ?? undefined,
						locale: data.locale,
						fallbackLocale: data.fallbackLocale,
						depth: data.depth,
						query: data.query,
					},
				);
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

export default createGetSingle;
