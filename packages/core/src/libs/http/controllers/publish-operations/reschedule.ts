import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/publish-operation-management.js";
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

const rescheduleController = factory.createHandlers(
	describeRoute({
		description: "Reschedule a publish operation.",
		tags: ["publish-operations"],
		summary: "Reschedule Publish Operation",
		responses: honoOpenAPIResponse({
			noProperties: true,
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.reschedule.body),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.reschedule.params,
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate,
	validate("json", controllerSchemas.reschedule.body),
	validate("param", controllerSchemas.reschedule.params),
	async (c) => {
		const { id } = c.req.valid("param");
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const reschedule = await serviceWrapper(
			documentPublishOperationServices.reschedule,
			{
				transaction: true,
			},
		)(context, {
			id: Number.parseInt(id, 10),
			scheduledAt: body.scheduledAt,
			scheduledTimezone: body.scheduledTimezone,
			user: c.get("auth"),
		});
		if (reschedule.error) throw new LucidAPIError(reschedule.error);

		c.status(204);
		return c.body(null);
	},
);

export default rescheduleController;
