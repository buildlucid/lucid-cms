import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import {
	oauthConnectionResponseSchema,
	oauthSchemas,
} from "../../../../schemas/oauth.js";
import { oauthServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getUserConnectionsController = factory.createHandlers(
	describeRoute({
		description: "Returns OAuth connections owned by a user.",
		tags: ["oauth-connections"],
		summary: "Get User OAuth Connections",
		responses: openAPI.responses({
			schema: z.toJSONSchema(z.array(oauthConnectionResponseSchema)),
		}),
		parameters: openAPI.parameters({
			params: oauthSchemas.userConnections.params,
		}),
	}),
	authenticate(),
	permissions(Permissions.UsersRead),
	validate("param", oauthSchemas.userConnections.params),
	async (c) => {
		const context = createServiceContext(c);
		const { userId } = c.req.valid("param");
		const result = await serviceWrapper(oauthServices.getConnections, {
			transaction: false,
			defaultError: { type: "basic" },
		})(context, {
			principalType: "user",
			userId,
			tenantKey: c.get("tenant")?.key,
		});
		if (result.error) throw new LucidAPIError(result.error);

		return c.json(formatAPIResponse(c, { data: result.data }));
	},
);

export default getUserConnectionsController;
