import type { FastifyInstance } from "fastify";
import r from "../../../route.js";
import documents from "../../../controllers/documents/index.js";

const documentRoutes = async (fastify: FastifyInstance) => {
	r(fastify, {
		method: "post",
		url: "/:collectionKey",
		middleware: {
			authenticate: true,
			validateCSRF: true,
		},
		swaggerSchema: documents.createSingle.swaggerSchema,
		zodSchema: documents.createSingle.zodSchema,
		controller: documents.createSingle.controller,
	});
};

export default documentRoutes;
