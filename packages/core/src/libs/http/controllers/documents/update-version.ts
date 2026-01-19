import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/documents.js";
import { documentVersionServices } from "../../../../services/index.js";
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

const updateVersionController = factory.createHandlers(
	describeRoute({
		description:
			"Update a single document version for a given collection key and document ID.",
		tags: ["documents"],
		summary: "Update Document Version",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.updateVersion.response),
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.updateVersion.body),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.updateVersion.params,
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.UpdateContent]),
	validate("json", controllerSchemas.updateVersion.body),
	validate("param", controllerSchemas.updateVersion.params),
	async (c) => {
		const { bricks, fields } = c.req.valid("json");
		const { collectionKey, id, versionId } = c.req.valid("param");

		const documentId = await serviceWrapper(
			documentVersionServices.updateSingle,
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
				db: c.get("config").db,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
				requestUrl: c.req.url,
			},
			{
				collectionKey,
				userId: c.get("auth").id,
				documentId: Number.parseInt(id, 10),
				versionId: Number.parseInt(versionId, 10),
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
