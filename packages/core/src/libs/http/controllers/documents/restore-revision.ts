import { createFactory } from "hono/factory";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/documents.js";
import { documentVersionServices } from "../../../../services/index.js";
import { LucidError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import authenticate from "../../middleware/authenticate.js";
import collectionPermissions from "../../middleware/collection-permissions.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const restoreRevisionController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Restore a single document revision to latest, or propose it in a new update request.",
		tags: ["documents"],
		summary: "Restore Document Revision",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.restoreRevision.response),
		}),
		requestBody: openAPI.requestBody(controllerSchemas.restoreRevision.body),
		parameters: openAPI.parameters({
			params: controllerSchemas.restoreRevision.params,
			headers: {
				csrf: true,
			},
		}),
	})),
	validateCSRF(),
	authenticate(),
	validate("json", controllerSchemas.restoreRevision.body),
	validate("param", controllerSchemas.restoreRevision.params),
	collectionPermissions("restore"),
	async (c) => {
		const body = c.req.valid("json");
		const { collectionKey, id, versionId } = c.req.valid("param");
		const context = createServiceContext(c);

		const restoreRevisionRes = await serviceWrapper(
			documentVersionServices.restoreRevision,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.document.restore.revision.error.name"),
					message: copy(
						"server:core.routes.document.restore.revision.error.message",
					),
				},
			},
		)(context, {
			versionId: Number.parseInt(versionId, 10),
			userId: c.get("auth").id,
			authUser: c.get("auth"),
			documentId: Number.parseInt(id, 10),
			collectionKey,
			request: body?.request,
		});
		if (restoreRevisionRes.error)
			throw new LucidError(restoreRevisionRes.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: restoreRevisionRes.data }));
	},
);

export default restoreRevisionController;
