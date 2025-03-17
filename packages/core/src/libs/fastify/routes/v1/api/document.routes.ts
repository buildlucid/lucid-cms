import type { FastifyInstance } from "fastify";
import r from "../../../route.js";
import documents from "../../../controllers/documents/index.js";

const documentRoutes = async (fastify: FastifyInstance) => {
	// create
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

	// update
	r(fastify, {
		method: "patch",
		url: "/:collectionKey/:id",
		middleware: {
			authenticate: true,
			validateCSRF: true,
		},
		swaggerSchema: documents.updateSingle.swaggerSchema,
		zodSchema: documents.updateSingle.zodSchema,
		controller: documents.updateSingle.controller,
	});

	// delete multiple
	r(fastify, {
		method: "delete",
		url: "/:collectionKey",
		permissions: ["delete_content"],
		middleware: {
			authenticate: true,
			validateCSRF: true,
		},
		swaggerSchema: documents.deleteMultiple.swaggerSchema,
		zodSchema: documents.deleteMultiple.zodSchema,
		controller: documents.deleteMultiple.controller,
	});
};

export default documentRoutes;
