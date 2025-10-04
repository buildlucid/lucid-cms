import { z } from "zod/v4";
import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import validate from "../../middleware/validate.js";
import { controllerSchemas } from "../../../../schemas/auth.js";
import { describeRoute } from "hono-openapi";
import services from "../../../../services/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import {
	honoOpenAPIResponse,
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
} from "../../../../utils/open-api/index.js";
import validateCSRF from "../../middleware/validate-csrf.js";

const factory = createFactory();

const setupController = factory.createHandlers(
	describeRoute({
		description:
			"Creates the initial admin user. This endpoint can only be used when no users exist in the system.",
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
			services.user.createInitialAdmin,
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
