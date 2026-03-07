import constants from "../../../constants/constants.js";
import registeredFields, {
	registeredFieldTypes,
} from "../../../libs/collection/custom-fields/registered-fields.js";
import type { TableType } from "../../../libs/collection/schema/types.js";
import T from "../../../translations/index.js";
import type { ServiceResponse } from "../../../types.js";
import { collectionTableParts } from "./build-table-name.js";

const HASHED_TABLE_SUFFIX_REGEX = /_[0-9a-f]{8}$/;

/**
 * Returns table configs for any custom field with the repeater or relation table mode
 */
const customFieldTableConfigs = registeredFieldTypes.flatMap((fieldType) => {
	const databaseConfig = registeredFields[fieldType].config.database;
	if (!("separator" in databaseConfig) || !("tableType" in databaseConfig)) {
		return [];
	}

	return [
		{
			separator: databaseConfig.separator,
			tableType: databaseConfig.tableType,
		},
	];
});

/**
 * Infers the table type from a table name
 */
const inferTableType = (name: string): Awaited<ServiceResponse<TableType>> => {
	const normalizedName = name.replace(HASHED_TABLE_SUFFIX_REGEX, "");
	const parts = normalizedName.split(constants.db.nameSeparator);
	const prefix = `${constants.db.prefix}${collectionTableParts.document}`;

	if (!parts[0] || parts[0] !== prefix) {
		return {
			data: undefined,
			error: {
				message: T("invalid_table_name_format_start_with", {
					prefix: prefix,
				}),
			},
		};
	}

	try {
		let tableType: TableType;

		if (parts.length === 1) {
			return {
				data: undefined,
				error: { message: T("invalid_table_name_format_insufficient_parts") },
			};
		}

		if (parts.length === 2) {
			tableType = "document";
		} else if (parts.length === 3) {
			if (parts[2] === collectionTableParts.versions) {
				tableType = "versions";
			} else if (parts[2] === collectionTableParts.fields) {
				tableType = "document-fields";
			} else {
				tableType = "brick";
			}
		} else if (parts.length > 3) {
			const customFieldTableConfig = customFieldTableConfigs.find(
				(config) => config.separator === parts[3],
			);
			if (!customFieldTableConfig) {
				return {
					data: undefined,
					error: {
						message: T("invalid_table_name_format_insufficient_parts"),
					},
				};
			}

			tableType = customFieldTableConfig.tableType;
		} else {
			return {
				data: undefined,
				error: { message: T("invalid_table_name_format_insufficient_parts") },
			};
		}

		return {
			data: tableType,
			error: undefined,
		};
	} catch (e) {
		return {
			data: undefined,
			error: {
				message:
					e instanceof Error ? e.message : T("failed_to_infer_table_parts"),
			},
		};
	}
};

export default inferTableType;
