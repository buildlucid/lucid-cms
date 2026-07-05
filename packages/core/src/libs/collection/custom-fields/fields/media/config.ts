import constants from "../../../../../constants/constants.js";
import type { FieldStaticConfig } from "../../types.js";

export const mediaFieldConfig = {
	type: "media",
	database: {
		mode: "relation-table",
		separator: "med",
		tableType: `${constants.db.customFieldTablePrefix}media`,
	},
	capabilities: {
		filterable: true,
		sortable: false,
	},
} as const satisfies FieldStaticConfig<"media">;

export type MediaFieldType = typeof mediaFieldConfig.type;
