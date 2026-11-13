import {
	defineContentApiRoute,
	formatAPIResponse,
	LucidError,
	openAPI,
	z,
} from "@lucidcms/core";
import type { LucidContentRouteAccess } from "@lucidcms/core/types";
import { sitemap } from "../constants.js";
import { controllerSchemas } from "../schema/sitemap.js";
import type { SeoPluginOptionsInternal } from "../services/parse-plugin-options.js";
import createSitemapToolkit from "../toolkit/sitemap/index.js";

declare module "@lucidcms/core/types" {
	interface CustomExternalScopes {
		"sitemap:read": true;
	}
}

const access = {
	type: "scoped",
	scopes: [sitemap.scope],
} satisfies LucidContentRouteAccess;

/** Content API routes for the sitemap, beneath `/api/v1/content/e/seo/sitemap`, for sites that build their own. */
const sitemapRoutes = (options: SeoPluginOptionsInternal) => [
	defineContentApiRoute({
		method: "get",
		path: `${sitemap.route}/entries`,
		schema: controllerSchemas.entries,
		access,
		openAPI: {
			description:
				"Lists every page in a site origin's sitemap, or one file's pages, with absolute URLs and language versions.",
			tags: ["seo-plugin"],
			summary: "Get Sitemap Entries",
			responses: openAPI.responses({
				dataSchema: z.toJSONSchema(controllerSchemas.entries.response),
			}),
		},
		handler: async ({ hono, context, input }) => {
			const entries = await createSitemapToolkit(context, options).entries(
				input.query,
			);
			if (entries.error) throw new LucidError(entries.error);

			hono.status(200);
			return hono.json(formatAPIResponse(hono, { data: entries.data }));
		},
	}),
	defineContentApiRoute({
		method: "get",
		path: `${sitemap.route}/files`,
		schema: controllerSchemas.files,
		access,
		openAPI: {
			description:
				"Lists a site origin's sitemap files, as its sitemap index does, with how many pages each lists.",
			tags: ["seo-plugin"],
			summary: "Get Sitemap Files",
			responses: openAPI.responses({
				dataSchema: z.toJSONSchema(controllerSchemas.files.response),
			}),
		},
		handler: async ({ hono, context, input }) => {
			const files = await createSitemapToolkit(context, options).files(
				input.query,
			);
			if (files.error) throw new LucidError(files.error);

			hono.status(200);
			return hono.json(formatAPIResponse(hono, { data: files.data }));
		},
	}),
	defineContentApiRoute({
		method: "get",
		path: `${sitemap.route}/xml`,
		schema: controllerSchemas.xml,
		access,
		openAPI: {
			description:
				"Returns a site origin's sitemap index as XML, or one file when `file` is given.",
			tags: ["seo-plugin"],
			summary: "Get Sitemap XML",
			responses: {
				200: {
					description: "The sitemap index, or one sitemap file.",
					content: { "application/xml": { schema: { type: "string" } } },
				},
			},
		},
		handler: async ({ hono, context, input }) => {
			const xml = await createSitemapToolkit(context, options).xml(input.query);
			if (xml.error) throw new LucidError(xml.error);

			hono.status(200);
			hono.header("Content-Type", "application/xml; charset=utf-8");
			return hono.body(xml.data);
		},
	}),
];

export default sitemapRoutes;
