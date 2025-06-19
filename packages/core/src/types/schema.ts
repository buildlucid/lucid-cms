import type z from "zod/v4";
export type { FieldInputSchema } from "../schemas/collection-fields.js";

export type ControllerSchema = {
	query: {
		string: z.ZodType | undefined;
		formatted: z.ZodType | undefined;
	};
	params: z.ZodType | undefined;
	body: z.ZodType | undefined;
	response: z.ZodType | undefined;
};
