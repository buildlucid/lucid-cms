import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/publish-operations.js";
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

const createPublishOperationController = factory.createHandlers(
	describeRoute({
		description: "Create a publish operation for a document.",
		tags: ["publish-operations"],
		summary: "Create Publish Operation",
		responses: honoOpenAPIResponse({
			noProperties: true,
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.createSingle.body),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.createSingle.params,
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate,
	validate("json", controllerSchemas.createSingle.body),
	validate("param", controllerSchemas.createSingle.params),
	async (c) => {
		const { collectionKey, id } = c.req.valid("param");
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const operationRes = await serviceWrapper(
			documentPublishOperationServices.createSingle,
			{
				transaction: true,
			},
		)(context, {
			collectionKey,
			documentId: Number.parseInt(id, 10),
			target: body.target,
			comment: body.comment,
			assigneeIds: body.assigneeIds,
			autoAccept: body.autoAccept,
			user: c.get("auth"),
		});
		if (operationRes.error) throw new LucidAPIError(operationRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default createPublishOperationController;
