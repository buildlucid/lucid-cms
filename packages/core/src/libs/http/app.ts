import type { PublicErrorData } from "@lucidcms/types";
import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { contextStorage } from "hono/context-storage";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import type { StatusCode } from "hono/utils/http-status";
import { openAPIRouteHandler } from "hono-openapi";
import packageJson from "../../../package.json" with { type: "json" };
import constants from "../../constants/constants.js";
import type { LucidHonoGeneric } from "../../types/hono.js";
import type { Config, EnvironmentVariables } from "../../types.js";
import { LucidAPIError, translateErrorData } from "../../utils/errors/index.js";
import { normalizeHost } from "../../utils/helpers/index.js";
import {
	destroyEmailAdapter,
	getInitializedEmailAdapter,
} from "../email/lifecycle.js";
import { createTranslator, resolveInterfaceLocale } from "../i18n/index.js";
import type { TranslationStore } from "../i18n/types.js";
import {
	destroyImageProcessor,
	getInitializedImageProcessor,
} from "../image-processor/lifecycle.js";
import { destroyKVAdapter, getInitializedKVAdapter } from "../kv/lifecycle.js";
import logger, { destroyLogger } from "../logger/index.js";
import {
	destroyMediaAdapter,
	getInitializedMediaAdapter,
} from "../media/lifecycle.js";
import {
	destroyQueueAdapter,
	getInitializedQueueAdapter,
} from "../queue/lifecycle.js";
import type { AdapterRuntimeContext } from "../runtime/types.js";
import logRoute from "./middleware/log-route.js";
import routes from "./routes/index.js";
import type { HttpExtension } from "./types.js";
import featureSupportChecks from "./utils/feature-support-checks.js";
import registerCustomRoutes from "./utils/register-custom-routes.js";
import runHttpExtensions from "./utils/run-http-extensions.js";

/**
 * The entry point for creating the Hono app.
 */
const createApp = async (props: {
	config: Config;
	translationStore: TranslationStore;
	runtimeContext: AdapterRuntimeContext;
	env?: EnvironmentVariables;
	app?: Hono<LucidHonoGeneric>;
	http?: {
		extensions?: HttpExtension[];
	};
}) => {
	const app = props.app || new Hono<LucidHonoGeneric>();
	const configuredHost = props.config.host?.trim()
		? normalizeHost(props.config.host)
		: undefined;

	app
		.use(
			requestId({
				headerName: constants.headers.requestId,
			}),
		)
		.use(contextStorage());

	await runHttpExtensions({
		app,
		config: props.config,
		priority: 0,
		extensions: [
			...(props.http?.extensions ?? []),
			...props.config.http.extensions,
		],
	});

	const kvInstance = await getInitializedKVAdapter(props.config, {
		env: props.env,
		runtimeContext: props.runtimeContext,
	});

	const [queueInstance, mediaInstance, emailInstance, imageProcessorInstance] =
		await Promise.all([
			getInitializedQueueAdapter(props.config, {
				env: props.env,
				runtimeContext: props.runtimeContext,
			}),
			getInitializedMediaAdapter(props.config, {
				env: props.env,
				runtimeContext: props.runtimeContext,
			}),
			getInitializedEmailAdapter(props.config, {
				env: props.env,
				runtimeContext: props.runtimeContext,
			}),
			getInitializedImageProcessor(props.config, {
				env: props.env,
				runtimeContext: props.runtimeContext,
			}),
		]);

	app
		.use(logRoute)
		.use(
			cors({
				origin: [
					"http://localhost:3000",
					...(configuredHost ? [configuredHost] : []),
					...(props.config.http.security.cors?.origin || []),
				],
				allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
				allowHeaders: [
					"Content-Type",
					"Authorization",
					"Content-Length",
					...Object.values(constants.headers),
					...(props.config.http.security.cors?.allowHeaders || []),
				],
				exposeHeaders: [constants.headers.requestId],
				credentials: true,
			}),
		)
		.use(
			secureHeaders(
				props.config.http.security.headers ?? {
					crossOriginResourcePolicy: false,
				},
			),
		)
		.use(async (c, next) => {
			c.set("config", props.config);
			c.set("translationStore", props.translationStore);
			c.set("runtimeContext", props.runtimeContext);
			c.set("queue", queueInstance);
			c.set("kv", kvInstance);
			c.set("media", mediaInstance);
			c.set("email", emailInstance);
			c.set("env", c.get("env") ?? props.env ?? null);
			c.set("cf", c.get("cf") ?? null);
			c.set("caches", c.get("caches") ?? null);
			c.set("ctx", c.get("ctx") ?? null);
			await next();
		})
		.route("/", routes)
		.onError(async (err, c) => {
			const locale = resolveInterfaceLocale({
				config: props.config,
				locale: c.req.header(constants.headers.interfaceLocale),
				acceptLanguage: c.req.header("Accept-Language"),
			});
			const translate = createTranslator({
				store: props.translationStore,
				locale,
			});

			if (err instanceof LucidAPIError) {
				const error = translateErrorData(err.error, translate);

				c.status(error.status as StatusCode);
				return c.json({
					name: error.name,
					message: error.message,
					status: error.status,
					errors: error.errors,
					code: error.code,
					key: error.key,
				} satisfies PublicErrorData);
			}

			logger.error({
				error: err,
				event: "http.unhandled.error",
				message: err.message,
				scope: constants.logScopes.http,
			});

			// @ts-expect-error
			if (err?.statusCode === 429) {
				const resetSeconds = c.res.headers.get("Retry-After") ?? 0;
				c.status(429);
				return c.json({
					code: "rate_limit",
					name: translate("server:core.rate.limit.error.name"),
					message: translate("server:core.rate.limit.exceeded.message", {
						data: {
							resetSeconds,
						},
					}),
					status: 429,
				} satisfies PublicErrorData);
			}

			c.status(500);
			return c.json({
				name: translate("server:core.errors.default.name"),
				message: err.message
					? err.message
					: translate("server:core.errors.default.message"),
				status: constants.errors.status,
				errors: constants.errors.errors,
				code: constants.errors.code,
			} satisfies PublicErrorData);
		})
		.notFound((c) => {
			const locale = resolveInterfaceLocale({
				config: props.config,
				locale: c.req.header(constants.headers.interfaceLocale),
				acceptLanguage: c.req.header("Accept-Language"),
			});
			const translate = createTranslator({
				store: props.translationStore,
				locale,
			});

			if (c.req.url.includes(`/${constants.directories.base}/api`)) {
				return c.json({
					status: 404,
					code: "not_found",
					name: translate("server:core.routes.not.found"),
					message: translate("server:core.routes.not.found.message"),
				} satisfies PublicErrorData);
			}
			c.status(404);
			return c.text(translate("server:core.pages.not.found"));
		});

	//* HTTP extensions
	registerCustomRoutes(app, props.config.http.routes);

	await runHttpExtensions({
		app,
		config: props.config,
		priority: 1,
		extensions: [
			...props.config.http.extensions,
			...(props.http?.extensions ?? []),
		],
	});

	if (props.config.http.openAPI?.enabled) {
		app.get(
			`/${constants.directories.base}/openapi`,
			openAPIRouteHandler(app, {
				documentation: {
					openapi: "3.0.0",
					info: {
						title: "Lucid CMS",
						description:
							"A modern headless CMS offering a delightful developer experience. Tailor Lucid CMS seamlessly to your client and frontend requirements with our expressive brick and collection builders and extensive configuration.",
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
								"Media endpoints for creating, updating, deleting, creating upload sessions and clearing processed images.",
						},
						{
							name: "media-folders",
							description:
								"Media folder endpoints for creating, updating, deleting and fetching media folders.",
						},
						{
							name: "media-share-links",
							description:
								"Media share link endpoints for creating, updating, deleting and fetching media share links.",
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
							name: "jobs",
							description:
								"Job endpoints for fetching existing jobs so you can monitor them and their status.",
						},
						{
							name: "cdn",
							description:
								"CDN endpoints for streaming media files. This handles media retrieval and optional on-request image processing.",
						},
						{
							name: "share",
							description: "Share endpoints for accessing shared media files.",
						},
						{
							name: "settings",
							description:
								"Setting endpoints to recieve current settings and meta data on Lucid.",
						},
						{
							name: "license",
							description:
								"License endpoints for managing the license key and verifying its validity.",
						},
						{
							name: "ai",
							description:
								"AI endpoints for generating CMS content with Lucid AI features.",
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
							name: "client-previews",
							description:
								"Client preview endpoints for resolving preview metadata in browser applications.",
						},
						{
							name: "client-locales",
							description:
								"Client locale endpoints for fetching locale information.",
						},
					],
					servers: configuredHost
						? [
								{
									url: configuredHost.includes("[::1]")
										? configuredHost.replace("[::1]", "localhost")
										: configuredHost,
									description: "Development server",
								},
							]
						: [],
				},
			}),
		);
		app.get(
			constants.openAPIDocsRoute,
			Scalar({
				url: `/${constants.directories.base}/openapi`,
				theme: "saturn",
				defaultHttpClient: {
					targetKey: "node",
					clientKey: "fetch",
				},
			}),
		);
	}

	await runHttpExtensions({
		app,
		config: props.config,
		priority: 2,
		extensions: [
			...props.config.http.extensions,
			...(props.http?.extensions ?? []),
		],
	});

	const supportChecksRes = featureSupportChecks(
		{
			queue: queueInstance.key,
			kv: kvInstance.key,
			media: mediaInstance?.key ?? null,
			email: emailInstance.key,
			database: props.config.db.adapter,
		},
		props.runtimeContext.support,
	);

	let destroyPromise: Promise<void> | undefined;

	return {
		app,
		queue: queueInstance,
		kv: kvInstance,
		media: mediaInstance,
		email: emailInstance,
		issues: supportChecksRes.issues,
		destroy: () => {
			destroyPromise ??= (async () => {
				await Promise.allSettled([
					destroyQueueAdapter(queueInstance, {
						config: props.config,
						env: props.env,
						runtimeContext: props.runtimeContext,
					}),
					destroyKVAdapter(kvInstance, {
						config: props.config,
						env: props.env,
						runtimeContext: props.runtimeContext,
					}),
					destroyMediaAdapter(mediaInstance, {
						config: props.config,
						env: props.env,
						runtimeContext: props.runtimeContext,
					}),
					destroyEmailAdapter(emailInstance, {
						config: props.config,
						env: props.env,
						runtimeContext: props.runtimeContext,
					}),
					destroyImageProcessor(imageProcessorInstance, {
						config: props.config,
						env: props.env,
						runtimeContext: props.runtimeContext,
					}),
					props.config.db.client.destroy(),
				]);
				await destroyLogger();
			})();

			return destroyPromise;
		},
	};
};

export default createApp;
