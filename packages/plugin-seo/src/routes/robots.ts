import { defineContentApiRoute, LucidError } from "@lucidcms/core";
import type { LucidContentRouteAccess } from "@lucidcms/core/types";
import { robots } from "../constants.js";
import { controllerSchemas } from "../schema/robots.js";
import type { SeoPluginOptionsInternal } from "../services/parse-plugin-options.js";
import createRobotsToolkit from "../toolkit/robots/index.js";

declare module "@lucidcms/core/types" {
	interface CustomExternalScopes {
		"robots:read": true;
	}
}

/** Scoped like the sitemap routes, so a frontend's API key is granted what it builds from the CMS. */
const access = {
	type: "scoped",
	scopes: [robots.scope],
} satisfies LucidContentRouteAccess;

/** The content API route for robots.txt, at `/api/v1/content/e/seo/robots`, for sites that serve their own. */
const robotsRoutes = (options: SeoPluginOptionsInternal) => [
	defineContentApiRoute({
		method: "get",
		path: robots.route,
		schema: controllerSchemas.text,
		access,
		openAPI: {
			description:
				"Returns robots.txt for a site origin, the default locale's unless `origin` names another.",
			tags: ["seo-plugin"],
			summary: "Get Robots.txt",
			responses: {
				200: {
					description: "The site origin's robots.txt.",
					content: { "text/plain": { schema: { type: "string" } } },
				},
			},
		},
		handler: async ({ hono, context, input }) => {
			const text = await createRobotsToolkit(context, options).text(
				input.query,
			);
			if (text.error) throw new LucidError(text.error);

			hono.status(200);
			hono.header("Content-Type", "text/plain; charset=utf-8");
			return hono.body(text.data);
		},
	}),
];

export default robotsRoutes;
