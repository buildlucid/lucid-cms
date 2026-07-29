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
import openAPI from "../../../openapi/index.js";
import formatAPIResponse from "../../../utils/build-response.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const getAllController = factory.createHandlers(
	describeRoute({
		description: "Returns the registered OAuth clients.",
		tags: ["integrations"],
		summary: "Get OAuth Clients",
		responses: openAPI.responses({
			schema: z.toJSONSchema(oauthClientSchemas.getAll.response),
		}),
	}),
	authenticate(),
	permissions([Permissions.IntegrationRead]),
	async (c) => {
		const context = createServiceContext(c);

		const getAllRes = await serviceWrapper(oauthClientServices.getAll, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.integrations.fetch.error.name"),
				message: copy("server:core.routes.integrations.fetch.error.message"),
			},
		})(context);
		if (getAllRes.error) throw new LucidAPIError(getAllRes.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: getAllRes.data }));
	},
);

export default getAllController;
