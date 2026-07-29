import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { oauthConnectionResponseSchema } from "../../../../schemas/oauth.js";
import { oauthServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import authenticate from "../../middleware/authenticate.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getAccountConnectionsController = factory.createHandlers(
	describeRoute({
		description: "Returns OAuth connections owned by the authenticated user.",
		tags: ["oauth-connections"],
		summary: "Get Account OAuth Connections",
		responses: openAPI.responses({
			schema: z.toJSONSchema(z.array(oauthConnectionResponseSchema)),
		}),
	}),
	authenticate(),
	async (c) => {
		const context = createServiceContext(c);
		const result = await serviceWrapper(oauthServices.getConnections, {
			transaction: false,
			defaultError: { type: "basic" },
		})(context, {
			principalType: "user",
			userId: c.get("auth").id,
		});
		if (result.error) throw new LucidAPIError(result.error);

		return c.json(formatAPIResponse(c, { data: result.data }));
	},
);

export default getAccountConnectionsController;
