import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { oauthSchemas } from "../../../../schemas/oauth.js";
import { oauthServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { Permissions } from "../../../permission/definitions.js";
import hasAccess from "../../../permission/has-access.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getAuthorizationRequestController = factory.createHandlers(
	describeRoute({
		description:
			"Returns the pending OAuth request and effective scopes for the consent screen.",
		tags: ["oauth-connections"],
		summary: "Get OAuth Authorization Request",
		responses: openAPI.responses({
			schema: z.toJSONSchema(oauthSchemas.authorizationRequest.response),
		}),
		parameters: openAPI.parameters({
			params: oauthSchemas.authorizationRequest.params,
		}),
	}),
	authenticate(),
	validate("param", oauthSchemas.authorizationRequest.params),
	async (c) => {
		const context = createServiceContext(c);
		const { requestId } = c.req.valid("param");
		const auth = c.get("auth");
		const result = await serviceWrapper(oauthServices.getAuthorizationRequest, {
			transaction: false,
			defaultError: { type: "basic" },
		})(context, {
			requestId,
			canConnectAsSystem: hasAccess({
				user: auth,
				requiredPermissions: [Permissions.IntegrationCreate],
			}),
			actor: {
				superAdmin: auth.superAdmin,
				permissions: auth.permissions,
			},
		});
		if (result.error) throw new LucidAPIError(result.error);

		c.header("Cache-Control", "no-store");
		c.header("Pragma", "no-cache");
		return c.json(formatAPIResponse(c, { data: result.data }));
	},
);

export default getAuthorizationRequestController;
