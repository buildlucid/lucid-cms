import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/account.js";
import { accountServices, authServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const updateMeController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description: "Update the authenticated user's information.",
		tags: ["account"],
		summary: "Update Authenticated User",
		responses: openAPI.responses(),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: openAPI.requestBody(controllerSchemas.updateMe.body),
	})),
	validateCSRF(),
	authenticate(),
	validate("json", controllerSchemas.updateMe.body),
	async (c) => {
		const {
			firstName,
			lastName,
			username,
			email,
			currentPassword,
			newPassword,
			passwordConfirmation,
		} = c.req.valid("json");
		const context = createServiceContext(c);

		//* the service owns its transaction so a wrong current password stays counted
		const updateMe = await serviceWrapper(accountServices.updateMe, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.user.me.update.error.name"),
				message: copy("server:core.routes.user.me.update.error.message"),
			},
		})(context, {
			auth: c.get("auth"),
			firstName,
			lastName,
			username,
			email,
			currentPassword,
			newPassword,
			passwordConfirmation,
		});

		if (updateMe.error) throw new LucidAPIError(updateMe.error);

		//* a new password logs out every session, so this one starts again
		if (updateMe.data.passwordChanged) {
			const [refreshRes, accessRes] = await Promise.all([
				authServices.refreshToken.generateToken(c, c.get("auth").id),
				authServices.accessToken.generateToken(c, c.get("auth").id),
			]);
			if (refreshRes.error) throw new LucidAPIError(refreshRes.error);
			if (accessRes.error) throw new LucidAPIError(accessRes.error);
		}

		c.status(204);
		return c.body(null);
	},
);

export default updateMeController;
