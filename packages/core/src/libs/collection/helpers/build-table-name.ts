import T from "../../../translations/index.js";
import constants from "../../../constants/constants.js";
import type { ServiceResponse } from "../../../types.js";
import type { TableType } from "../../../libs/collection/schema/types.js";

/**
 * Default parts for table names
 */
export const collectionTableParts = {
	document: "document",
	fields: "fields",
	versions: "versions",
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
): Awaited<ServiceResponse<R>> => {
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

			// push all repeater keys - repeaters can have have children/parent repeaters
			parts.push(...keys.repeater);
		}
	}

	return {
		data: `${constants.db.prefix}${parts.join(constants.db.collectionKeysJoin)}` as R,
		error: undefined,
	};
};

export default buildTableName;
