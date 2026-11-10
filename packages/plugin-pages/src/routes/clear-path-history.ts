import {
	defineRoute,
	formatAPIResponse,
	LucidError,
	middleware,
	openAPI,
	z,
} from "@lucidcms/core";
import {
	CLEAR_PATH_HISTORY_ROUTE,
	MAINTENANCE_RATE_LIMIT,
	MAINTENANCE_RATE_LIMIT_WINDOW_MS,
} from "../constants.js";
import type { ClearPathHistoryJob } from "../jobs/clear-path-history.js";
import { controllerSchemas } from "../schema/maintenance.js";

/** Queues the job clearing path history, for the Operations page tile. */
const clearPathHistoryRoute = (job: ClearPathHistoryJob) =>
	defineRoute({
		method: "post",
		path: CLEAR_PATH_HISTORY_ROUTE,
		schema: controllerSchemas.clearPathHistory,
		middleware: [
			middleware.validateCSRF(),
			middleware.authenticate(),
			middleware.rateLimiter({
				mode: "user",
				scope: "pages-clear-path-history",
				limit: MAINTENANCE_RATE_LIMIT,
				windowMs: MAINTENANCE_RATE_LIMIT_WINDOW_MS,
			}),
			middleware.permissions(["settings:update"]),
		],
		openAPI: {
			description:
				"Queue a job that forgets every page's old paths, so none of them redirect. The paths pages use now are kept, so their next change still redirects. Editors' redirects aren't affected.",
			tags: ["pages-plugin"],
			summary: "Clear Path History",
			responses: openAPI.responses({
				status: 202,
				dataSchema: z.toJSONSchema(controllerSchemas.clearPathHistory.response),
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

export default clearPathHistoryRoute;
