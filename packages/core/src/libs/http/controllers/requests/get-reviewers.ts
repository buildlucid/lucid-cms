import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
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
		description: "List the people who can be asked to review a request.",
		tags: ["requests"],
		summary: "Get Request Reviewers",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getReviewers.response),
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.getReviewers.params,
		}),
	}),
	authenticate(),
	permissions([Permissions.RequestsRead]),
	validate("param", controllerSchemas.getReviewers.params),
	async (c) => {
		const { id } = c.req.valid("param");
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
		});
		if (result.error) throw new LucidAPIError(result.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: result.data }));
	},
);

export default getReviewersController;
