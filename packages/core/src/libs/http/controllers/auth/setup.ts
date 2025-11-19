import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/auth.js";
import { userServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";

const factory = createFactory();

const setupController = factory.createHandlers(
	describeRoute({
		description:
			"Creates the initial admin user. This endpoint can only be used when no users exist in the system. Even if password auth is disabled, you will still be required to set one here.",
		tags: ["auth"],
		summary: "Initial Admin Setup",
		responses: honoOpenAPIResponse(),
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.setup.body),
		validateResponse: true,
	}),
	validateCSRF,
	validate("json", controllerSchemas.setup.body),
	async (c) => {
		const { email, username, firstName, lastName, password } =
			c.req.valid("json");

		const createAdminRes = await serviceWrapper(
			userServices.createInitialAdmin,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_user_create_error_name"),
					message: T("route_user_create_error_message"),
				},
			},
		)(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
			},
			{
				email,
				username,
				firstName,
				lastName,
				password,
			},
		);
		if (createAdminRes.error) throw new LucidAPIError(createAdminRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default setupController;
