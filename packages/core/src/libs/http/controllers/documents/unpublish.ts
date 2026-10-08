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

const unpublishController = factory.createHandlers(
	describeRoute({
		description:
			"Remove a document from an environment that does not need an approved request.",
		tags: ["documents"],
		summary: "Unpublish Document",
		responses: openAPI.responses({
			noProperties: true,
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.unpublish.params,
			headers: {
				csrf: true,
			},
		}),
		requestBody: openAPI.requestBody(controllerSchemas.unpublish.body),
	}),
	validateCSRF,
	authenticate(),
	validate("param", controllerSchemas.unpublish.params),
	validate("json", controllerSchemas.unpublish.body),
	collectionPermissions("publish"),
	async (c) => {
		const { collectionKey, id } = c.req.valid("param");
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const result = await serviceWrapper(documentServices.unpublish, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.document.unpublish.error.name"),
				message: copy("server:core.routes.document.unpublish.error.message"),
			},
		})(context, {
			collectionKey,
			documentId: Number.parseInt(id, 10),
			target: body.target,
			user: c.get("auth"),
		});
		if (result.error) throw new LucidAPIError(result.error);

		c.status(204);
		return c.body(null);
	},
);

export default unpublishController;
