import type { FastifyInstance } from "fastify";
import r from "../../../utils/route.js";
import cdn from "../../../controllers/cdn/index.js";

const cdnRoutes = async (fastify: FastifyInstance) => {
	r(fastify, {
		method: "get",
		url: "/*",
		zodSchema: cdn.streamSingle.zodSchema,
		controller: cdn.streamSingle.controller,
	});
};

export default cdnRoutes;
