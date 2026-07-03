import type { FieldStaticConfig } from "../../types.js";

export const collapsibleFieldConfig = {
	type: "collapsible",
	database: {
		mode: "ignore",
	},
} as const satisfies FieldStaticConfig<"collapsible">;

export type CollapsibleFieldType = typeof collapsibleFieldConfig.type;
