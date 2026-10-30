import { describeRoute } from "hono-openapi";
import { createFactory } from "hono/factory";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/requests.js";
import { requestServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getReviewersController = factory.createHandlers(
	describeRoute({
		description:
			"Search the people who can be asked to approve a request, by name or ID. Returns up to limit people.",
		tags: ["requests"],
		summary: "Get Request Reviewers",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getReviewers.response),
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.getReviewers.params,
			query: controllerSchemas.getReviewers.query.string,
		}),
	}),
	authenticate(),
	permissions([Permissions.RequestsRead]),
	validate("param", controllerSchemas.getReviewers.params),
	validate("query", controllerSchemas.getReviewers.query.string),
	async (c) => {
		const { id } = c.req.valid("param");
		const query = c.req.valid("query");
		const context = createServiceContext(c);

		const result = await serviceWrapper(requestServices.getReviewers, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.requests.error.name"),
				message: copy("server:core.routes.requests.error.message"),
			},
		})(context, {
			id: Number.parseInt(id, 10),
			user: c.get("auth"),
			name: query["filter[name]"],
			ids: query["filter[id]"]?.split(",").map(Number),
			limit: query.limit,
		});
		if (result.error) throw new LucidAPIError(result.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: result.data }));
	},
);

export default getReviewersController;
