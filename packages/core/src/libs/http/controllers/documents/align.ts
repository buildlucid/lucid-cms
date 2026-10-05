import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/documents.js";
import { documentVersionServices } from "../../../../services/index.js";
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

const alignController = factory.createHandlers(
	describeRoute({
		description:
			"Align editable document content with latest or an environment.",
		tags: ["documents"],
		summary: "Align Document Version",
		responses: openAPI.responses({
			noProperties: true,
		}),
		requestBody: openAPI.requestBody(controllerSchemas.align.body),
		parameters: openAPI.parameters({
			params: controllerSchemas.align.params,
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate(),
	validate("param", controllerSchemas.align.params),
	validate("json", controllerSchemas.align.body),
	collectionPermissions("update"),
	async (c) => {
		const { collectionKey, id, versionId } = c.req.valid("param");
		const context = createServiceContext(c);
		const body = c.req.valid("json");

		const alignRes = await serviceWrapper(documentVersionServices.align, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.document.align.error.name"),
				message: copy("server:core.routes.document.align.error.message"),
			},
		})(context, {
			versionId: Number.parseInt(versionId, 10),
			user: c.get("auth"),
			...body,
			documentId: Number.parseInt(id, 10),
			collectionKey,
		});
		if (alignRes.error) throw new LucidAPIError(alignRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default alignController;
