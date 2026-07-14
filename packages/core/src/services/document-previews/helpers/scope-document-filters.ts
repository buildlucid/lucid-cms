import type { QueryParamFilters } from "../../../types/query-params.js";

/** Ensures a preview token can only query its active, non-deleted document. */
const scopeDocumentFilters = (
	filters: Record<string, unknown> | undefined,
	documentId: number | undefined,
	notDeletedValue: boolean | number,
): Record<string, unknown> | undefined => {
	if (documentId === undefined) return filters;

	return {
		...(filters ?? {}),
		id: { value: documentId },
		isDeleted: { value: notDeletedValue },
	} satisfies QueryParamFilters;
};

export default scopeDocumentFilters;
