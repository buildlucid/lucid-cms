import z from "zod/v4";
import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/documents.js";
import { describeRoute } from "hono-openapi";
import services from "../../../../services/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoSwaggerResponse,
	honoSwaggerRequestBody,
	honoSwaggerParamaters,
} from "../../../../utils/swagger/index.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import { permissionCheck } from "../../middleware/permissions.js";

const factory = createFactory();

const updateVersionController = factory.createHandlers(
	describeRoute({
		description:
			"Update a single document version for a given collection key and document ID.",
		tags: ["documents"],
		summary: "Update Document Version",
		responses: honoSwaggerResponse({
			schema: z.toJSONSchema(controllerSchemas.updateVersion.response),
		}),
		requestBody: honoSwaggerRequestBody(controllerSchemas.updateVersion.body),
		parameters: honoSwaggerParamaters({
			params: controllerSchemas.updateVersion.params,
			headers: {
				csrf: true,
			},
		}),
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	validate("json", controllerSchemas.updateVersion.body),
	validate("param", controllerSchemas.updateVersion.params),
	async (c) => {
		const { bricks, fields } = c.req.valid("json");
		const { collectionKey, id, versionId } = c.req.valid("param");

		//* manually run permissions middleware based on the publish flag
		permissionCheck(c, ["create_content"]);

		const documentId = await serviceWrapper(
			services.collection.documentVersions.updateSingle,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_document_update_error_name"),
					message: T("route_document_update_error_message"),
				},
			},
		)(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				services: services,
			},
			{
				collectionKey,
				userId: c.get("auth").id,
				documentId: Number.parseInt(id),
				versionId: Number.parseInt(versionId),
				bricks,
				fields,
			},
		);
		if (documentId.error) throw new LucidAPIError(documentId.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: {
					id: documentId.data,
				},
			}),
		);
	},
);

export default updateVersionController;
