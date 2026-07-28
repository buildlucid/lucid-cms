import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { oauthConnectionResponseSchema } from "../../../../schemas/oauth.js";
import { oauthServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getSystemConnectionsController = factory.createHandlers(
	describeRoute({
		description: "Returns system-scoped OAuth integration connections.",
		tags: ["oauth-connections"],
		summary: "Get System OAuth Connections",
		responses: openAPI.responses({
			schema: z.toJSONSchema(z.array(oauthConnectionResponseSchema)),
		}),
	}),
	authenticate(),
	permissions(Permissions.IntegrationRead),
	async (c) => {
		const context = createServiceContext(c);
		const result = await serviceWrapper(oauthServices.getConnections, {
			transaction: false,
			defaultError: { type: "basic" },
		})(context, {
			principalType: "system",
			tenantKey: c.get("tenant")?.key,
		});
		if (result.error) throw new LucidAPIError(result.error);

		return c.json(formatAPIResponse(c, { data: result.data }));
	},
);

export default getSystemConnectionsController;
