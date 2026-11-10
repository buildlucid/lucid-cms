import { createFactory } from "hono/factory";
import { oauthSchemas } from "../../../../schemas/oauth.js";
import { oauthServices, userServices } from "../../../../services/index.js";
import { LucidError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { Permissions } from "../../../permission/definitions.js";
import { canManageOAuthConnection } from "../../../permission/oauth-connections.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const revokeConnectionController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description: "Revokes an OAuth connection and its active tokens.",
		tags: ["oauth-connections"],
		summary: "Revoke OAuth Connection",
		responses: openAPI.responses(),
		parameters: openAPI.parameters({
			headers: { csrf: true },
			params: oauthSchemas.connection.params,
		}),
	})),
	validateCSRF(),
	authenticate(),
	validate("param", oauthSchemas.connection.params),
	async (c) => {
		const { id, userId } = c.req.valid("param");
		const context = createServiceContext(c);
		const current = await serviceWrapper(oauthServices.getConnection, {
			transaction: false,
			defaultError: { type: "basic" },
		})(context, { id });
		if (current.error) throw new LucidError(current.error);
		if (
			userId !== undefined &&
			(current.data.principalType !== "user" || current.data.userId !== userId)
		) {
			throw new LucidError({ type: "basic", status: 404 });
		}

		if (
			!canManageOAuthConnection({
				connection: current.data,
				auth: c.get("auth"),
				systemPermission: Permissions.IntegrationDelete,
			})
		) {
			throw new LucidError({ type: "authorisation", status: 403 });
		}
		if (current.data.principalType === "user" && current.data.userId !== null) {
			const userAccessRes = await userServices.checks.checkUserAccess(context, {
				auth: c.get("auth"),
				id: current.data.userId,
			});
			if (userAccessRes.error) throw new LucidError(userAccessRes.error);
		}

		const result = await serviceWrapper(oauthServices.revokeConnection, {
			transaction: true,
			defaultError: { type: "basic" },
		})(context, { id });
		if (result.error) throw new LucidError(result.error);

		return c.body(null, 204);
	},
);

export default revokeConnectionController;
