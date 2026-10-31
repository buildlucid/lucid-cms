import { describeRoute } from "hono-openapi";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/users.js";
import { userServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const resetTwoFactorController = factory.createHandlers(
	describeRoute({
		description:
			"Turns off two-factor authentication for a specific user, for when they've lost their authenticator app and recovery codes.",
		tags: ["users"],
		summary: "Reset User Two-Factor Authentication",
		responses: openAPI.responses(),
		parameters: openAPI.parameters({
			params: controllerSchemas.resetTwoFactor.params,
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF(),
	authenticate(),
	permissions([Permissions.UsersUpdate]),
	validate("param", controllerSchemas.resetTwoFactor.params),
	async (c) => {
		const { id } = c.req.valid("param");
		const context = createServiceContext(c);

		const resetRes = await serviceWrapper(userServices.resetTwoFactor, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.user.update.error.name"),
				message: copy("server:core.routes.user.update.error.message"),
			},
		})(context, {
			auth: c.get("auth"),
			userId: Number.parseInt(id, 10),
		});
		if (resetRes.error) throw new LucidAPIError(resetRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default resetTwoFactorController;
