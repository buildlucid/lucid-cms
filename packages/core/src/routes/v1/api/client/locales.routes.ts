import type { FastifyInstance } from "fastify";
import r from "../../../../utils/route.js";
import locales from "../../../../controllers/locales/index.js";

const clientLocalesRoutes = async (fastify: FastifyInstance) => {
	r(fastify, {
		method: "get",
		url: "/",
		middleware: {
			clientAuthentication: true,
		},
		swaggerSchema: locales.client.getAll.swaggerSchema,
		zodSchema: locales.client.getAll.zodSchema,
		controller: locales.client.getAll.controller,
	});
};

export default clientLocalesRoutes;
