import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import validate from "../../middleware/validate.js";
import { controllerSchemas } from "../../../../schemas/account.js";
import { describeRoute } from "hono-openapi";
import services from "../../../../services/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoSwaggerResponse,
	honoSwaggerParamaters,
	honoSwaggerRequestBody,
} from "../../../../utils/swagger/index.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import authenticate from "../../middleware/authenticate.js";

const factory = createFactory();

const updateMeController = factory.createHandlers(
	describeRoute({
		description: "Update the authenticated user's information.",
		tags: ["account"],
		summary: "Update Authenticated User",
		responses: honoSwaggerResponse(),
		parameters: honoSwaggerParamaters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: honoSwaggerRequestBody(controllerSchemas.updateMe.body),
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
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

		const updateMe = await serviceWrapper(services.account.updateMe, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_user_me_update_error_name"),
				message: T("route_user_me_update_error_message"),
			},
		})(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				services: services,
			},
			{
				auth: c.get("auth"),
				firstName,
				lastName,
				username,
				email,
				currentPassword,
				newPassword,
				passwordConfirmation,
			},
		);

		if (updateMe.error) throw new LucidAPIError(updateMe.error);

		c.status(204);
		return c.body(null);
	},
);

export default updateMeController;
