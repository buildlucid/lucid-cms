import type { FastifyInstance } from "fastify";
import r from "../../../utils/route.js";
import clientIntegration from "../../../controllers/client-integrations/index.js";

const clientIntegrationRoutes = async (fastify: FastifyInstance) => {
	r(fastify, {
		method: "post",
		url: "",
		middleware: {
			authenticate: true,
			validateCSRF: true,
		},
		permissions: ["create_client_integration"],
		swaggerSchema: clientIntegration.createSingle.swaggerSchema,
		zodSchema: clientIntegration.createSingle.zodSchema,
		controller: clientIntegration.createSingle.controller,
	});

	r(fastify, {
		method: "get",
		url: "",
		middleware: {
			authenticate: true,
		},
		swaggerSchema: clientIntegration.getAll.swaggerSchema,
		zodSchema: clientIntegration.getAll.zodSchema,
		controller: clientIntegration.getAll.controller,
	});

	r(fastify, {
		method: "get",
		url: "/:id",
		middleware: {
			authenticate: true,
		},
		swaggerSchema: clientIntegration.getSingle.swaggerSchema,
		zodSchema: clientIntegration.getSingle.zodSchema,
		controller: clientIntegration.getSingle.controller,
	});

	r(fastify, {
		method: "delete",
		url: "/:id",
		middleware: {
			authenticate: true,
			validateCSRF: true,
		},
		permissions: ["delete_client_integration"],
		swaggerSchema: clientIntegration.deleteSingle.swaggerSchema,
		zodSchema: clientIntegration.deleteSingle.zodSchema,
		controller: clientIntegration.deleteSingle.controller,
	});

	r(fastify, {
		method: "patch",
		url: "/:id",
		middleware: {
			authenticate: true,
			validateCSRF: true,
		},
		permissions: ["update_client_integration"],
		swaggerSchema: clientIntegration.updateSingle.swaggerSchema,
		zodSchema: clientIntegration.updateSingle.zodSchema,
		controller: clientIntegration.updateSingle.controller,
	});

	r(fastify, {
		method: "post",
		url: "/:id/regenerate-keys",
		middleware: {
			authenticate: true,
			validateCSRF: true,
		},
		permissions: ["regenerate_client_integration"],
		swaggerSchema: clientIntegration.regenerateKeys.swaggerSchema,
		zodSchema: clientIntegration.regenerateKeys.zodSchema,
		controller: clientIntegration.regenerateKeys.controller,
	});
};

export default clientIntegrationRoutes;
