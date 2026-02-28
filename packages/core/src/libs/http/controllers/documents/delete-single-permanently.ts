import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/documents.js";
import { documentServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
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

const deleteSinglePermanentlyController = factory.createHandlers(
	describeRoute({
		description:
			"Permanently delete a single document by ID. The document must be soft-deleted first before it can be permanently deleted.",
		tags: ["documents"],
		summary: "Delete Document Permanently",
		responses: honoOpenAPIResponse({
			noProperties: true,
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.deleteSinglePermanently.params,
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.DocumentsDelete]),
	validate("param", controllerSchemas.deleteSinglePermanently.params),
	async (c) => {
		const { collectionKey, id } = c.req.valid("param");
		const context = getServiceContext(c);

		const deleteSinglePermanently = await serviceWrapper(
			documentServices.deleteSinglePermanently,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_document_delete_error_name"),
					message: T("route_document_delete_error_message"),
				},
			},
		)(context, {
			id: Number.parseInt(id, 10),
			collectionKey: collectionKey,
			userId: c.get("auth").id,
		});
		if (deleteSinglePermanently.error)
			throw new LucidAPIError(deleteSinglePermanently.error);

		c.status(204);
		return c.body(null);
	},
);

export default deleteSinglePermanentlyController;
