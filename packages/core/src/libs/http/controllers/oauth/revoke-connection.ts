import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { oauthSchemas } from "../../../../schemas/oauth.js";
import { oauthServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { Permissions } from "../../../permission/definitions.js";
import { canManageOAuthConnection } from "../../../permission/oauth-connections.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const revokeConnectionController = factory.createHandlers(
	describeRoute({
		description: "Revokes an OAuth connection and its active tokens.",
		tags: ["oauth-connections"],
		summary: "Revoke OAuth Connection",
		responses: openAPI.responses(),
		parameters: openAPI.parameters({
			headers: { csrf: true },
			params: oauthSchemas.connection.params,
		}),
	}),
	validateCSRF,
	authenticate(),
	validate("param", oauthSchemas.connection.params),
	async (c) => {
		const { id, userId } = c.req.valid("param");
		const context = createServiceContext(c);
		const current = await serviceWrapper(oauthServices.getConnection, {
			transaction: false,
			defaultError: { type: "basic" },
		})(context, { id });
		if (current.error) throw new LucidAPIError(current.error);
		if (
			userId !== undefined &&
			(current.data.principalType !== "user" || current.data.userId !== userId)
		) {
			throw new LucidAPIError({ type: "basic", status: 404 });
		}

		if (
			!canManageOAuthConnection({
				connection: current.data,
				auth: c.get("auth"),
				systemPermission: Permissions.IntegrationDelete,
			})
		) {
			throw new LucidAPIError({ type: "authorisation", status: 403 });
		}

		const result = await serviceWrapper(oauthServices.revokeConnection, {
			transaction: true,
			defaultError: { type: "basic" },
		})(context, { id });
		if (result.error) throw new LucidAPIError(result.error);

		return c.body(null, 204);
	},
);

export default revokeConnectionController;
