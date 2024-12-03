import type { FastifyInstance } from "fastify";
import apiV1 from "./v1/api/index.js";
import cdnV1 from "./v1/cdn/index.js";

const routes = async (fastify: FastifyInstance) => {
	fastify.register(apiV1, {
		prefix: "/api/v1",
	});
	fastify.register(cdnV1, {
		prefix: "/cdn/v1",
	});
};

export default routes;
