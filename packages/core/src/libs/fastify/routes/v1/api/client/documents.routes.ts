import type { FastifyInstance } from "fastify";
import r from "../../../../route.js";
import documents from "../../../../controllers/documents/index.js";

const clientDocumentsRoutes = async (fastify: FastifyInstance) => {
	r(fastify, {
		method: "get",
		url: "/document/:collectionKey/:status",
		middleware: {
			clientAuthentication: true,
		},
		swaggerSchema: documents.client.getSingle.swaggerSchema,
		zodSchema: documents.client.getSingle.zodSchema,
		controller: documents.client.getSingle.controller,
	});

	r(fastify, {
		method: "get",
		url: "/documents/:collectionKey/:status",
		middleware: {
			clientAuthentication: true,
		},
		swaggerSchema: documents.client.getMultiple.swaggerSchema,
		zodSchema: documents.client.getMultiple.zodSchema,
		controller: documents.client.getMultiple.controller,
	});
};

export default clientDocumentsRoutes;
