import type { FastifyInstance } from "fastify";
import r from "../../../utils/route.js";
import roles from "../../../controllers/roles/index.js";

const roleRoutes = async (fastify: FastifyInstance) => {
	r(fastify, {
		method: "post",
		url: "",
		middleware: {
			authenticate: true,
			validateCSRF: true,
		},
		permissions: ["create_role"],
		swaggerSchema: roles.createSingle.swaggerSchema,
		zodSchema: roles.createSingle.zodSchema,
		controller: roles.createSingle.controller,
	});

	r(fastify, {
		method: "get",
		url: "/:id",
		middleware: {
			authenticate: true,
		},
		swaggerSchema: roles.getSingle.swaggerSchema,
		zodSchema: roles.getSingle.zodSchema,
		controller: roles.getSingle.controller,
	});

	r(fastify, {
		method: "get",
		url: "",
		middleware: {
			authenticate: true,
		},
		swaggerSchema: roles.getMultiple.swaggerSchema,
		zodSchema: roles.getMultiple.zodSchema,
		controller: roles.getMultiple.controller,
	});

	r(fastify, {
		method: "delete",
		url: "/:id",
		middleware: {
			authenticate: true,
			validateCSRF: true,
		},
		permissions: ["delete_role"],
		swaggerSchema: roles.deleteSingle.swaggerSchema,
		zodSchema: roles.deleteSingle.zodSchema,
		controller: roles.deleteSingle.controller,
	});

	r(fastify, {
		method: "patch",
		url: "/:id",
		permissions: ["update_role"],
		middleware: {
			authenticate: true,
			validateCSRF: true,
		},
		swaggerSchema: roles.updateSingle.swaggerSchema,
		zodSchema: roles.updateSingle.zodSchema,
		controller: roles.updateSingle.controller,
	});
};

export default roleRoutes;
