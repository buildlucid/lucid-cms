import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { oauthClientSchemas } from "../../../../../schemas/oauth-clients.js";
import { oauthClientServices } from "../../../../../services/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import { Permissions } from "../../../../permission/definitions.js";
import authenticate from "../../../middleware/authenticate.js";
import permissions from "../../../middleware/permissions.js";
import validate from "../../../middleware/validate.js";
import validateCSRF from "../../../middleware/validate-csrf.js";
import openAPI from "../../../openapi/index.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const deleteSingleController = factory.createHandlers(
	describeRoute({
		description: "Deletes a registered OAuth client and revokes its grants.",
		tags: ["integrations"],
		summary: "Delete OAuth Client",
		responses: openAPI.responses(),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
			params: oauthClientSchemas.deleteSingle.params,
		}),
	}),
	validateCSRF,
	authenticate(),
	permissions([Permissions.IntegrationDelete]),
	validate("param", oauthClientSchemas.deleteSingle.params),
	async (c) => {
		const { id } = c.req.valid("param");
		const context = createServiceContext(c);

		const deleteRes = await serviceWrapper(oauthClientServices.deleteSingle, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.integrations.delete.error.name"),
				message: copy("server:core.routes.integrations.delete.error.message"),
			},
		})(context, {
			id,
			userId: c.get("auth").id,
		});
		if (deleteRes.error) throw new LucidAPIError(deleteRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default deleteSingleController;
