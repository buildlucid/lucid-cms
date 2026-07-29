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

const regenerateSecretController = factory.createHandlers(
	describeRoute({
		description: "Regenerates a confidential OAuth client's secret.",
		tags: ["integrations"],
		summary: "Regenerate OAuth Client Secret",
		responses: openAPI.responses({
			schema: z.toJSONSchema(oauthClientSchemas.regenerateSecret.response),
		}),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
			params: oauthClientSchemas.regenerateSecret.params,
		}),
	}),
	validateCSRF,
	authenticate(),
	permissions([Permissions.IntegrationRegenerate]),
	validate("param", oauthClientSchemas.regenerateSecret.params),
	async (c) => {
		const { id } = c.req.valid("param");
		const context = createServiceContext(c);

		const regenerateRes = await serviceWrapper(
			oauthClientServices.regenerateSecret,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.integrations.update.error.name"),
					message: copy("server:core.routes.integrations.update.error.message"),
				},
			},
		)(context, { id });
		if (regenerateRes.error) throw new LucidAPIError(regenerateRes.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: regenerateRes.data }));
	},
);

export default regenerateSecretController;
