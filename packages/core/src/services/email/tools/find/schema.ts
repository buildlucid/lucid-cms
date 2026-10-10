import z from "zod";
import {
	filterConditionsInput,
	toQueryFilters,
} from "../../../../libs/tools/filter-conditions.js";
import {
	paginationInput,
	paginationSchema,
} from "../../../../libs/tools/pagination.js";
import { controllerSchemas } from "../../../../schemas/email.js";
import { emailSummarySchema } from "../schema.js";

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
			({ filter, filterOr, sort, ...query }): z.input<typeof querySchema> => ({
				...query,
				...toQueryFilters(filter, filterOr),
				sort: sort?.length ? sort : [{ key: "createdAt", direction: "desc" }],
			}),
		)
		.pipe(querySchema)
		.meta({
			description:
				"All query fields are optional. Use {} for the newest emails first. filter is a list of conditions combined with AND: include only the conditions you need, eg. {filter:[{key:'currentStatus',value:['failed','bounced']}]} for delivery problems, {filter:[{key:'toAddress',value:'ada@example.com'}]} for one recipient or {filter:[{key:'template',value:'user-invite'}]} for one template. perPage max 50.",
		}),
});

export const outputSchema = z.object({
	data: z
		.array(emailSummarySchema)
		.meta({ description: "Matching emails for this page." }),
	pagination: paginationSchema,
});
