import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/documents.js";
import { documentVersionServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { serverText } from "../../../i18n/index.js";
import authenticate from "../../middleware/authenticate.js";
import collectionPermissions from "../../middleware/collection-permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import createServiceContext from "../../utils/create-service-context.js";

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
	validate("param", controllerSchemas.restoreRevision.params),
	collectionPermissions("restore"),
	async (c) => {
		const { collectionKey, id, versionId } = c.req.valid("param");
		const context = createServiceContext(c);

		const restoreRevisionRes = await serviceWrapper(
			documentVersionServices.restoreRevision,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: serverText("core.routes.document.restore.revision.error.name"),
					message: serverText(
						"core.routes.document.restore.revision.error.message",
					),
				},
			},
		)(context, {
			versionId: Number.parseInt(versionId, 10),
			userId: c.get("auth").id,
			documentId: Number.parseInt(id, 10),
			collectionKey,
		});
		if (restoreRevisionRes.error)
			throw new LucidAPIError(restoreRevisionRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default restoreRevisionController;
