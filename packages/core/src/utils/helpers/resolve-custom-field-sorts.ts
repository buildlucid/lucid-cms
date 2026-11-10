import { isFieldTypeSortable } from "../../libs/collection/custom-fields/capabilities.js";
import prefixGeneratedColName from "../../libs/collection/helpers/prefix-generated-column-name.js";
import type { CollectionSchemaTable } from "../../libs/collection/schema/types.js";
import type { LucidBrickTableName } from "../../libs/db/tables/index.js";
import type { QueryParamSorts } from "../../types/query-params.js";

const FIELD_SORT_PREFIX = "fields.";

export type CustomFieldSort = {
	/** Raw sort key, e.g. `fields.title`. */
	key: string;
	/** Generated document-fields value column. */
	column: `_${string}`;
	localized: boolean;
};

/** Resolves supported `fields.<key>` sort keys for top-level fields. */
const resolveCustomFieldSorts = (
	documentFieldsTableSchema:
		| CollectionSchemaTable<LucidBrickTableName>
		| undefined,
	sorts?: QueryParamSorts,
): CustomFieldSort[] => {
	if (!sorts || !documentFieldsTableSchema) return [];

	const results: CustomFieldSort[] = [];
	for (const sort of sorts) {
		if (!sort.key.startsWith(FIELD_SORT_PREFIX)) continue;

		const columnName = prefixGeneratedColName(
			sort.key.slice(FIELD_SORT_PREFIX.length),
		);
		const column = documentFieldsTableSchema.columns.find(
			(col) => col.name === columnName && col.source === "field",
		);
		if (!column?.customField) continue;
		if (!isFieldTypeSortable(column.customField.type)) continue;

		results.push({
			key: sort.key,
			column: column.name as `_${string}`,
			localized: column.customField.localized ?? false,
		});
	}

	return results;
};

export default resolveCustomFieldSorts;
