import z from "zod";
import {
	requestStatusSchema,
	requestTypeSchema,
} from "../../../../libs/db/tables/requests.js";
import {
	filterConditionsInput,
	toQueryFilters,
} from "../../../../libs/tools/filter-conditions.js";
import {
	paginationInput,
	paginationSchema,
} from "../../../../libs/tools/pagination.js";
import { controllerSchemas } from "../../../../schemas/requests.js";
import { requestLinksSchema, requestUserSchema } from "../schema.js";

const querySchema = controllerSchemas.getMultiple.query.formatted.extend({
	page: paginationInput.page,
	perPage: paginationInput.perPage,
});

export const inputSchema = z.object({
	query: querySchema
		.omit({ filter: true })
		.extend({
			filter: filterConditionsInput(
				querySchema.shape.filter.unwrap().keyof().exclude(["addable"]),
			),
		})
		.prefault({})
		.transform(
			({ filter, filterOr, sort, ...query }): z.input<typeof querySchema> => {
				const filters = toQueryFilters(filter, filterOr);
				const hasStatus = [...(filter ?? []), ...(filterOr ?? []).flat()].some(
					(condition) => condition.key === "status",
				);

				return {
					...query,
					...filters,
					filter: hasStatus
						? filters.filter
						: { status: { value: "open" }, ...filters.filter },
					sort: sort ?? [{ key: "updatedAt", direction: "desc" }],
				};
			},
		)
		.pipe(querySchema)
		.meta({
			description:
				"All query fields are optional. Use {} to list open requests, most recently changed first. filter is a list of conditions combined with AND: include only the conditions you need, eg. {filter:[{key:'type',value:'publish'}]} or {filter:[{key:'updatedAt',value:'2026-10-01T00:00:00Z',operator:'>'}]}. Keys: type (create, publish, unpublish or delete), title, status (defaults to open; use {key:'status',value:['open','closed'],operator:'in'} for others), approval (approved or pending), assignedToMe and involvesMe (asked to review, or created by, the person you act for), createdBy, collectionKey, documentId, scheduled, failed, createdAt, updatedAt and scheduledAt. perPage max 50.",
		}),
});

export const outputSchema = z.object({
	data: z.array(
		z.object({
			id: z.number().meta({ description: "Request ID for requests_get." }),
			type: requestTypeSchema,
			title: z.string(),
			status: requestStatusSchema,
			approved: z.boolean(),
			createdBy: requestUserSchema.nullable(),
			reviewers: z.array(requestUserSchema),
			documents: z.array(
				z.object({
					collectionKey: z.string(),
					documentId: z.number(),
					targets: z.array(z.string()),
				}),
			),
			scheduledAt: z.string().nullable(),
			failure: z
				.string()
				.nullable()
				.meta({ description: "Why the last completion attempt failed." }),
			updatedAt: z.string().nullable(),
			links: requestLinksSchema,
		}),
	),
	meta: z.object({ pagination: paginationSchema }),
});
