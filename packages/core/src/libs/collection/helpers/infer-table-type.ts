import T from "../../../translations/index.js";
import constants from "../../../constants/constants.js";
import { collectionTableParts } from "./build-table-name.js";
import type { TableType } from "../../../libs/collection/schema/types.js";
import type { ServiceResponse } from "../../../types.js";

const inferTableType = (name: string): Awaited<ServiceResponse<TableType>> => {
	const parts = name.split(constants.db.collectionKeysJoin);
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
			tableType = "repeater";
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
