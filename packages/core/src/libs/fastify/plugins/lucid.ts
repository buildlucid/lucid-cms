import fs from "node:fs";
import path from "node:path";
import fastifyCookie from "@fastify/cookie";
import cors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import fastifySwagger from "@fastify/swagger";
import fp from "fastify-plugin";
import packageJson from "../../../../package.json" with { type: "json" };
import executeStartTasks from "../../../actions/execute-start-tasks.js";
import constants from "../../../constants/constants.js";
import getConfig from "../../../libs/config/get-config.js";
import routes from "../routes/index.js";
import lucidServices from "../../../services/index.js";
import T from "../../../translations/index.js";
import { LucidError, decodeError } from "../../../utils/errors/index.js";
import { getDirName } from "../../../utils/helpers/index.js";
import logger from "../../../utils/logging/index.js";
import lucidFrontend from "./frontend.js";
import scalarApiReference from "@scalar/fastify-api-reference";
import type { FastifyInstance } from "fastify";

const currentDir = getDirName(import.meta.url);

const lucidPlugin = async (fastify: FastifyInstance) => {
	try {
		const config = await getConfig();

		await executeStartTasks({
			db: config.db.client,
			config: config,
			services: lucidServices,
		});

		// Decorate Fastify instance with config, logger, and services
		fastify.decorate("config", config);
		fastify.decorate("logger", logger);
		fastify.decorate("services", lucidServices);

		// Register Swagger for API documentation

		fastify.register(fastifySwagger, {
			openapi: {
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
						name: "emails",
						description:
							"Email endpoints for fetching, deleting and resending emails.",
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
						url: config.host.includes("[::1]")
							? config.host.replace("[::1]", "localhost")
							: config.host,
						description: "Development server",
					},
				],
				// schemes: ["http"],
				// consumes: ["application/json", "multipart/form-data"],
				// produces: ["application/json"],
				components: {},
			},
			hideUntagged: true,
		});

		if (!config.disableSwagger) {
			fastify.register(scalarApiReference, {
				routePrefix: constants.swaggerRoutePrefix,
				configuration: {
					theme: "saturn",
					defaultHttpClient: {
						targetKey: "node",
						clientKey: "fetch",
					},
				},
			});
		}

		// fastify.setValidatorCompiler(() => {
		// 	return () => ({ value: false });
		// });

		// Register server-wide middleware
		fastify.register(cors, {
			origin: [config.host, "http://localhost:3000"],
			methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
			allowedHeaders: [
				"Content-Type",
				"Authorization",
				"Content-Length",
				...Object.values(constants.headers),
			],
			credentials: true,
		});

		fastify.register(fastifyCookie, { secret: config.keys.cookieSecret });

		fastify.register(fastifyHelmet, {
			contentSecurityPolicy: false,
			crossOriginResourcePolicy: false,
		});

		await fastify.register(fastifyRateLimit, {
			max: constants.rateLimit.max,
			timeWindow: constants.rateLimit.timeWindow,
		});

		// Register routes
		fastify.register(routes);

		for (const fastifyExt of config.fastifyExtensions || []) {
			fastify.register(fastifyExt);
		}

		fastify.register(fastifyStatic, {
			root: path.resolve("public"),
			wildcard: false,
		});

		// Build & serve CMS
		fastify.register(lucidFrontend);

		// Serve landing page
		fastify.get("/", async (_, reply) => {
			const indexPath = path.resolve(currentDir, "../assets/landing.html");
			const stream = fs.createReadStream(indexPath);

			reply.type("text/html");
			return reply.send(stream);
		});

		// Handle 404 errors
		fastify.setNotFoundHandler(
			{
				preHandler: fastify.rateLimit(),
			},
			(request, reply) => {
				if (request.url.startsWith("/api")) {
					reply.code(404).send({
						status: 404,
						code: "not_found",
						name: T("route_not_found"),
						message: T("route_not_found_message"),
					});
				} else {
					reply.code(404).send(T("page_not_found"));
				}
			},
		);

		// Error handling
		fastify.setErrorHandler((error, request, reply) => {
			const { name, message, status, errorResponse, code } = decodeError(error);

			if (message) {
				logger("error", {
					message,
					scope: status?.toString() ?? "500",
				});
			}

			if (reply.sent) {
				logger("error", { message: T("headers_already_sent") });
				return;
			}

			reply.status(status ?? 500).send({
				status,
				code,
				name,
				message,
				errors: errorResponse,
			});
		});
	} catch (error) {
		throw new LucidError({
			scope: constants.logScopes.lucid,
			message:
				error instanceof Error
					? error?.message
					: T("lucid_server_unknow_error"),
			kill: true,
		});
	}
};

export default fp(lucidPlugin, {
	name: "@lucidcms/core",
	fastify: constants.fastify.version,
});
