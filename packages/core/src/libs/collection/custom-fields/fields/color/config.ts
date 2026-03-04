import type { FieldStaticConfig } from "../../types.js";

export const colorFieldConfig = {
	type: "color",
	relation: null,
	refs: null,
	validation: null,
} as const satisfies FieldStaticConfig<"color">;

export type ColorFieldType = typeof colorFieldConfig.type;
