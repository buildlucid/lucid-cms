import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/users.js";
import { userServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";

const factory = createFactory();

const unlinkAuthProviderController = factory.createHandlers(
	describeRoute({
		description: "Unlinks an auth provider from the target user.",
		tags: ["users"],
		summary: "Unlink User Auth Provider",
		responses: honoOpenAPIResponse({
			noProperties: true,
		}),
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
			},
			params: controllerSchemas.unlinkAuthProvider.params,
		}),
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.UpdateUser]),
	validate("param", controllerSchemas.unlinkAuthProvider.params),
	async (c) => {
		const { id, providerId } = c.req.valid("param");
		const auth = c.get("auth");

		const unlinkAuthProvider = await serviceWrapper(
			userServices.unlinkAuthProvider,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_user_auth_provider_unlink_error_name"),
					message: T("route_user_auth_provider_unlink_error_message"),
				},
			},
		)(
			{
				db: c.get("config").db,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
			},
			{
				auth: auth,
				targetUserId: Number.parseInt(id, 10),
				providerKey: providerId,
			},
		);
		if (unlinkAuthProvider.error) {
			throw new LucidAPIError(unlinkAuthProvider.error);
		}

		c.status(204);
		return c.body(null);
	},
);

export default unlinkAuthProviderController;
