import {
	copy,
	defineRoute,
	formatAPIResponse,
	LucidError,
	middleware,
	openAPI,
	serviceWrapper,
	z,
} from "@lucidcms/core";
import { indexNow } from "../constants.js";
import type { SendIndexNowJob } from "../jobs/send-index-now.js";
import { controllerSchemas } from "../schema/index-now.js";
import getStatus from "../services/index-now/get-status.js";

/** Admin routes for sending changed pages to IndexNow and reading their status, for the Operations page tile. */
const indexNowRoutes = (job: SendIndexNowJob) => [
	defineRoute({
		method: "post",
		path: indexNow.sendRoute,
		schema: controllerSchemas.send,
		middleware: [
			middleware.validateCSRF(),
			middleware.authenticate(),
			middleware.rateLimiter({
				mode: "user",
				scope: "seo-index-now-send",
				limit: indexNow.rateLimit,
				windowMs: indexNow.rateLimitWindowMs,
			}),
			middleware.permissions(["settings:update"]),
		],
		openAPI: {
			description:
				"Queue a job that sends IndexNow the sitemap's pages that are new, changed or gone, and any still waiting from earlier sends.",
			tags: ["seo-plugin"],
			summary: "Send Changed Pages to IndexNow",
			responses: openAPI.responses({
				status: 202,
				dataSchema: z.toJSONSchema(controllerSchemas.send.response),
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
	}),
	defineRoute({
		method: "get",
		path: indexNow.statusRoute,
		schema: controllerSchemas.status,
		middleware: [
			middleware.authenticate(),
			middleware.permissions(["settings:read"]),
		],
		openAPI: {
			description:
				"Read how many URLs are waiting to be sent to IndexNow, and when it last accepted changed pages and how many.",
			tags: ["seo-plugin"],
			summary: "Get IndexNow Status",
			responses: openAPI.responses({
				dataSchema: z.toJSONSchema(controllerSchemas.status.response),
			}),
		},
		handler: async ({ hono, context }) => {
			const status = await serviceWrapper(getStatus, {
				transaction: false,
				defaultError: {
					type: "basic",
					name: copy("server:plugin.seo.index.now.status.error.name"),
					message: copy("server:plugin.seo.index.now.status.error.message"),
				},
			})(context);
			if (status.error) throw new LucidError(status.error);

			return hono.json(formatAPIResponse(hono, { data: status.data }));
		},
	}),
];

export default indexNowRoutes;
