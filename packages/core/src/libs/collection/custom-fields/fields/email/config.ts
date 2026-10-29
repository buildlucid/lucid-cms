import constants from "../../../../../constants/constants.js";
import type { FieldStaticConfig } from "../../types.js";

export const emailFieldConfig = {
	type: "email",
	resource: "emails",
	database: {
		mode: "relation-table",
		separator: "eml",
		tableType: `${constants.db.customFieldTablePrefix}email`,
	},
	capabilities: {
		filterable: true,
		sortable: false,
		canBeLabel: false,
		canBeRichTextVariable: false,
	},
} as const satisfies FieldStaticConfig<"email">;

export type EmailFieldType = typeof emailFieldConfig.type;
