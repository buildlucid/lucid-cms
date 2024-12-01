import T from "../../../translations/index.js";
import fs from "node:fs";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import constants from "../../../constants/constants.js";
import fastifyStatic from "@fastify/static";
import vite from "../../vite/index.js";
import LucidError from "../../../utils/errors/lucid-error.js";
// import fastifyHttpProxy from "@fastify/http-proxy";

const lucidFrontend = async (fastify: FastifyInstance) => {
	try {
		const paths = vite.getPaths();

		// TODO: when plugins support custom components, the following needs to be supported
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

		//* build the vite frontend.
		// TODO: handle buildApp errors appropriately
		if (vite.shouldBuild()) await vite.buildApp();

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
	} catch (error) {
		throw new LucidError({
			scope: "lucid",
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
