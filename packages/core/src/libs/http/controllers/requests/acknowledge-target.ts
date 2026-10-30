import { describeRoute } from "hono-openapi";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/requests.js";
import { requestServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const acknowledgeTargetController = factory.createHandlers(
	describeRoute({
		description:
			"Acknowledge that someone else published to a request target since the request was created, or withdraw the acknowledgement. Pass the reviewToken you read as ifUnchanged.",
		tags: ["requests"],
		summary: "Acknowledge Request Target",
		responses: openAPI.responses({
			noProperties: true,
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.acknowledgeTarget.params,
			headers: {
				csrf: true,
			},
		}),
		requestBody: openAPI.requestBody(controllerSchemas.acknowledgeTarget.body),
	}),
	validateCSRF(),
	authenticate(),
	permissions([Permissions.RequestsRead]),
	validate("param", controllerSchemas.acknowledgeTarget.params),
	validate("json", controllerSchemas.acknowledgeTarget.body),
	async (c) => {
		const { id, requestDocumentId } = c.req.valid("param");
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const result = await serviceWrapper(requestServices.acknowledgeTarget, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.requests.error.name"),
				message: copy("server:core.routes.requests.error.message"),
			},
		})(context, {
			id: Number.parseInt(id, 10),
			requestDocumentId: Number.parseInt(requestDocumentId, 10),
			...body,
			user: c.get("auth"),
		});
		if (result.error) throw new LucidAPIError(result.error);

		c.status(204);
		return c.body(null);
	},
);

export default acknowledgeTargetController;
