import {
	defineRoute,
	formatAPIResponse,
	LucidError,
	middleware,
	openAPI,
	z,
} from "@lucidcms/core";
import {
	MAINTENANCE_RATE_LIMIT,
	MAINTENANCE_RATE_LIMIT_WINDOW_MS,
	REBUILD_PATHS_ROUTE,
} from "../constants.js";
import type { RebuildPathsJob } from "../jobs/rebuild-paths.js";
import { controllerSchemas } from "../schema/maintenance.js";

/** Queues the job rebuilding page paths, for the Operations page tile. */
const rebuildPathsRoute = (job: RebuildPathsJob) =>
	defineRoute({
		method: "post",
		path: REBUILD_PATHS_ROUTE,
		schema: controllerSchemas.rebuildPaths,
		middleware: [
			middleware.validateCSRF(),
			middleware.authenticate(),
			middleware.rateLimiter({
				mode: "user",
				scope: "pages-rebuild-paths",
				limit: MAINTENANCE_RATE_LIMIT,
				windowMs: MAINTENANCE_RATE_LIMIT_WINDOW_MS,
			}),
			middleware.permissions(["settings:update"]),
		],
		openAPI: {
			description:
				"Queue a job that recalculates every page's path from its parents, route segments and slug, in latest and each environment. Nothing changes if a rebuilt path would clash with another page's.",
			tags: ["pages-plugin"],
			summary: "Rebuild Page Paths",
			responses: openAPI.responses({
				status: 202,
				dataSchema: z.toJSONSchema(controllerSchemas.rebuildPaths.response),
			}),
			parameters: openAPI.parameters({ headers: { csrf: true } }),
		},
		handler: async ({ hono, toolkit }) => {
			const queued = await toolkit.jobs.enqueueJob({
				job,
				payload: null,
				options: { createdByUserId: hono.get("auth").id },
			});
			if (queued.error) throw new LucidError(queued.error);

			hono.status(202);
			return hono.json(
				formatAPIResponse(hono, { data: { jobId: queued.data.jobId } }),
			);
		},
	});

export default rebuildPathsRoute;
