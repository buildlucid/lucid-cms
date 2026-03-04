import type { FieldStaticConfig } from "../../types.js";

export const mediaFieldConfig = {
	type: "media",
	relation: {
		separator: "med",
		tableType: "media-rel",
	},
	refs: {
		fetchMode: "ids",
	},
	validation: {
		mode: "ids",
	},
} as const satisfies FieldStaticConfig<"media">;

export type MediaFieldType = typeof mediaFieldConfig.type;
