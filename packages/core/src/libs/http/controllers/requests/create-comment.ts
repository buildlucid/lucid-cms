import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/requests.js";
import { requestServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const createCommentController = factory.createHandlers(
	describeRoute({
		description: "Add a comment to a request, or reply to one of its comments.",
		tags: ["requests"],
		summary: "Comment On Request",
		responses: openAPI.responses({
			noProperties: true,
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.createComment.params,
			headers: {
				csrf: true,
			},
		}),
		requestBody: openAPI.requestBody(controllerSchemas.createComment.body),
	}),
	validateCSRF,
	authenticate(),
	permissions([Permissions.RequestsRead]),
	validate("param", controllerSchemas.createComment.params),
	validate("json", controllerSchemas.createComment.body),
	async (c) => {
		const { id } = c.req.valid("param");
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const result = await serviceWrapper(requestServices.createComment, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.requests.error.name"),
				message: copy("server:core.routes.requests.error.message"),
			},
		})(context, {
			id: Number.parseInt(id, 10),
			body: body.body,
			parentId: body.parentId,
			user: c.get("auth"),
		});
		if (result.error) throw new LucidAPIError(result.error);

		c.status(204);
		return c.body(null);
	},
);

export default createCommentController;
