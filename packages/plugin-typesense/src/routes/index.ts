import {
	copy,
	defineRoute,
	formatAPIResponse,
	LucidAPIError,
	middleware,
	openAPI,
	serviceWrapper,
	z,
} from "@lucidcms/core";
import {
	REBUILD_RATE_LIMIT,
	REBUILD_RATE_LIMIT_WINDOW_MS,
	REBUILD_ROUTE,
	STATUS_ROUTE,
} from "../constants.js";
import type { SyncJob } from "../jobs/types.js";
import { controllerSchemas } from "../schema/maintenance.js";
import getStatuses from "../services/get-statuses.js";
import queueRebuilds from "../services/queue-rebuilds.js";
import type { ResolvedOptions } from "../types.js";

/** Admin maintenance routes for rebuilding indexes and reading their status, for the Operations page tile. */
const routes = (options: ResolvedOptions, job: SyncJob) => [
	defineRoute({
		method: "post",
		path: REBUILD_ROUTE,
		schema: controllerSchemas.rebuild,
		middleware: [
			middleware.validateCSRF(),
			middleware.authenticate(),
			middleware.rateLimiter({
				mode: "user",
				scope: "typesense-rebuild",
				limit: REBUILD_RATE_LIMIT,
				windowMs: REBUILD_RATE_LIMIT_WINDOW_MS,
			}),
			middleware.permissions(["settings:update"]),
		],
		openAPI: {
			description:
				"Queue a rebuild of every Typesense index from its sources. Each index keeps serving searches until its rebuild is swapped in.",
			tags: ["typesense-plugin"],
			summary: "Rebuild Indexes",
			responses: openAPI.responses({
				status: 202,
				dataSchema: z.toJSONSchema(controllerSchemas.rebuild.response),
			}),
			parameters: openAPI.parameters({ headers: { csrf: true } }),
		},
		handler: async ({ hono, context, toolkit }) => {
			const queued = await serviceWrapper(queueRebuilds, {
				transaction: false,
				defaultError: {
					type: "basic",
					name: copy("server:plugin.typesense.rebuild.error.name"),
					message: copy("server:plugin.typesense.rebuild.error.message"),
				},
			})(context, { options, job, toolkit });
			if (queued.error) throw new LucidAPIError(queued.error);

			hono.status(202);
			return hono.json(formatAPIResponse(hono, { data: queued.data }));
		},
	}),
	defineRoute({
		method: "get",
		path: STATUS_ROUTE,
		schema: controllerSchemas.status,
		middleware: [
			middleware.authenticate(),
			middleware.permissions(["settings:read"]),
		],
		openAPI: {
			description:
				"Read each Typesense index's pending changes, rebuild progress and last error.",
			tags: ["typesense-plugin"],
			summary: "Get Index Statuses",
			responses: openAPI.responses({
				dataSchema: z.toJSONSchema(controllerSchemas.status.response),
			}),
		},
		handler: async ({ hono, context }) => {
			const statuses = await serviceWrapper(getStatuses, {
				transaction: false,
				defaultError: {
					type: "basic",
					name: copy("server:plugin.typesense.status.error.name"),
					message: copy("server:plugin.typesense.status.error.message"),
				},
			})(context, { options });
			if (statuses.error) throw new LucidAPIError(statuses.error);

			return hono.json(formatAPIResponse(hono, { data: statuses.data }));
		},
	}),
];

export default routes;
