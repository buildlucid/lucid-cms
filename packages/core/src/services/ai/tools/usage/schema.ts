import z from "zod";
import {
	filterConditionsInput,
	toQueryFilters,
} from "../../../../libs/tools/filter-conditions.js";
import {
	paginationInput,
	paginationSchema,
} from "../../../../libs/tools/pagination.js";
import { userSchema } from "../../../../libs/tools/person.js";
import {
	aiUsageChartDateSchema,
	aiUsageChartMetricSchema,
	aiUsageFeatureKeySchema,
	aiUsageSessionTypeSchema,
	controllerSchemas,
} from "../../../../schemas/ai.js";

const sessionsQuerySchema =
	controllerSchemas.getUsageSessions.query.formatted.extend(paginationInput);

export const inputSchema = z.object({
	include: z
		.array(z.enum(["credits", "sessions", "chart"]))
		.min(1)
		.default(["credits", "sessions", "chart"])
		.meta({
			description:
				"What to read. credits is the balance on the AI connection, sessions are recent chats and generations with what they cost, and chart totals usage by day.",
		}),
	sessions: sessionsQuerySchema
		.omit({ filter: true })
		.extend({
			filter: filterConditionsInput(
				sessionsQuerySchema.shape.filter.unwrap().keyof(),
			),
		})
		.prefault({})
		.transform(
			({
				filter,
				filterOr,
				sort,
				...query
			}): z.input<typeof sessionsQuerySchema> => ({
				...query,
				...toQueryFilters(filter, filterOr),
				sort: sort?.length
					? sort
					: [{ key: "lastActivityAt", direction: "desc" }],
			}),
		)
		.pipe(sessionsQuerySchema)
		.meta({
			description:
				"Session query, all fields optional. Use {} for the most recent sessions. filter is a list of conditions combined with AND, eg. {filter:[{key:'sessionType',value:'agent'}]} or {filter:[{key:'userId',value:3}]}. perPage max 50.",
		}),
	chart: z
		.object({
			startDate: aiUsageChartDateSchema.optional().meta({
				description: "Inclusive start, YYYY-MM-DD. Defaults to 13 days ago.",
			}),
			endDate: aiUsageChartDateSchema.optional().meta({
				description: "Inclusive end, YYYY-MM-DD. Defaults to today.",
			}),
			metrics: z.array(aiUsageChartMetricSchema).min(1).optional().meta({
				description: "Metrics to total by day. Defaults to credits.",
			}),
			featureKey: aiUsageFeatureKeySchema.optional().meta({
				description: "Only count one feature.",
			}),
			userId: z.number().int().positive().optional().meta({
				description: "Only count one person's usage.",
			}),
		})
		.prefault({})
		.meta({ description: "Chart range and filters, all optional." }),
});

const sessionSchema = z.object({
	type: aiUsageSessionTypeSchema,
	id: z.string(),
	conversation: z
		.object({ id: z.string(), title: z.string() })
		.nullable()
		.meta({ description: "The agent chat, when the person could open it." }),
	user: userSchema.nullable(),
	credits: z.number(),
	tokens: z.object({
		input: z.number(),
		output: z.number(),
		total: z.number(),
	}),
	requests: z.object({
		total: z.number(),
		webSearches: z.number(),
		webFetches: z.number(),
		failed: z.number(),
		pending: z.number(),
	}),
	startedAt: z.string().nullable(),
	lastActivityAt: z.string().nullable(),
});

export const outputSchema = z.object({
	credits: controllerSchemas.getCredits.response.nullable().meta({
		description: "The connection's balance, or null when not included.",
	}),
	sessions: z
		.object({ data: z.array(sessionSchema), pagination: paginationSchema })
		.nullable()
		.meta({ description: "Recent sessions, or null when not included." }),
	chart: controllerSchemas.getUsageChart.response.nullable().meta({
		description: "Daily totals for the range, or null when not included.",
	}),
});
