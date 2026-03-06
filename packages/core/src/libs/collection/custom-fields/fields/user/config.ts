import constants from "../../../../../constants/constants.js";
import type { FieldStaticConfig } from "../../types.js";

export const userFieldConfig = {
	type: "user",
	database: {
		mode: "relation-table",
		separator: "usr",
		tableType: `${constants.db.customFieldTablePrefix}user`,
	},
} as const satisfies FieldStaticConfig<"user">;

export type UserFieldType = typeof userFieldConfig.type;
