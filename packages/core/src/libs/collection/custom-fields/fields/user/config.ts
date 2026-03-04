import type { FieldStaticConfig } from "../../types.js";

export const userFieldConfig = {
	type: "user",
	relation: {
		separator: "usr",
		tableType: "user-rel",
	},
	refs: {
		fetchMode: "ids",
	},
	validation: {
		mode: "ids",
	},
} as const satisfies FieldStaticConfig<"user">;

export type UserFieldType = typeof userFieldConfig.type;
