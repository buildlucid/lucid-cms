import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import type { StatusCode } from "hono/utils/http-status";
import { openAPISpecs } from "hono-openapi";
import packageJson from "../../../package.json" with { type: "json" };
import constants from "../../constants/constants.js";
import T from "../../translations/index.js";
import type { LucidHonoGeneric } from "../../types/hono.js";
import type {
	Config,
	EnvironmentVariables,
	LucidErrorData,
} from "../../types.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import getEmailAdapter from "../email-adapter/get-adapter.js";
import getKVAdapter from "../kv-adapter/get-adapter.js";
import getMediaAdapter from "../media-adapter/get-adapter.js";
import getQueueAdapter from "../queue-adapter/get-adapter.js";
import type { AdapterRuntimeContext } from "../runtime-adapter/types.js";
import logRoute from "./middleware/log-route.js";
import routes from "./routes/index.js";
import featureSupportChecks from "./utils/feature-support-checks.js";

/**
 * The entry point for creating the Hono app.
 */
const createApp = async (props: {
	config: Config;
	runtimeContext: AdapterRuntimeContext;
	env?: EnvironmentVariables;
	app?: Hono<LucidHonoGeneric>;
	hono?: {
		middleware?: Array<
			(app: Hono<LucidHonoGeneric>, config: Config) => Promise<void>
		>;
		extensions?: Array<
			(app: Hono<LucidHonoGeneric>, config: Config) => Promise<void>
		>;
	};
}) => {
	const app = props.app || new Hono<LucidHonoGeneric>();

	const kvInstance = await getKVAdapter(props.config).then(async (i) => {
		await i.lifecycle?.init?.();
		return i;
	});

	const [queueInstance, mediaInstance, emailInstance] = await Promise.all([
		getQueueAdapter(props.config, props.runtimeContext).then(async (a) => {
			await a.lifecycle?.init?.({
				config: props.config,
				runtimeContext: props.runtimeContext,
				env: props.env,
			});
			return a;
		}),
		getMediaAdapter(props.config).then(async (a) => {
			await a.adapter?.lifecycle?.init?.();
			return a.adapter;
		}),
		getEmailAdapter(props.config).then(async (a) => {
			await a.adapter?.lifecycle?.init?.();
			return a.adapter;
		}),
		...(props.config.hono?.middleware || []).map((m) => m(app, props.config)),
		...(props.hono?.middleware || []).map((m) => m(app, props.config)),
	]);

	app
		.use(logRoute)
		.use(
			cors({
				origin: [
					props.config.host,
					"http://localhost:3000",
					...(props.config.cors?.origin || []),
				],
				allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
				allowHeaders: [
					"Content-Type",
					"Authorization",
					"Content-Length",
					...Object.values(constants.headers),
					...(props.config.cors?.allowHeaders || []),
				],
				credentials: true,
			}),
		)
		.use(
			secureHeaders({
				// contentSecurityPolicy: {
				// 	scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
				// 	styleSrc: ["'self'", "'unsafe-inline'"],
				// },
				crossOriginResourcePolicy: false,
			}),
		)
		// TODO: add rate limiting. Might be adapter specific, due to some being stateless
		.use(async (c, next) => {
			c.set("config", props.config);
			c.set("runtimeContext", props.runtimeContext);
			c.set("queue", queueInstance);
			c.set("kv", kvInstance);
			c.set("env", props.env ?? null);
			await next();
		})
		.route("/", routes)
		.onError(async (err, c) => {
			if (err instanceof LucidAPIError) {
				c.status(err.error.status as StatusCode);
				return c.json({
					name: err.error.name,
					message: err.error.message,
					status: err.error.status,
					errors: err.error.errors,
					code: err.error.code,
				} satisfies LucidErrorData);
			}

			// @ts-expect-error
			if (err?.statusCode === 429) {
				c.status(429);
				return c.json({
					code: "rate_limit",
					name: T("rate_limit_error_name"),
					message: err.message || constants.errors.message,
					status: 429,
				} satisfies LucidErrorData);
			}

			c.status(500);
			return c.json({
				name: constants.errors.name,
				message: err.message || constants.errors.message,
				status: constants.errors.status,
				errors: constants.errors.errors,
				code: constants.errors.code,
			} satisfies LucidErrorData);
		})
		.notFound((c) => {
			if (c.req.url.startsWith("/api")) {
				return c.json({
					status: 404,
					code: "not_found",
					name: T("route_not_found"),
					message: T("route_not_found_message"),
				} satisfies LucidErrorData);
			}
			return c.text(T("page_not_found"));
		});

	//* Hono Extensions
	for (const ext of props.config.hono?.extensions || []) {
		await ext(app, props.config);
	}
	for (const ext of props.hono?.extensions || []) {
		await ext(app, props.config);
	}

	if (!props.config.disableOpenAPI) {
		app.get(
			"/openapi",
			openAPISpecs(app, {
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
								"Media endpoints for creating, updating, deleting, getting presigned URLs and clearing processed images.",
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
			constants.openAPIDocsRoute,
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

	const supportChecksRes = featureSupportChecks(
		{
			queue: queueInstance.key,
			kv: kvInstance.key,
			media: mediaInstance?.key || null,
			email: emailInstance.key,
			database: props.config.db.adapter,
		},
		props.runtimeContext.support,
	);

	return {
		app,
		queue: queueInstance,
		kv: kvInstance,
		issues: supportChecksRes.issues,
		destroy: async () => {
			await Promise.allSettled([
				queueInstance.lifecycle?.destroy?.(),
				kvInstance.lifecycle?.destroy?.(),
				mediaInstance?.lifecycle?.destroy?.(),
				emailInstance?.lifecycle?.destroy?.(),
				props.config.db.client.destroy(),
			]);
		},
	};
};

export default createApp;
