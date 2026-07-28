import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/integrations.js";
import { integrationServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getScopesController = factory.createHandlers(
	describeRoute({
		description: "Returns all available integration scopes grouped by key.",
		tags: ["integrations"],
		summary: "Get Integration Scopes",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.getScopes.response),
		}),
	}),
	authenticate(),
	permissions([Permissions.IntegrationRead]),
	async (c) => {
		const context = createServiceContext(c);
		const getScopesRes = await serviceWrapper(integrationServices.getScopes, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.integrations.fetch.error.name"),
				message: copy("server:core.routes.integrations.fetch.error.message"),
			},
		})(context, {});
		if (getScopesRes.error) throw new LucidAPIError(getScopesRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: getScopesRes.data,
			}),
		);
	},
);

export default getScopesController;
