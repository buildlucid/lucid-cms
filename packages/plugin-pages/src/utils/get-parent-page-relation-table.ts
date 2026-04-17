import { buildTableName } from "@lucidcms/core/plugin";
import type {
	LucidBrickTableName,
	ServiceResponse,
} from "@lucidcms/core/types";
import constants from "../constants.js";

/**
 * Resolves the top-level relation table used by the parent page field.
 */
const getParentPageRelationTable = (
	collectionKey: string,
	tableNameByteLimit: number | null,
): Awaited<ServiceResponse<LucidBrickTableName>> => {
	const tableNameRes = buildTableName<LucidBrickTableName>(
		"cf_document",
		{
			collection: collectionKey,
			fieldPath: [constants.fields.parentPage.key],
		},
		tableNameByteLimit,
	);
	if (tableNameRes.error) {
		return {
			error: tableNameRes.error,
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: tableNameRes.data.name,
	};
};

export default getParentPageRelationTable;
