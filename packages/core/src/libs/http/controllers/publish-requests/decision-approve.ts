import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/publish-requests.js";
import { documentPublishOperationServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const decisionApproveController = factory.createHandlers(
	describeRoute({
		description: "Approve a publish request.",
		tags: ["publish-requests"],
		summary: "Approve Publish Request",
		responses: honoOpenAPIResponse({
			noProperties: true,
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.decision.body),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.decision.params,
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate,
	validate("json", controllerSchemas.decision.body),
	validate("param", controllerSchemas.decision.params),
	async (c) => {
		const { id } = c.req.valid("param");
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const request = await serviceWrapper(
			documentPublishOperationServices.approve,
			{
				transaction: true,
			},
		)(context, {
			id: Number.parseInt(id, 10),
			comment: body.comment,
			user: c.get("auth"),
		});
		if (request.error) throw new LucidAPIError(request.error);

		c.status(204);
		return c.body(null);
	},
);

export default decisionApproveController;
