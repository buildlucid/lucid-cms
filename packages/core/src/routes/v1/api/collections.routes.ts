import type { FastifyInstance } from "fastify";
import r from "../../../utils/route.js";
import collections from "../../../controllers/collections/index.js";

const collectionRoutes = async (fastify: FastifyInstance) => {
	r(fastify, {
		method: "get",
		url: "/:key",
		middleware: {
			authenticate: true,
		},
		swaggerSchema: collections.getSingle.swaggerSchema,
		zodSchema: collections.getSingle.zodSchema,
		controller: collections.getSingle.controller,
	});
	r(fastify, {
		method: "get",
		url: "",
		middleware: {
			authenticate: true,
		},
		swaggerSchema: collections.getAll.swaggerSchema,
		zodSchema: collections.getAll.zodSchema,
		controller: collections.getAll.controller,
	});
};

export default collectionRoutes;
