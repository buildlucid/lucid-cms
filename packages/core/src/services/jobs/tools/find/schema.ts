import z from "zod";
import {
	filterConditionsInput,
	toQueryFilters,
} from "../../../../libs/tools/filter-conditions.js";
import {
	paginationInput,
	paginationSchema,
} from "../../../../libs/tools/pagination.js";
import { controllerSchemas } from "../../../../schemas/jobs.js";
import { jobSchema } from "../schema.js";

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
				"All query fields are optional. Use {} for the newest jobs first. filter is a list of conditions combined with AND: include only the conditions you need, eg. {filter:[{key:'status',value:['failed']}]} for failures, {filter:[{key:'jobName',value:'core:send-email'}]} for one kind of job or {filter:[{key:'scheduleKey',value:'nightly'}]} for a schedule's runs. perPage max 50.",
		}),
});

export const outputSchema = z.object({
	data: z
		.array(jobSchema)
		.meta({ description: "Matching jobs for this page." }),
	pagination: paginationSchema,
});
