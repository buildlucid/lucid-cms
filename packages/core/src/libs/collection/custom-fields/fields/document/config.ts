import constants from "../../../../../constants/constants.js";
import type { FieldStaticConfig } from "../../types.js";

export const documentFieldConfig = {
	type: "document",
	database: {
		mode: "relation-table",
		separator: "doc",
		tableType: `${constants.db.customFieldTablePrefix}document`,
	},
} as const satisfies FieldStaticConfig<"document">;

export type DocumentFieldType = typeof documentFieldConfig.type;
