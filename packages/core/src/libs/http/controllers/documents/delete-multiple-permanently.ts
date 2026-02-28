import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
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
import getServiceContext from "../../utils/get-service-context.js";

const factory = createFactory();

const deleteMultiplePermanentlyController = factory.createHandlers(
	describeRoute({
		description:
			"Permanently delete multiple documents for a given collection. Documents should be soft-deleted before they are permanently deleted.",
		tags: ["documents"],
		summary: "Delete Multiple Documents Permanently",
		responses: honoOpenAPIResponse({
			noProperties: true,
		}),
		requestBody: honoOpenAPIRequestBody(
			controllerSchemas.deleteMultiplePermanently.body,
		),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.deleteMultiplePermanently.params,
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.DocumentsDelete]),
	validate("param", controllerSchemas.deleteMultiplePermanently.params),
	validate("json", controllerSchemas.deleteMultiplePermanently.body),
	async (c) => {
		const { collectionKey } = c.req.valid("param");
		const { ids } = c.req.valid("json");
		const context = getServiceContext(c);

		const deleteMultiplePermanently = await serviceWrapper(
			documentServices.deleteMultiplePermanently,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_document_delete_error_name"),
					message: T("route_document_delete_error_message"),
				},
			},
		)(context, {
			ids,
			collectionKey,
			userId: c.get("auth").id,
		});
		if (deleteMultiplePermanently.error)
			throw new LucidAPIError(deleteMultiplePermanently.error);

		c.status(204);
		return c.body(null);
	},
);

export default deleteMultiplePermanentlyController;
