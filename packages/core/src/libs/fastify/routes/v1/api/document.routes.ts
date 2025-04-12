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

	// delete single document
	r(fastify, {
		method: "delete",
		url: "/:collectionKey/:id",
		permissions: ["delete_content"],
		middleware: {
			authenticate: true,
			validateCSRF: true,
		},
		swaggerSchema: documents.deleteSingle.swaggerSchema,
		zodSchema: documents.deleteSingle.zodSchema,
		controller: documents.deleteSingle.controller,
	});

	// Get single document
	r(fastify, {
		method: "get",
		url: "/:collectionKey/:id/:statusOrId",
		middleware: {
			authenticate: true,
		},
		swaggerSchema: documents.getSingle.swaggerSchema,
		zodSchema: documents.getSingle.zodSchema,
		controller: documents.getSingle.controller,
	});

	// Get multiple documents
	r(fastify, {
		method: "get",
		url: "/:collectionKey/:status",
		middleware: {
			authenticate: true,
		},
		swaggerSchema: documents.getMultiple.swaggerSchema,
		zodSchema: documents.getMultiple.zodSchema,
		controller: documents.getMultiple.controller,
	});

	// Get multiple document revisions
	r(fastify, {
		method: "get",
		url: "/:collectionKey/:id/revisions",
		middleware: {
			authenticate: true,
		},
		swaggerSchema: documents.getMultipleRevisions.swaggerSchema,
		zodSchema: documents.getMultipleRevisions.zodSchema,
		controller: documents.getMultipleRevisions.controller,
	});

	// Restore revision
	r(fastify, {
		method: "post",
		url: "/:collectionKey/:id/:versionId/restore-revision",
		permissions: ["restore_content"],
		middleware: {
			authenticate: true,
			validateCSRF: true,
		},
		swaggerSchema: documents.restoreRevision.swaggerSchema,
		zodSchema: documents.restoreRevision.zodSchema,
		controller: documents.restoreRevision.controller,
	});

	// Promote version
	r(fastify, {
		method: "post",
		url: "/:collectionKey/:id/:versionId/promote-version",
		middleware: {
			authenticate: true,
			validateCSRF: true,
		},
		swaggerSchema: documents.promoteVersion.swaggerSchema,
		zodSchema: documents.promoteVersion.zodSchema,
		controller: documents.promoteVersion.controller,
	});
};

export default documentRoutes;
