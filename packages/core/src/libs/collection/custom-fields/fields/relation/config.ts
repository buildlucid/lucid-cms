import constants from "../../../../../constants/constants.js";
import type { FieldStaticConfig } from "../../types.js";

export const relationFieldConfig = {
	type: "relation",
	database: {
		mode: "relation-table",
		separator: "rel",
		tableType: `${constants.db.customFieldTablePrefix}relation`,
	},
} as const satisfies FieldStaticConfig<"relation">;

export type RelationFieldType = typeof relationFieldConfig.type;
