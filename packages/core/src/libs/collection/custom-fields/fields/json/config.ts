import type { FieldStaticConfig } from "../../types.js";

export const jsonFieldConfig = {
	type: "json",
	relation: null,
	refs: null,
	validation: null,
} as const satisfies FieldStaticConfig<"json">;

export type JsonFieldType = typeof jsonFieldConfig.type;
