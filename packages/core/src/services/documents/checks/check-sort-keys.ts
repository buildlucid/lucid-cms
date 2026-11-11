import type { CollectionSchemaTable } from "../../../libs/collection/schema/types.js";
import type { LucidBrickTableName } from "../../../libs/db/tables/index.js";
import { copy } from "../../../libs/i18n/index.js";
import type { QueryParamSorts } from "../../../types/query-params.js";
import resolveCustomFieldSorts from "../../../utils/helpers/resolve-custom-field-sorts.js";
import type { ServiceResponse } from "../../../utils/services/types.js";

/** Rejects `fields.<key>` sorts that name no sortable top-level field, which would otherwise be ignored. */
const checkSortKeys = (
	documentFieldsTableSchema:
		| CollectionSchemaTable<LucidBrickTableName>
		| undefined,
	sorts: QueryParamSorts | undefined,
): Awaited<ServiceResponse<undefined>> => {
	const resolved = new Set(
		resolveCustomFieldSorts(documentFieldsTableSchema, sorts).map(
			(sort) => sort.key,
		),
	);
	const key = sorts?.find(
		(sort) => sort.key.startsWith("fields.") && !resolved.has(sort.key),
	)?.key;
	if (key === undefined) {
		return { error: undefined, data: undefined };
	}

	return {
		error: {
			type: "basic",
			message: copy("server:core.documents.sort.key.unknown", {
				data: { key },
			}),
			status: 400,
		},
		data: undefined,
	};
};

export default checkSortKeys;
