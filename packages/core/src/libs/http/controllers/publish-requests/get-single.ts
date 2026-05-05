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
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getSingleController = factory.createHandlers(
	describeRoute({
		description: "Get a publish request.",
		tags: ["publish-requests"],
		summary: "Get Publish Request",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getSingle.response),
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.getSingle.params,
			query: controllerSchemas.getSingle.query.string,
		}),
	}),
	authenticate,
	permissions([Permissions.DocumentsReview]),
	validate("param", controllerSchemas.getSingle.params),
	async (c) => {
		const { id } = c.req.valid("param");
		const context = createServiceContext(c);

		const request = await serviceWrapper(
			documentPublishOperationServices.getSingle,
			{
				transaction: false,
			},
		)(context, {
			id: Number.parseInt(id, 10),
			user: c.get("auth"),
		});
		if (request.error) throw new LucidAPIError(request.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: request.data,
			}),
		);
	},
);

export default getSingleController;
