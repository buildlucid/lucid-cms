import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/account.js";
import { userServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const unlinkAuthProviderController = factory.createHandlers(
	describeRoute({
		description: "Unlinks an auth provider from the authenticated user.",
		tags: ["account"],
		summary: "Unlink Auth Provider",
		responses: openAPI.responses({
			noProperties: true,
		}),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
			params: controllerSchemas.unlinkAuthProvider.params,
		}),
	}),
	validateCSRF,
	authenticate(),
	validate("param", controllerSchemas.unlinkAuthProvider.params),
	async (c) => {
		const { providerId } = c.req.valid("param");
		const auth = c.get("auth");
		const context = createServiceContext(c);

		const unlinkAuthProvider = await serviceWrapper(
			userServices.unlinkAuthProvider,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: copy(
						"server:core.routes.account.auth.provider.unlink.error.message",
					),
					message: copy(
						"server:core.routes.account.auth.provider.unlink.error.message",
					),
				},
			},
		)(context, {
			auth: auth,
			targetUserId: auth.id,
			providerKey: providerId,
		});
		if (unlinkAuthProvider.error) {
			throw new LucidAPIError(unlinkAuthProvider.error);
		}

		c.status(204);
		return c.body(null);
	},
);

export default unlinkAuthProviderController;
