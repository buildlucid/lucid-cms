import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { oauthClientSchemas } from "../../../../../schemas/oauth-clients.js";
import { oauthClientServices } from "../../../../../services/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import { Permissions } from "../../../../permission/definitions.js";
import authenticate from "../../../middleware/authenticate.js";
import permissions from "../../../middleware/permissions.js";
import validate from "../../../middleware/validate.js";
import validateCSRF from "../../../middleware/validate-csrf.js";
import openAPI from "../../../openapi/index.js";
import formatAPIResponse from "../../../utils/build-response.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const createSingleController = factory.createHandlers(
	describeRoute({
		description: "Creates a pre-registered OAuth client.",
		tags: ["integrations"],
		summary: "Create OAuth Client",
		responses: openAPI.responses({
			schema: z.toJSONSchema(oauthClientSchemas.createSingle.response),
		}),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: openAPI.requestBody(oauthClientSchemas.createSingle.body),
	}),
	validateCSRF,
	authenticate(),
	permissions([Permissions.IntegrationCreate]),
	validate("json", oauthClientSchemas.createSingle.body),
	async (c) => {
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const createRes = await serviceWrapper(oauthClientServices.createSingle, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.integrations.create.error.name"),
				message: copy("server:core.routes.integrations.create.error.message"),
			},
		})(context, {
			...body,
			userId: c.get("auth").id,
		});
		if (createRes.error) throw new LucidAPIError(createRes.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: createRes.data }));
	},
);

export default createSingleController;
