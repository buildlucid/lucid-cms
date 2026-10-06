import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/documents.js";
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
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const requestCreationController = factory.createHandlers(
	describeRoute({
		description:
			"Request a new document through a create release. The document is only created once the release is approved and released.",
		tags: ["documents"],
		summary: "Request Document",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.requestCreation.response),
		}),
		requestBody: openAPI.requestBody(controllerSchemas.requestCreation.body),
		parameters: openAPI.parameters({
			params: controllerSchemas.requestCreation.params,
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate(),
	permissions([Permissions.ReleasesRead]),
	validate("json", controllerSchemas.requestCreation.body),
	validate("param", controllerSchemas.requestCreation.params),
	async (c) => {
		const body = c.req.valid("json");
		const { collectionKey } = c.req.valid("param");
		const context = createServiceContext(c);

		const result = await serviceWrapper(releaseServices.requestCreation, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.document.request.error.name"),
				message: copy("server:core.routes.document.request.error.message"),
			},
		})(context, {
			collectionKey,
			title: body.title,
			description: body.description,
			reviewerIds: body.reviewerIds,
			bricks: body.bricks,
			fields: body.fields,
			user: c.get("auth"),
		});
		if (result.error) throw new LucidAPIError(result.error);

		c.status(201);
		return c.json(formatAPIResponse(c, { data: result.data }));
	},
);

export default requestCreationController;
