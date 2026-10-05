import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/releases.js";
import { releaseServices } from "../../../../services/index.js";
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

const reviewTargetController = factory.createHandlers(
	describeRoute({
		description:
			"Acknowledge replacement of the destination version and source content reviewed.",
		tags: ["releases"],
		summary: "Review Release Destination",
		responses: openAPI.responses({
			noProperties: true,
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.reviewTarget.params,
			headers: {
				csrf: true,
			},
		}),
		requestBody: openAPI.requestBody(controllerSchemas.reviewTarget.body),
	}),
	validateCSRF,
	authenticate(),
	permissions([Permissions.ReleasesRead]),
	validate("param", controllerSchemas.reviewTarget.params),
	validate("json", controllerSchemas.reviewTarget.body),
	async (c) => {
		const { id, releaseDocumentId } = c.req.valid("param");
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const result = await serviceWrapper(releaseServices.reviewTarget, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.releases.error.name"),
				message: copy("server:core.routes.releases.error.message"),
			},
		})(context, {
			id: Number.parseInt(id, 10),
			releaseDocumentId: Number.parseInt(releaseDocumentId, 10),
			...body,
			user: c.get("auth"),
		});
		if (result.error) throw new LucidAPIError(result.error);

		c.status(204);
		return c.body(null);
	},
);

export default reviewTargetController;
