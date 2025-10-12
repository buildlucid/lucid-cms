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
	honoOpenAPIResponse,
	honoOpenAPIRequestBody,
	honoOpenAPIParamaters,
} from "../../../../utils/open-api/index.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import { permissionCheck } from "../../middleware/permissions.js";

const factory = createFactory();

const createVersionController = factory.createHandlers(
	describeRoute({
		description:
			"Create a new version for a single document for a given collection key and document ID.",
		tags: ["documents"],
		summary: "Create Document Version",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.createVersion.response),
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.createVersion.body),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.createVersion.params,
			headers: {
				csrf: true,
			},
		}),
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	validate("json", controllerSchemas.createVersion.body),
	validate("param", controllerSchemas.createVersion.params),
	async (c) => {
		const { publish, bricks, fields } = c.req.valid("json");
		const { collectionKey, id } = c.req.valid("param");

		//* manually run permissions middleware based on the publish flag
		permissionCheck(c, publish ? ["publish_content"] : ["create_content"]);

		const documentId = await serviceWrapper(services.documents.upsertSingle, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_document_create_error_name"),
				message: T("route_document_create_error_message"),
			},
		})(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
			},
			{
				collectionKey,
				publish,
				userId: c.get("auth").id,
				documentId: Number.parseInt(id),
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

export default createVersionController;
