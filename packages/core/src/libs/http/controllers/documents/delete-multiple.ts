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

const deleteMultipleController = factory.createHandlers(
	describeRoute({
		description: "Delete a multiple documents for a given collection.",
		tags: ["documents"],
		summary: "Delete Multiple Documents",
		responses: openAPI.responses({
			noProperties: true,
		}),
		requestBody: openAPI.requestBody(controllerSchemas.deleteMultiple.body),
		parameters: openAPI.parameters({
			params: controllerSchemas.deleteMultiple.params,
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate(),
	validate("json", controllerSchemas.deleteMultiple.body),
	validate("param", controllerSchemas.deleteMultiple.params),
	collectionPermissions("delete"),
	async (c) => {
		const { ids } = c.req.valid("json");
		const { collectionKey } = c.req.valid("param");
		const context = createServiceContext(c);

		const deleteMultiple = await serviceWrapper(
			documentServices.deleteMultiple,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.document.delete.error.name"),
					message: copy("server:core.routes.document.delete.error.message"),
				},
			},
		)(context, {
			ids,
			collectionKey,
			userId: c.get("auth").id,
		});
		if (deleteMultiple.error) throw new LucidAPIError(deleteMultiple.error);

		c.status(204);
		return c.body(null);
	},
);

export default deleteMultipleController;
