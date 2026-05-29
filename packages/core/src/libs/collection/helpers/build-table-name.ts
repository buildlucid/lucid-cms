import constants from "../../../constants/constants.js";
import type { TableType } from "../../../libs/collection/schema/types.js";
import type { ServiceResponse } from "../../../types.js";
import { copy } from "../../i18n/index.js";
import {
	getFieldDatabaseConfig,
	isCustomFieldTableType,
	isStorageMode,
} from "../custom-fields/storage/index.js";
import { collectionTableParts } from "./table-parts.js";
import toSafeTableName from "./to-safe-table-name.js";

/**
 * Builds out the table name based on its type and available keys
 */
const buildTableName = <R extends string>(
	type: TableType,
	keys: {
		collection: string;
		brick?: string;
		fieldPath?: Array<string>;
	},
	tableNameByteLimit: number | null,
): Awaited<
	ServiceResponse<{
		/** The hashed table name */
		name: R;
		/** The raw, readable table name */
		rawName: R;
	}>
> => {
	const parts = [collectionTableParts.document, keys.collection];

	switch (type) {
		case "document": {
			break;
		}
		case "versions": {
			parts.push(collectionTableParts.versions);
			break;
		}
		case "brick": {
			if (!keys.brick) {
				return {
					data: undefined,
					error: {
						message: copy(
							"server:core.collections.migration.table.name.brick.key.missing.message",
						),
					},
				};
			}
			parts.push(keys.brick);
			break;
		}
		case "document-fields": {
			parts.push(collectionTableParts.fields);
			break;
		}
	}

	if (isCustomFieldTableType(type)) {
		if (keys.fieldPath === undefined || keys.fieldPath.length === 0) {
			return {
				data: undefined,
				error: {
					message: copy(
						"server:core.collections.migration.table.name.repeater.keys.missing.message",
					),
				},
			};
		}

		const databaseConfig = getFieldDatabaseConfig(type);
		if (!databaseConfig) {
			return {
				data: undefined,
				error: {
					message: copy(
						"server:core.collections.schema.table.name.format.insufficient.parts",
					),
				},
			};
		}

		if (
			!isStorageMode(databaseConfig, "tree-table") &&
			!isStorageMode(databaseConfig, "relation-table")
		) {
			return {
				data: undefined,
				error: {
					message: copy(
						"server:core.collections.schema.table.name.format.insufficient.parts",
					),
				},
			};
		}

		// add brick key first - table-backed custom fields are scoped to these
		//* assumes document-fields type when brick key isnt present
		const scope = keys.brick ?? collectionTableParts.fields;
		parts.push(scope);
		parts.push(databaseConfig.separator);
		parts.push(...keys.fieldPath);
	}

	const safeNameRes = toSafeTableName(
		`${constants.db.prefix}${parts.join(constants.db.nameSeparator)}`,
		tableNameByteLimit,
	);

	return {
		data: {
			name: safeNameRes.name as R,
			rawName: safeNameRes.rawName as R,
		},
		error: undefined,
	};
};

export default buildTableName;
