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
import openAPI from "../../../openapi/index.js";
import formatAPIResponse from "../../../utils/build-response.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const getSingleController = factory.createHandlers(
	describeRoute({
		description: "Returns a registered OAuth client.",
		tags: ["integrations"],
		summary: "Get OAuth Client",
		responses: openAPI.responses({
			schema: z.toJSONSchema(oauthClientSchemas.getSingle.response),
		}),
		parameters: openAPI.parameters({
			params: oauthClientSchemas.getSingle.params,
		}),
	}),
	authenticate(),
	permissions([Permissions.IntegrationRead]),
	validate("param", oauthClientSchemas.getSingle.params),
	async (c) => {
		const { id } = c.req.valid("param");
		const context = createServiceContext(c);

		const getSingleRes = await serviceWrapper(oauthClientServices.getSingle, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.integrations.fetch.error.name"),
				message: copy("server:core.routes.integrations.fetch.error.message"),
			},
		})(context, { id });
		if (getSingleRes.error) throw new LucidAPIError(getSingleRes.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: getSingleRes.data }));
	},
);

export default getSingleController;
