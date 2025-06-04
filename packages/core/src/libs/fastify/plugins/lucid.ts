import fs from "node:fs";
import path from "node:path";
import fastifyCookie from "@fastify/cookie";
import cors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import fp from "fastify-plugin";
import constants from "../../../constants/constants.js";
import T from "../../../translations/index.js";
import { LucidError, decodeError } from "../../../utils/errors/index.js";
import { getDirName } from "../../../utils/helpers/index.js";
import logger from "../../../utils/logging/index.js";
import lucidFrontend from "./frontend.js";
import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import type { Config } from "../../../types.js";

const currentDir = getDirName(import.meta.url);

interface LucidPluginOptions extends FastifyPluginOptions {
	config: Config;
}

const lucidPlugin = async (
	fastify: FastifyInstance,
	options: LucidPluginOptions,
) => {
	try {
		// Register server-wide middleware
		fastify.register(cors, {
			origin: [options.config.host, "http://localhost:3000"],
			methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
			allowedHeaders: [
				"Content-Type",
				"Authorization",
				"Content-Length",
				...Object.values(constants.headers),
			],
			credentials: true,
		});

		fastify.register(fastifyCookie, {
			secret: options.config.keys.cookieSecret,
		});

		fastify.register(fastifyHelmet, {
			contentSecurityPolicy: false,
			crossOriginResourcePolicy: false,
		});

		await fastify.register(fastifyRateLimit, {
			max: constants.rateLimit.max,
			timeWindow: constants.rateLimit.timeWindow,
		});

		for (const fastifyExt of options.config.fastifyExtensions || []) {
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
