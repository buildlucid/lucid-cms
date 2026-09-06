import type z from "zod";

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

/** Request schemas accepted by route factories. Inferred handler input follows the body, params and formatted query schemas. */
export type RouteSchema = {
	/** Raw query validation and optional formatted query validation. */
	query?: {
		/** Validate string values from the URL query. */
		string?: z.ZodType | undefined;
		/** Validate query values after Lucid formats query parameters. */
		formatted?: z.ZodType | undefined;
	};
	/** Validate path parameters. */
	params?: z.ZodType | undefined;
	/** Validate the JSON request body. */
	body?: z.ZodType | undefined;
	/** Response schema available for route documentation. */
	response?: z.ZodType | undefined;
};
