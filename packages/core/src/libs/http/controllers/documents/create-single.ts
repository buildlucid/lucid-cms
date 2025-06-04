import z from "zod";
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

const createSingleController = factory.createHandlers(
	describeRoute({
		description: "Create a single document for a given collection.",
		tags: ["documents"],
		summary: "Create Document",
		responses: honoSwaggerResponse({
			schema: z.toJSONSchema(controllerSchemas.createSingle.response),
		}),
		requestBody: honoSwaggerRequestBody(controllerSchemas.createSingle.body),
		parameters: honoSwaggerParamaters({
			params: controllerSchemas.createSingle.params,
			headers: {
				csrf: true,
			},
		}),
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	validate("json", controllerSchemas.createSingle.body),
	validate("param", controllerSchemas.createSingle.params),
	async (c) => {
		const { publish, bricks, fields } = c.req.valid("json");
		const { collectionKey } = c.req.valid("param");

		//* manually run permissions middleware based on the publish flag
		permissionCheck(c, publish ? ["publish_content"] : ["create_content"]);

		const documentId = await serviceWrapper(
			services.collection.documents.upsertSingle,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_document_create_error_name"),
					message: T("route_document_create_error_message"),
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
				publish,
				userId: c.get("auth").id,
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

export default createSingleController;
