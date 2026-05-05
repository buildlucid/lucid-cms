import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/publish-requests.js";
import { documentPublishOperationServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getReviewersController = factory.createHandlers(
	describeRoute({
		description: "Get users who can review a publish request target.",
		tags: ["publish-requests"],
		summary: "Get Publish Request Reviewers",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getReviewers.response),
		}),
		parameters: honoOpenAPIParamaters({
			query: controllerSchemas.getReviewers.query.string,
		}),
	}),
	authenticate,
	validate("query", controllerSchemas.getReviewers.query.string),
	async (c) => {
		const query = c.req.valid("query");
		const context = createServiceContext(c);

		const reviewers = await serviceWrapper(
			documentPublishOperationServices.getReviewers,
			{
				transaction: false,
			},
		)(context, {
			collectionKey: query.collectionKey,
			target: query.target,
			user: c.get("auth"),
		});
		if (reviewers.error) throw new LucidAPIError(reviewers.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: reviewers.data,
			}),
		);
	},
);

export default getReviewersController;
