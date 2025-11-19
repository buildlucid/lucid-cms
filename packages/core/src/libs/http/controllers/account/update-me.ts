import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import validate from "../../middleware/validate.js";
import { controllerSchemas } from "../../../../schemas/account.js";
import { describeRoute } from "hono-openapi";
import { accountServices } from "../../../../services/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIResponse,
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
} from "../../../../utils/open-api/index.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import authenticate from "../../middleware/authenticate.js";

const factory = createFactory();

const updateMeController = factory.createHandlers(
	describeRoute({
		description: "Update the authenticated user's information.",
		tags: ["account"],
		summary: "Update Authenticated User",
		responses: honoOpenAPIResponse(),
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.updateMe.body),
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

		const updateMe = await serviceWrapper(accountServices.updateMe, {
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
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
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
