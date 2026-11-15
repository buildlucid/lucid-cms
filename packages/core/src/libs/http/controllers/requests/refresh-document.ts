import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/requests.js";
import { requestServices } from "../../../../services/index.js";
import { LucidError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const refreshDocumentController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Refresh a publish request's copy of latest from latest. Changing the copy dismisses any approval.",
		tags: ["requests"],
		summary: "Refresh Request Document",
		responses: openAPI.responses({
			noProperties: true,
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.refreshDocument.params,
			headers: {
				csrf: true,
			},
		}),
	})),
	validateCSRF(),
	authenticate(),
	validate("param", controllerSchemas.refreshDocument.params),
	async (c) => {
		const { id, requestDocumentId } = c.req.valid("param");
		const context = createServiceContext(c);

		const result = await serviceWrapper(requestServices.refreshDocument, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.requests.error.name"),
				message: copy("server:core.routes.requests.error.message"),
			},
		})(context, {
			id: Number.parseInt(id, 10),
			requestDocumentId: Number.parseInt(requestDocumentId, 10),
			user: c.get("auth"),
		});
		if (result.error) throw new LucidError(result.error);

		c.status(204);
		return c.body(null);
	},
);

export default refreshDocumentController;
