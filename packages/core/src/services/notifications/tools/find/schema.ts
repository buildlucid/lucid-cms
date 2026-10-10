import z from "zod";
import { notificationLevelSchema } from "../../../../libs/db/tables/notifications.js";
import {
	filterConditionsInput,
	toQueryFilters,
} from "../../../../libs/tools/filter-conditions.js";
import {
	paginationInput,
	paginationSchema,
} from "../../../../libs/tools/pagination.js";
import {
	agentNameSchema,
	personSchema,
} from "../../../../libs/tools/person.js";
import { controllerSchemas } from "../../../../schemas/notifications.js";

const querySchema =
	controllerSchemas.getMultiple.query.formatted.extend(paginationInput);

export const inputSchema = z.object({
	query: querySchema
		.omit({ filter: true })
		.extend({
			filter: filterConditionsInput(querySchema.shape.filter.unwrap().keyof()),
		})
		.prefault({})
		.transform(
			({ filter, sort, ...query }): z.input<typeof querySchema> => ({
				...query,
				filter: toQueryFilters(filter).filter,
				sort: sort?.length ? sort : [{ key: "updatedAt", direction: "desc" }],
			}),
		)
		.pipe(querySchema)
		.meta({
			description:
				"All query fields are optional. Use {} for the inbox, newest first. filter is a list of conditions combined with AND, eg. {filter:[{key:'status',value:'attention'}]} for to-dos, {filter:[{key:'status',value:'unread'}]} for unread, or {filter:[{key:'category',value:'requests'}]} for one category. status is one of inbox, unread, attention or archived. perPage max 50.",
		}),
});

export const outputSchema = z.object({
	data: z
		.array(
			z.object({
				id: z.number(),
				type: z.string(),
				category: z.string(),
				level: notificationLevelSchema,
				actionRequired: z.boolean().meta({
					description: "A to-do until resolvedAt is set.",
				}),
				title: z.string(),
				body: z.string().nullable(),
				actor: personSchema.nullable(),
				actorAgent: agentNameSchema,
				readAt: z.string().nullable(),
				resolvedAt: z.string().nullable(),
				createdAt: z.string().nullable(),
				link: z
					.string()
					.nullable()
					.meta({ description: "Admin URL the notification opens." }),
			}),
		)
		.meta({ description: "Matching notifications for this page." }),
	pagination: paginationSchema,
});
