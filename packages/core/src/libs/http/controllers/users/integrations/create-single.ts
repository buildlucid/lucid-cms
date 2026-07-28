import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import {
	controllerSchemas,
	userIntegrationParamsSchema,
} from "../../../../../schemas/integrations.js";
import { integrationServices } from "../../../../../services/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import authenticate from "../../../middleware/authenticate.js";
import validate from "../../../middleware/validate.js";
import validateCSRF from "../../../middleware/validate-csrf.js";
import openAPI from "../../../openapi/index.js";
import formatAPIResponse from "../../../utils/build-response.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const createSingleController = factory.createHandlers(
	describeRoute({
		description: "Creates an API key integration owned by the selected user.",
		tags: ["integrations"],
		summary: "Create User Integration",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.createSingle.response),
		}),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
			params: userIntegrationParamsSchema,
		}),
		requestBody: openAPI.requestBody(controllerSchemas.createSingle.body),
	}),
	validateCSRF,
	authenticate(),
	validate("param", userIntegrationParamsSchema),
	validate("json", controllerSchemas.createSingle.body),
	async (c) => {
		const { name, description, enabled, expiry, scopes } = c.req.valid("json");
		const { userId } = c.req.valid("param");
		const auth = c.get("auth");
		if (userId !== auth.id && !auth.superAdmin) {
			throw new LucidAPIError({ type: "authorisation", status: 403 });
		}
		const context = createServiceContext(c);

		const integrationRes = await serviceWrapper(
			integrationServices.createSingle,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.integrations.create.error.name"),
					message: copy("server:core.routes.integrations.create.error.message"),
				},
			},
		)(context, {
			name,
			description,
			enabled,
			expiry,
			scopes,
			userId,
		});
		if (integrationRes.error) throw new LucidAPIError(integrationRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: integrationRes.data,
			}),
		);
	},
);

export default createSingleController;
