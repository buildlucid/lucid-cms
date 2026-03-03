import constants from "../../../constants/constants.js";
import type { TableType } from "../../../libs/collection/schema/types.js";
import T from "../../../translations/index.js";
import type { ServiceResponse } from "../../../types.js";
import DocumentCustomField from "../custom-fields/fields/document/document.js";
import MediaCustomField from "../custom-fields/fields/media/media.js";
import RepeaterCustomField from "../custom-fields/fields/repeater/repeater.js";
import UserCustomField from "../custom-fields/fields/user/user.js";
import { collectionTableParts } from "./build-table-name.js";

const HASHED_TABLE_SUFFIX_REGEX = /_[0-9a-f]{8}$/;

const RELATION_CONFIGS = [
	RepeaterCustomField.getRelationConfig(),
	DocumentCustomField.getRelationConfig(),
	MediaCustomField.getRelationConfig(),
	UserCustomField.getRelationConfig(),
];

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
			const relationConfig = RELATION_CONFIGS.find(
				(config) => config.separator === parts[3],
			);
			if (!relationConfig) {
				return {
					data: undefined,
					error: {
						message: T("invalid_table_name_format_insufficient_parts"),
					},
				};
			}
			switch (relationConfig.type) {
				case "media":
					tableType = "media-rel";
					break;
				case "user":
					tableType = "user-rel";
					break;
				case "document":
					tableType = "document-rel";
					break;
				case "repeater":
					tableType = "repeater";
					break;
				default:
					return {
						data: undefined,
						error: {
							message: T("invalid_table_name_format_insufficient_parts"),
						},
					};
			}
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
