import type { FieldStaticConfig } from "../../types.js";

export const mediaFieldConfig = {
	type: "media",
	database: {
		mode: "column",
	},
	validation: {
		mode: "ids",
	},
} as const satisfies FieldStaticConfig<"media">;

export type MediaFieldType = typeof mediaFieldConfig.type;
