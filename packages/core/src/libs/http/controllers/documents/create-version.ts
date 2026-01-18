import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/documents.js";
import { documentServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import formatAPIResponse from "../../utils/build-response.js";

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
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.UpdateContent]),
	validate("json", controllerSchemas.createVersion.body),
	validate("param", controllerSchemas.createVersion.params),
	async (c) => {
		const { bricks, fields } = c.req.valid("json");
		const { collectionKey, id } = c.req.valid("param");

		const documentId = await serviceWrapper(documentServices.upsertSingle, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_document_create_error_name"),
				message: T("route_document_create_error_message"),
			},
		})(
			{
				db: c.get("config").db,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
			},
			{
				collectionKey,
				userId: c.get("auth").id,
				documentId: Number.parseInt(id, 10),
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
