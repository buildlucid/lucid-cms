import constants from "../../../constants/constants.js";
import registeredFields from "../../../libs/collection/custom-fields/registered-fields.js";
import type { TableType } from "../../../libs/collection/schema/types.js";
import T from "../../../translations/index.js";
import type { ServiceResponse } from "../../../types.js";
import toSafeTableName from "./to-safe-table-name.js";

/**
 * Default parts for table names
 */
export const collectionTableParts = {
	document: "doc",
	fields: "fld",
	versions: "ver",
};

/**
 * Builds out the table name based on its type and available keys
 */
const buildTableName = <R extends string>(
	type: TableType,
	keys: {
		collection: string;
		brick?: string;
		repeater?: Array<string>;
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
						message: T(
							"collection_migrator_table_name_brick_key_missing_message",
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
		case "repeater": {
			if (keys.repeater === undefined || keys.repeater?.length === 0) {
				return {
					data: undefined,
					error: {
						message: T(
							"collection_migrator_table_name_repeater_keys_missing_message",
						),
					},
				};
			}

			// add brick key first - repeater tables are scoped to them
			//* assumes document-fields type when brick key isnt present
			if (!keys.brick) {
				parts.push(collectionTableParts.fields);
			} else parts.push(keys.brick);

			const repeaterRelation = registeredFields.repeater.config.relation;
			if (!repeaterRelation) {
				return {
					data: undefined,
					error: {
						message: T("invalid_table_name_format_insufficient_parts"),
					},
				};
			}

			parts.push(repeaterRelation.separator);

			// push all repeater keys - repeaters can have have children/parent repeaters
			parts.push(...keys.repeater);
		}
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
