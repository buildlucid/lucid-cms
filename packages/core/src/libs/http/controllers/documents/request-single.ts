import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/documents.js";
import { requestServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import type { ServiceContext } from "../../../../utils/services/types.js";
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

const requestSingleController = factory.createHandlers(
	describeRoute({
		description:
			"Request a new document through a create request. The document is only created once the request is approved and completed.",
		tags: ["documents"],
		summary: "Request Document",
		responses: openAPI.responses({
			status: 201,
			dataSchema: z.toJSONSchema(controllerSchemas.requestSingle.response),
		}),
		requestBody: openAPI.requestBody(controllerSchemas.requestSingle.body),
		parameters: openAPI.parameters({
			params: controllerSchemas.requestSingle.params,
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF(),
	authenticate(),
	permissions([Permissions.RequestsRead]),
	validate("json", controllerSchemas.requestSingle.body),
	validate("param", controllerSchemas.requestSingle.params),
	async (c) => {
		const body = c.req.valid("json");
		const { collectionKey } = c.req.valid("param");
		const context = createServiceContext(c);

		const result = await serviceWrapper(
			(context: ServiceContext) =>
				requestServices.createSingle(context, {
					type: "create",
					title: body.title,
					description: body.description,
					reviewerIds: body.reviewerIds,
					document: { collectionKey, bricks: body.bricks, fields: body.fields },
					user: c.get("auth"),
				}),
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.document.request.error.name"),
					message: copy("server:core.routes.document.request.error.message"),
				},
			},
		)(context);
		if (result.error) throw new LucidAPIError(result.error);

		c.status(201);
		return c.json(
			formatAPIResponse(c, {
				data: { id: result.data.document.id, requestId: result.data.id },
			}),
		);
	},
);

export default requestSingleController;
