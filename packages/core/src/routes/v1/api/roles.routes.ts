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
		zodSchema: roles.createSingle.zodSchema,
		controller: roles.createSingle.controller,
	});

	r(fastify, {
		method: "get",
		url: "/:id",
		middleware: {
			authenticate: true,
		},
		zodSchema: roles.getSingle.zodSchema,
		controller: roles.getSingle.controller,
	});

	r(fastify, {
		method: "get",
		url: "",
		middleware: {
			authenticate: true,
		},
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
		zodSchema: roles.updateSingle.zodSchema,
		controller: roles.updateSingle.controller,
	});
};

export default roleRoutes;
