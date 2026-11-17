import { z } from "@lucidcms/core";
import type { RouteSchema } from "@lucidcms/core/types";
import { keyPattern } from "../constants.js";
import type { FormReadInput, FormSubmitInput } from "../types.js";

const keySchema = z.string().trim().regex(keyPattern);
const localeSchema = z.string().trim().min(1).optional();
const versionSchema = z.string().trim().min(1).optional();

/** Input for reading a form. */
export const formReadInputSchema = z.object({
	key: keySchema,
	locale: localeSchema,
	version: versionSchema,
}) satisfies z.ZodType<FormReadInput>;

/** Input for sending a form. */
export const formSubmitInputSchema = z.object({
	key: keySchema,
	values: z.record(z.string(), z.unknown()),
	files: z.record(z.string(), z.array(z.instanceof(File))).optional(),
	captchaToken: z.string().nullable().optional(),
	locale: localeSchema,
	version: versionSchema,
}) satisfies z.ZodType<FormSubmitInput>;

const params = z.object({ key: keySchema });
const query = z.object({ locale: localeSchema, version: versionSchema });

export const controllerSchemas = {
	get: {
		body: undefined,
		params,
		query,
		response: undefined,
	} satisfies RouteSchema,
	//* the body is JSON or a posted form, so the route reads it itself
	submit: {
		body: undefined,
		params,
		query,
		response: undefined,
	} satisfies RouteSchema,
	markup: {
		body: undefined,
		params: undefined,
		query: z.object({
			form: keySchema,
			locale: localeSchema,
			version: versionSchema,
		}),
		response: z.object({ html: z.string() }),
	} satisfies RouteSchema,
	exportSubmissions: {
		body: undefined,
		params: undefined,
		query: z.object({ form: keySchema }),
		response: z.object({ fileName: z.string(), csv: z.string() }),
	} satisfies RouteSchema,
	fileDownload: {
		body: undefined,
		params: z.object({
			id: z.coerce.number().int().positive(),
			mediaId: z.coerce.number().int().positive(),
		}),
		query: undefined,
		response: z.object({ url: z.string() }),
	} satisfies RouteSchema,
};
