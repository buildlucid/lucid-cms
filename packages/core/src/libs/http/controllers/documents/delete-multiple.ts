import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/documents.js";
import { describeRoute } from "hono-openapi";
import { documentServices } from "../../../../services/index.js";
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

const deleteMultipleController = factory.createHandlers(
	describeRoute({
		description: "Delete a multiple documents for a given collection.",
		tags: ["documents"],
		summary: "Delete Multiple Documents",
		responses: honoOpenAPIResponse({
			noProperties: true,
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.deleteMultiple.body),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.deleteMultiple.params,
			headers: {
				csrf: true,
			},
		}),
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.DeleteContent]),
	validate("json", controllerSchemas.deleteMultiple.body),
	validate("param", controllerSchemas.deleteMultiple.params),
	async (c) => {
		const { ids } = c.req.valid("json");
		const { collectionKey } = c.req.valid("param");

		const deleteMultiple = await serviceWrapper(
			documentServices.deleteMultiple,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_document_delete_error_name"),
					message: T("route_document_delete_error_message"),
				},
			},
		)(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
			},
			{
				ids,
				collectionKey,
				userId: c.get("auth").id,
			},
		);
		if (deleteMultiple.error) throw new LucidAPIError(deleteMultiple.error);

		c.status(204);
		return c.body(null);
	},
);

export default deleteMultipleController;
