import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/documents.js";
import { documentServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import authenticate from "../../middleware/authenticate.js";
import collectionPermissions from "../../middleware/collection-permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const updateOrderController = factory.createHandlers(
	describeRoute({
		description:
			"Move a document within an orderable collection's manual order by placing it between two neighbouring documents.",
		tags: ["documents"],
		summary: "Update Document Order",
		responses: openAPI.responses({
			noProperties: true,
		}),
		requestBody: openAPI.requestBody(controllerSchemas.updateOrder.body),
		parameters: openAPI.parameters({
			params: controllerSchemas.updateOrder.params,
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate(),
	validate("json", controllerSchemas.updateOrder.body),
	validate("param", controllerSchemas.updateOrder.params),
	collectionPermissions("update"),
	async (c) => {
		const { collectionKey, id } = c.req.valid("param");
		const { previousDocumentId, nextDocumentId } = c.req.valid("json");
		const context = createServiceContext(c);

		const updateRes = await serviceWrapper(documentServices.updateOrder, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.document.update.error.name"),
				message: copy("server:core.routes.document.update.error.message"),
			},
		})(context, {
			collectionKey,
			documentId: Number.parseInt(id, 10),
			previousDocumentId,
			nextDocumentId,
		});
		if (updateRes.error) throw new LucidAPIError(updateRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default updateOrderController;
