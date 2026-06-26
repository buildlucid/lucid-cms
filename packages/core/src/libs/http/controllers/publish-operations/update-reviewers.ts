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

const updateReviewersController = factory.createHandlers(
	describeRoute({
		description: "Update publish operation reviewers.",
		tags: ["publish-operations"],
		summary: "Update Publish Operation Reviewers",
		responses: openAPI.responses({
			noProperties: true,
		}),
		requestBody: openAPI.requestBody(controllerSchemas.updateReviewers.body),
		parameters: openAPI.parameters({
			params: controllerSchemas.updateReviewers.params,
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate(),
	validate("json", controllerSchemas.updateReviewers.body),
	validate("param", controllerSchemas.updateReviewers.params),
	async (c) => {
		const { id } = c.req.valid("param");
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const request = await serviceWrapper(
			documentPublishOperationServices.updateReviewers,
			{
				transaction: true,
			},
		)(context, {
			id: Number.parseInt(id, 10),
			assigneeIds: body.assigneeIds,
			user: c.get("auth"),
		});
		if (request.error) throw new LucidAPIError(request.error);

		c.status(204);
		return c.body(null);
	},
);

export default updateReviewersController;
