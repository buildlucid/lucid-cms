import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/documents.js";
import { documentVersionServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";

const factory = createFactory();

const restoreRevisionController = factory.createHandlers(
	describeRoute({
		description: "Restore a single document revision.",
		tags: ["documents"],
		summary: "Restore Document Revision",
		responses: honoOpenAPIResponse({
			noProperties: true,
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.restoreRevision.params,
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.RestoreContent]),
	validate("param", controllerSchemas.restoreRevision.params),
	async (c) => {
		const { collectionKey, id, versionId } = c.req.valid("param");

		const restoreRevisionRes = await serviceWrapper(
			documentVersionServices.restoreRevision,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_document_restore_revision_error_name"),
					message: T("route_document_restore_revision_error_message"),
				},
			},
		)(
			{
				db: c.get("config").db,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
				requestUrl: c.req.url,
			},
			{
				versionId: Number.parseInt(versionId, 10),
				userId: c.get("auth").id,
				documentId: Number.parseInt(id, 10),
				collectionKey,
			},
		);
		if (restoreRevisionRes.error)
			throw new LucidAPIError(restoreRevisionRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default restoreRevisionController;
