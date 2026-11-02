import { defineRoute, middleware, openAPI } from "@lucidcms/core";
import { CLEAR_CACHE_ROUTE } from "../constants.js";
import clearCache from "../tasks/clear-cache.js";

/** Admin maintenance routes, for the Operations page tile. */
const routes = () => [
	defineRoute({
		method: "post",
		path: CLEAR_CACHE_ROUTE,
		middleware: [
			middleware.validateCSRF(),
			middleware.authenticate(),
			middleware.permissions(["settings:update"]),
		],
		openAPI: {
			description:
				"Clear stored ISR pages and fragments, so they render afresh on their next request. CDN caches keep their copies until they expire.",
			tags: ["site-plugin"],
			summary: "Clear Stored Pages",
			responses: openAPI.responses(),
			parameters: openAPI.parameters({ headers: { csrf: true } }),
		},
		handler: async ({ hono, context, toolkit }) => {
			await clearCache.run({ context, toolkit, input: {} });

			hono.status(204);
			return hono.body(null);
		},
	}),
];

export default routes;
