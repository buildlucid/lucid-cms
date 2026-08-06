import z from "zod";
import type { OptionsName } from "../../../schemas/options.js";
import { optionsNameSchema } from "../../../schemas/options.js";
import { defineTable } from "../client/table/definition.js";
import type { BooleanInt } from "../types.js";

export const optionsTable = defineTable("lucid_options", (adapter) => ({
	columns: {
		name: {
			schema: optionsNameSchema,
			type: "text",
		},
		value_int: {
			schema: z.number().nullable(),
			type: "integer",
		},
		value_text: {
			schema: z.string().nullable(),
			type: "text",
		},
		value_bool: {
			schema: z
				.union([
					z.literal(adapter.config.defaults.boolean.true),
					z.literal(adapter.config.defaults.boolean.false),
				])
				.nullable(),
			type: "boolean",
		},
	},
}));

export interface LucidOptions {
	name: OptionsName;
	value_int: number | null;
	value_text: string | null;
	value_bool: BooleanInt | null;
}
