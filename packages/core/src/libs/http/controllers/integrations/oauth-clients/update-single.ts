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

const updateSingleController = factory.createHandlers(
	describeRoute({
		description: "Updates a registered OAuth client.",
		tags: ["integrations"],
		summary: "Update OAuth Client",
		responses: openAPI.responses({
			schema: z.toJSONSchema(oauthClientSchemas.updateSingle.response),
		}),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
			params: oauthClientSchemas.updateSingle.params,
		}),
		requestBody: openAPI.requestBody(oauthClientSchemas.updateSingle.body),
	}),
	validateCSRF,
	authenticate(),
	permissions([Permissions.IntegrationUpdate]),
	validate("param", oauthClientSchemas.updateSingle.params),
	validate("json", oauthClientSchemas.updateSingle.body),
	async (c) => {
		const { id } = c.req.valid("param");
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const updateRes = await serviceWrapper(oauthClientServices.updateSingle, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.integrations.update.error.name"),
				message: copy("server:core.routes.integrations.update.error.message"),
			},
		})(context, {
			id,
			...body,
			userId: c.get("auth").id,
		});
		if (updateRes.error) throw new LucidAPIError(updateRes.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: updateRes.data }));
	},
);

export default updateSingleController;
