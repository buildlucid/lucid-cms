import fs from "node:fs/promises";
import path, { join } from "node:path";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import constants from "../../../constants/constants.js";
import fastifyHttpProxy from "@fastify/http-proxy";
import fastifyStatic from "@fastify/static";
import vite from "../../vite/index.js";

const lucidFrontend = async (fastify: FastifyInstance) => {
	const cwd = process.cwd();
	const outDir = join(cwd, constants.vite.outputDir, constants.vite.dist);

	//* Hacky - just example
	// TODO:
	//  - error handling
	//  - args planned ouut
	//      - arg for creating dev server
	//      - arg for forcing rebuild of admin

	if (process.argv[2] === "--watch") {
		await vite.createServer();

		// proxy fastify /admin to it instead of serving built version
		fastify.register(fastifyHttpProxy, {
			upstream: "http://localhost:3000",
			prefix: "/admin",
			rewritePrefix: "/",
			websocket: true,
		});
	} else {
		// build the vite frontend.
		// determine if frontend has had any edits before deciding if we need to rebuild it.
		await vite.buildApp();

		// serve it
		const cmsEntry = await fs.readFile(path.resolve(outDir, "index.html"));
		fastify.register(fastifyStatic, {
			root: outDir,
			prefix: "/admin",
			wildcard: false,
			decorateReply: false,
		});

		fastify.get("/admin", async (_, reply) => {
			reply.type("text/html").send(cmsEntry);
		});

		fastify.get("/admin/*", async (_, reply) => {
			reply.type("text/html").send(cmsEntry);
		});
	}
};

export default fp(lucidFrontend, {
	name: "@lucidcms/frontend",
	fastify: constants.fastify.version,
});
