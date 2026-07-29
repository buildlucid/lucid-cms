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
import { canManageOAuthConnection } from "../../../permission/oauth-connections.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const updateConnectionController = factory.createHandlers(
	describeRoute({
		description: "Updates the private name of an OAuth connection.",
		tags: ["oauth-connections"],
		summary: "Update OAuth Connection",
		responses: openAPI.responses({
			schema: z.toJSONSchema(oauthConnectionResponseSchema),
		}),
		parameters: openAPI.parameters({
			headers: { csrf: true },
			params: oauthSchemas.updateConnection.params,
		}),
		requestBody: openAPI.requestBody(oauthSchemas.updateConnection.body),
	}),
	validateCSRF,
	authenticate(),
	validate("param", oauthSchemas.updateConnection.params),
	validate("json", oauthSchemas.updateConnection.body),
	async (c) => {
		const { id, userId } = c.req.valid("param");
		const { name } = c.req.valid("json");
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
				systemPermission: Permissions.IntegrationUpdate,
			})
		) {
			throw new LucidAPIError({ type: "authorisation", status: 403 });
		}

		const result = await serviceWrapper(oauthServices.updateConnection, {
			transaction: true,
			defaultError: { type: "basic" },
		})(context, { id, name });
		if (result.error) throw new LucidAPIError(result.error);

		return c.json(formatAPIResponse(c, { data: result.data }));
	},
);

export default updateConnectionController;
