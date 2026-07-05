import { isFieldTypeSortable } from "../../libs/collection/custom-fields/capabilities.js";
import type { CollectionSchemaTable } from "../../libs/collection/schema/types.js";
import type { QueryParamSorts } from "../../types/query-params.js";
import type { LucidBrickTableName } from "../../types.js";

const CUSTOMFIELD_SORT_PREFIX = "_";

export type CustomFieldSort = {
	/** Raw sort key, e.g. `_title`. */
	key: string;
	/** Generated document-fields value column. */
	column: `_${string}`;
};

/** Resolves supported underscore-prefixed top-level field sort keys. */
const resolveCustomFieldSorts = (
	documentFieldsTableSchema:
		| CollectionSchemaTable<LucidBrickTableName>
		| undefined,
	sorts?: QueryParamSorts,
): CustomFieldSort[] => {
	if (!sorts || !documentFieldsTableSchema) return [];

	const results: CustomFieldSort[] = [];
	for (const sort of sorts) {
		if (!sort.key.startsWith(CUSTOMFIELD_SORT_PREFIX)) continue;

		//* sort key matches the generated column name
		const column = documentFieldsTableSchema.columns.find(
			(col) => col.name === sort.key && col.source === "field",
		);
		if (!column?.customField) continue;
		if (!isFieldTypeSortable(column.customField.type)) continue;

		results.push({
			key: sort.key,
			column: column.name as `_${string}`,
		});
	}

	return results;
};

export default resolveCustomFieldSorts;
