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
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const completeAuthorizationController = factory.createHandlers(
	describeRoute({
		description: "Allows or denies a pending OAuth authorization request.",
		tags: ["oauth-connections"],
		summary: "Complete OAuth Authorization",
		responses: openAPI.responses({
			schema: z.toJSONSchema(oauthSchemas.completeAuthorization.response),
		}),
		parameters: openAPI.parameters({
			headers: { csrf: true },
			params: oauthSchemas.completeAuthorization.params,
		}),
		requestBody: openAPI.requestBody(oauthSchemas.completeAuthorization.body),
	}),
	validateCSRF,
	authenticate(),
	validate("param", oauthSchemas.completeAuthorization.params),
	validate("json", oauthSchemas.completeAuthorization.body),
	async (c) => {
		const { requestId } = c.req.valid("param");
		const body = c.req.valid("json");
		const auth = c.get("auth");
		const context = createServiceContext(c);

		const result = await serviceWrapper(oauthServices.completeAuthorization, {
			transaction: true,
			defaultError: { type: "basic" },
		})(context, {
			requestId,
			decision: body.decision,
			principalType: body.principalType,
			actor: {
				userId: auth.id,
				superAdmin: auth.superAdmin,
				permissions: auth.permissions,
				canConnectAsSystem: hasAccess({
					user: auth,
					requiredPermissions: [Permissions.IntegrationCreate],
				}),
			},
		});
		if (result.error) throw new LucidAPIError(result.error);

		c.header("Cache-Control", "no-store");
		c.header("Pragma", "no-cache");
		return c.json(formatAPIResponse(c, { data: result.data }));
	},
);

export default completeAuthorizationController;
