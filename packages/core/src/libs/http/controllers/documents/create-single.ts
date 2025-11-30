import z from "zod/v4";
import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/documents.js";
import { describeRoute } from "hono-openapi";
import { documentServices } from "../../../../services/index.js";
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
import permissions from "../../middleware/permissions.js";
import { Permissions } from "../../../permission/definitions.js";

const factory = createFactory();

const createSingleController = factory.createHandlers(
	describeRoute({
		description: "Create a single document for a given collection.",
		tags: ["documents"],
		summary: "Create Document",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.createSingle.response),
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.createSingle.body),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.createSingle.params,
			headers: {
				csrf: true,
			},
		}),
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.CreateContent]),
	validate("json", controllerSchemas.createSingle.body),
	validate("param", controllerSchemas.createSingle.params),
	async (c) => {
		const { bricks, fields } = c.req.valid("json");
		const { collectionKey } = c.req.valid("param");

		const documentId = await serviceWrapper(documentServices.upsertSingle, {
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
