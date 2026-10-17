import type { Toolkit } from "@lucidcms/core/types";
import isRecord from "../utils/is-record.js";

export type DocumentFilter = NonNullable<
	NonNullable<
		Parameters<Toolkit["documents"]["getSingle"]>[0]["query"]
	>["filter"]
>;

type FilterGroup = Exclude<DocumentFilter, unknown[]>;

/** Shapes values only; the toolkit validates them before querying. */
const normalizeGroup = (group: Record<string, unknown>): FilterGroup =>
	Object.fromEntries(
		Object.entries(group).map(([key, value]) => {
			if (isRecord(value)) {
				return [key, "value" in value ? value : normalizeGroup(value)];
			}
			return [key, { value }];
		}),
	) as FilterGroup;

const normalizeDocumentFilter = (
	filter: unknown,
): DocumentFilter | undefined => {
	if (Array.isArray(filter)) {
		return filter.filter(isRecord).map(normalizeGroup);
	}
	if (isRecord(filter)) return normalizeGroup(filter);
	return undefined;
};

export default normalizeDocumentFilter;
