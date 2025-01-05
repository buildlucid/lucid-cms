import z from "zod";

export default {
	createSingle: {
		body: z.object({
			name: z.string().min(2),
			description: z.string().optional(),
			enabled: z.boolean().optional(),
		}),
		query: undefined,
		params: undefined,
	},
	getAll: {
		body: undefined,
		query: undefined,
		params: undefined,
	},
	getSingle: {
		body: undefined,
		query: undefined,
		params: z.object({
			id: z.string(),
		}),
	},
	deleteSingle: {
		body: undefined,
		query: undefined,
		params: z.object({
			id: z.string(),
		}),
	},
	updateSingle: {
		body: z.object({
			name: z.string().min(2).optional(),
			description: z.string().optional(),
			enabled: z.boolean().optional(),
		}),
		query: undefined,
		params: z.object({
			id: z.string(),
		}),
	},
	regenerateKeys: {
		body: undefined,
		query: undefined,
		params: z.object({
			id: z.string(),
		}),
	},
};
