import type { QueryParamFilters } from "../../types/query-params.js";
import type { DocumentFieldFilters } from "../../types.js";
import type CollectionBuilder from "../../libs/builders/collection-builder/index.js";

const splitDocumentFilters = (
	collection: CollectionBuilder,
	filters?: QueryParamFilters,
): {
	documentFilters: QueryParamFilters;
	documentFieldFilters: DocumentFieldFilters[];
} => {
	if (!filters) return { documentFilters: {}, documentFieldFilters: [] };

	const documentFieldFilters = collection.documentFieldFilters(filters, true);

	const validDocFilters = [
		"documentId",
		"documentCreatedBy",
		"documentUpdatedBy",
		"documentCreatedAt",
		"documentUpdatedAt",
	];

	const documentFilters: QueryParamFilters = {};
	for (const [key, value] of Object.entries(filters)) {
		if (validDocFilters.includes(key)) {
			if (documentFieldFilters.find((f) => f.key === key)) continue; //* skip adding the document filter if there is also a field filter with the same key as this would cause unexpected results - this is something users should be aware of however. Likely wont happen as document filters are prefixed
			documentFilters[key] = value;
		}
	}

	return {
		documentFilters: documentFilters,
		documentFieldFilters: collection.documentFieldFilters(filters, true),
	};
};

export default splitDocumentFilters;
