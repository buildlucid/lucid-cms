import constants from "../../../constants/constants.js";
import type { ContentDocument } from "../../../exports/types.js";
import collections from "../../../libs/collection/collections.js";
import { documentsFormatter } from "../../../libs/formatters/index.js";
import type { ContentReadMultipleQueryParams } from "../../../schemas/documents.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { checkContentLocale } from "../../locales/checks/index.js";
import resolveRelatedDocuments from "../helpers/resolve-related-documents.js";
import getMultipleWithRefs, {
	type ContentDocumentsGetMultipleWithRefsInput,
} from "./get-multiple-with-refs.js";
import type { ContentReadOptions } from "./types.js";

/** Reads Content API documents with resolved references and a total count, leaving collection and locale typing to callers. */
const getMultiple = async <TDocument = ContentDocument<string, boolean>>(
	context: ServiceContext,
	data: Omit<
		ContentDocumentsGetMultipleWithRefsInput<string>,
		"query" | "depth"
	> &
		ContentReadOptions & {
			query: ContentReadMultipleQueryParams;
		},
): ServiceResponse<{
	documents: TDocument[];
	count: number;
}> => {
	const depth = data.depth ?? constants.query.depth.default;
	const localeRes = await checkContentLocale(context, data);
	if (localeRes.error) return localeRes;

	const [readRes, collectionRes] = await Promise.all([
		getMultipleWithRefs(context, {
			...data,
			// Rich text links and variables need related documents even when `depth` leaves them unfilled.
			query: {
				...data.query,
				include: [
					...(data.query.include ?? []),
					"refs.media",
					"refs.users",
					"refs.emails",
					"refs.documents",
				],
			},
		}),
		collections.getSingle(context, { key: data.collectionKey }),
	]);
	if (readRes.error) return readRes;
	if (collectionRes.error) return collectionRes;

	const refsRes = await resolveRelatedDocuments(context, {
		source: {
			collectionKey: data.collectionKey,
			versionType: readRes.data.documents[0]?.version ?? data.versionType,
			refs: readRes.data.refs ?? {},
		},
		depth,
		allowedCollectionKeys: data.allowedCollectionKeys,
	});
	if (refsRes.error) return refsRes;

	return {
		error: undefined,
		data: {
			documents: readRes.data.documents.map(
				(document) =>
					documentsFormatter.formatContentRead({
						document,
						refs: refsRes.data,
						collection: collectionRes.data,
						collections: context.config.collections,
						localization: context.config.localization,
						read: {
							locale: data.locale ?? null,
							fallbackLocale: data.fallbackLocale ?? null,
							depth,
						},
					}) as TDocument,
			),
			count: readRes.data.count,
		},
	};
};

export default getMultiple;
