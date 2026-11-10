import type z from "zod";

export type { FieldInputSchema } from "../schemas/collection-fields.js";

/** Schemas for Lucid's own controllers, whose list queries also have a formatted form. */
export type ControllerSchema = {
	query: {
		string: z.ZodType | undefined;
		formatted: z.ZodType | undefined;
	};
	params: z.ZodType | undefined;
	body: z.ZodType | undefined;
	response: z.ZodType | undefined;
};

/** Request schemas accepted by route factories. Handler input is inferred from the body, params and query schemas. */
export type RouteSchema = {
	/** Validate the URL query. Values arrive as strings, so coerce numbers and booleans, eg. `z.coerce.number()`. */
	query?: z.ZodType | undefined;
	/** Validate path parameters. */
	params?: z.ZodType | undefined;
	/** Validate the JSON request body. */
	body?: z.ZodType | undefined;
	/** Response schema available for route documentation. */
	response?: z.ZodType | undefined;
};
