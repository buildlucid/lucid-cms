import type { FieldStaticConfig } from "../../types.js";

export const linkFieldConfig = {
	type: "link",
	relation: null,
	refs: null,
	validation: null,
} as const satisfies FieldStaticConfig<"link">;

export type LinkFieldType = typeof linkFieldConfig.type;
