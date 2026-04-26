import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/account.js";
import { accountServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import validate from "../../middleware/validate.js";
import getServiceContext from "../../utils/get-service-context.js";

const factory = createFactory();

const verifyEmailChangeRevertController = factory.createHandlers(
	describeRoute({
		description: "Verifies an email change cancel/revert token is valid.",
		tags: ["account"],
		summary: "Verify Email Change Revert Token",
		responses: honoOpenAPIResponse(),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.verifyEmailChangeRevert.params,
		}),
	}),
	validate("param", controllerSchemas.verifyEmailChangeRevert.params),
	async (c) => {
		const { token } = c.req.valid("param");
		const context = getServiceContext(c);

		const tokenResult = await serviceWrapper(
			accountServices.verifyEmailChangeRevert,
			{
				transaction: false,
				defaultError: {
					type: "basic",
					name: T("route_verify_email_change_revert_error_name"),
					message: T("route_verify_email_change_revert_error_message"),
				},
			},
		)(context, {
			token,
		});

		if (tokenResult.error) throw new LucidAPIError(tokenResult.error);

		c.status(204);
		return c.body(null);
	},
);

export default verifyEmailChangeRevertController;
