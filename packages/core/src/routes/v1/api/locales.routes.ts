import type { FastifyInstance } from "fastify";
import r from "../../../utils/route.js";
import locales from "../../../controllers/locales/index.js";

const localeRoutes = async (fastify: FastifyInstance) => {
	r(fastify, {
		method: "get",
		url: "/:code",
		middleware: {
			authenticate: true,
		},
		swaggerSchema: locales.getSingle.swaggerSchema,
		zodSchema: locales.getSingle.zodSchema,
		controller: locales.getSingle.controller,
	});

	r(fastify, {
		method: "get",
		url: "",
		middleware: {
			authenticate: true,
		},
		swaggerSchema: locales.getAll.swaggerSchema,
		zodSchema: locales.getAll.zodSchema,
		controller: locales.getAll.controller,
	});
};

export default localeRoutes;
