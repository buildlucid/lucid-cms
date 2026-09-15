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
import type {
	EnvironmentVariables,
	ResolvedLucidConfig,
} from "../../exports/types.js";
import type { LucidHonoGeneric } from "../../types/hono.js";
import {
	LucidAPIError,
	LucidError,
	translateErrorData,
} from "../../utils/errors/index.js";
import { normalizeHost } from "../../utils/helpers/index.js";
import type LucidDatabase from "../db/client/lucid-database.js";
import { createTranslator, resolveInterfaceLocale } from "../i18n/index.js";
import type { TranslationStore } from "../i18n/types.js";
import logger, { destroyLogger } from "../logger/index.js";
import type { LucidAdapterInstances } from "../runtime/create-lucid-adapters.js";
import type { AdapterRuntimeContext } from "../runtime/types.js";
import logRoute from "./middleware/log-route.js";
import routes from "./routes/index.js";
import type { HttpExtension } from "./types.js";
import featureSupportChecks from "./utils/feature-support-checks.js";
import registerCustomRoutes from "./utils/register-custom-routes.js";
import runHttpExtensions from "./utils/run-http-extensions.js";

const invocationSymbol = Symbol("@lucidcms/core:http-invocation");

type HttpInvocation = {
	db: LucidDatabase;
	env?: EnvironmentVariables;
};

type HttpInvocationBindings = EnvironmentVariables & {
	[invocationSymbol]: HttpInvocation;
};

const createInvocationBindings = (
	invocation: HttpInvocation,
	requestBindings?: object,
): HttpInvocationBindings => {
	const bindings = Object.create(
		invocation.env ?? null,
	) as HttpInvocationBindings;
	if (requestBindings) {
		// Node bindings expose request state such as `socket` through descriptors,
		// so preserve them rather than flattening values with object spread.
		Object.defineProperties(
			bindings,
			Object.getOwnPropertyDescriptors(requestBindings),
		);
	}
	Object.defineProperty(bindings, invocationSymbol, {
		value: invocation,
	});
	return bindings;
};

/**
 * The entry point for creating the Hono app.
 */
const createApp = async (props: {
	config: ResolvedLucidConfig;
	translationStore: TranslationStore;
	runtimeContext: AdapterRuntimeContext;
	adapters: LucidAdapterInstances;
	env?: EnvironmentVariables;
	http?: {
		extensions?: HttpExtension[];
	};
}) => {
	const app = new Hono<LucidHonoGeneric>();
	const configuredHost = props.config.host?.trim()
		? normalizeHost(props.config.host)
		: undefined;
	const allowedCorsOrigins = [
		"http://localhost:3000",
		...(configuredHost ? [configuredHost] : []),
		...(props.config.http.security.cors?.origin || []),
	];

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
		phase: "beforeMiddleware",
		extensions: [
			...(props.http?.extensions ?? []),
			...props.config.http.extensions,
		],
	});

	app
		.use(logRoute)
		.use(
			cors({
				origin: (origin, c) => {
					if (c.req.path === "/lucid/oauth/authorize") return null;
					return allowedCorsOrigins.includes(origin) ? origin : null;
				},
				allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
				allowHeaders: [
					"Content-Type",
					"Authorization",
					"X-API-Key",
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
			const invocation = (c.env as HttpInvocationBindings | undefined)?.[
				invocationSymbol
			];
			if (!invocation) {
				throw new LucidError({
					message:
						"Lucid HTTP requests must be handled with an active runtime invocation.",
				});
			}

			c.set("config", props.config);
			c.set("db", invocation.db);
			c.set("translationStore", props.translationStore);
			c.set("runtimeContext", props.runtimeContext);
			c.set("queue", props.adapters.queue);
			c.set("kv", props.adapters.kv);
			c.set("mediaStorage", props.adapters.mediaStorage);
			c.set("mediaDelivery", props.adapters.mediaDelivery);
			c.set("email", props.adapters.email);
			c.set("env", invocation.env ?? null);
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

			c.status(404);

			const apiPath = `/${constants.directories.base}/api`;

			if (c.req.path === apiPath || c.req.path.startsWith(`${apiPath}/`)) {
				return c.json({
					status: 404,
					code: "not_found",
					name: translate("server:core.routes.not.found"),
					message: translate("server:core.routes.not.found.message"),
				} satisfies PublicErrorData);
			}
			return c.text(translate("server:core.pages.not.found"));
		});

	//* HTTP extensions
	try {
		registerCustomRoutes(app, props.config.http.routes);

		await runHttpExtensions({
			app,
			config: props.config,
			phase: "afterRoutes",
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
								description:
									"Share endpoints for accessing shared media files.",
							},
							{
								name: "settings",
								description:
									"Setting endpoints to recieve current settings and meta data on Lucid.",
							},
							{
								name: "connection",
								description:
									"OAuth endpoints for connecting Lucid CMS to Lucid Website.",
							},
							{
								name: "ai",
								description:
									"AI endpoints for generating CMS content with Lucid AI features.",
							},
							{
								name: "integrations",
								description:
									"Endpoints for managing integration credentials used by external applications.",
							},
							{
								name: "content-documents",
								description:
									"External document endpoints authorized by API keys or OAuth access tokens.",
							},
							{
								name: "content-previews",
								description:
									"Content preview endpoints for resolving preview metadata in browser applications.",
							},
							{
								name: "content-locales",
								description:
									"Content locale endpoints for fetching locale information.",
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
			phase: "afterSetup",
			extensions: [
				...props.config.http.extensions,
				...(props.http?.extensions ?? []),
			],
		});
	} catch (error) {
		await destroyLogger();
		throw error;
	}

	const supportChecksRes = featureSupportChecks(
		{
			queue: props.adapters.queue.key,
			kv: props.adapters.kv.key,
			mediaStorage: props.adapters.mediaStorage?.key ?? null,
			mediaDelivery: props.adapters.mediaDelivery.key,
			email: props.adapters.email.key,
			database: props.config.db.adapter,
		},
		props.runtimeContext.support,
	);

	let destroyPromise: Promise<void> | undefined;

	return {
		handle: (options: {
			request: Request;
			db: LucidDatabase;
			env?: EnvironmentVariables;
			executionContext?: unknown;
			requestBindings?: object;
		}) =>
			app.fetch(
				options.request,
				createInvocationBindings(
					{
						db: options.db,
						env: options.env,
					},
					options.requestBindings,
				),
				options.executionContext as Parameters<typeof app.fetch>[2],
			),
		issues: supportChecksRes.issues,
		destroy: () => {
			destroyPromise ??= (async () => {
				await destroyLogger();
			})();

			return destroyPromise;
		},
	};
};

export default createApp;
