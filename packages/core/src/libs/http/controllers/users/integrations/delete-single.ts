import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { userIntegrationItemParamsSchema } from "../../../../../schemas/integrations.js";
import { integrationServices } from "../../../../../services/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import { Permissions } from "../../../../permission/definitions.js";
import hasAccess from "../../../../permission/has-access.js";
import authenticate from "../../../middleware/authenticate.js";
import validate from "../../../middleware/validate.js";
import validateCSRF from "../../../middleware/validate-csrf.js";
import openAPI from "../../../openapi/index.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const deleteSingleController = factory.createHandlers(
	describeRoute({
		description: "Deletes an API key integration owned by the selected user.",
		tags: ["integrations"],
		summary: "Delete User Integration",
		responses: openAPI.responses({
			noProperties: true,
		}),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
			params: userIntegrationItemParamsSchema,
		}),
	}),
	validateCSRF,
	authenticate(),
	validate("param", userIntegrationItemParamsSchema),
	async (c) => {
		const { id, userId } = c.req.valid("param");
		const auth = c.get("auth");
		if (
			!hasAccess({
				user: auth,
				resourceOwnerId: userId,
				requiredPermissions: [Permissions.UsersUpdate],
			})
		) {
			throw new LucidAPIError({ type: "authorisation", status: 403 });
		}
		const context = createServiceContext(c);

		const deleteSingleRes = await serviceWrapper(
			integrationServices.deleteSingle,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.integrations.delete.error.name"),
					message: copy("server:core.routes.integrations.delete.error.message"),
				},
			},
		)(context, {
			id,
			userId,
		});
		if (deleteSingleRes.error) throw new LucidAPIError(deleteSingleRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default deleteSingleController;
