import z from "zod";

export const stringTranslations = z.union([
	z.string(),
	z.record(z.string(), z.string()),
]);

export default {
	getSingle: {
		query: undefined,
		params: z.object({
			code: z.string().min(2),
		}),
		body: undefined,
	},
	getAll: {
		query: undefined,
		params: undefined,
		body: undefined,
	},
	client: {
		getAll: {
			query: undefined,
			params: undefined,
			body: undefined,
		},
	},
};
