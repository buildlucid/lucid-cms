import { previewParams, previewScripts } from "@lucidcms/client/contract";
import {
	copy,
	defineRoute,
	formatAPIResponse,
	LucidError,
	middleware,
	openAPI,
	z,
} from "@lucidcms/core";
import { FORMS_READ_PERMISSION, routes } from "../constants.js";
import { controllerSchemas } from "../schema/forms.js";
import readPreviewForm from "../services/forms/read-preview-form.js";
import renderPreviewPage from "../services/forms/render-preview-page.js";
import typeRenderers from "../services/forms/type-renderers.js";
import type { FormsPluginOptionsInternal } from "../services/parse-plugin-options.js";
import { createFormsToolkit } from "../toolkit/index.js";

/**
 * Starts Lucid's preview script on the preview page, updating the form in place as it changes,
 * and keeps the form from being sent. A file of its own, so the page works under a Content
 * Security Policy that refuses inline scripts.
 */
const previewScript = `
window[Symbol.for(${JSON.stringify(Symbol.keyFor(previewScripts.page.key))})]?.setup({handlers:new Set(),morph:true,serverMarkup:new WeakMap()});
addEventListener("submit",function(event){event.preventDefault()});
`.trim();

const notFound = () =>
	new LucidError({
		type: "basic",
		status: 404,
		code: "not_found",
		name: copy("server:plugin.forms.not.found.name"),
		message: copy("server:plugin.forms.not.found"),
	});

/**
 * Routes for the collection editors build forms in: the page its preview frames, that page's
 * script, and a form's markup for the admin to show. The page is read with the preview's token,
 * which only the builder holds, so it needs no login.
 */
const builderRoutes = (options: FormsPluginOptionsInternal) => [
	defineRoute({
		method: "get",
		path: routes.preview,
		handler: async ({ hono, context }) => {
			const locale = hono.req.query("locale");
			const preview = await readPreviewForm(context, {
				options,
				token: hono.req.query(previewParams.token) ?? "",
				locale,
			});
			if (preview.error) throw new LucidError(preview.error);
			if (preview.data === null) throw notFound();

			return hono.html(
				renderPreviewPage(
					preview.data,
					typeRenderers(options.fieldTypes),
					locale ?? context.config.localization.defaultLocale ?? "en",
				),
				200,
				{
					"Cache-Control": "private, no-store",
					"Referrer-Policy": "no-referrer",
				},
			);
		},
	}),
	defineRoute({
		method: "get",
		path: routes.previewScript,
		handler: async ({ hono }) =>
			hono.body(previewScript, 200, {
				"Content-Type": "text/javascript; charset=utf-8",
				"Cache-Control": "public, max-age=3600",
			}),
	}),
	defineRoute({
		method: "get",
		path: routes.markup,
		schema: controllerSchemas.markup,
		middleware: [
			middleware.authenticate(),
			middleware.permissions([FORMS_READ_PERMISSION]),
		],
		openAPI: {
			description:
				"Returns the HTML websites get for a form, as `renderForm` writes it.",
			tags: ["forms-plugin"],
			summary: "Get Form Markup",
			responses: openAPI.responses({
				dataSchema: z.toJSONSchema(controllerSchemas.markup.response),
			}),
		},
		handler: async ({ hono, context, input }) => {
			const html = await createFormsToolkit(context, options).render({
				key: input.query.form,
				locale: input.query.locale,
				version: input.query.version,
			});
			if (html.error) throw new LucidError(html.error);
			if (html.data === null) throw notFound();

			return hono.json(formatAPIResponse(hono, { data: { html: html.data } }));
		},
	}),
];

export default builderRoutes;
