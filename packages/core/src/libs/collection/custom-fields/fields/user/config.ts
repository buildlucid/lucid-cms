import type { FieldStaticConfig } from "../../types.js";

export const userFieldConfig = {
	type: "user",
	database: {
		mode: "column",
	},
	validation: {
		mode: "ids",
	},
} as const satisfies FieldStaticConfig<"user">;

export type UserFieldType = typeof userFieldConfig.type;
