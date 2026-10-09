import type { FilterValue } from "../../types/query-params.js";

//* collection keys are restricted to ^[a-z0-9-_]+$ so ":" is unambiguous
const DOCUMENT_REF_VALUE_REGEX = /^([a-z0-9-_]+):(\d+)$/;

/** Parses `collectionKey:id` document filters, returning null for invalid values. */
const parseDocumentRefValue = (
	value: FilterValue,
): { collectionKey: string; documentId: number } | null => {
	if (typeof value !== "string") return null;
	const match = value.match(DOCUMENT_REF_VALUE_REGEX);
	if (!match?.[1] || !match[2]) return null;
	return { collectionKey: match[1], documentId: Number(match[2]) };
};

export default parseDocumentRefValue;
