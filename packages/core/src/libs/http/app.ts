import T from "../../translations/index.js";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { openAPISpecs } from "hono-openapi";
import constants from "../../constants/constants.js";
import routes from "./routes/v1/index.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import packageJson from "../../../package.json" with { type: "json" };
import { Scalar } from "@scalar/hono-api-reference";
import type { Config, LucidErrorData } from "../../types.js";
import type { LucidHonoGeneric } from "../../types/hono.js";
import type { StatusCode } from "hono/utils/http-status";

/**
 * The entry point for creating the Hono app.
 */
const createApp = async (props: {
	config: Config;
	beforeMiddleware?: (app: Hono<LucidHonoGeneric>) => void | Promise<void>;
}) => {
	const app = new Hono<LucidHonoGeneric>();

	if (props.beforeMiddleware) await props.beforeMiddleware(app);

	app
		.use(
			cors({
				origin: [props.config.host, "http://localhost:3000"],
				allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
				allowHeaders: [
					"Content-Type",
					"Authorization",
					"Content-Length",
					...Object.values(constants.headers),
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
					errorResponse: err.error.errorResponse,
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
				errorResponse: constants.errors.errorResponse,
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

	//* Hono Lucid Config Extensions
	for (const ext of props.config.honoExtensions || []) {
		await ext(app);
	}

	// TODO: have these implemented within the runtime adapters.
	// fastify.register(fastifyStatic, {
	//     root: path.resolve("public"),
	//     wildcard: false,
	// });
	// const paths = getPaths();

	// fastify.register(fastifyStatic, {
	//     root: paths.clientDist,
	//     prefix: "/admin",
	//     wildcard: false,
	//     decorateReply: false,
	// });

	// fastify.get("/admin", (_, reply) => {
	//     const stream = fs.createReadStream(paths.clientDistHtml);
	//     reply.type("text/html");
	//     return reply.send(stream);
	// });
	// fastify.get("/admin/*", (_, reply) => {
	//     const stream = fs.createReadStream(paths.clientDistHtml);
	//     reply.type("text/html");
	//     return reply.send(stream);
	// });

	// TODO: do we want to serve a landing page anymore?
	// fastify.get("/", async (_, reply) => {
	// 	const indexPath = path.resolve(currentDir, "../assets/landing.html");
	// 	const stream = fs.createReadStream(indexPath);

	// 	reply.type("text/html");
	// 	return reply.send(stream);
	// });

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
