import {
	copy,
	defineContentApiRoute,
	formatAPIResponse,
	LucidError,
	middleware,
} from "@lucidcms/core";
import type {
	LucidHonoContext,
	LucidRouteMiddleware,
} from "@lucidcms/core/types";
import { bodyLimit } from "hono/body-limit";
import { routes, uploads } from "../constants.js";
import readSubmissionBody from "../http/read-submission-body.js";
import resolveReturnUrl from "../http/resolve-return-url.js";
import { controllerSchemas } from "../schema/forms.js";
import type { FormsPluginOptionsInternal } from "../services/parse-plugin-options.js";
import { createFormsToolkit } from "../toolkit/index.js";

/** Whether the request came from a script that reads JSON, rather than a form the browser posted itself. */
const wantsJson = (hono: LucidHonoContext) =>
	[hono.req.header("content-type"), hono.req.header("accept")].some((header) =>
		header?.toLowerCase().includes("application/json"),
	);

/**
 * The content API routes websites read forms from and post them to, at
 * `/api/v1/content/e/forms/<key>`. Both are public: forms are meant for visitors, and hold nothing
 * private once recipients are left out. Posting is rate limited per IP address.
 */
const formsRoutes = (options: FormsPluginOptionsInternal) => {
	const submitMiddleware: LucidRouteMiddleware[] = [];
	if (options.rateLimit !== false) {
		submitMiddleware.push(
			middleware.rateLimiter({
				mode: "ip",
				scope: "forms-submit",
				limit: options.rateLimit.limit,
				windowMs: options.rateLimit.windowMs,
			}),
		);
	}

	return [
		defineContentApiRoute({
			method: "get",
			path: `${routes.content}/:key`,
			schema: controllerSchemas.get,
			access: { type: "public" },
			openAPI: {
				description:
					"Returns what a website needs to draw a form and send it: its fields, where it posts and what a captcha widget needs.",
				tags: ["forms-plugin"],
				summary: "Get Form",
			},
			handler: async ({ hono, context, input }) => {
				const form = await createFormsToolkit(context, options).get({
					key: input.params.key,
					locale: input.query.locale,
					version: input.query.version,
				});
				if (form.error) throw new LucidError(form.error);
				if (form.data === null) {
					throw new LucidError({
						type: "basic",
						status: 404,
						code: "not_found",
						name: copy("server:plugin.forms.not.found.name"),
						message: copy("server:plugin.forms.not.found"),
					});
				}

				return hono.json(formatAPIResponse(hono, { data: form.data }));
			},
		}),
		defineContentApiRoute({
			method: "post",
			path: `${routes.content}/:key/submit`,
			schema: controllerSchemas.submit,
			access: { type: "public" },
			middleware: [
				...submitMiddleware,
				(hono, next) =>
					bodyLimit({
						maxSize:
							uploads.answerBytes +
							hono.get("config").media.limits.uploadBytes *
								uploads.maxSubmissionFiles,
						onError: () => {
							throw new LucidError({
								type: "basic",
								status: 413,
								message: copy("server:plugin.forms.submit.too.large"),
							});
						},
					})(hono, next),
			],
			openAPI: {
				description:
					"Sends a form, as JSON or as a posted form with any files. Scripts get the confirmation back, with refused answers in `errors.values` by field name. Browsers posting the form themselves are redirected.",
				tags: ["forms-plugin"],
				summary: "Submit Form",
			},
			handler: async ({ hono, context, input }) => {
				const { key } = input.params;
				const { returnUrl, ...submission } = await readSubmissionBody(hono);
				const sent = await createFormsToolkit(context, options).submit({
					key,
					locale: input.query.locale,
					version: input.query.version,
					...submission,
				});

				if (wantsJson(hono)) {
					if (sent.error) throw new LucidError(sent.error);
					return hono.json(
						formatAPIResponse(hono, {
							data: { confirmation: sent.data.confirmation },
						}),
					);
				}

				const next = resolveReturnUrl(hono, {
					key,
					returnUrl,
					outcome: sent.error ? { error: true } : sent.data,
				});
				if (next === null) {
					if (sent.error) throw new LucidError(sent.error);
					return hono.json(
						formatAPIResponse(hono, {
							data: { confirmation: sent.data.confirmation },
						}),
					);
				}
				return hono.redirect(next, 303);
			},
		}),
	];
};

export default formsRoutes;
