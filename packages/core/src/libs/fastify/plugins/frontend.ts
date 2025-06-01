import T from "../../../translations/index.js";
import fs from "node:fs";
import fp from "fastify-plugin";
import constants from "../../../constants/constants.js";
import fastifyStatic from "@fastify/static";
import vite from "../../vite/index.js";
import LucidError from "../../../utils/errors/lucid-error.js";
import type { FastifyInstance } from "fastify";

// import fastifyHttpProxy from "@fastify/http-proxy";

/**
 * The Lucid Frontend Fastify Plugin
 * Responsible for building and serving the admin SPA for both production and development
 * @todo When plugins support custom components, re-enable and configure the vite.createServer service.
 */
const lucidFrontend = async (fastify: FastifyInstance) => {
	try {
		const paths = vite.getPaths();

		//* proxy fastify /admin to it instead of serving built version
		// if (process.env.NODE_ENV === "development") {
		// 	await vite.createServer();
		// 	fastify.register(fastifyHttpProxy, {
		// 		upstream: "http://localhost:3000",
		// 		prefix: "/admin",
		// 		rewritePrefix: "/",
		// 		websocket: true,
		// 	});
		// }
		// else {
		//* build the vite frontend.
		// const buildResponse = await vite.buildApp(fastify.config);
		// if (buildResponse.error) throw new Error(buildResponse.error.message);

		fastify.register(fastifyStatic, {
			root: paths.clientDist,
			prefix: "/admin",
			wildcard: false,
			decorateReply: false,
		});

		fastify.get("/admin", (_, reply) => {
			const stream = fs.createReadStream(paths.clientDistHtml);
			reply.type("text/html");
			return reply.send(stream);
		});
		fastify.get("/admin/*", (_, reply) => {
			const stream = fs.createReadStream(paths.clientDistHtml);
			reply.type("text/html");
			return reply.send(stream);
		});
		// }
	} catch (error) {
		throw new LucidError({
			scope: constants.logScopes.lucid,
			message:
				error instanceof Error
					? error?.message
					: T("lucid_server_unknow_build_error"),
			kill: true,
		});
	}
};

export default fp(lucidFrontend, {
	name: "@lucidcms/frontend",
	fastify: constants.fastify.version,
});
