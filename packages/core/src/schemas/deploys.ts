import z from "zod";
import type { ControllerSchema } from "../exports/types.js";
import type { DeployRunSource, DeployRunStatus } from "../types/response.js";
import { queryFormatted, queryString } from "./helpers/querystring.js";
import { agentActorSchema } from "./shared/agent-actor.js";
import { userDisplaySchema } from "./shared/user-display.js";

export const deployRunStatusSchema = z.enum([
	"queued",
	"starting",
	"running",
	"succeeded",
	"failed",
	"triggered",
	"timed-out",
	"cancelled",
]) satisfies z.ZodType<DeployRunStatus>;

export const deployRunSourceSchema = z.enum([
	"trigger",
	"schedule",
	"manual",
	"toolkit",
	"agent",
]) satisfies z.ZodType<DeployRunSource>;

/** A status the host or its CI reports for a run. */
const deployUpdateSchema = z.object({
	status: z.enum(["running", "succeeded", "failed"]).meta({
		description: "Where the run stands",
		example: "succeeded",
	}),
	url: z.url().max(2048).optional().meta({
		description: "The host's page for the run, such as its build log",
		example: "https://github.com/acme/site/actions/runs/123",
	}),
	message: z.string().max(1000).optional().meta({
		description: "A short note, such as why the run failed",
		example: "Build failed on step 3",
	}),
});

const deployRunSchema = z.object({
	id: z.number(),
	deployKey: z.string(),
	status: deployRunStatusSchema,
	source: deployRunSourceSchema,
	triggerCount: z.number(),
	startedBy: userDisplaySchema.nullable(),
	agent: agentActorSchema.nullable(),
	url: z.string().nullable(),
	message: z.string().nullable(),
	createdAt: z.string().nullable(),
	startedAt: z.string().nullable(),
	finishedAt: z.string().nullable(),
});

const deployKeyParams = z.object({ key: z.string().trim().min(1) });
const runIdParams = z.object({ id: z.string().trim() });

export const controllerSchemas = {
	getMultiple: {
		body: undefined,
		query: { string: undefined, formatted: undefined },
		params: undefined,
		response: z.array(
			z.object({
				key: z.string(),
				name: z.string(),
				description: z.string().nullable(),
				links: z.array(z.object({ label: z.string(), url: z.string() })),
				provider: z.string(),
				cancellable: z.boolean(),
				enabled: z.boolean(),
				disabledAt: z.string().nullable(),
				disabledBy: userDisplaySchema.nullable(),
				triggers: z.array(z.string()),
				schedule: z
					.object({ cron: z.string(), nextRunAt: z.string().nullable() })
					.nullable(),
				webhookUrl: z.string().nullable(),
				pending: z
					.object({ count: z.number(), readyAt: z.string() })
					.nullable(),
				queuedRun: deployRunSchema.nullable(),
				runningRun: deployRunSchema.nullable(),
				recentRuns: z.array(deployRunSchema),
			}),
		),
	} satisfies ControllerSchema,
	getRuns: {
		body: undefined,
		query: {
			string: z
				.object({
					"filter[deployKey]": queryString.schema.filter(true),
					"filter[status]": queryString.schema.filter(true),
					"filter[source]": queryString.schema.filter(true),
					sort: queryString.schema.sort("createdAt"),
					page: queryString.schema.page,
					perPage: queryString.schema.perPage,
				})
				.meta(queryString.meta),
			formatted: z.object({
				filter: z
					.object({
						deployKey: queryFormatted.schema.filters.union.optional(),
						status: queryFormatted.schema.filters.union.optional(),
						source: queryFormatted.schema.filters.union.optional(),
					})
					.optional(),
				sort: z
					.array(
						z.object({
							key: z.enum(["createdAt"]),
							direction: z.enum(["asc", "desc"]),
						}),
					)
					.optional(),
				page: queryFormatted.schema.page,
				perPage: queryFormatted.schema.perPage,
			}),
		},
		params: undefined,
		response: z.array(deployRunSchema),
	} satisfies ControllerSchema,
	run: {
		body: undefined,
		query: { string: undefined, formatted: undefined },
		params: deployKeyParams,
		response: z.object({ id: z.number() }),
	} satisfies ControllerSchema,
	setState: {
		body: z.object({ enabled: z.boolean() }),
		query: { string: undefined, formatted: undefined },
		params: deployKeyParams,
		response: undefined,
	} satisfies ControllerSchema,
	cancelRun: {
		body: undefined,
		query: { string: undefined, formatted: undefined },
		params: runIdParams,
		response: undefined,
	} satisfies ControllerSchema,
	callback: {
		body: deployUpdateSchema,
		query: {
			string: z.object({ token: z.string().trim().min(1) }),
			formatted: undefined,
		},
		params: runIdParams,
		response: undefined,
	} satisfies ControllerSchema,
	webhook: {
		body: undefined,
		query: { string: undefined, formatted: undefined },
		params: deployKeyParams,
		response: undefined,
	} satisfies ControllerSchema,
};

export type GetRunsQueryParams = z.infer<
	typeof controllerSchemas.getRuns.query.formatted
>;
