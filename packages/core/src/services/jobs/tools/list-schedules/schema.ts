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

const querySchema =
	controllerSchemas.getSchedules.query.formatted.extend(paginationInput);

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
				sort: sort?.length ? sort : [{ key: "nextRunAt", direction: "asc" }],
			}),
		)
		.pipe(querySchema)
		.meta({
			description:
				"All query fields are optional. Use {} for every schedule, soonest first. filter is a list of conditions combined with AND, eg. {filter:[{key:'state',value:'paused'}]} or {filter:[{key:'jobName',value:'core:'}]}. perPage max 50.",
		}),
});

export const outputSchema = z.object({
	data: z.array(controllerSchemas.getSchedules.response.element).meta({
		description:
			"Registered schedules with their next run and the last job each one created.",
	}),
	pagination: paginationSchema,
});
