import type { FastifyInstance } from "fastify";
import r from "../../../utils/route.js";
import collectionDocuments from "../../../controllers/collection-documents/index.js";

const collectionDocumentsRoutes = async (fastify: FastifyInstance) => {
	// Create published document
	r(fastify, {
		method: "post",
		url: "/:collectionKey",
		middleware: {
			authenticate: true,
			validateCSRF: true,
		},
		zodSchema: collectionDocuments.createSingle.zodSchema,
		controller: collectionDocuments.createSingle.controller,
	});

	// Update document
	r(fastify, {
		method: "post",
		url: "/:collectionKey/:id",
		middleware: {
			authenticate: true,
			validateCSRF: true,
		},
		zodSchema: collectionDocuments.updateSingle.zodSchema,
		controller: collectionDocuments.updateSingle.controller,
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
		zodSchema: collectionDocuments.restoreRevision.zodSchema,
		controller: collectionDocuments.restoreRevision.controller,
	});

	// Promote version
	r(fastify, {
		method: "post",
		url: "/:collectionKey/:id/:versionId/promote-version",
		middleware: {
			authenticate: true,
			validateCSRF: true,
		},
		zodSchema: collectionDocuments.promoteVersion.zodSchema,
		controller: collectionDocuments.promoteVersion.controller,
	});

	// Get single document
	r(fastify, {
		method: "get",
		url: "/:collectionKey/:id/:statusOrId",
		middleware: {
			authenticate: true,
		},
		zodSchema: collectionDocuments.getSingle.zodSchema,
		controller: collectionDocuments.getSingle.controller,
	});

	// Delete single document
	r(fastify, {
		method: "delete",
		url: "/:collectionKey/:id",
		permissions: ["delete_content"],
		middleware: {
			authenticate: true,
			validateCSRF: true,
		},
		zodSchema: collectionDocuments.deleteSingle.zodSchema,
		controller: collectionDocuments.deleteSingle.controller,
	});

	// Delete multiple documents
	r(fastify, {
		method: "delete",
		url: "/:collectionKey",
		permissions: ["delete_content"],
		middleware: {
			authenticate: true,
			validateCSRF: true,
		},
		zodSchema: collectionDocuments.deleteMultiple.zodSchema,
		controller: collectionDocuments.deleteMultiple.controller,
	});

	// Get multiple documents
	r(fastify, {
		method: "get",
		url: "/:collectionKey/:status",
		middleware: {
			authenticate: true,
		},
		zodSchema: collectionDocuments.getMultiple.zodSchema,
		controller: collectionDocuments.getMultiple.controller,
	});

	// Get multiple document revisions
	r(fastify, {
		method: "get",
		url: "/:collectionKey/:id/revisions",
		middleware: {
			authenticate: true,
		},
		zodSchema: collectionDocuments.getMultipleRevisions.zodSchema,
		controller: collectionDocuments.getMultipleRevisions.controller,
	});
};

export default collectionDocumentsRoutes;
