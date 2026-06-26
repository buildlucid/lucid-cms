import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/publish-operation-management.js";
import { documentPublishOperationServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const retryController = factory.createHandlers(
	describeRoute({
		description: "Retry a failed publish operation.",
		tags: ["publish-operations"],
		summary: "Retry Publish Operation",
		responses: openAPI.responses({
			noProperties: true,
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.retry.params,
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate(),
	validate("param", controllerSchemas.retry.params),
	async (c) => {
		const { id } = c.req.valid("param");
		const context = createServiceContext(c);

		const retry = await serviceWrapper(documentPublishOperationServices.retry, {
			transaction: true,
		})(context, {
			id: Number.parseInt(id, 10),
			user: c.get("auth"),
		});
		if (retry.error) throw new LucidAPIError(retry.error);

		c.status(204);
		return c.body(null);
	},
);

export default retryController;
