import T from "../../translations/index.js";
import { Hono } from "hono";
import { openAPISpecs } from "hono-openapi";
import constants from "../../constants/constants.js";
import routes from "./routes/v1/index.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import packageJson from "../../../package.json" with { type: "json" };
import { Scalar } from "@scalar/hono-api-reference";
import type { Config, LucidErrorData } from "../../types.js";
import type { LucidHonoGeneric } from "../../types/hono.js";

/**
 * The entry point for creating the Hono app.
 */
const createApp = async (props: {
	config: Config;
}) => {
	const app = new Hono<LucidHonoGeneric>()
		.use(async (c, next) => {
			c.set("config", props.config);
			await next();
		})

		.route("/", routes)
		.onError(async (err, c) => {
			if (err instanceof LucidAPIError) {
				return c.json({
					name: err.error.name,
					message: err.error.message,
					status: err.error.status,
					errorResponse: err.error.errorResponse,
					code: err.error.code,
				} satisfies Exclude<LucidErrorData, "zod">);
			}

			// @ts-expect-error
			if (err?.statusCode === 429) {
				return c.json({
					code: "rate_limit",
					name: T("rate_limit_error_name"),
					message: err.message || constants.errors.message,
					status: 429,
				});
			}

			return c.json({
				name: constants.errors.name,
				message: err.message || constants.errors.message,
				status: constants.errors.status,
				errorResponse: constants.errors.errorResponse,
				code: constants.errors.code,
			});
		});

	if (!props.config.disableSwagger) {
		app.get(
			"/openapi",
			openAPISpecs(app, {
				documentation: {
					openapi: "3.0.0",
					info: {
						title: "Lucid CMS",
						description:
							"A modern headless CMS offering a delightful developer experience. Tailor Lucid seamlessly to your client and frontend requirements with our expressive brick and collection builders and extensive configuration.",
						version: packageJson.version,
					},
					tags: [
						{
							name: "auth",
							description:
								"Authentication endpoints including login, token management, CSRF protection and logout functionality.",
						},
						{
							name: "account",
							description:
								"User account management endpoints for user details, password resets and updating personal settings.",
						},
						{
							name: "collections",
							description:
								"Collection endpoints for returning all of the collection configuration, such as their details, config and supported bricks and fields.",
						},
						{
							name: "documents",
							description:
								"Document endpoints for creating, deleting, updating and promoting/restoring versions.",
						},
						{
							name: "media",
							description:
								"Media endpoints for creating, updating, deleting, getting presigned URLs and clearing processed images.",
						},
						{
							name: "emails",
							description:
								"Email endpoints for fetching, deleting and resending emails.",
						},
						{
							name: "users",
							description:
								"User endpoints for inviting, deleting and updating.",
						},
						{
							name: "roles",
							description:
								"Role endpoints for fetching, creating, updating and deleting.",
						},
						{
							name: "permissions",
							description:
								"Permission endpoints for fetching all available permissions.",
						},
						{
							name: "locales",
							description:
								"Locale endpoints for fetching active locales. These are the locales available for your content to be written in.",
						},
						{
							name: "cdn",
							description:
								"CDN endpoints for streaming media files. This handles media retrieval and optional on-request image processing.",
						},
						{
							name: "settings",
							description:
								"Setting endpoints to recieve current settings and meta data on Lucid.",
						},
						{
							name: "client-integrations",
							description:
								"Endpoints for managing client integration credentials used to authenticate external applications accessing CMS content via client endpoints.",
						},
						{
							name: "client-documents",
							description:
								"Client document endpoints for fetching single and multiple documents via the client integration authentication.",
						},
						{
							name: "client-locales",
							description:
								"Client locale endpoints for fetching locale information.",
						},
					],
					servers: [
						{
							url: props.config.host.includes("[::1]")
								? props.config.host.replace("[::1]", "localhost")
								: props.config.host,
							description: "Development server",
						},
					],
				},
			}),
		);
		app.get(
			constants.swaggerRoutePrefix,
			Scalar({
				url: "/openapi",
				theme: "saturn",
				defaultHttpClient: {
					targetKey: "node",
					clientKey: "fetch",
				},
			}),
		);
	}

	return app;
};

export default createApp;
