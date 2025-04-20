import defaultQuery, { filterSchemas } from "./default-query.js";
import z from "zod";

export default {
	createSingle: {
		body: z.object({
			email: z.email(),
			username: z.string(),
			roleIds: z.array(z.number()),
			firstName: z.string().optional(),
			lastName: z.string().optional(),
			superAdmin: z.boolean().optional(),
		}),
		query: undefined,
		params: undefined,
	},
	updateSingle: {
		body: z.object({
			roleIds: z.array(z.number()).optional(),
			superAdmin: z.boolean().optional(),
			triggerPasswordReset: z.boolean().optional(),
			isDeleted: z.literal(false).optional(),
		}),
		query: undefined,
		params: z.object({
			id: z.string(),
		}),
	},
	getSingle: {
		body: undefined,
		query: undefined,
		params: z.object({
			id: z.string(),
		}),
	},
	getMultiple: {
		query: z.object({
			filter: z
				.object({
					firstName: filterSchemas.single.optional(),
					lastName: filterSchemas.single.optional(),
					email: filterSchemas.single.optional(),
					username: filterSchemas.single.optional(),
					roleIds: filterSchemas.union.optional(),
					id: filterSchemas.union.optional(),
				})
				.optional(),
			sort: z
				.array(
					z.object({
						key: z.enum([
							"createdAt",
							"updatedAt",
							"firstName",
							"lastName",
							"email",
							"username",
						]),
						value: z.enum(["asc", "desc"]),
					}),
				)
				.optional(),
			include: z.array(z.enum(["permissions"])).optional(),
			exclude: defaultQuery.exclude,
			page: defaultQuery.page,
			perPage: defaultQuery.perPage,
		}),
		params: undefined,
		body: undefined,
	},
	deleteSingle: {
		body: undefined,
		query: undefined,
		params: z.object({
			id: z.string(),
		}),
	},
};
