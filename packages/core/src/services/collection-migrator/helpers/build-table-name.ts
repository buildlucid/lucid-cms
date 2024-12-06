import T from "../../../translations/index.js";
import type { ServiceResponse } from "../../../types.js";
import type { TableType } from "../schema/types.js";

/**
 * Builds out the table name based on its type and available keys
 */
const buildTableName = (
	type: TableType,
	keys: {
		collection: string;
		brick?: string;
		repeater?: Array<string>;
	},
): Awaited<ServiceResponse<string>> => {
	const partDefault = {
		fields: "fields",
		versions: "versions",
	};
	const parts = ["lucid", "document", keys.collection];

	switch (type) {
		case "document": {
			break;
		}
		case "versions": {
			parts.push(partDefault.versions);
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
			parts.push(partDefault.fields);
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
				parts.push(partDefault.fields);
			} else parts.push(keys.brick);

			// push all repeater keys - repeaters can have have children/parent repeaters
			parts.push(...keys.repeater);
		}
	}

	return {
		data: parts.join("_"),
		error: undefined,
	};
};

export default buildTableName;
